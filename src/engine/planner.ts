/**
 * FreshRoute Distribution Planning Engine - Main Planner Orchestrator
 * Pure deterministic distribution solver coordinating feasibility, FEFO prioritization,
 * shared capacity tracking, two-part transport economics, and SHA-256 snapshot hashing.
 */

import { createHash } from "crypto";
import Decimal from "decimal.js";
import {
  BaselineComparisonMetrics,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlannerInput,
  EnginePlanOutput,
  EngineRejection,
  EngineSolverConfig,
  EngineTransportRoute,
} from "./contracts";
import { evaluateCandidateFeasibility } from "./feasibility";
import { calculatePriorityScore, CandidateAllocationPair, sortCandidatesDeterministically } from "./prioritizer";
import { executeAllocationPlan } from "./allocator";
import { computeBaselineComparison, executeBaselineFifoPlan } from "./baseline-fifo";

export const FRESHROUTE_ENGINE_NAME = "FreshRoute-Intelligent-FEFO-Solver";
export const FRESHROUTE_ENGINE_VERSION = "1.0.0-fefo";

export interface PlannerExecutionOptions {
  compareWithBaseline?: boolean;
}

export interface PlannerExecutionResult {
  plan: EnginePlanOutput;
  baselineComparison?: BaselineComparisonMetrics;
}

/**
 * Replaceable Planning Engine Interface allowing seamless future integration
 * of mathematical Mixed-Integer Linear Programming (MILP) solvers.
 */
export interface IDistributionPlanningEngine {
  solve(input: EnginePlannerInput, options?: PlannerExecutionOptions): PlannerExecutionResult;
}

/**
 * Validates raw input collections and ensures physical unit invariants.
 */
export function validatePlannerInput(input: EnginePlannerInput): void {
  if (!input) {
    throw new Error("Planning engine input cannot be null or undefined.");
  }
  if (!Array.isArray(input.batches)) {
    throw new Error("Input 'batches' must be an array.");
  }
  if (!Array.isArray(input.demands)) {
    throw new Error("Input 'demands' must be an array.");
  }
  if (!Array.isArray(input.routes)) {
    throw new Error("Input 'routes' must be an array.");
  }
  if (!Array.isArray(input.destinations)) {
    throw new Error("Input 'destinations' must be an array.");
  }
  if (!Array.isArray(input.commodities)) {
    throw new Error("Input 'commodities' must be an array.");
  }

  // Validate Batch Invariants
  for (const b of input.batches) {
    if (!b.id || !b.batchCode) {
      throw new Error(`Batch missing required identifier or batchCode: ${JSON.stringify(b)}`);
    }
    const availKg = new Decimal(b.availableQuantityKg);
    if (availKg.isNaN() || availKg.lessThan(0)) {
      throw new Error(`Batch ${b.batchCode} has invalid availableQuantityKg: ${b.availableQuantityKg}`);
    }
    const unitCost = new Decimal(b.unitCostUsd);
    if (unitCost.isNaN() || unitCost.lessThan(0)) {
      throw new Error(`Batch ${b.batchCode} has invalid unitCostUsd: ${b.unitCostUsd}`);
    }
    if (isNaN(new Date(b.expiryDate).getTime())) {
      throw new Error(`Batch ${b.batchCode} has invalid expiryDate: ${b.expiryDate}`);
    }
  }

  // Validate Demand Invariants
  for (const d of input.demands) {
    if (!d.id || !d.orderNumber) {
      throw new Error(`Demand order missing required id or orderNumber: ${JSON.stringify(d)}`);
    }
    const reqKg = new Decimal(d.requestedQuantityKg);
    if (reqKg.isNaN() || reqKg.lessThanOrEqualTo(0)) {
      throw new Error(`Demand ${d.orderNumber} must have positive requestedQuantityKg: ${d.requestedQuantityKg}`);
    }
    const price = new Decimal(d.contractedPricePerKgUsd);
    if (price.isNaN() || price.lessThan(0)) {
      throw new Error(`Demand ${d.orderNumber} has invalid contractedPricePerKgUsd: ${d.contractedPricePerKgUsd}`);
    }
    if (isNaN(new Date(d.deliveryWindowStart).getTime()) || isNaN(new Date(d.deliveryWindowEnd).getTime())) {
      throw new Error(`Demand ${d.orderNumber} has invalid deliveryWindow dates.`);
    }
  }

  // Validate Route Invariants
  for (const r of input.routes) {
    if (!r.id || !r.routeCode) {
      throw new Error(`Route missing required id or routeCode: ${JSON.stringify(r)}`);
    }
    const capKg = new Decimal(r.capacityKg);
    if (capKg.isNaN() || capKg.lessThan(0)) {
      throw new Error(`Route ${r.routeCode} has invalid capacityKg: ${r.capacityKg}`);
    }
    if (isNaN(new Date(r.departureTime).getTime())) {
      throw new Error(`Route ${r.routeCode} has invalid departureTime: ${r.departureTime}`);
    }
  }
}

/**
 * Computes a cryptographic SHA-256 digest of canonically ordered input JSON.
 */
export function computeCanonicalInputSnapshotHash(input: EnginePlannerInput): string {
  // Deep clone and normalize dates/decimals into sorted canonical structure
  const canonicalNormalize = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (obj instanceof Decimal) {
      return obj.toString();
    }
    if (Array.isArray(obj)) {
      return obj.map(canonicalNormalize);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalNormalize(obj[key]);
    }
    return result;
  };

  const normalized = canonicalNormalize({
    batches: [...input.batches].sort((a, b) => a.id.localeCompare(b.id)),
    commodities: [...input.commodities].sort((a, b) => a.id.localeCompare(b.id)),
    destinations: [...input.destinations].sort((a, b) => a.id.localeCompare(b.id)),
    demands: [...input.demands].sort((a, b) => a.id.localeCompare(b.id)),
    routes: [...input.routes].sort((a, b) => a.id.localeCompare(b.id)),
    config: input.config || {},
  });

  const jsonString = JSON.stringify(normalized);
  return createHash("sha256").update(jsonString, "utf8").digest("hex");
}

/**
 * Primary FreshRoute FEFO Distribution Planning Engine implementation.
 */
export class FreshRoutePlanningEngine implements IDistributionPlanningEngine {
  public solve(
    input: EnginePlannerInput,
    options: PlannerExecutionOptions = {}
  ): PlannerExecutionResult {
    const startTime = Date.now();

    // 1. Invariant Validation
    validatePlannerInput(input);

    // 2. Resolve Config Defaults
    const resolvedConfig: Required<EngineSolverConfig> = {
      algorithmVersion: input.config?.algorithmVersion || FRESHROUTE_ENGINE_VERSION,
      enableDynamicMarkdowns: input.config?.enableDynamicMarkdowns !== false,
      maxMarkdownPercent: input.config?.maxMarkdownPercent ?? 40,
      minGrossMarginThresholdPercent: input.config?.minGrossMarginThresholdPercent ?? 0,
      shelfLifeSafetyBufferHours: input.config?.shelfLifeSafetyBufferHours ?? 4.0,
      spoilageAvoidanceWeight: input.config?.spoilageAvoidanceWeight ?? 1.5,
      planningTime: input.config?.planningTime ? new Date(input.config.planningTime).toISOString() : new Date().toISOString(),
      disposalPenaltyPerKgUsd: input.config?.disposalPenaltyPerKgUsd ?? 0.25,
      handlingCostPerKgUsd: input.config?.handlingCostPerKgUsd ?? 0.0,
    };

    // 3. Cryptographic Input Snapshot Digest
    const snapshotHash = computeCanonicalInputSnapshotHash(input);

    // 4. Construct Fast Lookup Maps
    const commodityMap = new Map<string, EngineCommodity>(input.commodities.map((c) => [c.id, c]));
    const destinationMap = new Map<string, EngineDestination>(input.destinations.map((d) => [d.id, d]));

    // 5. Feasibility Scanning
    const candidates: CandidateAllocationPair[] = [];
    const initialRejections: EngineRejection[] = [];

    for (const batch of input.batches) {
      const commodity = commodityMap.get(batch.commodityId);

      for (const demand of input.demands) {
        // Fast skip if commodity mismatch
        if (batch.commodityId !== demand.commodityId) {
          continue;
        }

        const destination = destinationMap.get(demand.destinationId);
        if (!destination) {
          continue;
        }

        // Find candidate routes linking this warehouse to destination
        const candidateRoutes = input.routes.filter(
          (r) => r.originWarehouseId === batch.warehouseId && r.destinationId === destination.id
        );

        if (candidateRoutes.length === 0) {
          initialRejections.push({
            batchId: batch.id,
            batchCode: batch.batchCode,
            demandOrderId: demand.id,
            orderNumber: demand.orderNumber,
            routeId: "NONE",
            routeCode: "NO_ACTIVE_ROUTE",
            reasonCode: evaluateCandidateFeasibility(
              batch,
              commodity,
              destination,
              demand,
              {
                id: "MOCK",
                routeCode: "NONE",
                originWarehouseId: batch.warehouseId,
                destinationId: "NONE",
                capacityKg: 0,
                fixedCostUsd: 0,
                costPerKgUsd: 0,
                transitDurationHours: 0,
                handlingDurationHours: 0,
                departureTime: new Date(),
                tempZoneMinCelsius: 0,
                tempZoneMaxCelsius: 0,
              },
              resolvedConfig
            ).reasonCode,
            reasonExplanation: `No direct transport route connects origin warehouse ${batch.warehouseId} with destination ${destination.id}.`,
            facts: { originWarehouseId: batch.warehouseId, destinationId: destination.id },
          });
          continue;
        }

        for (const route of candidateRoutes) {
          const assessment = evaluateCandidateFeasibility(
            batch,
            commodity,
            destination,
            demand,
            route,
            resolvedConfig
          );

          if (assessment.isFeasible) {
            const rawCandidate = {
              batch,
              commodity,
              destination,
              demand,
              route,
              feasibility: assessment,
            };
            const priorityScore = calculatePriorityScore(rawCandidate, resolvedConfig);

            candidates.push({
              ...rawCandidate,
              priorityScore,
            });
          } else {
            initialRejections.push({
              batchId: batch.id,
              batchCode: batch.batchCode,
              demandOrderId: demand.id,
              orderNumber: demand.orderNumber,
              routeId: route.id,
              routeCode: route.routeCode,
              reasonCode: assessment.reasonCode,
              reasonExplanation: assessment.reasonExplanation,
              facts: assessment.facts,
            });
          }
        }
      }
    }

    // 6. Deterministic Prioritization Sorting
    const sortedCandidates = sortCandidatesDeterministically(candidates);

    // 7. Allocation Execution & Shared Capacity Tracking
    const rawResult = executeAllocationPlan(
      sortedCandidates,
      input.batches,
      input.demands,
      input.routes,
      input.destinations,
      input.commodities,
      initialRejections,
      resolvedConfig
    );

    const solveDurationMs = Date.now() - startTime;
    const planId = `plan-fefo-${snapshotHash.slice(0, 12)}`;

    const plan: EnginePlanOutput = {
      planId,
      snapshotHash,
      algorithmVersion: resolvedConfig.algorithmVersion,
      engineMetadata: {
        engineName: FRESHROUTE_ENGINE_NAME,
        version: FRESHROUTE_ENGINE_VERSION,
        executionTimestamp: new Date().toISOString(),
        solveDurationMs,
      },
      config: resolvedConfig,
      metrics: rawResult.metrics,
      allocations: rawResult.allocations,
      routeDispatches: rawResult.routeDispatches,
      batchLeftoverBreakdowns: rawResult.batchLeftoverBreakdowns,
      demandFulfillments: rawResult.demandFulfillments,
      rejections: rawResult.rejections,
    };

    // 8. Optional Baseline Comparison Pass
    let baselineComparison: BaselineComparisonMetrics | undefined;
    if (options.compareWithBaseline) {
      const fifoPlan = executeBaselineFifoPlan(input, resolvedConfig, snapshotHash);
      baselineComparison = computeBaselineComparison(plan, fifoPlan);
    }

    return {
      plan,
      baselineComparison,
    };
  }
}

/**
 * Convenient standalone solver function.
 */
export function solveDistributionPlan(
  input: EnginePlannerInput,
  options?: PlannerExecutionOptions
): PlannerExecutionResult {
  const engine = new FreshRoutePlanningEngine();
  return engine.solve(input, options);
}
