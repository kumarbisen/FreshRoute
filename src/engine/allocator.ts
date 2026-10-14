/**
 * FreshRoute Distribution Planning Engine - Allocator & Capacity Tracker
 * Multi-pass allocation with shared vehicle and demand capacity tracking,
 * two-part transport cost attribution, and multi-tier leftover stock categorization.
 */

import Decimal from "decimal.js";
import {
  AllocationFactAudit,
  AllocationReasonCode,
  BatchLeftoverBreakdown,
  BindingConstraintType,
  DemandFulfillmentSummary,
  EngineAllocation,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlanMetrics,
  EngineRejection,
  EngineSolverConfig,
  EngineTransportRoute,
  LeftoverStockCategory,
  RouteUtilizationSummary,
} from "./contracts";
import { FeasibilityAssessment } from "./feasibility";
import { CandidateAllocationPair } from "./prioritizer";

export interface AllocationEngineResult {
  allocations: EngineAllocation[];
  routeDispatches: RouteUtilizationSummary[];
  batchLeftoverBreakdowns: BatchLeftoverBreakdown[];
  demandFulfillments: DemandFulfillmentSummary[];
  rejections: EngineRejection[];
  metrics: EnginePlanMetrics;
}

/**
 * Executes deterministic multi-pass allocation across prioritized candidate pairs,
 * tracking shared vehicle capacities, batch availability, and demand order fulfillment.
 */
export function executeAllocationPlan(
  sortedCandidates: CandidateAllocationPair[],
  rawBatches: EngineInventoryBatch[],
  rawDemands: EngineDemandOrder[],
  rawRoutes: EngineTransportRoute[],
  rawDestinations: EngineDestination[],
  rawCommodities: EngineCommodity[],
  initialRejections: EngineRejection[],
  config: Required<EngineSolverConfig>
): AllocationEngineResult {
  const commodityMap = new Map<string, EngineCommodity>(rawCommodities.map((c) => [c.id, c]));
  const destinationMap = new Map<string, EngineDestination>(rawDestinations.map((d) => [d.id, d]));

  // 1. Initialize State Balances with Decimal precision
  const remainingBatchStock = new Map<string, Decimal>();
  for (const b of rawBatches) {
    remainingBatchStock.set(b.id, new Decimal(b.availableQuantityKg));
  }

  const remainingDemand = new Map<string, Decimal>();
  for (const d of rawDemands) {
    remainingDemand.set(d.id, new Decimal(d.requestedQuantityKg));
  }

  const remainingRouteCapacity = new Map<string, Decimal>();
  for (const r of rawRoutes) {
    remainingRouteCapacity.set(r.id, new Decimal(r.capacityKg));
  }

  const allocatedByRoute = new Map<string, Decimal>();
  for (const r of rawRoutes) {
    allocatedByRoute.set(r.id, new Decimal(0));
  }

  const allocations: EngineAllocation[] = [];
  const runtimeRejections: EngineRejection[] = [...initialRejections];

  // 2. Multi-Pass Allocation Loop
  for (const candidate of sortedCandidates) {
    const batchId = candidate.batch.id;
    const demandId = candidate.demand.id;
    const routeId = candidate.route.id;

    const currentStock = remainingBatchStock.get(batchId) || new Decimal(0);
    const currentDemand = remainingDemand.get(demandId) || new Decimal(0);
    const currentRouteCap = remainingRouteCapacity.get(routeId) || new Decimal(0);

    // If batch stock is already exhausted
    if (currentStock.lessThanOrEqualTo(0)) {
      runtimeRejections.push({
        batchId,
        batchCode: candidate.batch.batchCode,
        demandOrderId: demandId,
        orderNumber: candidate.demand.orderNumber,
        routeId,
        routeCode: candidate.route.routeCode,
        reasonCode: AllocationReasonCode.REJECTED_BATCH_STOCK_EXHAUSTED,
        reasonExplanation: `Batch ${candidate.batch.batchCode} has 0.00 kg available stock remaining.`,
        facts: { currentStockKg: 0 },
      });
      continue;
    }

    // If demand order is already completely fulfilled
    if (currentDemand.lessThanOrEqualTo(0)) {
      runtimeRejections.push({
        batchId,
        batchCode: candidate.batch.batchCode,
        demandOrderId: demandId,
        orderNumber: candidate.demand.orderNumber,
        routeId,
        routeCode: candidate.route.routeCode,
        reasonCode: AllocationReasonCode.REJECTED_DEMAND_SATISFIED,
        reasonExplanation: `Customer demand order ${candidate.demand.orderNumber} is already 100% fulfilled.`,
        facts: { currentDemandRemainingKg: 0 },
      });
      continue;
    }

    // If vehicle capacity on this route is exhausted
    if (currentRouteCap.lessThanOrEqualTo(0)) {
      runtimeRejections.push({
        batchId,
        batchCode: candidate.batch.batchCode,
        demandOrderId: demandId,
        orderNumber: candidate.demand.orderNumber,
        routeId,
        routeCode: candidate.route.routeCode,
        reasonCode: AllocationReasonCode.REJECTED_VEHICLE_CAPACITY_EXHAUSTED,
        reasonExplanation: `Route vehicle ${candidate.route.routeCode} has reached its gross payload limit.`,
        facts: { currentRouteCapacityKg: 0 },
      });
      continue;
    }

    // Calculate maximum allowable quantity without exceeding any constraint
    let allocQty = Decimal.min(currentStock, currentDemand, currentRouteCap);

    // Round to 2 decimal places (grams)
    allocQty = allocQty.toDecimalPlaces(2, Decimal.ROUND_DOWN);

    if (allocQty.lessThanOrEqualTo(0)) {
      continue;
    }

    // Identify binding constraint
    let bindingConstraint: BindingConstraintType = "NONE";
    if (allocQty.equals(currentRouteCap) && currentRouteCap.lessThan(currentStock) && currentRouteCap.lessThan(currentDemand)) {
      bindingConstraint = "VEHICLE_CAPACITY";
    } else if (allocQty.equals(currentDemand) && currentDemand.lessThanOrEqualTo(currentStock)) {
      bindingConstraint = "DEMAND_QUANTITY";
    } else if (allocQty.equals(currentStock)) {
      bindingConstraint = "BATCH_STOCK";
    }

    // Deduct allocated quantity from running balances
    remainingBatchStock.set(batchId, currentStock.minus(allocQty));
    remainingDemand.set(demandId, currentDemand.minus(allocQty));
    remainingRouteCapacity.set(routeId, currentRouteCap.minus(allocQty));
    allocatedByRoute.set(routeId, (allocatedByRoute.get(routeId) || new Decimal(0)).plus(allocQty));

    const unitCost = new Decimal(candidate.batch.unitCostUsd);
    const effectivePrice = new Decimal(candidate.feasibility.effectivePricePerKgUsd);
    const varTransportCost = new Decimal(candidate.route.costPerKgUsd);

    const grossRevenue = allocQty.times(effectivePrice);
    const inventoryCost = allocQty.times(unitCost);

    // Initial allocation object (fixed transport cost share will be attributed in Step 3)
    const allocationId = `alloc-${candidate.batch.batchCode}-${candidate.demand.orderNumber}-${allocations.length + 1}`;

    const factAudit: AllocationFactAudit = {
      batchCode: candidate.batch.batchCode,
      orderNumber: candidate.demand.orderNumber,
      destinationCode: candidate.destination.code,
      routeCode: candidate.route.routeCode,
      allocatedKg: allocQty.toNumber(),
      departureTime: candidate.feasibility.departureTime.toISOString(),
      arrivalTime: candidate.feasibility.arrivalTime.toISOString(),
      handlingCompletedTime: candidate.feasibility.handlingCompletedTime.toISOString(),
      expiryDate: new Date(candidate.batch.expiryDate).toISOString(),
      arrivalRslDays: candidate.feasibility.arrivalRslDays,
      handlingRslDays: candidate.feasibility.handlingRslDays,
      requiredRslDays: candidate.feasibility.requiredRslDays,
      contractedPricePerKg: new Decimal(candidate.demand.contractedPricePerKgUsd).toNumber(),
      discountPercent: candidate.feasibility.recommendedDiscountPercent,
      effectivePricePerKg: effectivePrice.toNumber(),
      unitCostPerKg: unitCost.toNumber(),
      variableTransportCostPerKg: varTransportCost.toNumber(),
      allocatedFixedCostShare: 0, // calculated next
      netMarginUsd: 0, // calculated next
      bindingConstraint,
    };

    const allocReasonCodes: AllocationReasonCode[] = [];
    if (candidate.feasibility.isSalvageDiscount) {
      allocReasonCodes.push(AllocationReasonCode.DYNAMIC_MARKDOWN_SALVAGE);
    }
    if (candidate.feasibility.handlingRslDays >= candidate.feasibility.requiredRslDays) {
      allocReasonCodes.push(AllocationReasonCode.SHELF_LIFE_SLA_SATISFIED);
    }
    if (
      candidate.feasibility.handlingRslDays <= 7.0 ||
      candidate.feasibility.handlingRslDays - candidate.feasibility.requiredRslDays <= 3.0
    ) {
      allocReasonCodes.push(AllocationReasonCode.FEFO_EXPIRATION_PRIORITY);
    }
    allocReasonCodes.push(AllocationReasonCode.COLD_CHAIN_TEMPERATURE_COMPLIANT);
    allocReasonCodes.push(AllocationReasonCode.MARGIN_OPTIMIZED_MATCH);
    if (!allocReasonCodes.includes(candidate.feasibility.reasonCode)) {
      allocReasonCodes.unshift(candidate.feasibility.reasonCode);
    }

    allocations.push({
      id: allocationId,
      batchId,
      batchCode: candidate.batch.batchCode,
      commodityId: candidate.batch.commodityId,
      commodityName: candidate.commodity?.name || candidate.batch.commodityName || "Produce",
      demandOrderId: demandId,
      orderNumber: candidate.demand.orderNumber,
      destinationId: candidate.destination.id,
      destinationName: candidate.destination.name,
      routeId,
      routeCode: candidate.route.routeCode,
      allocatedQuantityKg: allocQty.toNumber(),
      discountPercent: candidate.feasibility.recommendedDiscountPercent,
      effectivePricePerKgUsd: effectivePrice.toNumber(),
      grossRevenueUsd: grossRevenue.toNumber(),
      inventoryCostUsd: inventoryCost.toNumber(),
      transportCostUsd: 0, // updated next
      netMarginUsd: 0,       // updated next
      netMarginPercent: 0,   // updated next
      departureTime: candidate.feasibility.departureTime.toISOString(),
      arrivalTime: candidate.feasibility.arrivalTime.toISOString(),
      handlingCompletedTime: candidate.feasibility.handlingCompletedTime.toISOString(),
      arrivalShelfLifeDays: candidate.feasibility.arrivalRslDays,
      handlingShelfLifeDays: candidate.feasibility.handlingRslDays,
      requiredShelfLifeDays: candidate.feasibility.requiredRslDays,
      isSalvageDiscount: candidate.feasibility.isSalvageDiscount,
      reasonCodes: allocReasonCodes,
      reasonExplanation: candidate.feasibility.reasonExplanation,
      bindingConstraint,
      auditFacts: factAudit,
    });
  }

  // 3. Two-Part Transport Cost Attribution & Route Utilization
  const routeDispatches: RouteUtilizationSummary[] = [];

  for (const r of rawRoutes) {
    const totalCap = new Decimal(r.capacityKg);
    const loadedKg = allocatedByRoute.get(r.id) || new Decimal(0);
    const remainingCap = totalCap.minus(loadedKg);
    const fixedFee = new Decimal(r.fixedCostUsd);
    const varRate = new Decimal(r.costPerKgUsd);

    let variableCost = new Decimal(0);
    let totalRouteCost = new Decimal(0);

    if (loadedKg.greaterThan(0)) {
      variableCost = loadedKg.times(varRate);
      totalRouteCost = fixedFee.plus(variableCost);
    }

    const routeAllocations = allocations.filter((a) => a.routeId === r.id);

    // Distribute fixed fee proportionally based on mass fraction
    for (const alloc of routeAllocations) {
      const allocKg = new Decimal(alloc.allocatedQuantityKg);
      const varCostAlloc = allocKg.times(varRate);
      const fixedShare = loadedKg.greaterThan(0)
        ? fixedFee.times(allocKg.dividedBy(loadedKg))
        : new Decimal(0);

      const totalAllocTransportCost = varCostAlloc.plus(fixedShare);
      const grossRev = new Decimal(alloc.grossRevenueUsd);
      const invCost = new Decimal(alloc.inventoryCostUsd);
      const netMargin = grossRev.minus(invCost).minus(totalAllocTransportCost);
      const marginPct = grossRev.greaterThan(0)
        ? netMargin.dividedBy(grossRev).times(100)
        : new Decimal(0);

      alloc.transportCostUsd = totalAllocTransportCost.toDecimalPlaces(2).toNumber();
      alloc.netMarginUsd = netMargin.toDecimalPlaces(2).toNumber();
      alloc.netMarginPercent = marginPct.toDecimalPlaces(2).toNumber();

      alloc.auditFacts.allocatedFixedCostShare = fixedShare.toDecimalPlaces(2).toNumber();
      alloc.auditFacts.netMarginUsd = alloc.netMarginUsd;
    }

    const utilPct = totalCap.greaterThan(0)
      ? loadedKg.dividedBy(totalCap).times(100).toNumber()
      : 0;

    const departureTime = new Date(r.departureTime);
    const arrivalTime = new Date(departureTime.getTime() + r.transitDurationHours * 3600 * 1000);

    routeDispatches.push({
      routeId: r.id,
      routeCode: r.routeCode,
      originWarehouseId: r.originWarehouseId,
      destinationId: r.destinationId,
      totalCapacityKg: totalCap.toNumber(),
      loadedKg: loadedKg.toNumber(),
      remainingCapacityKg: Math.max(0, remainingCap.toNumber()),
      utilizationPercent: Number(utilPct.toFixed(1)),
      fixedCostUsd: fixedFee.toNumber(),
      variableCostUsd: variableCost.toDecimalPlaces(2).toNumber(),
      totalCostUsd: totalRouteCost.toDecimalPlaces(2).toNumber(),
      batchCount: routeAllocations.length,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
    });
  }

  // 4. Leftover Inventory Breakdown (Explicit multi-tier categorization)
  const planningTime = new Date(config.planningTime);
  const disposalPenalty = new Decimal(config.disposalPenaltyPerKgUsd);
  const batchLeftoverBreakdowns: BatchLeftoverBreakdown[] = [];

  for (const b of rawBatches) {
    const initKg = new Decimal(b.availableQuantityKg);
    const remainingKg = remainingBatchStock.get(b.id) || new Decimal(0);
    const allocKg = initKg.minus(remainingKg);

    const expiryDate = new Date(b.expiryDate);
    const remainingRslHours = (expiryDate.getTime() - planningTime.getTime()) / (3600 * 1000);
    const remainingRslDays = remainingRslHours / 24;

    const commodity = commodityMap.get(b.commodityId);
    const commodityName = commodity?.name || b.commodityName || "Produce";
    const unitCost = new Decimal(b.unitCostUsd);

    let category: LeftoverStockCategory = "FULLY_ALLOCATED";
    let unallocatedFeasibleKg = 0;
    let atRiskKg = 0;
    let infeasibleKg = 0;
    let spoiledKg = 0;
    let estimatedSpoilageLoss = 0;
    let explanation = `Batch ${b.batchCode} fully dispatched (${allocKg.toFixed(2)} kg allocated).`;

    if (remainingKg.greaterThan(0)) {
      const remVal = remainingKg.toNumber();

      if (remainingRslHours <= 0) {
        // Expired before or at planning timestamp
        category = "SPOILED_EXPIRED";
        spoiledKg = remVal;
        estimatedSpoilageLoss = remainingKg.times(unitCost.plus(disposalPenalty)).toDecimalPlaces(2).toNumber();
        explanation = `Expired before dispatch. Incurs 100% procurement write-off plus bio-waste disposal fees.`;
      } else {
        // Test if this batch could theoretically reach ANY destination without capacity limits
        let couldReachAny = false;
        for (const dest of rawDestinations) {
          const matchingRoutes = rawRoutes.filter(
            (r) => r.originWarehouseId === b.warehouseId && r.destinationId === dest.id
          );
          for (const rt of matchingRoutes) {
            // Check cold-chain
            const bTemp = Number(b.storageTempCelsius);
            if (bTemp >= rt.tempZoneMinCelsius && bTemp <= rt.tempZoneMaxCelsius) {
              const transitMs = rt.transitDurationHours * 3600 * 1000;
              const handlingMs = rt.handlingDurationHours * 3600 * 1000;
              const arrMs = new Date(rt.departureTime).getTime() + transitMs;
              const handMs = arrMs + handlingMs;
              const hRslDays = (expiryDate.getTime() - handMs) / (24 * 3600 * 1000);
              if (hRslDays >= dest.minShelfLifeDays || (dest.acceptsDiscounts && hRslDays > 0)) {
                couldReachAny = true;
                break;
              }
            }
          }
          if (couldReachAny) break;
        }

        if (!couldReachAny) {
          // Hard physical/quality constraint failure
          category = "INFEASIBLE_CONSTRAINTS";
          infeasibleKg = remVal;
          explanation = `Could not reach any destination buyer due to transit duration exceeding shelf life or reefer temperature incompatibility.`;
        } else if (remainingRslHours <= 48) {
          // Feasible but critically close to expiration
          category = "AT_RISK";
          atRiskKg = remVal;
          estimatedSpoilageLoss = remainingKg.times(unitCost.plus(disposalPenalty)).toDecimalPlaces(2).toNumber();
          explanation = `Shelf-life critical (remaining RSL ${remainingRslHours.toFixed(1)}h). Unallocated due to network demand saturation or vehicle capacity limits. High risk of near-term spoilage.`;
        } else {
          // Healthy surplus inventory with ample life
          category = "UNALLOCATED_FEASIBLE";
          unallocatedFeasibleKg = remVal;
          explanation = `Healthy surplus stock with ${remainingRslDays.toFixed(1)} days of shelf life. Available for subsequent planning horizon dispatches.`;
        }
      }
    }

    batchLeftoverBreakdowns.push({
      batchId: b.id,
      batchCode: b.batchCode,
      commodityName,
      initialAvailableKg: initKg.toNumber(),
      allocatedKg: allocKg.toNumber(),
      unallocatedKg: remainingKg.toNumber(),
      unallocatedFeasibleKg,
      atRiskKg,
      infeasibleKg,
      spoiledKg,
      category,
      remainingRslDaysAtPlanning: Number(remainingRslDays.toFixed(2)),
      estimatedSpoilageLossUsd: estimatedSpoilageLoss,
      explanation,
    });
  }

  // 5. Demand Fulfillment Summary
  const demandFulfillments: DemandFulfillmentSummary[] = [];

  for (const d of rawDemands) {
    const reqKg = new Decimal(d.requestedQuantityKg);
    const remKg = remainingDemand.get(d.id) || new Decimal(0);
    const fulKg = reqKg.minus(remKg);
    const dest = destinationMap.get(d.destinationId);
    const commodity = commodityMap.get(d.commodityId);

    const fillRate = reqKg.greaterThan(0)
      ? fulKg.dividedBy(reqKg).times(100).toNumber()
      : 0;

    let status: "FULFILLED" | "PARTIALLY_FULFILLED" | "UNFULFILLED" = "UNFULFILLED";
    if (fulKg.equals(reqKg)) {
      status = "FULFILLED";
    } else if (fulKg.greaterThan(0)) {
      status = "PARTIALLY_FULFILLED";
    }

    demandFulfillments.push({
      demandOrderId: d.id,
      orderNumber: d.orderNumber,
      destinationId: d.destinationId,
      destinationName: dest?.name || "Buyer Destination",
      commodityName: commodity?.name || "Produce",
      requestedKg: reqKg.toNumber(),
      fulfilledKg: fulKg.toNumber(),
      unfulfilledKg: remKg.toNumber(),
      fillRatePercent: Number(fillRate.toFixed(1)),
      status,
    });
  }

  // 6. Overall Plan Metrics Calculation
  let totalAllocatedKg = 0;
  let grossRevenueUsd = 0;
  let inventoryCostUsd = 0;
  let transportCostUsd = 0;
  let netMarginUsd = 0;

  for (const a of allocations) {
    totalAllocatedKg += a.allocatedQuantityKg;
    grossRevenueUsd += a.grossRevenueUsd;
    inventoryCostUsd += a.inventoryCostUsd;
    transportCostUsd += a.transportCostUsd;
    netMarginUsd += a.netMarginUsd;
  }

  let totalSpoiledDisposalPenalty = 0;
  let totalSpoiledKg = 0;
  let totalAtRiskKg = 0;
  let totalSurplusKg = 0;

  for (const l of batchLeftoverBreakdowns) {
    totalSpoiledKg += l.spoiledKg;
    totalAtRiskKg += l.atRiskKg;
    totalSurplusKg += l.unallocatedFeasibleKg;
    if (l.spoiledKg > 0) {
      totalSpoiledDisposalPenalty += l.spoiledKg * disposalPenalty.toNumber();
    }
  }

  netMarginUsd -= totalSpoiledDisposalPenalty;

  const totalRequestedDemandKg = rawDemands.reduce(
    (acc, d) => acc + new Decimal(d.requestedQuantityKg).toNumber(),
    0
  );
  const totalUnfulfilledDemandKg = demandFulfillments.reduce(
    (acc, f) => acc + f.unfulfilledKg,
    0
  );

  const demandFillRatePercent = totalRequestedDemandKg > 0
    ? Number(((totalAllocatedKg / totalRequestedDemandKg) * 100).toFixed(1))
    : 100;

  const slaCompliantAllocations = allocations.filter((a) => !a.isSalvageDiscount).length;
  const slaComplianceRatePercent = allocations.length > 0
    ? Number(((slaCompliantAllocations / allocations.length) * 100).toFixed(1))
    : 100;

  const netMarginPercent = grossRevenueUsd > 0
    ? Number(((netMarginUsd / grossRevenueUsd) * 100).toFixed(2))
    : 0;

  // Spoilage prevented: produce dispatched that would have spoiled if unallocated
  const spoilagePreventedKg = allocations.filter(
    (a) => a.handlingShelfLifeDays <= 3.0 || a.isSalvageDiscount
  ).reduce((acc, a) => acc + a.allocatedQuantityKg, 0);

  const spoilagePreventedValueUsd = allocations.filter(
    (a) => a.handlingShelfLifeDays <= 3.0 || a.isSalvageDiscount
  ).reduce((acc, a) => acc + a.grossRevenueUsd, 0);

  const activeRoutesCount = routeDispatches.filter((r) => r.loadedKg > 0).length;

  const metrics: EnginePlanMetrics = {
    totalAllocatedKg: Number(totalAllocatedKg.toFixed(2)),
    totalRequestedDemandKg: Number(totalRequestedDemandKg.toFixed(2)),
    totalUnfulfilledDemandKg: Number(totalUnfulfilledDemandKg.toFixed(2)),
    totalSurplusInventoryKg: Number(totalSurplusKg.toFixed(2)),
    totalAtRiskInventoryKg: Number(totalAtRiskKg.toFixed(2)),
    totalSpoiledInventoryKg: Number(totalSpoiledKg.toFixed(2)),
    demandFillRatePercent,
    slaComplianceRatePercent,
    grossRevenueUsd: Number(grossRevenueUsd.toFixed(2)),
    inventoryCostUsd: Number(inventoryCostUsd.toFixed(2)),
    transportCostUsd: Number(transportCostUsd.toFixed(2)),
    spoilageDisposalPenaltyUsd: Number(totalSpoiledDisposalPenalty.toFixed(2)),
    netMarginUsd: Number(netMarginUsd.toFixed(2)),
    netMarginPercent,
    spoilagePreventedKg: Number(spoilagePreventedKg.toFixed(2)),
    spoilagePreventedValueUsd: Number(spoilagePreventedValueUsd.toFixed(2)),
    totalAllocationsCount: allocations.length,
    activeRoutesCount,
  };

  return {
    allocations,
    routeDispatches,
    batchLeftoverBreakdowns,
    demandFulfillments,
    rejections: runtimeRejections,
    metrics,
  };
}
