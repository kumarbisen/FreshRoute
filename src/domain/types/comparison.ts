import Decimal from "decimal.js";
import { Kilograms, Percent } from "./units";
import { DomainPlanResult } from "./models";

export interface ComparativeMetricDelta {
  baselineValue: Decimal;
  proposedValue: Decimal;
  absoluteDelta: Decimal; // proposed - baseline
  percentageImprovement: Percent; // e.g. +14.2%
  isFavorable: boolean;
}

export interface PlanComparisonReport {
  baselinePlan: DomainPlanResult;
  proposedPlan: DomainPlanResult;
  metrics: {
    netProfit: ComparativeMetricDelta;
    grossRevenue: ComparativeMetricDelta;
    spoilageWeightKg: {
      baselineValue: Kilograms;
      proposedValue: Kilograms;
      weightSavedKg: Kilograms;
      reductionPercentage: Percent;
    };
    spoilageCostUsd: ComparativeMetricDelta;
    slaComplianceRate: {
      baselineRate: Percent;
      proposedRate: Percent;
      rateDelta: Percent;
    };
    averageMarginPercent: {
      baselinePercent: Percent;
      proposedPercent: Percent;
      deltaPercent: Percent;
    };
  };
  keyTakeaways: string[];
}
