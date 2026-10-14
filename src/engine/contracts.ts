/**
 * FreshRoute Distribution Planning Engine - Contracts & Type Definitions
 * Pure TypeScript domain definitions - Zero framework / React / Prisma / DB dependencies.
 */

import Decimal from "decimal.js";

// ============================================================================
// 1. REASON CODES & TAXONOMY
// ============================================================================

export enum AllocationReasonCode {
  // Successful Allocation Reasons
  FEFO_EXPIRATION_PRIORITY = "FEFO_EXPIRATION_PRIORITY",
  SHELF_LIFE_SLA_SATISFIED = "SHELF_LIFE_SLA_SATISFIED",
  DYNAMIC_MARKDOWN_SALVAGE = "DYNAMIC_MARKDOWN_SALVAGE",
  STANDARD_DISPATCH_NOMINAL = "STANDARD_DISPATCH_NOMINAL",
  COLD_CHAIN_TEMPERATURE_COMPLIANT = "COLD_CHAIN_TEMPERATURE_COMPLIANT",
  MARGIN_OPTIMIZED_MATCH = "MARGIN_OPTIMIZED_MATCH",

  // Rejection & Infeasibility Reasons
  REJECTED_COMMODITY_MISMATCH = "REJECTED_COMMODITY_MISMATCH",
  REJECTED_ROUTE_NOT_CONNECTED = "REJECTED_ROUTE_NOT_CONNECTED",
  REJECTED_TEMPERATURE_INCOMPATIBLE = "REJECTED_TEMPERATURE_INCOMPATIBLE",
  REJECTED_DELIVERY_WINDOW_MISSED = "REJECTED_DELIVERY_WINDOW_MISSED",
  REJECTED_DELIVERY_WINDOW_PREMATURE = "REJECTED_DELIVERY_WINDOW_PREMATURE",
  REJECTED_INSUFFICIENT_SHELF_LIFE = "REJECTED_INSUFFICIENT_SHELF_LIFE",
  REJECTED_VEHICLE_CAPACITY_EXHAUSTED = "REJECTED_VEHICLE_CAPACITY_EXHAUSTED",
  REJECTED_DEMAND_SATISFIED = "REJECTED_DEMAND_SATISFIED",
  REJECTED_BATCH_STOCK_EXHAUSTED = "REJECTED_BATCH_STOCK_EXHAUSTED",
  REJECTED_NEGATIVE_MARGIN = "REJECTED_NEGATIVE_MARGIN",
  REJECTED_ZERO_ALLOCABLE_QUANTITY = "REJECTED_ZERO_ALLOCABLE_QUANTITY",
}

export type BindingConstraintType =
  | "BATCH_STOCK"
  | "DEMAND_QUANTITY"
  | "VEHICLE_CAPACITY"
  | "SHELF_LIFE_SLA"
  | "DELIVERY_WINDOW"
  | "NONE";

export type LeftoverStockCategory =
  | "FULLY_ALLOCATED"
  | "UNALLOCATED_FEASIBLE"
  | "AT_RISK"
  | "INFEASIBLE_CONSTRAINTS"
  | "SPOILED_EXPIRED";

// ============================================================================
// 2. INPUT DATA CONTRACTS
// ============================================================================

export interface EngineInventoryBatch {
  id: string;
  batchCode: string;
  warehouseId: string;
  commodityId: string;
  commodityName?: string;
  availableQuantityKg: number | string | Decimal;
  initialQuantityKg?: number | string | Decimal;
  unitCostUsd: number | string | Decimal;
  harvestDate: string | Date;
  receivedDate: string | Date;
  expiryDate: string | Date;
  storageTempCelsius: number | string | Decimal;
  qualityGrade?: "GRADE_A" | "GRADE_B" | "GRADE_C" | string;
}

export interface EngineCommodity {
  id: string;
  code: string;
  name: string;
  category: string;
  standardShelfLifeDays: number;
  minTempCelsius: number;
  maxTempCelsius: number;
  decayRateExponent?: number; // default 1.5
  wasteDisposalCostPerKgUsd?: number | string | Decimal; // default 0.25
}

export interface EngineDestination {
  id: string;
  code: string;
  name: string;
  tier: "PREMIUM_GROCER" | "REGIONAL_SUPERMARKET" | "DISCOUNT_CHAIN" | "FOOD_SERVICE_PROCESSOR" | string;
  minShelfLifeDays: number;
  acceptsDiscounts: boolean;
  maxDiscountPercent: number; // 0 to 100
  receivingHoursStart?: string; // "06:00"
  receivingHoursEnd?: string;   // "18:00"
}

export interface EngineDemandOrder {
  id: string;
  orderNumber: string;
  destinationId: string;
  commodityId: string;
  requestedQuantityKg: number | string | Decimal;
  contractedPricePerKgUsd: number | string | Decimal;
  deliveryWindowStart: string | Date;
  deliveryWindowEnd: string | Date;
}

export interface EngineTransportRoute {
  id: string;
  routeCode: string;
  originWarehouseId: string;
  destinationId: string; // destination or region matching destination
  capacityKg: number | string | Decimal;
  fixedCostUsd: number | string | Decimal;
  costPerKgUsd: number | string | Decimal;
  transitDurationHours: number;
  handlingDurationHours: number; // bay loading + dock unloading buffer
  departureTime: string | Date;
  tempZoneMinCelsius: number;
  tempZoneMaxCelsius: number;
}

export interface EngineSolverConfig {
  algorithmVersion?: string; // default "1.0.0-fefo"
  enableDynamicMarkdowns?: boolean; // default true
  maxMarkdownPercent?: number; // default 40
  minGrossMarginThresholdPercent?: number; // default 0 (allow break-even salvage if > -disposalFee)
  shelfLifeSafetyBufferHours?: number; // default 4.0
  spoilageAvoidanceWeight?: number; // default 1.5
  planningTime?: string | Date; // default current date
  disposalPenaltyPerKgUsd?: number | string | Decimal; // default 0.25 $/kg
  handlingCostPerKgUsd?: number | string | Decimal; // default 0.00 $/kg
}

export interface EnginePlannerInput {
  batches: EngineInventoryBatch[];
  commodities: EngineCommodity[];
  destinations: EngineDestination[];
  demands: EngineDemandOrder[];
  routes: EngineTransportRoute[];
  config?: EngineSolverConfig;
}

// ============================================================================
// 3. OUTPUT PLAN CONTRACTS
// ============================================================================

export interface AllocationFactAudit {
  batchCode: string;
  orderNumber: string;
  destinationCode: string;
  routeCode: string;
  allocatedKg: number;
  departureTime: string;
  arrivalTime: string;
  handlingCompletedTime: string;
  expiryDate: string;
  arrivalRslDays: number;
  handlingRslDays: number;
  requiredRslDays: number;
  contractedPricePerKg: number;
  discountPercent: number;
  effectivePricePerKg: number;
  unitCostPerKg: number;
  variableTransportCostPerKg: number;
  allocatedFixedCostShare: number;
  netMarginUsd: number;
  bindingConstraint: BindingConstraintType;
}

export interface EngineAllocation {
  id: string;
  batchId: string;
  batchCode: string;
  commodityId: string;
  commodityName: string;
  demandOrderId: string;
  orderNumber: string;
  destinationId: string;
  destinationName: string;
  routeId: string;
  routeCode: string;
  allocatedQuantityKg: number;
  discountPercent: number;
  effectivePricePerKgUsd: number;
  grossRevenueUsd: number;
  inventoryCostUsd: number;
  transportCostUsd: number;
  netMarginUsd: number;
  netMarginPercent: number;
  departureTime: string;
  arrivalTime: string;
  handlingCompletedTime: string;
  arrivalShelfLifeDays: number;
  handlingShelfLifeDays: number;
  requiredShelfLifeDays: number;
  isSalvageDiscount: boolean;
  reasonCodes: AllocationReasonCode[];
  reasonExplanation: string;
  bindingConstraint: BindingConstraintType;
  auditFacts: AllocationFactAudit;
}

export interface EngineRejection {
  batchId: string;
  batchCode: string;
  demandOrderId: string;
  orderNumber: string;
  routeId: string;
  routeCode: string;
  reasonCode: AllocationReasonCode;
  reasonExplanation: string;
  facts: Record<string, string | number | boolean>;
}

export interface BatchLeftoverBreakdown {
  batchId: string;
  batchCode: string;
  commodityName: string;
  initialAvailableKg: number;
  allocatedKg: number;
  unallocatedKg: number;
  unallocatedFeasibleKg: number;
  atRiskKg: number;
  infeasibleKg: number;
  spoiledKg: number;
  category: LeftoverStockCategory;
  remainingRslDaysAtPlanning: number;
  estimatedSpoilageLossUsd: number;
  explanation: string;
}

export interface DemandFulfillmentSummary {
  demandOrderId: string;
  orderNumber: string;
  destinationId: string;
  destinationName: string;
  commodityName: string;
  requestedKg: number;
  fulfilledKg: number;
  unfulfilledKg: number;
  fillRatePercent: number;
  status: "FULFILLED" | "PARTIALLY_FULFILLED" | "UNFULFILLED";
}

export interface RouteUtilizationSummary {
  routeId: string;
  routeCode: string;
  originWarehouseId: string;
  destinationId: string;
  totalCapacityKg: number;
  loadedKg: number;
  remainingCapacityKg: number;
  utilizationPercent: number;
  fixedCostUsd: number;
  variableCostUsd: number;
  totalCostUsd: number;
  batchCount: number;
  departureTime: string;
  arrivalTime: string;
}

export interface EnginePlanMetrics {
  totalAllocatedKg: number;
  totalRequestedDemandKg: number;
  totalUnfulfilledDemandKg: number;
  totalSurplusInventoryKg: number;
  totalAtRiskInventoryKg: number;
  totalSpoiledInventoryKg: number;
  demandFillRatePercent: number;
  slaComplianceRatePercent: number;
  grossRevenueUsd: number;
  inventoryCostUsd: number;
  transportCostUsd: number;
  spoilageDisposalPenaltyUsd: number;
  netMarginUsd: number;
  netMarginPercent: number;
  spoilagePreventedKg: number;
  spoilagePreventedValueUsd: number;
  totalAllocationsCount: number;
  activeRoutesCount: number;
}

export interface EnginePlanOutput {
  planId: string;
  snapshotHash: string;
  algorithmVersion: string;
  engineMetadata: {
    engineName: string;
    version: string;
    executionTimestamp: string;
    solveDurationMs: number;
  };
  config: Required<EngineSolverConfig>;
  metrics: EnginePlanMetrics;
  allocations: EngineAllocation[];
  routeDispatches: RouteUtilizationSummary[];
  batchLeftoverBreakdowns: BatchLeftoverBreakdown[];
  demandFulfillments: DemandFulfillmentSummary[];
  rejections: EngineRejection[];
}

export interface BaselineComparisonMetrics {
  fefoPlan: EnginePlanOutput;
  fifoPlan: EnginePlanOutput;
  deltas: {
    profitUpliftUsd: number;
    profitUpliftPercent: number;
    spoilagePreventedDeltaKg: number;
    spoilagePreventedDeltaUsd: number;
    slaComplianceDeltaPercent: number;
    demandFillRateDeltaPercent: number;
    rejectionsPreventedCount: number;
  };
}

// ============================================================================
// 4. PHASE 05 - ECONOMIC LEDGER & SCENARIO EVALUATION CONTRACTS
// ============================================================================

export type CostTimingClassification = "SUNK" | "AVOIDABLE" | "INCURRED_ON_ACTION";

export interface EconomicLedger {
  // Volume & Physical Mass Ledger (kg)
  initialStockKg: number;
  soldQuantityKg: number;
  remainingQuantityKg: number;
  unsoldHealthyStockKg: number;     // unallocated with RSL > 0 (reusable/salvageable in future cycles)
  spoiledExpiredStockKg: number;    // unallocated with RSL <= 0 at planning/handling (spoiled waste)
  atRiskStockKg: number;            // unallocated with 0 < RSL <= 7d

  // Mass Balance Verification: initialStockKg === soldQuantityKg + remainingQuantityKg
  massBalanceReconciled: boolean;

  // Demand Fulfillment Ledger (kg)
  totalDemandKg: number;
  fulfilledDemandKg: number;
  unmetDemandKg: number;
  fulfillmentRatePercent: number;
  demandBalanceReconciled: boolean;

  // Revenue Ledger (USD)
  referenceRevenueUsd: number;      // Revenue earned if sold kg were priced at 100% contracted list price
  realizedSalesRevenueUsd: number;  // Actual gross cash inflow: sold kg * effective price (after discount)
  discountForegoneRevenueUsd: number; // Foregone reference revenue: referenceRevenue - realizedRevenue (NOT double counted as an expense!)
  unmetDemandLostRevenueUsd: number;  // Unmet demand kg * contracted list price

  // Cost Ledger (USD) - Categorized by Financial Nature
  // 1. Incurred / Action Costs (Costs triggered solely by dispatch/handling actions)
  incurredTransportFixedCostUsd: number;    // sum of F_r for all dispatched routes
  incurredTransportVariableCostUsd: number; // sum of (V_r * allocatedKg)
  incurredTransportTotalCostUsd: number;    // fixed + variable
  incurredHandlingCostUsd: number;          // handling cost (handlingRate * soldQuantityKg)
  incurredDisposalPenaltyUsd: number;       // bio-waste tipping fee for spoiled inventory (spoiledKg * disposalCostPerKg)

  // 2. Inventory / Acquisition Costs (COGS vs Asset vs Sunk)
  totalInventoryProcurementCostUsd: number; // Sunk inventory purchase cost: initialStockKg * unitCost
  cogsSoldInventoryUsd: number;             // Realized COGS for sold goods: soldKg * unitCost
  remainingHealthyInventoryValueUsd: number;// Balance sheet asset value of fresh stock remaining: unsoldHealthyStockKg * unitCost
  spoiledInventoryWriteOffUsd: number;      // Unrecoverable inventory write-off: spoiledExpiredStockKg * unitCost

  // 3. Spoilage Loss (Avoidable vs Incurred)
  totalSpoilageEconomicLossUsd: number;     // spoiledInventoryWriteOffUsd + incurredDisposalPenaltyUsd
  spoilageRatePercent: number;              // (spoiledExpiredStockKg / initialStockKg) * 100

  // Net Economic Outcomes (USD)
  operationalCashContributionUsd: number;   // Realized Revenue - Transport Total - Handling Total - Incurred Disposal Penalty
  netEconomicOutcomeUsd: number;            // Realized Revenue - COGS - Transport Total - Handling Total - Incurred Disposal Penalty
  netMarginPercent: number;                 // (netEconomicOutcomeUsd / realizedSalesRevenueUsd) * 100

  // Ledger Reconciliation Verifications
  revenueReconciled: boolean;               // referenceRevenue === realizedRevenue + discountForegone
  inventoryCostReconciled: boolean;         // procurementCost === cogsSold + healthyAssetValue + spoiledWriteOff
  financialLedgerReconciled: boolean;       // netEconomicOutcome === realizedRevenue - cogsSold - transport - handling - disposalPenalty
}

export type StrategyOutcomeWinner = "FRESHROUTE_SUPERIOR" | "EQUIVALENT" | "BASELINE_SUPERIOR";

export interface StrategyComparisonDeltas {
  // Volume Deltas (FreshRoute - Baseline)
  soldQuantityDeltaKg: number;
  spoilageReductionKg: number;             // baseline spoiled - freshRoute spoiled (> 0 is good)
  spoilageReductionPercent: number;        // safe percentage
  spoilageRateDeltaPercent: number;
  fulfillmentDeltaKg: number;
  fulfillmentRateDeltaPercent: number;
  unmetDemandReductionKg: number;

  // Revenue Deltas (FreshRoute - Baseline)
  realizedRevenueDeltaUsd: number;
  realizedRevenueDeltaPercent: number;
  discountImpactDeltaUsd: number;

  // Cost Deltas (FreshRoute - Baseline)
  transportCostDeltaUsd: number;
  handlingCostDeltaUsd: number;
  spoilageLossReductionUsd: number;        // baseline loss - freshRoute loss (> 0 is savings)

  // Net Outcome Deltas
  netOutcomeDeltaUsd: number;              // FreshRoute Net - Baseline Net (Profit Uplift)
  netOutcomeDeltaPercent: number;          // Safe percentage handling of zero/negative baseline
  operationalCashUpliftUsd: number;

  // Winner Designation & Explanation
  outcomeStatus: StrategyOutcomeWinner;
  narrativeSummary: string;
}

export interface ScenarioEvaluationOptions {
  scenarioId?: string;
  scenarioName?: string;
  config?: Partial<EngineSolverConfig>;
  baselineStrategyName?: string;
  baselineDiscountBehavior?: "STATIC_LIST_PRICE" | "MATCH_CONFIG";
}

export interface ScenarioEvaluationRun {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  timestamp: string;
  inputSnapshotHash: string;
  freshRouteVersion: string;
  baselineVersion: string;
  config: Required<EngineSolverConfig>;
  freshRoutePlan: EnginePlanOutput;
  baselinePlan: EnginePlanOutput;
  freshRouteLedger: EconomicLedger;
  baselineLedger: EconomicLedger;
  comparison: StrategyComparisonDeltas;
}
