/**
 * FreshRoute Distribution Planning Engine - Dispatch Prioritizer
 * Deterministic multi-factor scoring with stable tie-breaking for 100% reproducible ordering.
 */

import {
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EngineSolverConfig,
  EngineTransportRoute,
} from "./contracts";
import { FeasibilityAssessment } from "./feasibility";

export interface CandidateAllocationPair {
  batch: EngineInventoryBatch;
  commodity?: EngineCommodity;
  destination: EngineDestination;
  demand: EngineDemandOrder;
  route: EngineTransportRoute;
  feasibility: FeasibilityAssessment;
  priorityScore: number;
}

/**
 * Calculates a deterministic priority score for a feasible candidate pairing.
 *
 * Scoring Formula:
 *  1. FEFO Perishability Urgency: 10,000 / (RSL_days + 0.1) * spoilageAvoidanceWeight
 *  2. Net Margin Contribution: 100 * unitMarginUsd
 *  3. Retailer Tier Preference: Premium Grocer (+50), Supermarket (+30), Food Service (+10)
 *  4. Full Price vs Discount: full price (+0), salvage discount (-200) to prefer undiscounted if available
 */
export function calculatePriorityScore(
  candidate: Omit<CandidateAllocationPair, "priorityScore">,
  config: Required<EngineSolverConfig>
): number {
  const rslDays = Math.max(0.01, candidate.feasibility.handlingRslDays);
  const urgencyWeight = config.spoilageAvoidanceWeight || 1.5;

  // 1. Perishability Urgency (Higher as RSL approaches 0)
  const urgencyScore = (10000 / (rslDays + 0.1)) * urgencyWeight;

  // 2. Financial Contribution ($/kg margin)
  const marginScore = candidate.feasibility.unitMarginUsd * 100;

  // 3. Customer Tier Priority
  let tierScore = 0;
  switch (candidate.destination.tier) {
    case "PREMIUM_GROCER":
      tierScore = 50;
      break;
    case "REGIONAL_SUPERMARKET":
      tierScore = 30;
      break;
    case "FOOD_SERVICE_PROCESSOR":
      tierScore = 10;
      break;
    default:
      tierScore = 0;
      break;
  }

  // 4. Undiscounted vs Discounted Preference
  const discountAdjustment = candidate.feasibility.isSalvageDiscount ? -200 : 0;

  return urgencyScore + marginScore + tierScore + discountAdjustment;
}

/**
 * Sorts candidate allocation pairs deterministically.
 * Uses mathematical priority scores first, followed by strict alphabetical & timestamp
 * tie-breakers to guarantee bit-for-bit identical results on identical inputs.
 */
export function sortCandidatesDeterministically(
  candidates: CandidateAllocationPair[]
): CandidateAllocationPair[] {
  return [...candidates].sort((a, b) => {
    // 1. Primary: Priority Score Descending
    const scoreDiff = b.priorityScore - a.priorityScore;
    if (Math.abs(scoreDiff) > 1e-5) {
      return scoreDiff;
    }

    // 2. Tie-Breaker 1: Earliest Expiry Timestamp First (Strict FEFO)
    const expiryA = new Date(a.batch.expiryDate).getTime();
    const expiryB = new Date(b.batch.expiryDate).getTime();
    if (expiryA !== expiryB) {
      return expiryA - expiryB;
    }

    // 3. Tie-Breaker 2: Batch Code Alphabetical Ascending
    const batchCodeComp = a.batch.batchCode.localeCompare(b.batch.batchCode);
    if (batchCodeComp !== 0) {
      return batchCodeComp;
    }

    // 4. Tie-Breaker 3: Earliest Delivery Window End First
    const windowEndA = new Date(a.demand.deliveryWindowEnd).getTime();
    const windowEndB = new Date(b.demand.deliveryWindowEnd).getTime();
    if (windowEndA !== windowEndB) {
      return windowEndA - windowEndB;
    }

    // 5. Tie-Breaker 4: Demand Order Number Alphabetical Ascending
    const orderComp = a.demand.orderNumber.localeCompare(b.demand.orderNumber);
    if (orderComp !== 0) {
      return orderComp;
    }

    // 6. Tie-Breaker 5: Route Code Alphabetical Ascending
    return a.route.routeCode.localeCompare(b.route.routeCode);
  });
}
