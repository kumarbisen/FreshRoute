import Decimal from "decimal.js";
import { Celsius, CubicMeters, Days, Hours, Kilograms, Percent } from "./units";

export enum QualityGrade {
  GRADE_A = "GRADE_A",
  GRADE_B = "GRADE_B",
  GRADE_C = "GRADE_C",
}

export enum AllocationReasonCode {
  FEFO_URGENCY_PRIORITY = "FEFO_URGENCY_PRIORITY",
  SHELF_LIFE_SLA_SATISFIED = "SHELF_LIFE_SLA_SATISFIED",
  DYNAMIC_MARKDOWN_SALVAGE = "DYNAMIC_MARKDOWN_SALVAGE",
  COLD_CHAIN_COMPLIANT = "COLD_CHAIN_COMPLIANT",
  TRANSPORT_CAPACITY_OPTIMIZED = "TRANSPORT_CAPACITY_OPTIMIZED",
  SECONDARY_BUYER_MATCH = "SECONDARY_BUYER_MATCH",
  DISPATCH_WINDOW_ALIGNED = "DISPATCH_WINDOW_ALIGNED",
  REJECTED_INSUFFICIENT_SHELF_LIFE = "REJECTED_INSUFFICIENT_SHELF_LIFE",
  REJECTED_TEMPERATURE_INCOMPATIBLE = "REJECTED_TEMPERATURE_INCOMPATIBLE",
  REJECTED_VEHICLE_OVERFLOW = "REJECTED_VEHICLE_OVERFLOW",
  REJECTED_MARGIN_FLOOR_VIOLATION = "REJECTED_MARGIN_FLOOR_VIOLATION",
}

export interface DomainProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  standardShelfLifeDays: Days;
  minTempCelsius: Celsius;
  maxTempCelsius: Celsius;
  decayRateExponent: number; // e.g. 1.5
  defaultPricePerKg: Decimal;
  defaultCostPerKg: Decimal;
  wasteDisposalCostPerKg: Decimal; // Penalty cost for spoilage
}

export interface DomainBatch {
  id: string;
  batchCode: string;
  facilityId: string;
  productId: string;
  harvestDate: Date;
  receivedDate: Date;
  expiryDate: Date;
  initialQtyKg: Kilograms;
  availableQtyKg: Kilograms;
  qualityGrade: QualityGrade;
  storageTempCelsius: Celsius;
  unitCostPerKg: Decimal;
  basePricePerKg: Decimal;
}

export interface DomainCustomer {
  id: string;
  code: string;
  name: string;
  tier: "PREMIUM_GROCER" | "REGIONAL_SUPERMARKET" | "DISCOUNT_CHAIN" | "FOOD_SERVICE";
  minShelfLifeDays: Days;
  city: string;
  state: string;
  acceptsDiscounts: boolean;
  maxDiscountThreshold: Percent;
}

export interface DomainDemandOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  productId: string;
  requestedQtyKg: Kilograms;
  contractedPricePerKg: Decimal;
  deliveryWindowStart: Date;
  deliveryWindowEnd: Date;
}

export interface DomainTransportRoute {
  id: string;
  routeCode: string;
  originFacilityId: string;
  destinationRegion: string;
  maxWeightKg: Kilograms;
  maxVolumeM3: CubicMeters;
  tempZoneMinCelsius: Celsius;
  tempZoneMaxCelsius: Celsius;
  transitHours: Hours;
  costPerKg: Decimal;
  departureTime: Date;
  arrivalTime: Date;
}

export interface SolverConfiguration {
  algorithmVersion: string;
  enableDynamicMarkdowns: boolean;
  maxMarkdownPercent: Percent;
  minGrossMarginThresholdPercent: Percent; // e.g. 5%
  spoilageAvoidanceWeight: number; // Weight in objective function
}

export interface DomainAllocation {
  batchId: string;
  demandOrderId: string;
  routeId: string;
  allocatedQtyKg: Kilograms;
  discountPercent: Percent;
  effectivePricePerKg: Decimal;
  grossRevenueUsd: Decimal;
  totalCostUsd: Decimal;
  netMarginUsd: Decimal;
  arrivalShelfLifeDays: Days;
  reasonCodes: AllocationReasonCode[];
  reasonExplanation: string;
}

export interface DomainPlanSummary {
  algorithmVersion: string;
  totalAllocatedKg: Kilograms;
  unfulfilledDemandKg: Kilograms;
  surplusInventoryKg: Kilograms;
  spoiledInventoryKg: Kilograms;
  totalRevenueUsd: Decimal;
  totalCostUsd: Decimal;
  netMarginUsd: Decimal;
  averageDiscountPercent: Percent;
  slaComplianceRatePercent: Percent;
}

export interface DomainPlanResult {
  summary: DomainPlanSummary;
  allocations: DomainAllocation[];
  unallocatedBatches: Array<{
    batchId: string;
    remainingQtyKg: Kilograms;
    remainingDaysToExpiry: Days;
    estimatedSpoilageCostUsd: Decimal;
  }>;
}
