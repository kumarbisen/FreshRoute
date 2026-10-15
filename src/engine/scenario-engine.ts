/**
/**
 * FreshRoute Distribution Planning Engine - Scenario Lab & Sensitivity Simulator
 * Pure TypeScript module for evaluating operational disruptions, capacity shocks,
 * demand fluctuations, price changes, and shelf-life decay without mutating base plans.
 */

import Decimal from "decimal.js";
import {
  AllocationReasonCode,
  EconomicLedger,
  EngineAllocation,
  EngineDemandOrder,
  EngineInventoryBatch,
  EnginePlannerInput,
  EnginePlanOutput,
  EngineSolverConfig,
  EngineTransportRoute,
  ScenarioEvaluationRun,
  StrategyOutcomeWinner,
} from "./contracts";
import { evaluateScenario, safePercentageChange } from "./evaluator";
import { computeCanonicalInputSnapshotHash, FRESHROUTE_ENGINE_VERSION } from "./planner";
import { computeSeverity, BatchPerishabilitySeverity } from "./discount-engine";

export const SCENARIO_ENGINE_VERSION = "v1.0.0-scenario-lab";

// ============================================================================
// 1. SCENARIO CONFIGURATION & OVERRIDE CONTRACTS
// ============================================================================

export interface ScenarioOverrides {
  // 1. Transit & Route Disruptions
  transitDelayPercent?: number; // e.g. +30% transit duration across carrier routes
  transitDelayHours?: number; // e.g. +2.5 hours highway congestion
  disabledRouteIds?: string[]; // Carrier routes shut down or cancelled
  routeTransitOverrides?: Record<string, number>; // routeId -> specific transit hours

  // 2. Destination Demand Shocks
  demandMultiplierPercent?: number; // e.g. 80% (20% demand drop)
  demandOverrides?: Record<string, number>; // demandId -> specific requestedQuantityKg
  disabledDemandIds?: string[]; // Cancelled buyer orders

  // 3. Wholesale & Contract Price Shifts
  priceMultiplierPercent?: number; // e.g. 90% (10% market price slump)
  priceOverrides?: Record<string, number>; // demandId -> specific contractedPricePerKgUsd

  // 4. Vehicle & Fleet Capacity Reductions
  capacityMultiplierPercent?: number; // e.g. 70% fleet payload capacity constraint
  capacityOverrides?: Record<string, number>; // routeId -> specific capacityKg

  // 5. Shelf-Life Decay & Temperature Stress
  shelfLifeReductionPercent?: number; // e.g. 25% shelf-life acceleration from harvest heat
  shelfLifeReductionHours?: number; // e.g. -12 hours shelf-life shock
  storageTempIncreaseCelsius?: number; // e.g. +3.0°C ambient storage temperature rise

  // 6. Solver Config Overrides (optional)
  solverConfig?: EngineSolverConfig;
}

export interface AllocationDiffItem {
  batchId: string;
  batchCode: string;
  commodityName: string;
  destinationId: string;
  destinationName: string;
  routeId: string;
  routeCode: string;
  type: "UNCHANGED" | "MODIFIED" | "DROPPED" | "NEW";
  baseQuantityKg: number;
  scenarioQuantityKg: number;
  quantityDeltaKg: number;
  baseEffectivePrice: number;
  scenarioEffectivePrice: number;
  baseNetMarginUsd: number;
  scenarioNetMarginUsd: number;
  marginDeltaUsd: number;
  rejectionReasonCode?: string;
  rejectionReasonExplanation?: string;
}

export interface NewlyInfeasibleDelivery {
  batchId: string;
  batchCode: string;
  commodityName: string;
  destinationId: string;
  destinationName: string;
  routeId: string;
  routeCode: string;
  baseAllocatedKg: number;
  reasonCode: string;
  reasonExplanation: string;
}

export interface BatchUrgencyMigration {
  batchId: string;
  batchCode: string;
  commodityName: string;
  initialQuantityKg: number;
  baseRslDays: number;
  scenarioRslDays: number;
  baseSeverity: BatchPerishabilitySeverity;
  scenarioSeverity: BatchPerishabilitySeverity;
  isUrgencyEscalated: boolean;
}

export interface ScenarioComparisonDeltas {
  // Operational Mass Deltas
  baseAllocatedKg: number;
  scenarioAllocatedKg: number;
  allocatedKgDelta: number;
  allocatedKgDeltaPercent: number;

  baseSpoilageKg: number;
  scenarioSpoilageKg: number;
  spoilageKgDelta: number;
  spoilageKgDeltaPercent: number;

  baseFulfillmentKg: number;
  scenarioFulfillmentKg: number;
  fulfillmentKgDelta: number;
  fulfillmentRateDeltaPercent: number;

  // Financial Deltas
  baseRevenueUsd: number;
  scenarioRevenueUsd: number;
  revenueDeltaUsd: number;
  revenueDeltaPercent: number;

  baseTransportCostUsd: number;
  scenarioTransportCostUsd: number;
  transportCostDeltaUsd: number;

  baseDisposalCostUsd: number;
  scenarioDisposalCostUsd: number;
  disposalCostDeltaUsd: number;

  baseNetProfitUsd: number;
  scenarioNetProfitUsd: number;
  netProfitDeltaUsd: number;
  netProfitDeltaPercent: number;

  // Counts
  baseAllocationsCount: number;
  scenarioAllocationsCount: number;
  droppedAllocationsCount: number;
  newAllocationsCount: number;
  newlyInfeasibleCount: number;
  urgentBatchesEscalatedCount: number;

  executiveSummary: string;
}

export interface ScenarioEvaluationResult {
  scenarioId: string;
  name: string;
  description: string;
  basePlanId: string;
  executionTimestamp: string;
  engineVersion: string;
  evaluatorVersion: string;
  baseSnapshotHash: string;
  scenarioSnapshotHash: string;
  overrides: ScenarioOverrides;
  scenarioRun: ScenarioEvaluationRun;
  deltas: ScenarioComparisonDeltas;
  allocationDiffs: AllocationDiffItem[];
  newlyInfeasibleDeliveries: NewlyInfeasibleDelivery[];
  urgencyMigrations: BatchUrgencyMigration[];
  governance: {
    basePlanPreserved: boolean;
    deterministicMethodology: string;
    disclaimer: string;
  };
}

export type SensitivityParameter =
  | "transitDelayPercent"
  | "shelfLifeReductionPercent"
  | "demandMultiplierPercent"
  | "capacityMultiplierPercent"
  | "priceMultiplierPercent";

export interface SensitivityPoint {
  parameterValue: number;
  label: string;
  profitUsd: number;
  profitDeltaUsd: number;
  spoilageKg: number;
  spoilageDeltaKg: number;
  fulfillmentKg: number;
  fulfillmentPercent: number;
  allocationsCount: number;
  newlyInfeasibleCount: number;
}

export interface SensitivityResult {
  parameter: SensitivityParameter;
  parameterName: string;
  parameterUnit: string;
  points: SensitivityPoint[];
  worstCasePoint: SensitivityPoint;
  bestCasePoint: SensitivityPoint;
  profitSensitivitySlopeUsdPerUnit: number;
  disclaimer: string;
}

// ============================================================================
// 2. INPUT OVERRIDE PIPELINE (IMMUTABLE CLONING)
// ============================================================================

/**
 * Deeply clones and applies validated scenario parameter overrides to an immutable
 * EnginePlannerInput contract. Preserves all schema invariants and guarantees the
 * base input remains 100% unmutated.
 */
export function applyScenarioOverrides(
  baseInput: EnginePlannerInput,
  overrides: ScenarioOverrides = {}
): EnginePlannerInput {
  const now = baseInput.config?.planningTime ? new Date(baseInput.config.planningTime) : new Date();

  // 1. Clone & Override Batches
  const clonedBatches: EngineInventoryBatch[] = baseInput.batches.map((b) => {
    let expiryDate = new Date(b.expiryDate);
    const harvestDate = new Date(b.harvestDate);

    // Apply shelf-life reduction percent
    if (overrides.shelfLifeReductionPercent && overrides.shelfLifeReductionPercent > 0) {
      const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
      const reductionFactor = Math.min(1.0, overrides.shelfLifeReductionPercent / 100);
      const newRemainingMs = remainingMs * (1 - reductionFactor);
      expiryDate = new Date(now.getTime() + newRemainingMs);
    }

    // Apply shelf-life reduction hours
    if (overrides.shelfLifeReductionHours && overrides.shelfLifeReductionHours > 0) {
      const reductionMs = overrides.shelfLifeReductionHours * 3600 * 1000;
      expiryDate = new Date(Math.max(harvestDate.getTime(), expiryDate.getTime() - reductionMs));
    }

    // Apply storage temperature increase
    let storageTemp = Number(b.storageTempCelsius);
    if (overrides.storageTempIncreaseCelsius) {
      storageTemp += overrides.storageTempIncreaseCelsius;
    }

    return {
      ...b,
      expiryDate: expiryDate.toISOString(),
      storageTempCelsius: storageTemp,
    };
  });

  // 2. Clone & Override Demands
  const disabledDemands = new Set(overrides.disabledDemandIds || []);
  const demandMult =
    overrides.demandMultiplierPercent !== undefined
      ? Math.max(0, overrides.demandMultiplierPercent / 100)
      : 1.0;
  const priceMult =
    overrides.priceMultiplierPercent !== undefined
      ? Math.max(0, overrides.priceMultiplierPercent / 100)
      : 1.0;

  const clonedDemands: EngineDemandOrder[] = baseInput.demands.map((d) => {
    let reqQty = new Decimal(d.requestedQuantityKg).times(demandMult);
    if (disabledDemands.has(d.id)) {
      reqQty = new Decimal(0);
    } else if (overrides.demandOverrides && overrides.demandOverrides[d.id] !== undefined) {
      reqQty = new Decimal(Math.max(0, overrides.demandOverrides[d.id]));
    }

    let price = new Decimal(d.contractedPricePerKgUsd).times(priceMult);
    if (overrides.priceOverrides && overrides.priceOverrides[d.id] !== undefined) {
      price = new Decimal(Math.max(0, overrides.priceOverrides[d.id]));
    }

    return {
      ...d,
      requestedQuantityKg: Number(reqQty.toFixed(2)),
      contractedPricePerKgUsd: Number(price.toFixed(2)),
    };
  });

  // 3. Clone & Override Routes
  const disabledRoutes = new Set(overrides.disabledRouteIds || []);
  const transitDelayMult =
    overrides.transitDelayPercent !== undefined
      ? Math.max(0, 1 + overrides.transitDelayPercent / 100)
      : 1.0;
  const delayHours = overrides.transitDelayHours || 0;
  const capacityMult =
    overrides.capacityMultiplierPercent !== undefined
      ? Math.max(0, overrides.capacityMultiplierPercent / 100)
      : 1.0;

  const clonedRoutes: EngineTransportRoute[] = baseInput.routes.map((r) => {
    // Transit duration calculation
    let transitHours = (Number(r.transitDurationHours) + delayHours) * transitDelayMult;
    if (overrides.routeTransitOverrides && overrides.routeTransitOverrides[r.id] !== undefined) {
      transitHours = Math.max(0.1, overrides.routeTransitOverrides[r.id]);
    }

    // Capacity calculation
    let capacity = new Decimal(r.capacityKg).times(capacityMult);
    if (disabledRoutes.has(r.id)) {
      capacity = new Decimal(0);
    } else if (overrides.capacityOverrides && overrides.capacityOverrides[r.id] !== undefined) {
      capacity = new Decimal(Math.max(0, overrides.capacityOverrides[r.id]));
    }

    return {
      ...r,
      transitDurationHours: Number(transitHours.toFixed(2)),
      capacityKg: Number(capacity.toFixed(2)),
    };
  });

  // 4. Clone Commodities & Destinations
  const clonedCommodities = baseInput.commodities.map((c) => ({ ...c }));
  const clonedDestinations = baseInput.destinations.map((d) => ({ ...d }));

  // 5. Merge Config Overrides
  const mergedConfig: EngineSolverConfig = {
    ...(baseInput.config || {}),
    ...(overrides.solverConfig || {}),
  };

  return {
    batches: clonedBatches,
    commodities: clonedCommodities,
    destinations: clonedDestinations,
    demands: clonedDemands,
    routes: clonedRoutes,
    config: mergedConfig,
  };
}

// ============================================================================
// 3. SCENARIO DIFF & ALLOCATION COMPARISON
// ============================================================================

/**
 * Computes deep differences between a base plan and an evaluated scenario plan.
 */
export function calculateScenarioDiffs(
  basePlan: EnginePlanOutput,
  scenarioPlan: EnginePlanOutput,
  baseLedger: EconomicLedger,
  scenarioLedger: EconomicLedger,
  baseInput: EnginePlannerInput,
  scenarioInput: EnginePlannerInput
): {
  deltas: ScenarioComparisonDeltas;
  allocationDiffs: AllocationDiffItem[];
  newlyInfeasibleDeliveries: NewlyInfeasibleDelivery[];
  urgencyMigrations: BatchUrgencyMigration[];
} {
  const destMap = new Map(baseInput.destinations.map((d) => [d.id, d.name]));
  const commMap = new Map(baseInput.commodities.map((c) => [c.id, c.name]));
  const batchMap = new Map(baseInput.batches.map((b) => [b.id, b]));

  // Index base allocations by unique tuple key: batchId__demandId
  const baseAllocMap = new Map<string, EngineAllocation>();
  for (const a of basePlan.allocations) {
    const key = `${a.batchId}__${a.demandOrderId}`;
    baseAllocMap.set(key, a);
  }

  // Index scenario allocations by unique tuple key: batchId__demandId
  const scenAllocMap = new Map<string, EngineAllocation>();
  for (const a of scenarioPlan.allocations) {
    const key = `${a.batchId}__${a.demandOrderId}`;
    scenAllocMap.set(key, a);
  }

  // Index scenario rejections for rapid lookup
  const scenRejectionMap = new Map<string, { reasonCode: string; reasonExplanation: string }>();
  for (const rej of scenarioPlan.rejections) {
    const key = `${rej.batchId}__${rej.demandOrderId}`;
    scenRejectionMap.set(key, {
      reasonCode: rej.reasonCode,
      reasonExplanation: rej.reasonExplanation,
    });
  }

  const allKeys = new Set<string>([...baseAllocMap.keys(), ...scenAllocMap.keys()]);
  const allocationDiffs: AllocationDiffItem[] = [];
  const newlyInfeasibleDeliveries: NewlyInfeasibleDelivery[] = [];

  let droppedCount = 0;
  let newCount = 0;

  for (const key of allKeys) {
    const baseAlloc = baseAllocMap.get(key);
    const scenAlloc = scenAllocMap.get(key);

    const [batchId, demandId] = key.split("__");
    const batch = batchMap.get(batchId);
    const commodityName = batch ? commMap.get(batch.commodityId) || "Perishable Produce" : "Produce";
    const destName = baseAlloc?.destinationId
      ? destMap.get(baseAlloc.destinationId) || "Destination"
      : scenAlloc?.destinationId
      ? destMap.get(scenAlloc.destinationId) || "Destination"
      : "Destination";

    if (baseAlloc && !scenAlloc) {
      // DROPPED ALLOCATION
      droppedCount++;
      const rejection = scenRejectionMap.get(key) || {
        reasonCode: AllocationReasonCode.REJECTED_INSUFFICIENT_SHELF_LIFE,
        reasonExplanation: "Delivery became infeasible under scenario constraints.",
      };

      allocationDiffs.push({
        batchId,
        batchCode: baseAlloc.batchCode,
        commodityName,
        destinationId: baseAlloc.destinationId,
        destinationName: destName,
        routeId: baseAlloc.routeId,
        routeCode: baseAlloc.routeCode,
        type: "DROPPED",
        baseQuantityKg: Number(baseAlloc.allocatedQuantityKg),
        scenarioQuantityKg: 0,
        quantityDeltaKg: -Number(baseAlloc.allocatedQuantityKg),
        baseEffectivePrice: Number(baseAlloc.effectivePricePerKgUsd),
        scenarioEffectivePrice: 0,
        baseNetMarginUsd: Number(baseAlloc.netMarginUsd),
        scenarioNetMarginUsd: 0,
        marginDeltaUsd: -Number(baseAlloc.netMarginUsd),
        rejectionReasonCode: rejection.reasonCode,
        rejectionReasonExplanation: rejection.reasonExplanation,
      });

      newlyInfeasibleDeliveries.push({
        batchId,
        batchCode: baseAlloc.batchCode,
        commodityName,
        destinationId: baseAlloc.destinationId,
        destinationName: destName,
        routeId: baseAlloc.routeId,
        routeCode: baseAlloc.routeCode,
        baseAllocatedKg: Number(baseAlloc.allocatedQuantityKg),
        reasonCode: rejection.reasonCode,
        reasonExplanation: rejection.reasonExplanation,
      });
    } else if (!baseAlloc && scenAlloc) {
      // NEW ALLOCATION
      newCount++;
      allocationDiffs.push({
        batchId,
        batchCode: scenAlloc.batchCode,
        commodityName,
        destinationId: scenAlloc.destinationId,
        destinationName: destName,
        routeId: scenAlloc.routeId,
        routeCode: scenAlloc.routeCode,
        type: "NEW",
        baseQuantityKg: 0,
        scenarioQuantityKg: Number(scenAlloc.allocatedQuantityKg),
        quantityDeltaKg: Number(scenAlloc.allocatedQuantityKg),
        baseEffectivePrice: 0,
        scenarioEffectivePrice: Number(scenAlloc.effectivePricePerKgUsd),
        baseNetMarginUsd: 0,
        scenarioNetMarginUsd: Number(scenAlloc.netMarginUsd),
        marginDeltaUsd: Number(scenAlloc.netMarginUsd),
      });
    } else if (baseAlloc && scenAlloc) {
      // UNCHANGED OR MODIFIED
      const baseQty = Number(baseAlloc.allocatedQuantityKg);
      const scenQty = Number(scenAlloc.allocatedQuantityKg);
      const isModified = Math.abs(baseQty - scenQty) > 0.01;

      allocationDiffs.push({
        batchId,
        batchCode: baseAlloc.batchCode,
        commodityName,
        destinationId: baseAlloc.destinationId,
        destinationName: destName,
        routeId: scenAlloc.routeId,
        routeCode: scenAlloc.routeCode,
        type: isModified ? "MODIFIED" : "UNCHANGED",
        baseQuantityKg: baseQty,
        scenarioQuantityKg: scenQty,
        quantityDeltaKg: Number((scenQty - baseQty).toFixed(2)),
        baseEffectivePrice: Number(baseAlloc.effectivePricePerKgUsd),
        scenarioEffectivePrice: Number(scenAlloc.effectivePricePerKgUsd),
        baseNetMarginUsd: Number(baseAlloc.netMarginUsd),
        scenarioNetMarginUsd: Number(scenAlloc.netMarginUsd),
        marginDeltaUsd: Number((Number(scenAlloc.netMarginUsd) - Number(baseAlloc.netMarginUsd)).toFixed(2)),
      });
    }
  }

  // 2. Batch Urgency Migrations
  const now = baseInput.config?.planningTime ? new Date(baseInput.config.planningTime) : new Date();
  const urgencyMigrations: BatchUrgencyMigration[] = [];
  let urgentEscalatedCount = 0;

  for (let i = 0; i < baseInput.batches.length; i++) {
    const baseB = baseInput.batches[i];
    const scenB = scenarioInput.batches[i] || baseB;

    const baseExp = new Date(baseB.expiryDate);
    const scenExp = new Date(scenB.expiryDate);

    const baseRsl = Math.max(0, (baseExp.getTime() - now.getTime()) / (24 * 3600 * 1000));
    const scenRsl = Math.max(0, (scenExp.getTime() - now.getTime()) / (24 * 3600 * 1000));

    const baseSev = computeSeverity(baseRsl);
    const scenSev = computeSeverity(scenRsl);

    const sevRanks: Record<BatchPerishabilitySeverity, number> = {
      STABLE: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
      EXPIRED: 5,
    };

    const isEscalated = sevRanks[scenSev] > sevRanks[baseSev];
    if (isEscalated) {
      urgentEscalatedCount++;
    }

    urgencyMigrations.push({
      batchId: baseB.id,
      batchCode: baseB.batchCode,
      commodityName: baseB.commodityName || commMap.get(baseB.commodityId) || "Produce",
      initialQuantityKg: Number(baseB.availableQuantityKg),
      baseRslDays: Number(baseRsl.toFixed(2)),
      scenarioRslDays: Number(scenRsl.toFixed(2)),
      baseSeverity: baseSev,
      scenarioSeverity: scenSev,
      isUrgencyEscalated: isEscalated,
    });
  }

  // 3. Macro Deltas
  const baseAllocKg = Number(baseLedger.soldQuantityKg || 0);
  const scenAllocKg = Number(scenarioLedger.soldQuantityKg || 0);
  const allocDeltaKg = Number((scenAllocKg - baseAllocKg).toFixed(2));
  const allocDeltaPct = safePercentageChange(scenAllocKg, baseAllocKg);

  const baseSpoilKg = Number(baseLedger.spoiledExpiredStockKg || 0);
  const scenSpoilKg = Number(scenarioLedger.spoiledExpiredStockKg || 0);
  const spoilDeltaKg = Number((scenSpoilKg - baseSpoilKg).toFixed(2));
  const spoilDeltaPct = safePercentageChange(scenSpoilKg, baseSpoilKg);

  const baseFulfilKg = Number(baseLedger.fulfilledDemandKg || 0);
  const scenFulfilKg = Number(scenarioLedger.fulfilledDemandKg || 0);
  const fulfilDeltaKg = Number((scenFulfilKg - baseFulfilKg).toFixed(2));
  const fulfilRateDeltaPct = Number(
    (Number(scenarioLedger.fulfillmentRatePercent || 0) - Number(baseLedger.fulfillmentRatePercent || 0)).toFixed(2)
  );

  const baseRev = Number(baseLedger.realizedSalesRevenueUsd || 0);
  const scenRev = Number(scenarioLedger.realizedSalesRevenueUsd || 0);
  const revDelta = Number((scenRev - baseRev).toFixed(2));
  const revDeltaPct = safePercentageChange(scenRev, baseRev);

  const baseTrans = Number(baseLedger.incurredTransportTotalCostUsd || 0);
  const scenTrans = Number(scenarioLedger.incurredTransportTotalCostUsd || 0);
  const transDelta = Number((scenTrans - baseTrans).toFixed(2));

  const baseDisp = Number(baseLedger.incurredDisposalPenaltyUsd || 0);
  const scenDisp = Number(scenarioLedger.incurredDisposalPenaltyUsd || 0);
  const dispDelta = Number((scenDisp - baseDisp).toFixed(2));

  const baseProfit = Number(baseLedger.netEconomicOutcomeUsd || 0);
  const scenProfit = Number(scenarioLedger.netEconomicOutcomeUsd || 0);
  const profitDelta = Number((scenProfit - baseProfit).toFixed(2));
  const profitDeltaPct = safePercentageChange(scenProfit, baseProfit);

  let summary = "";
  if (profitDelta < -0.05) {
    summary = `Scenario disruptions reduced net operating profit by $${Math.abs(profitDelta).toLocaleString(
      "en-US",
      { minimumFractionDigits: 2 }
    )} (${profitDeltaPct}%). ${spoilDeltaKg > 0 ? `Perishable spoilage increased by ${spoilDeltaKg.toLocaleString()} kg.` : ""} ${droppedCount} delivery allocations were rendered infeasible.`;
  } else if (profitDelta > 0.05) {
    summary = `Scenario conditions improved net operating profit by +$${profitDelta.toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })} (+${profitDeltaPct}%).`;
  } else {
    summary = `Scenario produced identical net profit ($${scenProfit.toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}) with zero delta in spoilage or demand fulfillment.`;
  }

  const deltas: ScenarioComparisonDeltas = {
    baseAllocatedKg: baseAllocKg,
    scenarioAllocatedKg: scenAllocKg,
    allocatedKgDelta: allocDeltaKg,
    allocatedKgDeltaPercent: allocDeltaPct,

    baseSpoilageKg: baseSpoilKg,
    scenarioSpoilageKg: scenSpoilKg,
    spoilageKgDelta: spoilDeltaKg,
    spoilageKgDeltaPercent: spoilDeltaPct,

    baseFulfillmentKg: baseFulfilKg,
    scenarioFulfillmentKg: scenFulfilKg,
    fulfillmentKgDelta: fulfilDeltaKg,
    fulfillmentRateDeltaPercent: fulfilRateDeltaPct,

    baseRevenueUsd: baseRev,
    scenarioRevenueUsd: scenRev,
    revenueDeltaUsd: revDelta,
    revenueDeltaPercent: revDeltaPct,

    baseTransportCostUsd: baseTrans,
    scenarioTransportCostUsd: scenTrans,
    transportCostDeltaUsd: transDelta,

    baseDisposalCostUsd: baseDisp,
    scenarioDisposalCostUsd: scenDisp,
    disposalCostDeltaUsd: dispDelta,

    baseNetProfitUsd: baseProfit,
    scenarioNetProfitUsd: scenProfit,
    netProfitDeltaUsd: profitDelta,
    netProfitDeltaPercent: profitDeltaPct,

    baseAllocationsCount: basePlan.allocations.length,
    scenarioAllocationsCount: scenarioPlan.allocations.length,
    droppedAllocationsCount: droppedCount,
    newAllocationsCount: newCount,
    newlyInfeasibleCount: newlyInfeasibleDeliveries.length,
    urgentBatchesEscalatedCount: urgentEscalatedCount,

    executiveSummary: summary,
  };

  return {
    deltas,
    allocationDiffs,
    newlyInfeasibleDeliveries,
    urgencyMigrations,
  };
}

// ============================================================================
// 4. HIGH-LEVEL SCENARIO LAB EXECUTION RUNNER
// ============================================================================

/**
 * Executes a complete Scenario Lab run against a base plan input snapshot.
 * Reuses the existing planning engine and economic evaluator without mutating the base plan.
 */
export function executeScenarioRun(
  basePlanId: string,
  basePlanOutput: EnginePlanOutput,
  basePlannerInput: EnginePlannerInput,
  overrides: ScenarioOverrides,
  meta: { name: string; description: string; scenarioId?: string }
): ScenarioEvaluationResult {
  const scenarioId = meta.scenarioId || `scen-${Date.now().toString(36)}`;
  const executionTimestamp = new Date().toISOString();

  // 1. Snapshot Hashes
  const baseSnapshotHash = computeCanonicalInputSnapshotHash(basePlannerInput);

  // 2. Apply Overrides (Immutable Cloning)
  const scenarioInput = applyScenarioOverrides(basePlannerInput, overrides);
  const scenarioSnapshotHash = computeCanonicalInputSnapshotHash(scenarioInput);

  // 3. Execute Scenario Plan & Economic Ledgers via Existing Pipeline
  const effectiveConfig = overrides.solverConfig || basePlanOutput.config || basePlannerInput.config;
  const effectivePlanningTime = effectiveConfig?.planningTime;

  const scenarioRun = evaluateScenario(scenarioInput, {
    config: effectiveConfig,
  });

  // Evaluate Base Plan Ledger against original inputs
  const baseLedger = evaluateScenario(basePlannerInput, {
    config: basePlanOutput.config || basePlannerInput.config,
  }).freshRouteLedger;

  // 4. Calculate Comprehensive Diffs
  const diffs = calculateScenarioDiffs(
    basePlanOutput,
    scenarioRun.freshRoutePlan,
    baseLedger,
    scenarioRun.freshRouteLedger,
    basePlannerInput,
    scenarioInput
  );

  return {
    scenarioId,
    name: meta.name,
    description: meta.description,
    basePlanId,
    executionTimestamp,
    engineVersion: FRESHROUTE_ENGINE_VERSION,
    evaluatorVersion: FRESHROUTE_ENGINE_VERSION,
    baseSnapshotHash,
    scenarioSnapshotHash,
    overrides,
    scenarioRun,
    deltas: diffs.deltas,
    allocationDiffs: diffs.allocationDiffs,
    newlyInfeasibleDeliveries: diffs.newlyInfeasibleDeliveries,
    urgencyMigrations: diffs.urgencyMigrations,
    governance: {
      basePlanPreserved: true,
      deterministicMethodology:
        "Input overrides applied to canonical immutable snapshot; evaluated via deterministic FEFO engine and shared economic ledger.",
      disclaimer:
        "Deterministic Scenario Simulation: Metrics reflect mathematical optimization outcomes under isolated parameter modifications. Results do not constitute empirical or probabilistic market forecasts.",
    },
  };
}

// ============================================================================
// 5. DETERMINISTIC SENSITIVITY ANALYSIS SWEEP
// ============================================================================

/**
 * Runs a deterministic sensitivity sweep across a discrete operational parameter range.
 */
export function runSensitivityAnalysis(
  basePlannerInput: EnginePlannerInput,
  basePlanOutput: EnginePlanOutput,
  parameter: SensitivityParameter,
  rangeValues: number[],
  baseOverrides: ScenarioOverrides = {}
): SensitivityResult {
  const points: SensitivityPoint[] = [];

  const paramUnits: Record<SensitivityParameter, { name: string; unit: string }> = {
    transitDelayPercent: { name: "Transit Delay", unit: "%" },
    shelfLifeReductionPercent: { name: "Shelf-Life Reduction", unit: "%" },
    demandMultiplierPercent: { name: "Demand Multiplier", unit: "%" },
    capacityMultiplierPercent: { name: "Fleet Capacity Multiplier", unit: "%" },
    priceMultiplierPercent: { name: "Market Price Multiplier", unit: "%" },
  };

  const effectiveConfig = basePlanOutput.config || basePlannerInput.config;
  const effectivePlanningTime = effectiveConfig?.planningTime;

  const baseLedger = evaluateScenario(basePlannerInput, {
    config: effectiveConfig,
  }).freshRouteLedger;

  const baseProfit = Number(baseLedger.netEconomicOutcomeUsd || 0);
  const baseSpoilage = Number(baseLedger.spoiledExpiredStockKg || 0);

  for (const val of rangeValues) {
    const stepOverrides: ScenarioOverrides = {
      ...baseOverrides,
      [parameter]: val,
    };

    const modifiedInput = applyScenarioOverrides(basePlannerInput, stepOverrides);
    const run = evaluateScenario(modifiedInput, {
      config: effectiveConfig,
    });

    const stepLedger = run.freshRouteLedger;
    const profit = Number(stepLedger.netEconomicOutcomeUsd || 0);
    const spoilage = Number(stepLedger.spoiledExpiredStockKg || 0);
    const fulfillmentKg = Number(stepLedger.fulfilledDemandKg || 0);
    const fulfillmentPct = Number(stepLedger.fulfillmentRatePercent || 0);

    // Count newly infeasible
    const diff = calculateScenarioDiffs(
      basePlanOutput,
      run.freshRoutePlan,
      baseLedger,
      stepLedger,
      basePlannerInput,
      modifiedInput
    );

    points.push({
      parameterValue: val,
      label: `${val}${paramUnits[parameter].unit}`,
      profitUsd: profit,
      profitDeltaUsd: Number((profit - baseProfit).toFixed(2)),
      spoilageKg: spoilage,
      spoilageDeltaKg: Number((spoilage - baseSpoilage).toFixed(2)),
      fulfillmentKg,
      fulfillmentPercent: fulfillmentPct,
      allocationsCount: run.freshRoutePlan.allocations.length,
      newlyInfeasibleCount: diff.newlyInfeasibleDeliveries.length,
    });
  }

  // Find best and worst case points
  let best = points[0];
  let worst = points[0];
  for (const p of points) {
    if (p.profitUsd > best.profitUsd) best = p;
    if (p.profitUsd < worst.profitUsd) worst = p;
  }

  // Calculate linear sensitivity slope (USD profit change per parameter unit)
  const first = points[0];
  const last = points[points.length - 1];
  const deltaX = last.parameterValue - first.parameterValue;
  const slope = deltaX !== 0 ? (last.profitUsd - first.profitUsd) / deltaX : 0;

  return {
    parameter,
    parameterName: paramUnits[parameter].name,
    parameterUnit: paramUnits[parameter].unit,
    points,
    worstCasePoint: worst,
    bestCasePoint: best,
    profitSensitivitySlopeUsdPerUnit: Number(slope.toFixed(2)),
    disclaimer:
      "Deterministic Sensitivity Sweep: Outcome values reflect exact optimization outputs across isolated parameter steps. This is a deterministic sensitivity analysis and must not be interpreted as a validated probabilistic confidence interval.",
  };
}
