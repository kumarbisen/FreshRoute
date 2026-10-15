import { z } from "zod";

// -------------------------------------------------------------
// ENUMS & CLASSIFICATION SCHEMAS
// -------------------------------------------------------------

export const OrganizationRoleSchema = z.enum([
  "OWNER",
  "DISPATCHER",
  "PRICING_ANALYST",
  "LOGISTICS_VIEWER",
]);
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

export const QualityGradeSchema = z.enum(["GRADE_A", "GRADE_B", "GRADE_C"]);
export type QualityGrade = z.infer<typeof QualityGradeSchema>;

export const UnitOfMeasureSchema = z.enum(["KG", "PALLETS", "CASES"]);
export type UnitOfMeasure = z.infer<typeof UnitOfMeasureSchema>;

export const BatchStatusSchema = z.enum([
  "AVAILABLE",
  "ALLOCATED",
  "PARTIALLY_ALLOCATED",
  "EXPIRED",
  "SALVAGED",
]);
export type BatchStatus = z.infer<typeof BatchStatusSchema>;

export const DemandStatusSchema = z.enum([
  "PENDING",
  "ALLOCATED",
  "PARTIALLY_ALLOCATED",
  "DELIVERED",
  "CANCELLED",
]);
export type DemandStatus = z.infer<typeof DemandStatusSchema>;

export const RouteStatusSchema = z.enum([
  "SCHEDULED",
  "LOADING",
  "IN_TRANSIT",
  "COMPLETED",
  "CANCELLED",
]);
export type RouteStatus = z.infer<typeof RouteStatusSchema>;

export const PlanStatusSchema = z.enum([
  "DRAFT",
  "OPTIMIZED",
  "COMMITTED",
  "ARCHIVED",
]);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

export const DiscountStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);
export type DiscountStatus = z.infer<typeof DiscountStatusSchema>;

export const AllocationReasonCodeSchema = z.enum([
  "FEFO_URGENCY_PRIORITY",
  "SHELF_LIFE_SLA_SATISFIED",
  "DYNAMIC_MARKDOWN_SALVAGE",
  "COLD_CHAIN_COMPLIANT",
  "TRANSPORT_CAPACITY_OPTIMIZED",
  "SECONDARY_BUYER_MATCH",
  "DISPATCH_WINDOW_ALIGNED",
  "REJECTED_INSUFFICIENT_SHELF_LIFE",
  "REJECTED_TEMPERATURE_INCOMPATIBLE",
  "REJECTED_VEHICLE_OVERFLOW",
  "REJECTED_MARGIN_FLOOR_VIOLATION",
]);
export type AllocationReasonCode = z.infer<typeof AllocationReasonCodeSchema>;

// Helper for decimal representation as string or number
export const DecimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a non-negative decimal string or number",
  });

export const SignedDecimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .refine((val) => !isNaN(Number(val)), {
    message: "Must be a valid decimal string or number",
  });

// -------------------------------------------------------------
// CORE MODEL SCHEMAS
// -------------------------------------------------------------

export const CreateOrganizationSchema = z.object({
  slug: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  billingPlan: z.string().default("ENTERPRISE_COLD_CHAIN"),
});

export const CreateWarehouseSchema = z.object({
  organizationId: z.string().optional(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(2).max(20),
  latitude: SignedDecimalStringSchema,
  longitude: SignedDecimalStringSchema,
  totalCapacityKg: DecimalStringSchema,
  totalVolumeM3: DecimalStringSchema.default("1500.00"),
  coldStorageType: z.string().default("DUAL_ZONE_REFRIGERATED"),
});

export const CreateCommoditySchema = z.object({
  organizationId: z.string().optional(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  defaultUnit: UnitOfMeasureSchema.default("KG"),
  standardShelfLifeDays: z.number().int().positive(),
  minTempCelsius: DecimalStringSchema,
  maxTempCelsius: DecimalStringSchema,
  decayRateExponent: DecimalStringSchema.default("1.50"),
  defaultPricePerUnit: DecimalStringSchema,
  defaultCostPerUnit: DecimalStringSchema,
  wasteDisposalCostPerKg: DecimalStringSchema.default("0.25"),
});

export const CreateInventoryBatchSchema = z.object({
  organizationId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  commodityId: z.string().min(1, "Commodity is required"),
  batchCode: z.string().min(3).max(50),
  harvestDate: z.coerce.date(),
  receivedDate: z.coerce.date().default(() => new Date()),
  expiryDate: z.coerce.date(),
  initialQuantity: DecimalStringSchema,
  availableQuantity: DecimalStringSchema.optional(),
  reservedQuantity: DecimalStringSchema.default("0.00"),
  dispatchedQuantity: DecimalStringSchema.default("0.00"),
  spoiledQuantity: DecimalStringSchema.default("0.00"),
  unitOfMeasure: UnitOfMeasureSchema.default("KG"),
  qualityGrade: QualityGradeSchema.default("GRADE_A"),
  storageTempCelsius: DecimalStringSchema.default("2.50"),
  unitCost: DecimalStringSchema,
  basePrice: DecimalStringSchema,
  status: BatchStatusSchema.default("AVAILABLE"),
  isDemo: z.boolean().default(false),
});

export const UpdateInventoryBatchSchema = z.object({
  warehouseId: z.string().optional(),
  commodityId: z.string().optional(),
  qualityGrade: QualityGradeSchema.optional(),
  storageTempCelsius: DecimalStringSchema.optional(),
  unitCost: DecimalStringSchema.optional(),
  basePrice: DecimalStringSchema.optional(),
  expiryDate: z.coerce.date().optional(),
  status: BatchStatusSchema.optional(),
  availableQuantity: DecimalStringSchema.optional(),
  reservedQuantity: DecimalStringSchema.optional(),
  dispatchedQuantity: DecimalStringSchema.optional(),
  spoiledQuantity: DecimalStringSchema.optional(),
});

export const CreateDestinationSchema = z.object({
  organizationId: z.string().optional(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  tier: z.string().min(2).max(50), // e.g. "PREMIUM_GROCER", "SECONDARY_DISCOUNT"
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(2).max(20),
  latitude: SignedDecimalStringSchema,
  longitude: SignedDecimalStringSchema,
  minShelfLifeDays: z.coerce.number().int().positive(),
  acceptsDiscounts: z.coerce.boolean().default(false),
  maxDiscountPercent: DecimalStringSchema.default("0.00"),
  receivingHoursStart: z.string().default("04:00"),
  receivingHoursEnd: z.string().default("14:00"),
  isDemo: z.boolean().default(false),
});

export const UpdateDestinationSchema = CreateDestinationSchema.partial();

export const CreateDestinationDemandSchema = z.object({
  organizationId: z.string().optional(),
  destinationId: z.string().min(1, "Destination is required"),
  commodityId: z.string().min(1, "Commodity is required"),
  orderNumber: z.string().min(3).max(50),
  requestedQuantity: DecimalStringSchema,
  fulfilledQuantity: DecimalStringSchema.default("0.00"),
  unitOfMeasure: UnitOfMeasureSchema.default("KG"),
  contractedPricePerUnit: DecimalStringSchema,
  deliveryWindowStart: z.coerce.date(),
  deliveryWindowEnd: z.coerce.date(),
  maxReceivingLimitKg: DecimalStringSchema.optional(),
  status: DemandStatusSchema.default("PENDING"),
  isDemo: z.boolean().default(false),
});

export const UpdateDestinationDemandSchema = z.object({
  requestedQuantity: DecimalStringSchema.optional(),
  fulfilledQuantity: DecimalStringSchema.optional(),
  contractedPricePerUnit: DecimalStringSchema.optional(),
  deliveryWindowStart: z.coerce.date().optional(),
  deliveryWindowEnd: z.coerce.date().optional(),
  maxReceivingLimitKg: DecimalStringSchema.optional(),
  status: DemandStatusSchema.optional(),
});

export const CreateRouteSchema = z.object({
  organizationId: z.string().optional(),
  routeCode: z.string().min(2).max(50),
  originWarehouseId: z.string().min(1, "Origin warehouse is required"),
  destinationRegion: z.string().min(2).max(100),
  vehicleType: z.string().default("REEFER_HEAVY_TRUCK"),
  maxWeightCapacityKg: DecimalStringSchema,
  maxVolumeCapacityM3: DecimalStringSchema.default("65.00"),
  currentAvailableWeightKg: DecimalStringSchema.optional(),
  currentAvailableVolumeM3: DecimalStringSchema.default("65.00"),
  tempZoneMinCelsius: DecimalStringSchema.default("1.0"),
  tempZoneMaxCelsius: DecimalStringSchema.default("4.0"),
  transitDurationHours: DecimalStringSchema,
  handlingDurationHours: DecimalStringSchema.default("0.50"),
  fixedTripCost: DecimalStringSchema,
  variableCostPerKg: DecimalStringSchema,
  departureTime: z.coerce.date(),
  estimatedArrivalTime: z.coerce.date(),
  status: RouteStatusSchema.default("SCHEDULED"),
  isDemo: z.boolean().default(false),
});

export const UpdateRouteSchema = z.object({
  destinationRegion: z.string().optional(),
  vehicleType: z.string().optional(),
  maxWeightCapacityKg: DecimalStringSchema.optional(),
  currentAvailableWeightKg: DecimalStringSchema.optional(),
  tempZoneMinCelsius: DecimalStringSchema.optional(),
  tempZoneMaxCelsius: DecimalStringSchema.optional(),
  transitDurationHours: DecimalStringSchema.optional(),
  handlingDurationHours: DecimalStringSchema.optional(),
  fixedTripCost: DecimalStringSchema.optional(),
  variableCostPerKg: DecimalStringSchema.optional(),
  departureTime: z.coerce.date().optional(),
  estimatedArrivalTime: z.coerce.date().optional(),
  status: RouteStatusSchema.optional(),
});

export const CreateDistributionPlanSchema = z.object({
  organizationId: z.string().optional(),
  planNumber: z.string().min(3).max(50),
  status: PlanStatusSchema.default("DRAFT"),
  algorithmVersion: z.string().default("v1.0.0-fefo-elastic"),
  snapshotHash: z.string().min(64).max(64),
  planTimestamp: z.coerce.date().default(() => new Date()),
  targetDate: z.coerce.date(),
  totalAllocatedKg: DecimalStringSchema.default("0.00"),
  unfulfilledDemandKg: DecimalStringSchema.default("0.00"),
  surplusStockKg: DecimalStringSchema.default("0.00"),
  totalRevenueUsd: DecimalStringSchema.default("0.00"),
  totalCostUsd: DecimalStringSchema.default("0.00"),
  netMarginUsd: DecimalStringSchema.default("0.00"),
  spoilagePreventedKg: DecimalStringSchema.default("0.00"),
  spoilagePreventedUsd: DecimalStringSchema.default("0.00"),
  isDemo: z.boolean().default(false),
});

export const CreateAllocationSchema = z.object({
  distributionPlanId: z.string(),
  batchId: z.string(),
  destinationDemandId: z.string(),
  routeId: z.string(),
  allocatedQuantity: DecimalStringSchema,
  unitOfMeasure: UnitOfMeasureSchema.default("KG"),
  discountPercent: DecimalStringSchema.default("0.00"),
  effectivePricePerUnit: DecimalStringSchema,
  grossRevenueUsd: DecimalStringSchema,
  transportCostUsd: DecimalStringSchema,
  purchaseCostUsd: DecimalStringSchema,
  netMarginUsd: DecimalStringSchema,
  arrivalShelfLifeDays: DecimalStringSchema,
  reasonCode: AllocationReasonCodeSchema,
  reasonExplanation: z.string().min(5),
});

export const CreateDiscountRecommendationSchema = z.object({
  organizationId: z.string().optional(),
  batchId: z.string(),
  destinationId: z.string(),
  suggestedDiscountPercent: DecimalStringSchema,
  originalPricePerUnit: DecimalStringSchema,
  discountedPricePerUnit: DecimalStringSchema,
  quantityKg: DecimalStringSchema,
  estimatedDisposalLossAvoided: DecimalStringSchema,
  projectedGrossMarginUsd: DecimalStringSchema,
  status: DiscountStatusSchema.default("PENDING"),
  reasonExplanation: z.string().min(5),
});

export const CreatePlanMetricsSchema = z.object({
  distributionPlanId: z.string(),
  baselineProfitUsd: DecimalStringSchema.default("0.00"),
  proposedProfitUsd: DecimalStringSchema.default("0.00"),
  profitUpliftUsd: DecimalStringSchema.default("0.00"),
  profitUpliftPercent: DecimalStringSchema.default("0.00"),
  baselineSpoilageKg: DecimalStringSchema.default("0.00"),
  proposedSpoilageKg: DecimalStringSchema.default("0.00"),
  spoilageReductionKg: DecimalStringSchema.default("0.00"),
  spoilageReductionPercent: DecimalStringSchema.default("0.00"),
  baselineSlaCompliancePercent: DecimalStringSchema.default("0.00"),
  proposedSlaCompliancePercent: DecimalStringSchema.default("0.00"),
  baselineRejectionsCount: z.number().int().default(0),
  proposedRejectionsCount: z.number().int().default(0),
});

export const CreateScenarioSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().min(5),
  basePlanId: z.string().optional(),
  transitDelayHours: SignedDecimalStringSchema.default("0.00"),
  temperatureDeltaCelsius: SignedDecimalStringSchema.default("0.00"),
  demandMultiplierPercent: DecimalStringSchema.default("100.00"),
  fuelCostMultiplierPercent: DecimalStringSchema.default("100.00"),
  simulatedProfitDeltaUsd: SignedDecimalStringSchema.optional(),
  simulatedSpoilageDeltaKg: SignedDecimalStringSchema.optional(),
  status: z.string().default("DRAFT"),
});

// -------------------------------------------------------------
// CSV IMPORT ROW SCHEMAS
// -------------------------------------------------------------

export const InventoryCsvRowSchema = z
  .object({
    batchCode: z.string().min(2, "Batch code is required"),
    commodityCode: z.string().min(2, "Commodity code is required"),
    warehouseCode: z.string().min(2, "Warehouse code is required"),
    initialQuantityKg: z.coerce.number().positive("Quantity must be greater than 0"),
    qualityGrade: QualityGradeSchema.default("GRADE_A"),
    unitCostUsd: z.coerce.number().nonnegative("Unit cost must be non-negative").optional(),
    unitCostInr: z.coerce.number().nonnegative("Unit cost must be non-negative").optional(),
    unitCost: z.coerce.number().nonnegative("Unit cost must be non-negative").optional(),
    basePriceUsd: z.coerce.number().positive("Base price must be positive").optional(),
    basePriceInr: z.coerce.number().positive("Base price must be positive").optional(),
    basePrice: z.coerce.number().positive("Base price must be positive").optional(),
    harvestDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    storageTempCelsius: z.coerce.number().default(2.5),
  })
  .transform((row) => ({
    ...row,
    unitCostUsd: row.unitCostInr ?? row.unitCost ?? row.unitCostUsd ?? 0,
    basePriceUsd: row.basePriceInr ?? row.basePrice ?? row.basePriceUsd ?? 1,
  }));
export type InventoryCsvRow = z.infer<typeof InventoryCsvRowSchema>;

export const DestinationDemandCsvRowSchema = z.object({
  destinationCode: z.string().min(2, "Destination code is required"),
  destinationName: z.string().min(2, "Destination name is required"),
  tier: z.string().min(2, "Tier is required"),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  minShelfLifeDays: z.coerce.number().int().positive("Min shelf-life days must be >= 1"),
  acceptsDiscounts: z
    .union([z.boolean(), z.string()])
    .transform((val) => String(val).toLowerCase() === "true" || String(val).toLowerCase() === "yes")
    .default(false),
  commodityCode: z.string().min(2, "Commodity code is required"),
  orderNumber: z.string().min(2, "Order number is required"),
  requestedQuantityKg: z.coerce.number().positive("Requested quantity must be > 0"),
  contractedPricePerKg: z.coerce.number().positive("Contracted price must be > 0"),
  deliveryWindowStart: z.coerce.date(),
  deliveryWindowEnd: z.coerce.date(),
});
export type DestinationDemandCsvRow = z.infer<typeof DestinationDemandCsvRowSchema>;

export const TransportCsvRowSchema = z
  .object({
    routeCode: z.string().min(2, "Route code is required"),
    originWarehouseCode: z.string().min(2, "Origin warehouse code is required"),
    destinationRegion: z.string().min(2, "Destination region is required"),
    carrierName: z.string().min(2, "Carrier name is required"),
    vehicleType: z.string().default("REEFER_HEAVY_TRUCK"),
    maxWeightCapacityKg: z.coerce.number().positive("Max weight capacity must be > 0"),
    fixedTripCostUsd: z.coerce.number().nonnegative("Fixed trip cost must be >= 0").optional(),
    fixedTripCostInr: z.coerce.number().nonnegative("Fixed trip cost must be >= 0").optional(),
    fixedTripCost: z.coerce.number().nonnegative("Fixed trip cost must be >= 0").optional(),
    variableCostPerKgUsd: z.coerce.number().nonnegative("Variable cost must be >= 0").optional(),
    variableCostPerKgInr: z.coerce.number().nonnegative("Variable cost must be >= 0").optional(),
    variableCostPerKg: z.coerce.number().nonnegative("Variable cost must be >= 0").optional(),
    transitDurationHours: z.coerce.number().positive("Transit duration must be > 0"),
    handlingDurationHours: z.coerce.number().default(0.5),
    departureTime: z.coerce.date(),
    estimatedArrivalTime: z.coerce.date(),
  })
  .transform((row) => ({
    ...row,
    fixedTripCostUsd: row.fixedTripCostInr ?? row.fixedTripCost ?? row.fixedTripCostUsd ?? 0,
    variableCostPerKgUsd: row.variableCostPerKgInr ?? row.variableCostPerKg ?? row.variableCostPerKgUsd ?? 0,
  }));
export type TransportCsvRow = z.infer<typeof TransportCsvRowSchema>;
