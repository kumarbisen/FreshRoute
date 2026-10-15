/**
 * FreshRoute Distribution Planning Engine - Discount Engine
 * Pure TypeScript deterministic module for evaluating explainable dynamic markdown
 * price reductions on unallocated, at-risk perishable produce stock.
 *
 * Architecture Invariant:
 * - Pure domain logic - Zero React, Next.js, Prisma, database, or browser dependencies.
 * - Deterministic demand ceiling: modeled sales are strictly capped by customer contract
 *   ceilings and unfulfilled demand orders; no speculative consumer elasticity is fabricated.
 */

import Decimal from "decimal.js";
import {
  AllocationFactAudit,
  AllocationReasonCode,
  EconomicLedger,
  EngineAllocation,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlanOutput,
  EnginePlannerInput,
  EngineSolverConfig,
  EngineTransportRoute,
  StrategyComparisonDeltas,
} from "./contracts";
import { compareEconomicLedgers, evaluatePlanEconomicLedger } from "./evaluator";

// ============================================================================
// 1. REASON CODES & TYPES
// ============================================================================

export type BatchPerishabilitySeverity = "EXPIRED" | "CRITICAL" | "HIGH" | "MEDIUM" | "STABLE";

export enum DiscountReasonCode {
  RECOMMEND_SALVAGE_DISCOUNT = "RECOMMEND_SALVAGE_DISCOUNT",
  RECOMMEND_PREVENTATIVE_MARKDOWN = "RECOMMEND_PREVENTATIVE_MARKDOWN",
  NO_DISCOUNT_FULLY_ALLOCATED = "NO_DISCOUNT_FULLY_ALLOCATED",
  NO_DISCOUNT_EXPIRED_INVENTORY = "NO_DISCOUNT_EXPIRED_INVENTORY",
  NO_DISCOUNT_INSUFFICIENT_DEMAND = "NO_DISCOUNT_INSUFFICIENT_DEMAND",
  NO_DISCOUNT_INSUFFICIENT_SHELF_LIFE = "NO_DISCOUNT_INSUFFICIENT_SHELF_LIFE",
  NO_DISCOUNT_LOSS_MAKING = "NO_DISCOUNT_LOSS_MAKING",
  NO_DISCOUNT_DESTINATIONS_INCOMPATIBLE = "NO_DISCOUNT_DESTINATIONS_INCOMPATIBLE",
  NO_DISCOUNT_FRESH_HOLDING_SUPERIOR = "NO_DISCOUNT_FRESH_HOLDING_SUPERIOR",
}

export interface DiscountEngineOptions {
  candidateDiscountSteps?: number[]; // e.g. [5, 10, 15, 20, 25, 30, 35, 40]
  evaluationTimestamp?: string | Date;
  minGrossMarginThresholdPercent?: number;
  safetyBufferHours?: number;
}

export interface BatchDiscountRecommendation {
  id: string;
  batchId: string;
  batchCode: string;
  warehouseId: string;
  commodityId: string;
  commodityName: string;
  initialQuantityKg: number;
  allocatedQuantityKg: number;
  residualQuantityKg: number;
  severity: BatchPerishabilitySeverity;
  remainingRslDays: number;
  sellByDeadline: string;
  unitCostUsd: number;
  referencePricePerKgUsd: number;

  isDiscountRecommended: boolean;
  reasonCode: DiscountReasonCode;
  reasonExplanation: string;

  proposedDiscountPercent: number; // 0 to 100
  proposedSellingPricePerKgUsd: number;
  targetDestinationId?: string;
  targetDestinationCode?: string;
  targetDestinationName?: string;
  targetDemandOrderId?: string;
  targetOrderNumber?: string;
  targetRouteId?: string;
  targetRouteCode?: string;

  estimatedSalesKg: number;
  estimatedResidualStockKg: number;

  projectedSalesRevenueUsd: number;
  estimatedTransportCostUsd: number;
  estimatedDisposalLossAvoidedUsd: number;
  netEconomicImpactUsd: number; // Net Margin Gain compared to status quo holding/dump
  confidenceScore: number; // 0.0 to 1.0

  assumptions: string[];
  confidenceLimitations: string[];
}

export interface DiscountOpportunityEvaluationResult {
  evaluationTimestamp: string;
  algorithmVersion: string;
  recommendations: BatchDiscountRecommendation[];
  summary: {
    totalBatchesEvaluated: number;
    totalResidualAtRiskKg: number;
    discountRecommendedBatchesCount: number;
    totalSalvageClearableKg: number;
    projectedSalvageRevenueUsd: number;
    projectedDisposalLossAvoidedUsd: number;
    projectedNetMarginUpliftUsd: number;
    averageRecommendedDiscountPercent: number;
  };
  methodology: {
    elasticityModel: string;
    demandCeilingMode: string;
    disclaimer: string;
  };
}

export interface SimulatedDiscountPlanResult {
  beforeLedger: EconomicLedger;
  afterLedger: EconomicLedger;
  comparison: StrategyComparisonDeltas;
  simulatedPlan: EnginePlanOutput;
  additionalAllocationsCount: number;
  additionalSoldKg: number;
  additionalNetMarginUsd: number;
}

export const DISCOUNT_ENGINE_VERSION = "v1.0.0-deterministic-salvage";

// ============================================================================
// 2. HELPER CALCULATIONS
// ============================================================================

export function computeSeverity(remainingRslDays: number): BatchPerishabilitySeverity {
  if (remainingRslDays <= 0) return "EXPIRED";
  if (remainingRslDays <= 2.0) return "CRITICAL";
  if (remainingRslDays <= 4.0) return "HIGH";
  if (remainingRslDays <= 7.0) return "MEDIUM";
  return "STABLE";
}

// ============================================================================
// 3. CORE DISCOUNT EVALUATION ENGINE
// ============================================================================

/**
 * Pure TypeScript discount evaluation engine.
 * Evaluates whether a candidate price reduction on residual stock can clear unallocated inventory,
 * avoid bio-waste tipping fees, and increase net modeled profit.
 */
export function evaluatePlanDiscountOpportunities(
  plan: EnginePlanOutput,
  input: EnginePlannerInput,
  options: DiscountEngineOptions = {}
): DiscountOpportunityEvaluationResult {
  const now = options.evaluationTimestamp ? new Date(options.evaluationTimestamp) : new Date();
  const evaluationTimestamp = now.toISOString();

  const commodityMap = new Map<string, EngineCommodity>(input.commodities.map((c) => [c.id, c]));
  const destinationMap = new Map<string, EngineDestination>(input.destinations.map((d) => [d.id, d]));
  const demandMap = new Map<string, EngineDemandOrder>(input.demands.map((d) => [d.id, d]));

  // 1. Calculate already-allocated quantities per batch in the current plan
  const batchAllocatedMap = new Map<string, Decimal>();
  for (const alloc of plan.allocations) {
    const cur = batchAllocatedMap.get(alloc.batchId) || new Decimal(0);
    batchAllocatedMap.set(alloc.batchId, cur.plus(new Decimal(alloc.allocatedQuantityKg)));
  }

  // 2. Calculate remaining unfulfilled demand per demand order in current plan
  const demandFulfilledMap = new Map<string, Decimal>();
  for (const alloc of plan.allocations) {
    const cur = demandFulfilledMap.get(alloc.demandOrderId) || new Decimal(0);
    demandFulfilledMap.set(alloc.demandOrderId, cur.plus(new Decimal(alloc.allocatedQuantityKg)));
  }

  const candidateSteps = options.candidateDiscountSteps || [5, 10, 15, 20, 25, 30, 35, 40];
  const safetyBufferHours = options.safetyBufferHours ?? plan.config.shelfLifeSafetyBufferHours;
  const disposalPenaltyRate = new Decimal(plan.config.disposalPenaltyPerKgUsd || 0.25);
  const handlingRate = new Decimal(plan.config.handlingCostPerKgUsd || 0.05);

  const recommendations: BatchDiscountRecommendation[] = [];

  let totalResidualAtRiskKg = 0;
  let totalSalvageClearableKg = 0;
  let projectedSalvageRevenueUsd = 0;
  let projectedDisposalLossAvoidedUsd = 0;
  let projectedNetMarginUpliftUsd = 0;
  let discountCount = 0;
  let sumDiscountPercent = 0;

  for (const batch of input.batches) {
    const totalAvailDecimal = new Decimal(batch.availableQuantityKg);
    const allocatedDecimal = batchAllocatedMap.get(batch.id) || new Decimal(0);
    const residualDecimal = Decimal.max(0, totalAvailDecimal.minus(allocatedDecimal));
    const residualKg = Number(residualDecimal.toFixed(2));

    const expiryDate = new Date(batch.expiryDate);
    const remainingRslDays = Number(
      ((expiryDate.getTime() - now.getTime()) / (24 * 3600 * 1000)).toFixed(2)
    );
    const severity = computeSeverity(remainingRslDays);

    const sellByDeadline = new Date(
      expiryDate.getTime() - safetyBufferHours * 3600 * 1000
    ).toISOString();

    const commodity = commodityMap.get(batch.commodityId);
    const commodityName = batch.commodityName || commodity?.name || "Perishable Produce";
    const unitCost = Number(new Decimal(batch.unitCostUsd).toFixed(2));

    // Default reference price
    let refPrice = Number(new Decimal(commodity?.wasteDisposalCostPerKgUsd || 5.0).toFixed(2));
    const matchingDemands = input.demands.filter((d) => d.commodityId === batch.commodityId);
    if (matchingDemands.length > 0) {
      refPrice = Number(new Decimal(matchingDemands[0].contractedPricePerKgUsd).toFixed(2));
    }

    const baseRec: Partial<BatchDiscountRecommendation> = {
      id: `rec-${batch.id}-${now.getTime().toString(36)}`,
      batchId: batch.id,
      batchCode: batch.batchCode,
      warehouseId: batch.warehouseId,
      commodityId: batch.commodityId,
      commodityName,
      initialQuantityKg: Number(totalAvailDecimal.toFixed(2)),
      allocatedQuantityKg: Number(allocatedDecimal.toFixed(2)),
      residualQuantityKg: residualKg,
      severity,
      remainingRslDays,
      sellByDeadline,
      unitCostUsd: unitCost,
      referencePricePerKgUsd: refPrice,
      assumptions: [
        "Deterministic Demand Ceiling: Sales volume is strictly capped at buyer unfulfilled order quantity; no speculative market expansion is assumed.",
        "Landfill Tipping Fee Avoidance: Salvaging produce avoids the local environmental disposal fee.",
        "Cold-Chain Compliance: Reefer transport temperatures and handling buffers are strictly respected.",
      ],
      confidenceLimitations: [
        "Modeled buyer price acceptance is evaluated against contracted discount caps. Commercial acceptance is simulated and subject to merchandiser confirmation.",
      ],
    };

    // Case 1: Fully allocated in current plan
    if (residualKg <= 0.01) {
      recommendations.push({
        ...baseRec,
        isDiscountRecommended: false,
        reasonCode: DiscountReasonCode.NO_DISCOUNT_FULLY_ALLOCATED,
        reasonExplanation: `Batch ${batch.batchCode} is 100% allocated in current distribution plan. Zero unallocated stock remaining.`,
        proposedDiscountPercent: 0,
        proposedSellingPricePerKgUsd: refPrice,
        estimatedSalesKg: 0,
        estimatedResidualStockKg: 0,
        projectedSalesRevenueUsd: 0,
        estimatedTransportCostUsd: 0,
        estimatedDisposalLossAvoidedUsd: 0,
        netEconomicImpactUsd: 0,
        confidenceScore: 1.0,
      } as BatchDiscountRecommendation);
      continue;
    }

    // Case 2: Batch is already expired at evaluation time
    if (remainingRslDays <= 0) {
      recommendations.push({
        ...baseRec,
        isDiscountRecommended: false,
        reasonCode: DiscountReasonCode.NO_DISCOUNT_EXPIRED_INVENTORY,
        reasonExplanation: `Produce expired (${remainingRslDays.toFixed(2)}d RSL). Product cannot legally or safely be sold at any price. 100% disposal write-off.`,
        proposedDiscountPercent: 0,
        proposedSellingPricePerKgUsd: 0,
        estimatedSalesKg: 0,
        estimatedResidualStockKg: residualKg,
        projectedSalesRevenueUsd: 0,
        estimatedTransportCostUsd: 0,
        estimatedDisposalLossAvoidedUsd: 0,
        netEconomicImpactUsd: 0,
        confidenceScore: 1.0,
      } as BatchDiscountRecommendation);
      continue;
    }

    totalResidualAtRiskKg += residualKg;

    // 3. Find Eligible Candidate Destinations with Remaining Demand
    interface CandidateEvaluation {
      destination: EngineDestination;
      demand: EngineDemandOrder;
      route: EngineTransportRoute;
      discountPercent: number;
      sellingPriceUsd: number;
      clearableKg: number;
      grossRevenueUsd: number;
      transportCostUsd: number;
      disposalLossAvoidedUsd: number;
      netMarginImpactUsd: number;
      rslAtArrivalDays: number;
    }

    const candidateMatches: CandidateEvaluation[] = [];

    // Filter demands matching batch commodity
    const openDemands = input.demands.filter((d) => d.commodityId === batch.commodityId);

    for (const dem of openDemands) {
      const dest = destinationMap.get(dem.destinationId);
      if (!dest) continue;

      const requested = new Decimal(dem.requestedQuantityKg);
      const fulfilled = demandFulfilledMap.get(dem.id) || new Decimal(0);
      const unfulfilledDemandKg = Number(Decimal.max(0, requested.minus(fulfilled)).toFixed(2));
      if (unfulfilledDemandKg <= 0.01) continue;

      // Find routes from batch warehouse to destination
      const connectingRoutes = input.routes.filter((r) => {
        return (
          r.originWarehouseId === batch.warehouseId &&
          (r.destinationId === dest.id || r.destinationId.includes(dest.id))
        );
      });

      for (const route of connectingRoutes) {
        // Temperature check
        const bTemp = Number(batch.storageTempCelsius);
        if (bTemp < route.tempZoneMinCelsius || bTemp > route.tempZoneMaxCelsius) {
          continue;
        }

        // Timeline check
        const depTime = new Date(route.departureTime);
        const arrTime = new Date(depTime.getTime() + route.transitDurationHours * 3600 * 1000);
        const handledTime = new Date(
          arrTime.getTime() + (route.handlingDurationHours || 0.5) * 3600 * 1000
        );

        const handlingRslMs = expiryDate.getTime() - handledTime.getTime();
        const handlingRslDays = handlingRslMs / (24 * 3600 * 1000);

        if (handlingRslDays <= 0) continue;

        // SLA Check: must satisfy destination minShelfLifeDays (or secondary salvage floor if destination accepts discounts)
        const minAcceptableDays = dest.acceptsDiscounts ? 1.0 : dest.minShelfLifeDays + safetyBufferHours / 24;
        if (handlingRslDays < minAcceptableDays) continue;

        // Modeled clearable volume
        const maxRouteCap = new Decimal(route.capacityKg);
        const clearableKg = Math.min(
          residualKg,
          unfulfilledDemandKg,
          Number(maxRouteCap.toFixed(2))
        );
        if (clearableKg <= 0.01) continue;

        const listPrice = new Decimal(dem.contractedPricePerKgUsd);
        const varTransportCost = new Decimal(route.costPerKgUsd);

        // Build candidate discount percentages for this destination
        const discountTiers: number[] = [0];
        if (dest.acceptsDiscounts) {
          const maxAllowed = Math.min(dest.maxDiscountPercent, plan.config.maxMarkdownPercent);
          for (const step of candidateSteps) {
            if (step <= maxAllowed && !discountTiers.includes(step)) {
              discountTiers.push(step);
            }
          }
          if (maxAllowed > 0 && !discountTiers.includes(maxAllowed)) {
            discountTiers.push(maxAllowed);
          }
        }

        // Test each discount tier
        for (const discPct of discountTiers) {
          // If product breaches primary SLA, discount must be >= 5% to incentivize secondary acceptance
          if (handlingRslDays < dest.minShelfLifeDays && discPct < 5 && dest.acceptsDiscounts) {
            continue;
          }

          const multiplier = new Decimal(1).minus(new Decimal(discPct).dividedBy(100));
          const effectivePrice = listPrice.times(multiplier);

          const grossRevenue = effectivePrice.times(clearableKg);
          const transportCost = varTransportCost.times(clearableKg);
          const handlingCost = handlingRate.times(clearableKg);
          const disposalPenaltyAvoided = disposalPenaltyRate.times(clearableKg);

          // Net Economic Margin Impact over status quo dump/holding:
          // In status quo: produce expires/disposed -> loss = clearableKg * (unitCost + disposalPenalty)
          // In discount scenario: revenue - transport - handling - COGS
          // Delta Margin = Revenue - Transport - Handling + DisposalPenaltyAvoided
          const netMarginImpact = grossRevenue
            .minus(transportCost)
            .minus(handlingCost)
            .plus(disposalPenaltyAvoided);

          const netImpactVal = Number(netMarginImpact.toFixed(2));

          candidateMatches.push({
            destination: dest,
            demand: dem,
            route,
            discountPercent: discPct,
            sellingPriceUsd: Number(effectivePrice.toFixed(2)),
            clearableKg,
            grossRevenueUsd: Number(grossRevenue.toFixed(2)),
            transportCostUsd: Number(transportCost.toFixed(2)),
            disposalLossAvoidedUsd: Number(disposalPenaltyAvoided.toFixed(2)),
            netMarginImpactUsd: netImpactVal,
            rslAtArrivalDays: Number(handlingRslDays.toFixed(2)),
          });
        }
      }
    }

    // 4. Determine Best Candidate or Recommend No Discount
    if (candidateMatches.length === 0) {
      recommendations.push({
        ...baseRec,
        isDiscountRecommended: false,
        reasonCode: DiscountReasonCode.NO_DISCOUNT_INSUFFICIENT_DEMAND,
        reasonExplanation: `No feasible buyers with unmet demand for ${commodityName} within viable cold-chain reach before sell-by deadline (${remainingRslDays.toFixed(1)}d RSL).`,
        proposedDiscountPercent: 0,
        proposedSellingPricePerKgUsd: refPrice,
        estimatedSalesKg: 0,
        estimatedResidualStockKg: residualKg,
        projectedSalesRevenueUsd: 0,
        estimatedTransportCostUsd: 0,
        estimatedDisposalLossAvoidedUsd: 0,
        netEconomicImpactUsd: 0,
        confidenceScore: 0.9,
      } as BatchDiscountRecommendation);
      continue;
    }

    // Sort candidates by Net Economic Impact (descending), then lower discount percent (ascending)
    candidateMatches.sort((a, b) => {
      if (Math.abs(b.netMarginImpactUsd - a.netMarginImpactUsd) > 0.01) {
        return b.netMarginImpactUsd - a.netMarginImpactUsd;
      }
      return a.discountPercent - b.discountPercent;
    });

    const bestCandidate = candidateMatches[0];

    // Check if best candidate is economically viable (strictly better than status quo write-off)
    if (bestCandidate.netMarginImpactUsd <= 0.05) {
      recommendations.push({
        ...baseRec,
        isDiscountRecommended: false,
        reasonCode: DiscountReasonCode.NO_DISCOUNT_LOSS_MAKING,
        reasonExplanation: `Candidate price concessions generate negative cash return (-$${Math.abs(
          bestCandidate.netMarginImpactUsd
        ).toFixed(2)}) after deducting route freight and handling costs. Writing off product is financially preferable to subsidized shipping.`,
        proposedDiscountPercent: 0,
        proposedSellingPricePerKgUsd: refPrice,
        targetDestinationId: bestCandidate.destination.id,
        targetDestinationCode: bestCandidate.destination.code,
        targetDestinationName: bestCandidate.destination.name,
        estimatedSalesKg: 0,
        estimatedResidualStockKg: residualKg,
        projectedSalesRevenueUsd: 0,
        estimatedTransportCostUsd: 0,
        estimatedDisposalLossAvoidedUsd: 0,
        netEconomicImpactUsd: 0,
        confidenceScore: 0.85,
      } as BatchDiscountRecommendation);
      continue;
    }

    // If best candidate is 0% discount, standard pricing is already feasible
    if (bestCandidate.discountPercent === 0) {
      recommendations.push({
        ...baseRec,
        isDiscountRecommended: false,
        reasonCode: DiscountReasonCode.NO_DISCOUNT_FRESH_HOLDING_SUPERIOR,
        reasonExplanation: `Product is within nominal shelf-life (${remainingRslDays.toFixed(1)}d RSL) and can be sold at 100% list price (₹${bestCandidate.sellingPriceUsd.toFixed(2)}/kg) to ${bestCandidate.destination.name}. No price markdown required.`,
        proposedDiscountPercent: 0,
        proposedSellingPricePerKgUsd: bestCandidate.sellingPriceUsd,
        targetDestinationId: bestCandidate.destination.id,
        targetDestinationCode: bestCandidate.destination.code,
        targetDestinationName: bestCandidate.destination.name,
        targetDemandOrderId: bestCandidate.demand.id,
        targetOrderNumber: bestCandidate.demand.orderNumber,
        targetRouteId: bestCandidate.route.id,
        targetRouteCode: bestCandidate.route.routeCode,
        estimatedSalesKg: bestCandidate.clearableKg,
        estimatedResidualStockKg: residualKg - bestCandidate.clearableKg,
        projectedSalesRevenueUsd: bestCandidate.grossRevenueUsd,
        estimatedTransportCostUsd: bestCandidate.transportCostUsd,
        estimatedDisposalLossAvoidedUsd: bestCandidate.disposalLossAvoidedUsd,
        netEconomicImpactUsd: bestCandidate.netMarginImpactUsd,
        confidenceScore: 0.95,
      } as BatchDiscountRecommendation);
      continue;
    }

    // Active Salvage Discount Recommendation!
    discountCount++;
    sumDiscountPercent += bestCandidate.discountPercent;
    totalSalvageClearableKg += bestCandidate.clearableKg;
    projectedSalvageRevenueUsd += bestCandidate.grossRevenueUsd;
    projectedDisposalLossAvoidedUsd += bestCandidate.disposalLossAvoidedUsd;
    projectedNetMarginUpliftUsd += bestCandidate.netMarginImpactUsd;

    const remainingUnsold = Math.max(0, residualKg - bestCandidate.clearableKg);

    recommendations.push({
      ...baseRec,
      isDiscountRecommended: true,
      reasonCode:
        severity === "CRITICAL"
          ? DiscountReasonCode.RECOMMEND_SALVAGE_DISCOUNT
          : DiscountReasonCode.RECOMMEND_PREVENTATIVE_MARKDOWN,
      reasonExplanation: `Apply ${bestCandidate.discountPercent}% dynamic markdown (₹${bestCandidate.sellingPriceUsd.toFixed(2)}/kg) to liquidate ${bestCandidate.clearableKg.toLocaleString()} kg through ${bestCandidate.destination.name}. Salvages ₹${bestCandidate.grossRevenueUsd.toFixed(2)} gross revenue and avoids ₹${bestCandidate.disposalLossAvoidedUsd.toFixed(2)} disposal fee.`,
      proposedDiscountPercent: bestCandidate.discountPercent,
      proposedSellingPricePerKgUsd: bestCandidate.sellingPriceUsd,
      targetDestinationId: bestCandidate.destination.id,
      targetDestinationCode: bestCandidate.destination.code,
      targetDestinationName: bestCandidate.destination.name,
      targetDemandOrderId: bestCandidate.demand.id,
      targetOrderNumber: bestCandidate.demand.orderNumber,
      targetRouteId: bestCandidate.route.id,
      targetRouteCode: bestCandidate.route.routeCode,
      estimatedSalesKg: bestCandidate.clearableKg,
      estimatedResidualStockKg: Number(remainingUnsold.toFixed(2)),
      projectedSalesRevenueUsd: bestCandidate.grossRevenueUsd,
      estimatedTransportCostUsd: bestCandidate.transportCostUsd,
      estimatedDisposalLossAvoidedUsd: bestCandidate.disposalLossAvoidedUsd,
      netEconomicImpactUsd: bestCandidate.netMarginImpactUsd,
      confidenceScore: 0.9,
    } as BatchDiscountRecommendation);
  }

  const avgDiscount = discountCount > 0 ? Number((sumDiscountPercent / discountCount).toFixed(1)) : 0;

  return {
    evaluationTimestamp,
    algorithmVersion: DISCOUNT_ENGINE_VERSION,
    recommendations,
    summary: {
      totalBatchesEvaluated: input.batches.length,
      totalResidualAtRiskKg: Number(totalResidualAtRiskKg.toFixed(2)),
      discountRecommendedBatchesCount: discountCount,
      totalSalvageClearableKg: Number(totalSalvageClearableKg.toFixed(2)),
      projectedSalvageRevenueUsd: Number(projectedSalvageRevenueUsd.toFixed(2)),
      projectedDisposalLossAvoidedUsd: Number(projectedDisposalLossAvoidedUsd.toFixed(2)),
      projectedNetMarginUpliftUsd: Number(projectedNetMarginUpliftUsd.toFixed(2)),
      averageRecommendedDiscountPercent: avgDiscount,
    },
    methodology: {
      elasticityModel: "Deterministic Unfulfilled Demand Ceiling (No Speculative Elasticity)",
      demandCeilingMode: "Capped strictly by open customer order limits and vehicle payload",
      disclaimer:
        "Modeled recommendations are calculated for commercial scenario evaluation. Approved discounts represent simulated decisions until integrated with an external pricing feed.",
    },
  };
}

// ============================================================================
// 4. PLAN BEFORE-AND-AFTER SIMULATION (INTEGRATION WITH SHARED EVALUATOR)
// ============================================================================

/**
 * Simulates applying approved discount recommendations to an existing distribution plan.
 * Re-evaluates economic metrics through the shared evaluator without double-counting.
 */
export function simulatePlanWithApprovedDiscounts(
  plan: EnginePlanOutput,
  input: EnginePlannerInput,
  approvedDiscounts: BatchDiscountRecommendation[]
): SimulatedDiscountPlanResult {
  const activeApproved = approvedDiscounts.filter(
    (d) => d.isDiscountRecommended && d.estimatedSalesKg > 0 && d.targetDemandOrderId && d.targetRouteId
  );

  // Deep clone allocations from plan
  const clonedAllocations: EngineAllocation[] = JSON.parse(JSON.stringify(plan.allocations));

  let additionalSoldKg = 0;
  let additionalRevenueUsd = 0;
  let additionalTransportCostUsd = 0;

  const destinationMap = new Map<string, EngineDestination>(input.destinations.map((d) => [d.id, d]));
  const demandMap = new Map<string, EngineDemandOrder>(input.demands.map((d) => [d.id, d]));
  const routeMap = new Map<string, EngineTransportRoute>(input.routes.map((r) => [r.id, r]));

  activeApproved.forEach((rec, idx) => {
    const dem = demandMap.get(rec.targetDemandOrderId!);
    const dest = destinationMap.get(rec.targetDestinationId!);
    const route = routeMap.get(rec.targetRouteId!) || input.routes[0];

    const allocKg = rec.estimatedSalesKg;
    const effPrice = rec.proposedSellingPricePerKgUsd;
    const grossRev = Number(new Decimal(effPrice).times(allocKg).toFixed(2));
    const transCost = Number(new Decimal(route.costPerKgUsd).times(allocKg).toFixed(2));
    const invCost = Number(new Decimal(rec.unitCostUsd).times(allocKg).toFixed(2));
    const netMargin = Number(new Decimal(grossRev).minus(transCost).minus(invCost).toFixed(2));

    additionalSoldKg += allocKg;
    additionalRevenueUsd += grossRev;
    additionalTransportCostUsd += transCost;

    const factAudit: AllocationFactAudit = {
      batchCode: rec.batchCode,
      orderNumber: rec.targetOrderNumber || dem?.orderNumber || "ORD-DISC-SIM",
      destinationCode: rec.targetDestinationCode || dest?.code || "DEST-SIM",
      routeCode: rec.targetRouteCode || route.routeCode || "RT-SIM",
      allocatedKg: allocKg,
      departureTime: new Date(route.departureTime).toISOString(),
      arrivalTime: new Date(new Date(route.departureTime).getTime() + route.transitDurationHours * 3600 * 1000).toISOString(),
      handlingCompletedTime: new Date().toISOString(),
      expiryDate: new Date(rec.sellByDeadline).toISOString(),
      arrivalRslDays: rec.remainingRslDays,
      handlingRslDays: rec.remainingRslDays,
      requiredRslDays: dest?.minShelfLifeDays || 1.0,
      contractedPricePerKg: rec.referencePricePerKgUsd,
      discountPercent: rec.proposedDiscountPercent,
      effectivePricePerKg: effPrice,
      unitCostPerKg: rec.unitCostUsd,
      variableTransportCostPerKg: Number(route.costPerKgUsd),
      allocatedFixedCostShare: 0,
      netMarginUsd: netMargin,
      bindingConstraint: "DEMAND_QUANTITY",
    };

    clonedAllocations.push({
      id: `alloc-sim-disc-${idx + 1}-${rec.batchId}`,
      batchId: rec.batchId,
      batchCode: rec.batchCode,
      commodityId: rec.commodityId,
      commodityName: rec.commodityName,
      demandOrderId: rec.targetDemandOrderId!,
      orderNumber: rec.targetOrderNumber || "ORD-DISC-SIM",
      destinationId: rec.targetDestinationId!,
      destinationName: rec.targetDestinationName || "Salvage Buyer",
      routeId: rec.targetRouteId!,
      routeCode: rec.targetRouteCode || "RT-SIM",
      allocatedQuantityKg: allocKg,
      discountPercent: rec.proposedDiscountPercent,
      effectivePricePerKgUsd: effPrice,
      grossRevenueUsd: grossRev,
      inventoryCostUsd: invCost,
      transportCostUsd: transCost,
      netMarginUsd: netMargin,
      netMarginPercent: grossRev > 0 ? Number(((netMargin / grossRev) * 100).toFixed(2)) : 0,
      departureTime: new Date(route.departureTime).toISOString(),
      arrivalTime: new Date().toISOString(),
      handlingCompletedTime: new Date().toISOString(),
      arrivalShelfLifeDays: rec.remainingRslDays,
      handlingShelfLifeDays: rec.remainingRslDays,
      requiredShelfLifeDays: dest?.minShelfLifeDays || 1.0,
      isSalvageDiscount: true,
      reasonCodes: [AllocationReasonCode.DYNAMIC_MARKDOWN_SALVAGE],
      reasonExplanation: rec.reasonExplanation,
      bindingConstraint: "DEMAND_QUANTITY",
      auditFacts: factAudit,
    });
  });

  // Update batchLeftoverBreakdowns reflecting additional sold stock
  const updatedLeftovers = plan.batchLeftoverBreakdowns.map((leftover) => {
    const soldForBatch = activeApproved
      .filter((rec) => rec.batchId === leftover.batchId)
      .reduce((acc, rec) => acc + rec.estimatedSalesKg, 0);

    const newAllocated = leftover.allocatedKg + soldForBatch;
    const newUnallocated = Math.max(0, leftover.initialAvailableKg - newAllocated);

    return {
      ...leftover,
      allocatedKg: newAllocated,
      unallocatedKg: newUnallocated,
      unallocatedFeasibleKg: Math.max(0, leftover.unallocatedFeasibleKg - soldForBatch),
      atRiskKg: Math.max(0, leftover.atRiskKg - soldForBatch),
      spoiledKg: leftover.remainingRslDaysAtPlanning <= 0 ? newUnallocated : 0,
      category: newUnallocated <= 0.01 ? ("FULLY_ALLOCATED" as const) : leftover.category,
    };
  });

  // Assemble simulated EnginePlanOutput
  const simulatedPlan: EnginePlanOutput = {
    ...plan,
    planId: `sim-${plan.planId}`,
    allocations: clonedAllocations,
    batchLeftoverBreakdowns: updatedLeftovers,
    metrics: {
      ...plan.metrics,
      totalAllocatedKg: plan.metrics.totalAllocatedKg + additionalSoldKg,
      totalUnfulfilledDemandKg: Math.max(0, plan.metrics.totalUnfulfilledDemandKg - additionalSoldKg),
      totalSurplusInventoryKg: Math.max(0, plan.metrics.totalSurplusInventoryKg - additionalSoldKg),
      grossRevenueUsd: plan.metrics.grossRevenueUsd + additionalRevenueUsd,
      transportCostUsd: plan.metrics.transportCostUsd + additionalTransportCostUsd,
      totalAllocationsCount: clonedAllocations.length,
    },
  };

  // Re-run shared economic evaluation pipeline for before and after
  const beforeLedger = evaluatePlanEconomicLedger(plan, input, plan.config);
  const afterLedger = evaluatePlanEconomicLedger(simulatedPlan, input, plan.config);

  const comparison = compareEconomicLedgers(afterLedger, beforeLedger);

  return {
    beforeLedger,
    afterLedger,
    comparison,
    simulatedPlan,
    additionalAllocationsCount: activeApproved.length,
    additionalSoldKg,
    additionalNetMarginUsd: Number((afterLedger.netEconomicOutcomeUsd - beforeLedger.netEconomicOutcomeUsd).toFixed(2)),
  };
}
