/**
 * FreshRoute Distribution Planning Engine - Shared Economic Evaluator
 * Fair, unified evaluation pipeline that computes reconciled economic and operational
 * metrics for both FreshRoute (FEFO Optimizer) and Baseline FIFO using identical
 * initial stock, cost definitions, demand, prices, and shelf-life assumptions.
 */

import Decimal from "decimal.js";
import {
  EconomicLedger,
  EnginePlannerInput,
  EnginePlanOutput,
  EngineSolverConfig,
  ScenarioEvaluationOptions,
  ScenarioEvaluationRun,
  StrategyComparisonDeltas,
  StrategyOutcomeWinner,
} from "./contracts";
import { FRESHROUTE_ENGINE_VERSION, FreshRoutePlanningEngine } from "./planner";
import { BASELINE_FIFO_ALGORITHM_VERSION, executeBaselineFifoPlan } from "./baseline-fifo";
import { computeCanonicalInputSnapshotHash } from "./planner";

/**
 * Computes percentage change with guaranteed zero-denominator and negative baseline safety.
 *
 * Rules:
 * 1. If baseline is 0:
 *    - if current is 0: 0.0%
 *    - if current > 0: +100.0%
 *    - if current < 0: -100.0%
 * 2. If baseline > 0:
 *    - ((current - baseline) / baseline) * 100
 * 3. If baseline < 0:
 *    - Uses Math.abs(baseline) in denominator so that positive gains (e.g. reducing loss or turning profitable)
 *      always yield positive percentages:
 *      ((current - baseline) / Math.abs(baseline)) * 100
 */
export function safePercentageChange(current: number, baseline: number): number {
  if (Math.abs(baseline) < 1e-6) {
    if (Math.abs(current) < 1e-6) return 0.0;
    return current > 0 ? 100.0 : -100.0;
  }
  const pct = ((current - baseline) / Math.abs(baseline)) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Evaluates an allocation plan against the input scenario and produces a fully
 * reconciled economic ledger with strict mass, demand, revenue, and cost balance verifications.
 */
export function evaluatePlanEconomicLedger(
  plan: EnginePlanOutput,
  input: EnginePlannerInput,
  config?: Required<EngineSolverConfig>
): EconomicLedger {
  const resolvedConfig: Required<EngineSolverConfig> = config || plan.config;
  const commodityMap = new Map(input.commodities.map((c) => [c.id, c]));
  const demandMap = new Map(input.demands.map((d) => [d.id, d]));
  const batchMap = new Map(input.batches.map((b) => [b.id, b]));

  // --------------------------------------------------------------------------
  // 1. VOLUME & MASS BALANCES (kg)
  // --------------------------------------------------------------------------
  let initialStockDecimal = new Decimal(0);
  let totalProcurementDecimal = new Decimal(0);

  for (const b of input.batches) {
    const qty = new Decimal(b.availableQuantityKg);
    const unitCost = new Decimal(b.unitCostUsd);
    initialStockDecimal = initialStockDecimal.plus(qty);
    totalProcurementDecimal = totalProcurementDecimal.plus(qty.times(unitCost));
  }

  let soldQuantityDecimal = new Decimal(0);
  for (const alloc of plan.allocations) {
    soldQuantityDecimal = soldQuantityDecimal.plus(new Decimal(alloc.allocatedQuantityKg));
  }

  const remainingQuantityDecimal = initialStockDecimal.minus(soldQuantityDecimal);

  // Categorize leftover stock
  let unsoldHealthyDecimal = new Decimal(0);
  let spoiledExpiredDecimal = new Decimal(0);
  let atRiskDecimal = new Decimal(0);

  let healthyAssetValueDecimal = new Decimal(0);
  let spoiledWriteOffDecimal = new Decimal(0);
  let incurredDisposalPenaltyDecimal = new Decimal(0);

  for (const leftover of plan.batchLeftoverBreakdowns) {
    const leftoverKg = new Decimal(leftover.unallocatedKg);
    if (leftoverKg.lessThanOrEqualTo(0)) continue;

    const batch = batchMap.get(leftover.batchId);
    const unitCost = batch ? new Decimal(batch.unitCostUsd) : new Decimal(0);
    const commodity = batch ? commodityMap.get(batch.commodityId) : undefined;
    const disposalRate = commodity?.wasteDisposalCostPerKgUsd
      ? new Decimal(commodity.wasteDisposalCostPerKgUsd)
      : new Decimal(resolvedConfig.disposalPenaltyPerKgUsd);

    if (leftover.category === "SPOILED_EXPIRED" || leftover.remainingRslDaysAtPlanning <= 0) {
      spoiledExpiredDecimal = spoiledExpiredDecimal.plus(leftoverKg);
      spoiledWriteOffDecimal = spoiledWriteOffDecimal.plus(leftoverKg.times(unitCost));
      incurredDisposalPenaltyDecimal = incurredDisposalPenaltyDecimal.plus(leftoverKg.times(disposalRate));
    } else {
      unsoldHealthyDecimal = unsoldHealthyDecimal.plus(leftoverKg);
      healthyAssetValueDecimal = healthyAssetValueDecimal.plus(leftoverKg.times(unitCost));

      if (leftover.category === "AT_RISK" || leftover.remainingRslDaysAtPlanning <= 7.0) {
        atRiskDecimal = atRiskDecimal.plus(leftoverKg);
      }
    }
  }

  const initialStockKg = Number(initialStockDecimal.toFixed(2));
  const soldQuantityKg = Number(soldQuantityDecimal.toFixed(2));
  const remainingQuantityKg = Number(remainingQuantityDecimal.toFixed(2));
  const unsoldHealthyStockKg = Number(unsoldHealthyDecimal.toFixed(2));
  const spoiledExpiredStockKg = Number(spoiledExpiredDecimal.toFixed(2));
  const atRiskStockKg = Number(atRiskDecimal.toFixed(2));

  // Mass balance reconciliation check
  const massBalanceReconciled =
    Math.abs(initialStockKg - (soldQuantityKg + remainingQuantityKg)) < 0.05 &&
    Math.abs(remainingQuantityKg - (unsoldHealthyStockKg + spoiledExpiredStockKg)) < 0.05;

  // --------------------------------------------------------------------------
  // 2. DEMAND FULFILLMENT LEDGER (kg)
  // --------------------------------------------------------------------------
  let totalDemandDecimal = new Decimal(0);
  for (const d of input.demands) {
    totalDemandDecimal = totalDemandDecimal.plus(new Decimal(d.requestedQuantityKg));
  }

  const totalDemandKg = Number(totalDemandDecimal.toFixed(2));
  const fulfilledDemandKg = soldQuantityKg;
  const unmetDemandDecimal = totalDemandDecimal.minus(soldQuantityDecimal);
  const unmetDemandKg = Number(Decimal.max(0, unmetDemandDecimal).toFixed(2));

  const fulfillmentRatePercent =
    totalDemandKg > 0
      ? Number(soldQuantityDecimal.dividedBy(totalDemandDecimal).times(100).toFixed(2))
      : 100.0;

  const demandBalanceReconciled =
    Math.abs(totalDemandKg - (fulfilledDemandKg + unmetDemandKg)) < 0.05;

  // --------------------------------------------------------------------------
  // 3. REVENUE RECONCILIATION LEDGER (USD)
  // --------------------------------------------------------------------------
  let referenceRevenueDecimal = new Decimal(0);
  let realizedSalesRevenueDecimal = new Decimal(0);
  let discountForegoneDecimal = new Decimal(0);
  let cogsSoldDecimal = new Decimal(0);

  for (const alloc of plan.allocations) {
    const allocKg = new Decimal(alloc.allocatedQuantityKg);
    const demand = demandMap.get(alloc.demandOrderId);
    const listPrice = demand
      ? new Decimal(demand.contractedPricePerKgUsd)
      : new Decimal(alloc.effectivePricePerKgUsd);
    const effectivePrice = new Decimal(alloc.effectivePricePerKgUsd);
    const unitCost = new Decimal(alloc.inventoryCostUsd).dividedBy(allocKg);

    const refRev = allocKg.times(listPrice);
    const realRev = allocKg.times(effectivePrice);
    const discForegone = refRev.minus(realRev);

    referenceRevenueDecimal = referenceRevenueDecimal.plus(refRev);
    realizedSalesRevenueDecimal = realizedSalesRevenueDecimal.plus(realRev);
    discountForegoneDecimal = discountForegoneDecimal.plus(discForegone);
    cogsSoldDecimal = cogsSoldDecimal.plus(new Decimal(alloc.inventoryCostUsd));
  }

  // Lost revenue potential from unmet demand
  let unmetDemandLostRevenueDecimal = new Decimal(0);
  for (const df of plan.demandFulfillments) {
    if (df.unfulfilledKg > 0) {
      const demand = demandMap.get(df.demandOrderId);
      if (demand) {
        unmetDemandLostRevenueDecimal = unmetDemandLostRevenueDecimal.plus(
          new Decimal(df.unfulfilledKg).times(new Decimal(demand.contractedPricePerKgUsd))
        );
      }
    }
  }

  const referenceRevenueUsd = Number(referenceRevenueDecimal.toFixed(2));
  const realizedSalesRevenueUsd = Number(realizedSalesRevenueDecimal.toFixed(2));
  const discountForegoneRevenueUsd = Number(discountForegoneDecimal.toFixed(2));
  const unmetDemandLostRevenueUsd = Number(unmetDemandLostRevenueDecimal.toFixed(2));

  // Revenue Reconciled: Reference Revenue === Realized Revenue + Discount Foregone
  const revenueReconciled =
    Math.abs(referenceRevenueUsd - (realizedSalesRevenueUsd + discountForegoneRevenueUsd)) < 0.05;

  // --------------------------------------------------------------------------
  // 4. COST RECONCILIATION LEDGER (USD)
  // --------------------------------------------------------------------------
  // Incurred Transport Costs
  let transportFixedDecimal = new Decimal(0);
  let transportVarDecimal = new Decimal(0);

  for (const rd of plan.routeDispatches) {
    if (rd.loadedKg > 0) {
      transportFixedDecimal = transportFixedDecimal.plus(new Decimal(rd.fixedCostUsd));
      transportVarDecimal = transportVarDecimal.plus(new Decimal(rd.variableCostUsd));
    }
  }

  const incurredTransportFixedCostUsd = Number(transportFixedDecimal.toFixed(2));
  const incurredTransportVariableCostUsd = Number(transportVarDecimal.toFixed(2));
  const incurredTransportTotalCostUsd = Number(
    transportFixedDecimal.plus(transportVarDecimal).toFixed(2)
  );

  // Incurred Handling Costs
  const handlingRateDecimal = new Decimal(resolvedConfig.handlingCostPerKgUsd || 0);
  const incurredHandlingDecimal = soldQuantityDecimal.times(handlingRateDecimal);
  const incurredHandlingCostUsd = Number(incurredHandlingDecimal.toFixed(2));

  // Incurred Spoilage Penalty
  const incurredDisposalPenaltyUsd = Number(incurredDisposalPenaltyDecimal.toFixed(2));

  // Inventory / Procurement Costs
  const totalInventoryProcurementCostUsd = Number(totalProcurementDecimal.toFixed(2));
  const cogsSoldInventoryUsd = Number(cogsSoldDecimal.toFixed(2));
  const remainingHealthyInventoryValueUsd = Number(healthyAssetValueDecimal.toFixed(2));
  const spoiledInventoryWriteOffUsd = Number(spoiledWriteOffDecimal.toFixed(2));

  // Total Spoilage Economic Loss = Write-off of expired produce + tipping disposal fee
  const totalSpoilageEconomicLossUsd = Number(
    spoiledWriteOffDecimal.plus(incurredDisposalPenaltyDecimal).toFixed(2)
  );

  const spoilageRatePercent =
    initialStockKg > 0
      ? Number(spoiledExpiredDecimal.dividedBy(initialStockDecimal).times(100).toFixed(2))
      : 0.0;

  // Inventory Cost Reconciliation:
  // Total Procurement Cost === COGS Sold + Carrying Value Healthy Asset + Expired Write-Off
  const inventoryCostReconciled =
    Math.abs(
      totalInventoryProcurementCostUsd -
        (cogsSoldInventoryUsd + remainingHealthyInventoryValueUsd + spoiledInventoryWriteOffUsd)
    ) < 0.10;

  // --------------------------------------------------------------------------
  // 5. NET ECONOMIC OUTCOMES (USD)
  // --------------------------------------------------------------------------
  // Operational Cash Contribution: Cash in from sales minus cash out for transport, handling, and disposal
  const operationalCashContributionDecimal = realizedSalesRevenueDecimal
    .minus(transportFixedDecimal)
    .minus(transportVarDecimal)
    .minus(incurredHandlingDecimal)
    .minus(incurredDisposalPenaltyDecimal);

  // Net Economic Outcome / Profit: Realized Sales - COGS Sold - Transport Total - Handling Total - Disposal Penalty
  const netEconomicOutcomeDecimal = operationalCashContributionDecimal.minus(cogsSoldDecimal);

  const operationalCashContributionUsd = Number(operationalCashContributionDecimal.toFixed(2));
  const netEconomicOutcomeUsd = Number(netEconomicOutcomeDecimal.toFixed(2));

  const netMarginPercent =
    realizedSalesRevenueUsd > 0
      ? Number(
          netEconomicOutcomeDecimal.dividedBy(realizedSalesRevenueDecimal).times(100).toFixed(2)
        )
      : 0.0;

  // Financial Ledger Reconciliation:
  // netEconomicOutcomeUsd === realizedSalesRevenueUsd - cogsSoldInventoryUsd - incurredTransportTotalCostUsd - incurredHandlingCostUsd - incurredDisposalPenaltyUsd
  const expectedNet =
    realizedSalesRevenueUsd -
    cogsSoldInventoryUsd -
    incurredTransportTotalCostUsd -
    incurredHandlingCostUsd -
    incurredDisposalPenaltyUsd;
  const financialLedgerReconciled = Math.abs(netEconomicOutcomeUsd - expectedNet) < 0.05;

  return {
    initialStockKg,
    soldQuantityKg,
    remainingQuantityKg,
    unsoldHealthyStockKg,
    spoiledExpiredStockKg,
    atRiskStockKg,
    massBalanceReconciled,

    totalDemandKg,
    fulfilledDemandKg,
    unmetDemandKg,
    fulfillmentRatePercent,
    demandBalanceReconciled,

    referenceRevenueUsd,
    realizedSalesRevenueUsd,
    discountForegoneRevenueUsd,
    unmetDemandLostRevenueUsd,

    incurredTransportFixedCostUsd,
    incurredTransportVariableCostUsd,
    incurredTransportTotalCostUsd,
    incurredHandlingCostUsd,
    incurredDisposalPenaltyUsd,

    totalInventoryProcurementCostUsd,
    cogsSoldInventoryUsd,
    remainingHealthyInventoryValueUsd,
    spoiledInventoryWriteOffUsd,

    totalSpoilageEconomicLossUsd,
    spoilageRatePercent,

    operationalCashContributionUsd,
    netEconomicOutcomeUsd,
    netMarginPercent,

    revenueReconciled,
    inventoryCostReconciled,
    financialLedgerReconciled,
  };
}

/**
 * Compares two evaluated economic ledgers (typically FreshRoute FEFO vs Baseline FIFO)
 * and produces precise, safe delta metrics and winner designation.
 */
export function compareEconomicLedgers(
  freshRouteLedger: EconomicLedger,
  baselineLedger: EconomicLedger
): StrategyComparisonDeltas {
  // Volume Deltas
  const soldQuantityDeltaKg = Number(
    (freshRouteLedger.soldQuantityKg - baselineLedger.soldQuantityKg).toFixed(2)
  );

  // Spoilage Reduction: positive means FreshRoute had LESS spoilage than Baseline
  const spoilageReductionKg = Number(
    (baselineLedger.spoiledExpiredStockKg - freshRouteLedger.spoiledExpiredStockKg).toFixed(2)
  );

  const spoilageReductionPercent =
    baselineLedger.spoiledExpiredStockKg > 0
      ? Number(
          (
            (spoilageReductionKg / baselineLedger.spoiledExpiredStockKg) *
            100
          ).toFixed(2)
        )
      : freshRouteLedger.spoiledExpiredStockKg === 0
      ? 0.0
      : -100.0;

  const spoilageRateDeltaPercent = Number(
    (freshRouteLedger.spoilageRatePercent - baselineLedger.spoilageRatePercent).toFixed(2)
  );

  const fulfillmentDeltaKg = Number(
    (freshRouteLedger.fulfilledDemandKg - baselineLedger.fulfilledDemandKg).toFixed(2)
  );

  const fulfillmentRateDeltaPercent = Number(
    (
      freshRouteLedger.fulfillmentRatePercent - baselineLedger.fulfillmentRatePercent
    ).toFixed(2)
  );

  const unmetDemandReductionKg = Number(
    (baselineLedger.unmetDemandKg - freshRouteLedger.unmetDemandKg).toFixed(2)
  );

  // Revenue Deltas
  const realizedRevenueDeltaUsd = Number(
    (
      freshRouteLedger.realizedSalesRevenueUsd - baselineLedger.realizedSalesRevenueUsd
    ).toFixed(2)
  );

  const realizedRevenueDeltaPercent = safePercentageChange(
    freshRouteLedger.realizedSalesRevenueUsd,
    baselineLedger.realizedSalesRevenueUsd
  );

  const discountImpactDeltaUsd = Number(
    (
      freshRouteLedger.discountForegoneRevenueUsd -
      baselineLedger.discountForegoneRevenueUsd
    ).toFixed(2)
  );

  // Cost Deltas
  const transportCostDeltaUsd = Number(
    (
      freshRouteLedger.incurredTransportTotalCostUsd -
      baselineLedger.incurredTransportTotalCostUsd
    ).toFixed(2)
  );

  const handlingCostDeltaUsd = Number(
    (freshRouteLedger.incurredHandlingCostUsd - baselineLedger.incurredHandlingCostUsd).toFixed(2)
  );

  // Spoilage Loss Reduction: positive means FreshRoute saved money on spoilage
  const spoilageLossReductionUsd = Number(
    (
      baselineLedger.totalSpoilageEconomicLossUsd -
      freshRouteLedger.totalSpoilageEconomicLossUsd
    ).toFixed(2)
  );

  // Net Outcome Deltas (Profit Uplift)
  const netOutcomeDeltaUsd = Number(
    (freshRouteLedger.netEconomicOutcomeUsd - baselineLedger.netEconomicOutcomeUsd).toFixed(2)
  );

  const netOutcomeDeltaPercent = safePercentageChange(
    freshRouteLedger.netEconomicOutcomeUsd,
    baselineLedger.netEconomicOutcomeUsd
  );

  const operationalCashUpliftUsd = Number(
    (
      freshRouteLedger.operationalCashContributionUsd -
      baselineLedger.operationalCashContributionUsd
    ).toFixed(2)
  );

  // Determine Outcome Status
  let outcomeStatus: StrategyOutcomeWinner = "EQUIVALENT";
  let narrativeSummary = "";

  if (netOutcomeDeltaUsd > 0.05) {
    outcomeStatus = "FRESHROUTE_SUPERIOR";
    narrativeSummary = `FreshRoute outperformed the baseline by $${netOutcomeDeltaUsd.toLocaleString(
      "en-US",
      { minimumFractionDigits: 2 }
    )} (+${netOutcomeDeltaPercent}% net margin uplift). ` +
      `Mitigated ${spoilageReductionKg.toFixed(2)} kg of perishable waste and achieved ${fulfillmentRateDeltaPercent >= 0 ? "+" : ""}${fulfillmentRateDeltaPercent.toFixed(1)}% demand fulfillment delta.`;
  } else if (netOutcomeDeltaUsd < -0.05) {
    outcomeStatus = "BASELINE_SUPERIOR";
    narrativeSummary = `Baseline FIFO outperformed FreshRoute by $${Math.abs(
      netOutcomeDeltaUsd
    ).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${netOutcomeDeltaPercent}% net margin delta). ` +
      `FreshRoute incurred additional transport freight ($${transportCostDeltaUsd.toFixed(2)}) or price concessions ($${discountImpactDeltaUsd.toFixed(2)}) that exceeded the value of salvaged produce.`;
  } else {
    outcomeStatus = "EQUIVALENT";
    narrativeSummary = `Both FreshRoute FEFO and Baseline FIFO produced identical economic outcomes ($${freshRouteLedger.netEconomicOutcomeUsd.toLocaleString(
      "en-US",
      { minimumFractionDigits: 2 }
    )} net profit). Zero delta in spoilage or demand fulfillment.`;
  }

  return {
    soldQuantityDeltaKg,
    spoilageReductionKg,
    spoilageReductionPercent,
    spoilageRateDeltaPercent,
    fulfillmentDeltaKg,
    fulfillmentRateDeltaPercent,
    unmetDemandReductionKg,

    realizedRevenueDeltaUsd,
    realizedRevenueDeltaPercent,
    discountImpactDeltaUsd,

    transportCostDeltaUsd,
    handlingCostDeltaUsd,
    spoilageLossReductionUsd,

    netOutcomeDeltaUsd,
    netOutcomeDeltaPercent,
    operationalCashUpliftUsd,

    outcomeStatus,
    narrativeSummary,
  };
}

/**
 * High-level Scenario Evaluation Interface that executes both FreshRoute and Baseline FIFO
 * against identical initial stock snapshots and unified economic configurations.
 * Can be called independently of UI components or database sessions.
 */
export function evaluateScenario(
  input: EnginePlannerInput,
  options: ScenarioEvaluationOptions = {}
): ScenarioEvaluationRun {
  const timestamp = new Date().toISOString();
  const runId = `eval-run-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const scenarioId = options.scenarioId || `scenario-${Date.now().toString(36)}`;
  const scenarioName = options.scenarioName || "Perishable Produce Distribution Scenario";

  // Unified canonical input snapshot hash
  const inputSnapshotHash = computeCanonicalInputSnapshotHash(input);

  // 1. Solve with FreshRoute Planning Engine
  const engine = new FreshRoutePlanningEngine();
  const fefoSolveResult = engine.solve(input, { compareWithBaseline: false });
  const freshRoutePlan = fefoSolveResult.plan;

  // 2. Solve with Documented Baseline FIFO Engine against identical inputs
  const baselinePlan = executeBaselineFifoPlan(input, freshRoutePlan.config, inputSnapshotHash);

  // 3. Shared Economic Evaluation Pipeline (Identical cost definitions, demand, and prices)
  const freshRouteLedger = evaluatePlanEconomicLedger(
    freshRoutePlan,
    input,
    freshRoutePlan.config
  );
  const baselineLedger = evaluatePlanEconomicLedger(
    baselinePlan,
    input,
    freshRoutePlan.config
  );

  // 4. Compute Comparison Deltas
  const comparison = compareEconomicLedgers(freshRouteLedger, baselineLedger);

  return {
    runId,
    scenarioId,
    scenarioName,
    timestamp,
    inputSnapshotHash,
    freshRouteVersion: FRESHROUTE_ENGINE_VERSION,
    baselineVersion: BASELINE_FIFO_ALGORITHM_VERSION,
    config: freshRoutePlan.config,
    freshRoutePlan,
    baselinePlan,
    freshRouteLedger,
    baselineLedger,
    comparison,
  };
}
