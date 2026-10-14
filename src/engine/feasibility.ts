/**
 * FreshRoute Distribution Planning Engine - Feasibility Evaluator
 * Pure deterministic validation of physical, temporal, quality, and economic constraints.
 */

import Decimal from "decimal.js";
import {
  AllocationReasonCode,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EngineSolverConfig,
  EngineTransportRoute,
} from "./contracts";

export interface FeasibilityAssessment {
  isFeasible: boolean;
  isSalvageDiscount: boolean;
  recommendedDiscountPercent: number;
  effectivePricePerKgUsd: number;
  reasonCode: AllocationReasonCode;
  reasonExplanation: string;
  departureTime: Date;
  arrivalTime: Date;
  handlingCompletedTime: Date;
  arrivalRslDays: number;
  handlingRslDays: number;
  requiredRslDays: number;
  unitMarginUsd: number;
  facts: Record<string, string | number | boolean>;
}

/**
 * Evaluates whether a candidate pairing of (Batch, Demand Order, Transport Route)
 * is feasible under cold-chain, delivery window, shelf-life SLA, and economic margin rules.
 */
export function evaluateCandidateFeasibility(
  batch: EngineInventoryBatch,
  commodity: EngineCommodity | undefined,
  destination: EngineDestination,
  demand: EngineDemandOrder,
  route: EngineTransportRoute,
  config: Required<EngineSolverConfig>
): FeasibilityAssessment {
  const facts: Record<string, string | number | boolean> = {
    batchCode: batch.batchCode,
    orderNumber: demand.orderNumber,
    routeCode: route.routeCode,
    destinationCode: destination.code,
    destinationTier: destination.tier,
  };

  // 1. Commodity Match
  if (batch.commodityId !== demand.commodityId) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_COMMODITY_MISMATCH,
      reasonExplanation: `Batch commodity ${batch.commodityId} does not match order requirement ${demand.commodityId}.`,
      departureTime: new Date(route.departureTime),
      arrivalTime: new Date(route.departureTime),
      handlingCompletedTime: new Date(route.departureTime),
      arrivalRslDays: 0,
      handlingRslDays: 0,
      requiredRslDays: destination.minShelfLifeDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  // 2. Route Origin & Destination Connectivity
  if (route.originWarehouseId !== batch.warehouseId || route.destinationId !== destination.id) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_ROUTE_NOT_CONNECTED,
      reasonExplanation: `Route ${route.routeCode} originates at ${route.originWarehouseId} and terminates at ${route.destinationId}, but allocation requires ${batch.warehouseId} -> ${destination.id}.`,
      departureTime: new Date(route.departureTime),
      arrivalTime: new Date(route.departureTime),
      handlingCompletedTime: new Date(route.departureTime),
      arrivalRslDays: 0,
      handlingRslDays: 0,
      requiredRslDays: destination.minShelfLifeDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  // 3. Cold-Chain Temperature Range Compatibility
  const batchTemp = new Decimal(batch.storageTempCelsius).toNumber();
  const routeMinTemp = Number(route.tempZoneMinCelsius);
  const routeMaxTemp = Number(route.tempZoneMaxCelsius);

  facts.batchStorageTempCelsius = batchTemp;
  facts.routeTempZoneMin = routeMinTemp;
  facts.routeTempZoneMax = routeMaxTemp;

  if (batchTemp < routeMinTemp || batchTemp > routeMaxTemp) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_TEMPERATURE_INCOMPATIBLE,
      reasonExplanation: `Produce requires ${batchTemp}°C storage, but carrier route ${route.routeCode} reefer bounds are [${routeMinTemp}°C, ${routeMaxTemp}°C]. Cold-chain violation.`,
      departureTime: new Date(route.departureTime),
      arrivalTime: new Date(route.departureTime),
      handlingCompletedTime: new Date(route.departureTime),
      arrivalRslDays: 0,
      handlingRslDays: 0,
      requiredRslDays: destination.minShelfLifeDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  // 4. Absolute Timeline Milestones
  const departureTime = new Date(route.departureTime);
  const transitMs = Number(route.transitDurationHours) * 3600 * 1000;
  const handlingMs = Number(route.handlingDurationHours) * 3600 * 1000;

  const arrivalTime = new Date(departureTime.getTime() + transitMs);
  const handlingCompletedTime = new Date(arrivalTime.getTime() + handlingMs);

  const windowStart = new Date(demand.deliveryWindowStart);
  const windowEnd = new Date(demand.deliveryWindowEnd);

  facts.departureTime = departureTime.toISOString();
  facts.arrivalTime = arrivalTime.toISOString();
  facts.handlingCompletedTime = handlingCompletedTime.toISOString();
  facts.windowStart = windowStart.toISOString();
  facts.windowEnd = windowEnd.toISOString();

  // Arrival must be on or before the delivery window end
  if (arrivalTime.getTime() > windowEnd.getTime()) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_DELIVERY_WINDOW_MISSED,
      reasonExplanation: `Estimated arrival ${arrivalTime.toISOString()} misses customer receiving window deadline ${windowEnd.toISOString()}.`,
      departureTime,
      arrivalTime,
      handlingCompletedTime,
      arrivalRslDays: 0,
      handlingRslDays: 0,
      requiredRslDays: destination.minShelfLifeDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  // Arrival must not be prematurely early if receiving dock is not open
  // If arrival is before windowStart, check if destination allows staging/dock wait (default max 12 hours)
  const maxEarlyBufferMs = 12 * 3600 * 1000;
  if (arrivalTime.getTime() < windowStart.getTime() - maxEarlyBufferMs) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_DELIVERY_WINDOW_PREMATURE,
      reasonExplanation: `Estimated arrival ${arrivalTime.toISOString()} is more than 12 hours before receiving dock opens at ${windowStart.toISOString()}.`,
      departureTime,
      arrivalTime,
      handlingCompletedTime,
      arrivalRslDays: 0,
      handlingRslDays: 0,
      requiredRslDays: destination.minShelfLifeDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  // 5. Remaining Shelf-Life (RSL) Evaluation at Handling Completion
  const expiryDate = new Date(batch.expiryDate);
  facts.expiryDate = expiryDate.toISOString();

  const arrivalRslMs = expiryDate.getTime() - arrivalTime.getTime();
  const handlingRslMs = expiryDate.getTime() - handlingCompletedTime.getTime();

  const arrivalRslDays = arrivalRslMs / (24 * 3600 * 1000);
  const handlingRslDays = handlingRslMs / (24 * 3600 * 1000);

  const safetyBufferDays = config.shelfLifeSafetyBufferHours / 24;
  const requiredRslDays = destination.minShelfLifeDays + safetyBufferDays;

  facts.arrivalRslDays = Number(arrivalRslDays.toFixed(2));
  facts.handlingRslDays = Number(handlingRslDays.toFixed(2));
  facts.requiredRslDays = Number(requiredRslDays.toFixed(2));

  // Batch is completely expired before arrival / handling
  if (handlingRslDays <= 0) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_INSUFFICIENT_SHELF_LIFE,
      reasonExplanation: `Produce will expire before unloading completes at dock. Handling RSL is ${handlingRslDays.toFixed(2)} days. 100% spoilage.`,
      departureTime,
      arrivalTime,
      handlingCompletedTime,
      arrivalRslDays,
      handlingRslDays,
      requiredRslDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  const contractedPrice = new Decimal(demand.contractedPricePerKgUsd);
  const unitCost = new Decimal(batch.unitCostUsd);
  const varTransportCost = new Decimal(route.costPerKgUsd);
  const disposalPenalty = new Decimal(config.disposalPenaltyPerKgUsd);

  // 6. Primary SLA Check vs Dynamic Markdown Opportunity
  let isSalvageDiscount = false;
  let recommendedDiscount = 0;
  let effectivePrice = contractedPrice;

  const breachesPrimarySla = handlingRslDays < requiredRslDays;
  const isSecondarySalvageChannel = destination.acceptsDiscounts && (
    breachesPrimarySla ||
    destination.tier === "DISCOUNT_CHAIN" ||
    destination.tier === "FOOD_SERVICE_PROCESSOR" ||
    handlingRslDays <= 5.0
  );

  if (breachesPrimarySla && (!config.enableDynamicMarkdowns || !destination.acceptsDiscounts)) {
    return {
      isFeasible: false,
      isSalvageDiscount: false,
      recommendedDiscountPercent: 0,
      effectivePricePerKgUsd: 0,
      reasonCode: AllocationReasonCode.REJECTED_INSUFFICIENT_SHELF_LIFE,
      reasonExplanation: `Handling RSL of ${handlingRslDays.toFixed(2)} days breaches retailer minimum gate SLA of ${destination.minShelfLifeDays} days (safety buffer: ${config.shelfLifeSafetyBufferHours}h). Destination does not accept discounts.`,
      departureTime,
      arrivalTime,
      handlingCompletedTime,
      arrivalRslDays,
      handlingRslDays,
      requiredRslDays,
      unitMarginUsd: 0,
      facts,
    };
  }

  if (config.enableDynamicMarkdowns && isSecondarySalvageChannel) {
    // Destination accepts dynamic markdown salvage
    const standardLife = commodity?.standardShelfLifeDays || 14;
    const decayRatio = Math.max(0, Math.min(1, 1 - (handlingRslDays / standardLife)));
    const decayExp = commodity?.decayRateExponent || 1.5;
    const calculatedDiscount = Math.min(
      destination.maxDiscountPercent,
      config.maxMarkdownPercent,
      Math.round(Math.pow(decayRatio, decayExp) * config.maxMarkdownPercent * 10) / 10
    );

    const minIncentive = breachesPrimarySla ? 5 : 0;
    const finalDiscount = Math.max(minIncentive, calculatedDiscount);

    if (finalDiscount > 0) {
      recommendedDiscount = finalDiscount;
      const discountMultiplier = new Decimal(1).minus(new Decimal(recommendedDiscount).dividedBy(100));
      effectivePrice = contractedPrice.times(discountMultiplier);
      isSalvageDiscount = true;

      facts.recommendedDiscountPercent = recommendedDiscount;
      facts.effectivePricePerKg = Number(effectivePrice.toFixed(4));
    }
  }

  // 7. Economic Feasibility & Margin Floor Check
  const netUnitMargin = effectivePrice.minus(unitCost).minus(varTransportCost);
  const unitMarginVal = Number(netUnitMargin.toFixed(4));
  facts.netUnitMargin = unitMarginVal;

  // Margin Floor: net return must be strictly better than writing off product at -disposalPenalty
  const marginFloor = disposalPenalty.negated();
  if (netUnitMargin.lessThanOrEqualTo(marginFloor)) {
    return {
      isFeasible: false,
      isSalvageDiscount,
      recommendedDiscountPercent: recommendedDiscount,
      effectivePricePerKgUsd: Number(effectivePrice.toFixed(4)),
      reasonCode: AllocationReasonCode.REJECTED_NEGATIVE_MARGIN,
      reasonExplanation: `Net margin of $${unitMarginVal.toFixed(2)}/kg is worse than spoilage disposal penalty (-$${disposalPenalty.toFixed(2)}/kg). Economically infeasible.`,
      departureTime,
      arrivalTime,
      handlingCompletedTime,
      arrivalRslDays,
      handlingRslDays,
      requiredRslDays,
      unitMarginUsd: unitMarginVal,
      facts,
    };
  }

  // ALL CHECKS PASSED: Candidate is feasible!
  const reasonCode = isSalvageDiscount
    ? AllocationReasonCode.DYNAMIC_MARKDOWN_SALVAGE
    : handlingRslDays <= 3.0
    ? AllocationReasonCode.FEFO_EXPIRATION_PRIORITY
    : AllocationReasonCode.SHELF_LIFE_SLA_SATISFIED;

  const reasonExplanation = isSalvageDiscount
    ? `Salvage discount of ${recommendedDiscount}% applied to recover at-risk produce (${handlingRslDays.toFixed(2)}d RSL vs ${destination.minShelfLifeDays}d SLA). Yields net contribution of $${unitMarginVal.toFixed(2)}/kg.`
    : `Feasible dispatch satisfying cold-chain, delivery window, and gate SLA with ${handlingRslDays.toFixed(2)} days RSL at handling completion.`;

  return {
    isFeasible: true,
    isSalvageDiscount,
    recommendedDiscountPercent: recommendedDiscount,
    effectivePricePerKgUsd: Number(effectivePrice.toFixed(4)),
    reasonCode,
    reasonExplanation,
    departureTime,
    arrivalTime,
    handlingCompletedTime,
    arrivalRslDays,
    handlingRslDays,
    requiredRslDays,
    unitMarginUsd: unitMarginVal,
    facts,
  };
}
