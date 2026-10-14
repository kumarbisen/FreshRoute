/**
 * FreshRoute Distribution Planning Engine - Documented Baseline FIFO Solver
 * Simulates industry-standard naive First-In, First-Out (FIFO) dispatching
 * with static pricing and customer SLA rejection simulation to establish
 * an objective, empirical benchmark.
 */

import Decimal from "decimal.js";
import {
  AllocationFactAudit,
  AllocationReasonCode,
  BaselineComparisonMetrics,
  BindingConstraintType,
  EngineAllocation,
  EnginePlannerInput,
  EnginePlanOutput,
  EngineSolverConfig,
} from "./contracts";
import { executeAllocationPlan } from "./allocator";
import { CandidateAllocationPair } from "./prioritizer";
import { evaluateCandidateFeasibility } from "./feasibility";

export const BASELINE_FIFO_ALGORITHM_VERSION = "0.9.0-baseline-fifo";

/**
 * Executes a deterministic Baseline FIFO planning run against the exact same inputs.
 */
export function executeBaselineFifoPlan(
  input: EnginePlannerInput,
  resolvedConfig: Required<EngineSolverConfig>,
  snapshotHash?: string
): EnginePlanOutput {
  // Baseline configuration: dynamic discounts strictly disabled
  const baselineConfig: Required<EngineSolverConfig> = {
    ...resolvedConfig,
    algorithmVersion: BASELINE_FIFO_ALGORITHM_VERSION,
    enableDynamicMarkdowns: false,
    maxMarkdownPercent: 0,
  };

  const commodityMap = new Map(input.commodities.map((c) => [c.id, c]));
  const destinationMap = new Map(input.destinations.map((d) => [d.id, d]));

  // Naive FIFO Sorting: Sort batches purely by intake/receivedDate ascending, then harvestDate, then batchCode
  const fifoBatches = [...input.batches].sort((a, b) => {
    const receivedA = new Date(a.receivedDate).getTime();
    const receivedB = new Date(b.receivedDate).getTime();
    if (receivedA !== receivedB) return receivedA - receivedB;

    const harvestA = new Date(a.harvestDate).getTime();
    const harvestB = new Date(b.harvestDate).getTime();
    if (harvestA !== harvestB) return harvestA - harvestB;

    return a.batchCode.localeCompare(b.batchCode);
  });

  const candidates: CandidateAllocationPair[] = [];
  const initialRejections = [];

  for (const batch of fifoBatches) {
    const commodity = commodityMap.get(batch.commodityId);

    for (const demand of input.demands) {
      if (batch.commodityId !== demand.commodityId) continue;
      const destination = destinationMap.get(demand.destinationId);
      if (!destination) continue;

      const matchingRoutes = input.routes.filter(
        (r) => r.originWarehouseId === batch.warehouseId && r.destinationId === destination.id
      );

      for (const route of matchingRoutes) {
        const assessment = evaluateCandidateFeasibility(
          batch,
          commodity,
          destination,
          demand,
          route,
          baselineConfig
        );

        if (assessment.isFeasible) {
          // FIFO Priority: purely based on oldest received intake date
          const receivedMs = new Date(batch.receivedDate).getTime();
          const fifoScore = 1e12 - receivedMs; // Earlier date yields higher score

          candidates.push({
            batch,
            commodity,
            destination,
            demand,
            route,
            feasibility: assessment,
            priorityScore: fifoScore,
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
            reasonExplanation: `[Baseline FIFO] ${assessment.reasonExplanation}`,
            facts: assessment.facts,
          });
        }
      }
    }
  }

  // Sort candidates strictly by FIFO score (received date asc) + 5-tier deterministic tie-breakers
  candidates.sort((a, b) => {
    // 1. Primary: Older intake date first
    const diff = b.priorityScore - a.priorityScore;
    if (Math.abs(diff) > 1e-5) return diff;

    // 2. Secondary: Batch code ascending
    const batchDiff = a.batch.batchCode.localeCompare(b.batch.batchCode);
    if (batchDiff !== 0) return batchDiff;

    // 3. Demand deadline: earliest delivery window end first
    const endA = new Date(a.demand.deliveryWindowEnd).getTime();
    const endB = new Date(b.demand.deliveryWindowEnd).getTime();
    if (endA !== endB) return endA - endB;

    // 4. Order number ascending
    const orderDiff = a.demand.orderNumber.localeCompare(b.demand.orderNumber);
    if (orderDiff !== 0) return orderDiff;

    // 5. Route code ascending
    return a.route.routeCode.localeCompare(b.route.routeCode);
  });

  const rawResult = executeAllocationPlan(
    candidates,
    input.batches,
    input.demands,
    input.routes,
    input.destinations,
    input.commodities,
    initialRejections,
    baselineConfig
  );

  return {
    planId: `plan-fifo-${Date.now().toString(36)}`,
    snapshotHash: snapshotHash || "fifo-baseline",
    algorithmVersion: BASELINE_FIFO_ALGORITHM_VERSION,
    engineMetadata: {
      engineName: "FreshRoute-Baseline-FIFO-Benchmark",
      version: BASELINE_FIFO_ALGORITHM_VERSION,
      executionTimestamp: new Date().toISOString(),
      solveDurationMs: 0,
    },
    config: baselineConfig,
    metrics: rawResult.metrics,
    allocations: rawResult.allocations,
    routeDispatches: rawResult.routeDispatches,
    batchLeftoverBreakdowns: rawResult.batchLeftoverBreakdowns,
    demandFulfillments: rawResult.demandFulfillments,
    rejections: rawResult.rejections,
  };
}

/**
 * Computes comparative financial and operational deltas between FreshRoute FEFO and Baseline FIFO.
 */
export function computeBaselineComparison(
  fefoPlan: EnginePlanOutput,
  fifoPlan: EnginePlanOutput
): BaselineComparisonMetrics {
  const profitUpliftUsd = Number((fefoPlan.metrics.netMarginUsd - fifoPlan.metrics.netMarginUsd).toFixed(2));
  const fifoMargin = fifoPlan.metrics.netMarginUsd;

  const profitUpliftPercent = fifoMargin > 0
    ? Number(((profitUpliftUsd / fifoMargin) * 100).toFixed(2))
    : profitUpliftUsd > 0 ? 100 : 0;

  const spoilagePreventedDeltaKg = Number(
    (fefoPlan.metrics.spoilagePreventedKg - fifoPlan.metrics.spoilagePreventedKg).toFixed(2)
  );

  const spoilagePreventedDeltaUsd = Number(
    (fefoPlan.metrics.spoilagePreventedValueUsd - fifoPlan.metrics.spoilagePreventedValueUsd).toFixed(2)
  );

  const slaComplianceDeltaPercent = Number(
    (fefoPlan.metrics.slaComplianceRatePercent - fifoPlan.metrics.slaComplianceRatePercent).toFixed(1)
  );

  const demandFillRateDeltaPercent = Number(
    (fefoPlan.metrics.demandFillRatePercent - fifoPlan.metrics.demandFillRatePercent).toFixed(1)
  );

  const rejectionsPreventedCount = Math.max(
    0,
    fifoPlan.rejections.length - fefoPlan.rejections.length
  );

  return {
    fefoPlan,
    fifoPlan,
    deltas: {
      profitUpliftUsd,
      profitUpliftPercent,
      spoilagePreventedDeltaKg,
      spoilagePreventedDeltaUsd,
      slaComplianceDeltaPercent,
      demandFillRateDeltaPercent,
      rejectionsPreventedCount,
    },
  };
}
