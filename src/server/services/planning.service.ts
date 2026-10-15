import Decimal from "decimal.js";
import crypto from "crypto";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import {
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlannerInput,
  EnginePlanOutput,
  EngineSolverConfig,
  EngineTransportRoute,
  ScenarioEvaluationRun,
} from "@/engine/contracts";
import { evaluateScenario } from "@/engine/evaluator";
import { computeCanonicalInputSnapshotHash } from "@/engine/planner";
import { DEMO_ORGANIZATION_ID } from "./data-foundation.service";

// ============================================================================
// 1. REASON CODE MAPPING & TYPES
// ============================================================================

export function mapEngineReasonToPrisma(engineReason: string): string {
  switch (engineReason) {
    case "FEFO_EXPIRATION_PRIORITY":
    case "FEFO_URGENCY_PRIORITY":
      return "FEFO_URGENCY_PRIORITY";
    case "DYNAMIC_MARKDOWN_SALVAGE":
      return "DYNAMIC_MARKDOWN_SALVAGE";
    case "COLD_CHAIN_TEMPERATURE_COMPLIANT":
    case "COLD_CHAIN_COMPLIANT":
      return "COLD_CHAIN_COMPLIANT";
    case "MARGIN_OPTIMIZED_MATCH":
    case "TRANSPORT_CAPACITY_OPTIMIZED":
      return "TRANSPORT_CAPACITY_OPTIMIZED";
    case "REJECTED_INSUFFICIENT_SHELF_LIFE":
      return "REJECTED_INSUFFICIENT_SHELF_LIFE";
    case "REJECTED_TEMPERATURE_INCOMPATIBLE":
      return "REJECTED_TEMPERATURE_INCOMPATIBLE";
    case "REJECTED_VEHICLE_CAPACITY_EXHAUSTED":
    case "REJECTED_VEHICLE_OVERFLOW":
      return "REJECTED_VEHICLE_OVERFLOW";
    case "REJECTED_NEGATIVE_MARGIN":
    case "REJECTED_MARGIN_FLOOR_VIOLATION":
      return "REJECTED_MARGIN_FLOOR_VIOLATION";
    case "SHELF_LIFE_SLA_SATISFIED":
    case "STANDARD_DISPATCH_NOMINAL":
    default:
      return "SHELF_LIFE_SLA_SATISFIED";
  }
}

export interface PlanningReadinessResult {
  isReady: boolean;
  reasons: string[];
  warnings: string[];
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    city: string;
    batchCount: number;
    availableKg: number;
  }>;
  summary: {
    selectedWarehouseId?: string;
    availableBatchesCount: number;
    totalAvailableStockKg: number;
    criticalBatchesCount: number;
    pendingDemandsCount: number;
    totalRequestedDemandKg: number;
    activeRoutesCount: number;
    totalRouteCapacityKg: number;
    commoditiesCount: number;
    destinationsCount: number;
    matchedCommoditiesCount: number;
  };
}

export interface GeneratePlanOptions {
  warehouseId?: string;
  targetDate?: string;
  config?: Partial<EngineSolverConfig>;
}

export interface DistributionPlanListItem {
  id: string;
  planNumber: string;
  status: "DRAFT" | "OPTIMIZED" | "COMMITTED" | "ARCHIVED";
  algorithmVersion: string;
  snapshotHash: string;
  planTimestamp: string;
  targetDate: string;
  totalAllocatedKg: number;
  unfulfilledDemandKg: number;
  surplusStockKg: number;
  totalRevenueUsd: number;
  totalCostUsd: number;
  netMarginUsd: number;
  spoilagePreventedKg: number;
  spoilagePreventedUsd: number;
  allocationsCount: number;
  profitUpliftPercent?: number;
  profitUpliftUsd?: number;
  spoilageReductionPercent?: number;
  winnerStatus?: string;
  createdAt: string;
}

export interface DistributionPlanDetail extends DistributionPlanListItem {
  organizationId: string;
  snapshot?: {
    snapshotJson: string;
    hashSha256: string;
  };
  metrics?: {
    baselineProfitUsd: number;
    proposedProfitUsd: number;
    profitUpliftUsd: number;
    profitUpliftPercent: number;
    baselineSpoilageKg: number;
    proposedSpoilageKg: number;
    spoilageReductionKg: number;
    spoilageReductionPercent: number;
    baselineSlaCompliancePercent: number;
    proposedSlaCompliancePercent: number;
    baselineRejectionsCount: number;
    proposedRejectionsCount: number;
    proposedFulfillmentKg?: number;
    baselineFulfillmentKg?: number;
    fulfillmentRateDeltaPercent?: number;
    strategyWinner?: string;
  };
  allocations: Array<{
    id: string;
    batchId: string;
    batchCode: string;
    commodityId: string;
    commodityName: string;
    destinationDemandId: string;
    orderNumber: string;
    destinationId: string;
    destinationName: string;
    destinationCode: string;
    routeId: string;
    routeCode: string;
    allocatedQuantity: number;
    discountPercent: number;
    effectivePricePerUnit: number;
    grossRevenueUsd: number;
    transportCostUsd: number;
    purchaseCostUsd: number;
    netMarginUsd: number;
    arrivalShelfLifeDays: number;
    reasonCode: string;
    reasonExplanation: string;
    createdAt: string;
  }>;
  evaluationRun?: ScenarioEvaluationRun;
}

// ============================================================================
// 2. ROUTE TO DESTINATION MATCHER
// ============================================================================

/**
 * Matches a database Route to Destinations it can service.
 * Considers explicit destination ID/code, city matches, regional coverage patterns,
 * and standard logistics corridors.
 */
export function matchRouteToDestinations(
  route: { id: string; routeCode: string; destinationRegion: string },
  destinations: Array<{ id: string; code: string; name: string; city: string; state: string }>
): Array<{ id: string; code: string; name: string; city: string; state: string }> {
  const regLower = route.destinationRegion.toLowerCase().trim();
  const matched: Array<{ id: string; code: string; name: string; city: string; state: string }> = [];

  for (const dest of destinations) {
    const destCityLower = dest.city.toLowerCase().trim();
    const destCodeLower = dest.code.toLowerCase().trim();
    const destNameLower = dest.name.toLowerCase().trim();

    // 1. Exact ID or Code Match
    if (route.destinationRegion === dest.id || regLower === destCodeLower) {
      matched.push(dest);
      continue;
    }

    // 2. Direct City or Name Match
    if (regLower.includes(destCityLower) || destCityLower.includes(regLower) || destNameLower.includes(regLower)) {
      matched.push(dest);
      continue;
    }

    // 3. Known California Logistics Corridors
    const isBayAreaDest = ["san francisco", "oakland", "hayward", "berkeley", "fremont", "san jose"].includes(destCityLower);
    if (regLower.includes("bay") && isBayAreaDest) {
      matched.push(dest);
      continue;
    }

    if (regLower.includes("east bay") && ["oakland", "hayward", "berkeley", "fremont"].includes(destCityLower)) {
      matched.push(dest);
      continue;
    }

    if (regLower.includes("sacramento") && destCityLower.includes("sacramento")) {
      matched.push(dest);
      continue;
    }

    if (regLower.includes("central valley") && ["fresno", "sacramento", "bakersfield", "stockton"].includes(destCityLower)) {
      matched.push(dest);
      continue;
    }
  }

  // Fallback: If no destination specifically matched by region rules,
  // allow the route to serve all active destinations within the state / default set
  if (matched.length === 0 && destinations.length > 0) {
    return destinations;
  }

  return matched;
}

// ============================================================================
// 3. READINESS CHECK SERVICE
// ============================================================================

export async function checkPlanningReadiness(
  organizationId: string,
  warehouseId?: string
): Promise<PlanningReadinessResult> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // 1. Fetch Warehouses for organization with their stock counts
  const whQuery = await db.query<any>(
    `
    SELECT 
      w.id,
      w.code,
      w.name,
      w.city,
      COUNT(b.id)::int as "batchCount",
      COALESCE(SUM(b."availableQuantity"), 0)::float as "availableKg"
    FROM "Warehouse" w
    LEFT JOIN "InventoryBatch" b ON w.id = b."warehouseId" AND b.status IN ('AVAILABLE', 'PARTIALLY_ALLOCATED') AND b."availableQuantity" > 0
    WHERE w."organizationId" = $1
    GROUP BY w.id
    ORDER BY w.code ASC;
  `,
    [organizationId]
  );

  const warehouses = whQuery.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    city: r.city,
    batchCount: Number(r.batchCount || 0),
    availableKg: Number(r.availableKg || 0),
  }));

  // Selected warehouse filter clause
  const whFilter = warehouseId && warehouseId !== "ALL" ? `AND b."warehouseId" = '${warehouseId}'` : "";
  const routeWhFilter = warehouseId && warehouseId !== "ALL" ? `AND r."originWarehouseId" = '${warehouseId}'` : "";

  // 2. Query available batches
  const batchesQuery = await db.query<any>(
    `
    SELECT 
      b.id,
      b."batchCode",
      b."commodityId",
      b."availableQuantity",
      b."expiryDate"
    FROM "InventoryBatch" b
    WHERE b."organizationId" = $1 
      AND b.status IN ('AVAILABLE', 'PARTIALLY_ALLOCATED')
      AND b."availableQuantity" > 0
      ${whFilter};
  `,
    [organizationId]
  );

  const now = new Date();
  let criticalBatchesCount = 0;
  let totalAvailableStockKg = 0;
  const availableCommodityIds = new Set<string>();

  for (const b of batchesQuery.rows) {
    const qty = Number(b.availableQuantity);
    totalAvailableStockKg += qty;
    availableCommodityIds.add(b.commodityId);

    const expiry = new Date(b.expiryDate);
    const remainingDays = (expiry.getTime() - now.getTime()) / (24 * 3600 * 1000);
    if (remainingDays <= 2.0 && remainingDays > 0) {
      criticalBatchesCount++;
    }
  }

  // 3. Query pending demands
  const demandsQuery = await db.query<any>(
    `
    SELECT 
      d.id,
      d."destinationId",
      d."commodityId",
      d."requestedQuantity",
      d."fulfilledQuantity"
    FROM "DestinationDemand" d
    WHERE d."organizationId" = $1 
      AND d.status IN ('PENDING', 'PARTIALLY_ALLOCATED')
      AND d."requestedQuantity" > d."fulfilledQuantity";
  `,
    [organizationId]
  );

  let totalRequestedDemandKg = 0;
  const demandedCommodityIds = new Set<string>();
  const demandedDestinationIds = new Set<string>();

  for (const d of demandsQuery.rows) {
    const unfulfilled = Number(d.requestedQuantity) - Number(d.fulfilledQuantity);
    totalRequestedDemandKg += Math.max(0, unfulfilled);
    demandedCommodityIds.add(d.commodityId);
    demandedDestinationIds.add(d.destinationId);
  }

  // 4. Query active routes
  const routesQuery = await db.query<any>(
    `
    SELECT 
      r.id,
      r."routeCode",
      r."originWarehouseId",
      r."destinationRegion",
      r."currentAvailableWeightKg"
    FROM "Route" r
    WHERE r."organizationId" = $1 
      AND r.status IN ('SCHEDULED', 'LOADING')
      AND r."currentAvailableWeightKg" > 0
      ${routeWhFilter};
  `,
    [organizationId]
  );

  let totalRouteCapacityKg = 0;
  for (const r of routesQuery.rows) {
    totalRouteCapacityKg += Number(r.currentAvailableWeightKg);
  }

  // 5. Query destinations to test route connectivity
  const destinationsQuery = await db.query<any>(
    `
    SELECT id, code, name, city, state 
    FROM "Destination" 
    WHERE "organizationId" = $1;
  `,
    [organizationId]
  );

  // Check commodity overlap
  let matchedCommoditiesCount = 0;
  for (const cId of demandedCommodityIds) {
    if (availableCommodityIds.has(cId)) {
      matchedCommoditiesCount++;
    }
  }

  // Check route connectivity
  let hasRouteConnection = false;
  for (const r of routesQuery.rows) {
    const reachableDestinations = matchRouteToDestinations(r, destinationsQuery.rows);
    for (const d of reachableDestinations) {
      if (demandedDestinationIds.has(d.id)) {
        hasRouteConnection = true;
        break;
      }
    }
    if (hasRouteConnection) break;
  }

  // Build Readiness Checks
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (batchesQuery.rows.length === 0) {
    reasons.push(
      warehouseId && warehouseId !== "ALL"
        ? "No available inventory batches found in selected warehouse. Intake stock or select another warehouse."
        : "No available inventory batches found across all facilities."
    );
  }

  if (demandsQuery.rows.length === 0) {
    reasons.push("No pending destination demand orders found. Create customer demand orders to generate an allocation plan.");
  }

  if (routesQuery.rows.length === 0) {
    reasons.push(
      warehouseId && warehouseId !== "ALL"
        ? "No active carrier routes scheduled from the selected origin warehouse."
        : "No active carrier routes currently scheduled."
    );
  }

  if (batchesQuery.rows.length > 0 && demandsQuery.rows.length > 0 && matchedCommoditiesCount === 0) {
    reasons.push("Commodity Mismatch: Demanded produce does not match any perishable inventory available in stock.");
  }

  if (routesQuery.rows.length > 0 && demandsQuery.rows.length > 0 && !hasRouteConnection) {
    warnings.push("Route Reachability Notice: Active carrier routes may not directly connect to all demanded delivery destinations.");
  }

  if (criticalBatchesCount > 0) {
    warnings.push(
      `${criticalBatchesCount} batch(es) have less than 48 hours remaining shelf life and require urgent dispatch priority.`
    );
  }

  const isReady = reasons.length === 0;

  return {
    isReady,
    reasons,
    warnings,
    warehouses,
    summary: {
      selectedWarehouseId: warehouseId,
      availableBatchesCount: batchesQuery.rows.length,
      totalAvailableStockKg: Number(totalAvailableStockKg.toFixed(2)),
      criticalBatchesCount,
      pendingDemandsCount: demandsQuery.rows.length,
      totalRequestedDemandKg: Number(totalRequestedDemandKg.toFixed(2)),
      activeRoutesCount: routesQuery.rows.length,
      totalRouteCapacityKg: Number(totalRouteCapacityKg.toFixed(2)),
      commoditiesCount: availableCommodityIds.size,
      destinationsCount: demandedDestinationIds.size,
      matchedCommoditiesCount,
    },
  };
}

// ============================================================================
// 4. PLAN GENERATION & PERSISTENCE
// ============================================================================

export async function generateDistributionPlan(
  organizationId: string,
  options: GeneratePlanOptions = {}
): Promise<{
  plan: DistributionPlanDetail;
  evaluationRun: ScenarioEvaluationRun;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // 1. Validate readiness first
  const readiness = await checkPlanningReadiness(organizationId, options.warehouseId);
  if (!readiness.isReady) {
    throw new Error(`Cannot generate plan: ${readiness.reasons.join(" | ")}`);
  }

  const whFilter = options.warehouseId && options.warehouseId !== "ALL" ? `AND b."warehouseId" = '${options.warehouseId}'` : "";
  const routeWhFilter = options.warehouseId && options.warehouseId !== "ALL" ? `AND r."originWarehouseId" = '${options.warehouseId}'` : "";

  // 2. Fetch Batches with Commodities
  const rawBatches = await db.query<any>(
    `
    SELECT 
      b.id,
      b."batchCode",
      b."warehouseId",
      b."commodityId",
      c.name as "commodityName",
      c.code as "commodityCode",
      b."availableQuantity",
      b."initialQuantity",
      b."unitCost",
      b."harvestDate",
      b."receivedDate",
      b."expiryDate",
      b."storageTempCelsius",
      b."qualityGrade"
    FROM "InventoryBatch" b
    JOIN "Commodity" c ON b."commodityId" = c.id
    WHERE b."organizationId" = $1 
      AND b.status IN ('AVAILABLE', 'PARTIALLY_ALLOCATED')
      AND b."availableQuantity" > 0
      ${whFilter};
  `,
    [organizationId]
  );

  // 3. Fetch Commodities
  const rawCommodities = await db.query<any>(
    `
    SELECT 
      id,
      code,
      name,
      category,
      "standardShelfLifeDays",
      "minTempCelsius",
      "maxTempCelsius",
      "decayRateExponent",
      "wasteDisposalCostPerKg"
    FROM "Commodity"
    WHERE "organizationId" = $1;
  `,
    [organizationId]
  );

  // 4. Fetch Destinations
  const rawDestinations = await db.query<any>(
    `
    SELECT 
      id,
      code,
      name,
      tier,
      city,
      state,
      "minShelfLifeDays",
      "acceptsDiscounts",
      "maxDiscountPercent",
      "receivingHoursStart",
      "receivingHoursEnd"
    FROM "Destination"
    WHERE "organizationId" = $1;
  `,
    [organizationId]
  );

  // 5. Fetch Demands
  const rawDemands = await db.query<any>(
    `
    SELECT 
      d.id,
      d."orderNumber",
      d."destinationId",
      d."commodityId",
      d."requestedQuantity",
      d."fulfilledQuantity",
      d."contractedPricePerUnit",
      d."deliveryWindowStart",
      d."deliveryWindowEnd"
    FROM "DestinationDemand" d
    WHERE d."organizationId" = $1 
      AND d.status IN ('PENDING', 'PARTIALLY_ALLOCATED')
      AND d."requestedQuantity" > d."fulfilledQuantity";
  `,
    [organizationId]
  );

  // 6. Fetch Routes
  const rawRoutes = await db.query<any>(
    `
    SELECT 
      r.id,
      r."routeCode",
      r."originWarehouseId",
      r."destinationRegion",
      r."currentAvailableWeightKg",
      r."maxWeightCapacityKg",
      r."fixedTripCost",
      r."variableCostPerKg",
      r."transitDurationHours",
      r."handlingDurationHours",
      r."departureTime",
      r."tempZoneMinCelsius",
      r."tempZoneMaxCelsius"
    FROM "Route" r
    WHERE r."organizationId" = $1 
      AND r.status IN ('SCHEDULED', 'LOADING')
      AND r."currentAvailableWeightKg" > 0
      ${routeWhFilter};
  `,
    [organizationId]
  );

  // 7. Convert to EnginePlannerInput contracts
  const engineBatches: EngineInventoryBatch[] = rawBatches.rows.map((b) => ({
    id: b.id,
    batchCode: b.batchCode,
    warehouseId: b.warehouseId,
    commodityId: b.commodityId,
    commodityName: b.commodityName,
    availableQuantityKg: Number(b.availableQuantity),
    initialQuantityKg: Number(b.initialQuantity || b.availableQuantity),
    unitCostUsd: Number(b.unitCost),
    harvestDate: b.harvestDate,
    receivedDate: b.receivedDate,
    expiryDate: b.expiryDate,
    storageTempCelsius: Number(b.storageTempCelsius),
    qualityGrade: b.qualityGrade,
  }));

  const engineCommodities: EngineCommodity[] = rawCommodities.rows.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    category: c.category,
    standardShelfLifeDays: c.standardShelfLifeDays,
    minTempCelsius: Number(c.minTempCelsius),
    maxTempCelsius: Number(c.maxTempCelsius),
    decayRateExponent: Number(c.decayRateExponent || 1.5),
    wasteDisposalCostPerKgUsd: Number(c.wasteDisposalCostPerKg || 0.25),
  }));

  const engineDestinations: EngineDestination[] = rawDestinations.rows.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    tier: d.tier,
    minShelfLifeDays: d.minShelfLifeDays,
    acceptsDiscounts: Boolean(d.acceptsDiscounts),
    maxDiscountPercent: Number(d.maxDiscountPercent || 0),
    receivingHoursStart: d.receivingHoursStart,
    receivingHoursEnd: d.receivingHoursEnd,
  }));

  const engineDemands: EngineDemandOrder[] = rawDemands.rows.map((d) => ({
    id: d.id,
    orderNumber: d.orderNumber,
    destinationId: d.destinationId,
    commodityId: d.commodityId,
    requestedQuantityKg: Number(d.requestedQuantity) - Number(d.fulfilledQuantity || 0),
    contractedPricePerKgUsd: Number(d.contractedPricePerUnit),
    deliveryWindowStart: d.deliveryWindowStart,
    deliveryWindowEnd: d.deliveryWindowEnd,
  }));

  // Build Engine Routes with Destination Mappings
  const engineRoutes: EngineTransportRoute[] = [];
  const engineRouteToDbRouteId = new Map<string, string>();

  for (const r of rawRoutes.rows) {
    const reachableDestinations = matchRouteToDestinations(r, rawDestinations.rows);
    for (const d of reachableDestinations) {
      const engineRouteId = `${r.id}__${d.id}`;
      engineRouteToDbRouteId.set(engineRouteId, r.id);
      engineRouteToDbRouteId.set(r.id, r.id);

      engineRoutes.push({
        id: engineRouteId,
        routeCode: r.routeCode,
        originWarehouseId: r.originWarehouseId,
        destinationId: d.id,
        capacityKg: Number(r.currentAvailableWeightKg),
        fixedCostUsd: Number(r.fixedTripCost),
        costPerKgUsd: Number(r.variableCostPerKg),
        transitDurationHours: Number(r.transitDurationHours),
        handlingDurationHours: Number(r.handlingDurationHours || 0.5),
        departureTime: r.departureTime,
        tempZoneMinCelsius: Number(r.tempZoneMinCelsius),
        tempZoneMaxCelsius: Number(r.tempZoneMaxCelsius),
      });
    }
  }

  const engineInput: EnginePlannerInput = {
    batches: engineBatches,
    commodities: engineCommodities,
    destinations: engineDestinations,
    demands: engineDemands,
    routes: engineRoutes,
    config: {
      enableDynamicMarkdowns: options.config?.enableDynamicMarkdowns ?? true,
      maxMarkdownPercent: options.config?.maxMarkdownPercent ?? 40,
      shelfLifeSafetyBufferHours: options.config?.shelfLifeSafetyBufferHours ?? 4.0,
      spoilageAvoidanceWeight: options.config?.spoilageAvoidanceWeight ?? 1.5,
      disposalPenaltyPerKgUsd: options.config?.disposalPenaltyPerKgUsd ?? 0.25,
      handlingCostPerKgUsd: options.config?.handlingCostPerKgUsd ?? 0.05,
      ...(options.config || {}),
    },
  };

  // 8. Execute Shared Economic Evaluation Scenario
  const evaluationRun = evaluateScenario(engineInput, {
    scenarioName: `Planning Run - ${new Date().toISOString()}`,
    config: engineInput.config,
  });

  const freshRoutePlan = evaluationRun.freshRoutePlan;
  const ledger = evaluationRun.freshRouteLedger;
  const comparison = evaluationRun.comparison;

  // 9. Persist DistributionPlan in Database
  const planId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const planNumber = `PLAN-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
  const targetDate = options.targetDate ? new Date(options.targetDate) : new Date();

  const totalCostUsd = Number(
    (
      ledger.cogsSoldInventoryUsd +
      ledger.incurredTransportTotalCostUsd +
      ledger.incurredHandlingCostUsd +
      ledger.incurredDisposalPenaltyUsd
    ).toFixed(2)
  );

  await db.query(
    `
    INSERT INTO "DistributionPlan" (
      id,
      "organizationId",
      "planNumber",
      status,
      "algorithmVersion",
      "snapshotHash",
      "planTimestamp",
      "targetDate",
      "totalAllocatedKg",
      "unfulfilledDemandKg",
      "surplusStockKg",
      "totalRevenueUsd",
      "totalCostUsd",
      "netMarginUsd",
      "spoilagePreventedKg",
      "spoilagePreventedUsd",
      "isDemo",
      "createdAt",
      "updatedAt"
    )
    VALUES ($1, $2, $3, 'OPTIMIZED', $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, false, NOW(), NOW());
  `,
    [
      planId,
      organizationId,
      planNumber,
      freshRoutePlan.algorithmVersion,
      evaluationRun.inputSnapshotHash,
      targetDate,
      freshRoutePlan.metrics.totalAllocatedKg,
      freshRoutePlan.metrics.totalUnfulfilledDemandKg,
      freshRoutePlan.metrics.totalSurplusInventoryKg,
      ledger.realizedSalesRevenueUsd,
      totalCostUsd,
      ledger.netEconomicOutcomeUsd,
      comparison.spoilageReductionKg,
      comparison.spoilageLossReductionUsd,
    ]
  );

  // 10. Persist Snapshot with Complete Evaluation Run Data
  const snapshotJson = JSON.stringify({
    input: engineInput,
    evaluationRun,
  });

  await db.query(
    `
    INSERT INTO "PlanSnapshot" (
      id,
      "distributionPlanId",
      "snapshotJson",
      "hashSha256",
      "createdAt"
    )
    VALUES ($1, $2, $3, $4, NOW());
  `,
    [`snap-${Date.now().toString(36)}`, planId, snapshotJson, evaluationRun.inputSnapshotHash]
  );

  // 11. Persist Allocations & Discount Recommendations
  for (let idx = 0; idx < freshRoutePlan.allocations.length; idx++) {
    const alloc = freshRoutePlan.allocations[idx];
    const allocId = `alloc-${planId}-${idx + 1}`;
    const rawRouteId = engineRouteToDbRouteId.get(alloc.routeId) || alloc.routeId.split("__")[0];
    const primaryReasonCode = alloc.reasonCodes[0] || "SHELF_LIFE_SLA_SATISFIED";
    const prismaReasonCode = mapEngineReasonToPrisma(primaryReasonCode);

    await db.query(
      `
      INSERT INTO "Allocation" (
        id,
        "distributionPlanId",
        "batchId",
        "destinationDemandId",
        "routeId",
        "allocatedQuantity",
        "unitOfMeasure",
        "discountPercent",
        "effectivePricePerUnit",
        "grossRevenueUsd",
        "transportCostUsd",
        "purchaseCostUsd",
        "netMarginUsd",
        "arrivalShelfLifeDays",
        "reasonCode",
        "reasonExplanation",
        "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'KG', $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW());
    `,
      [
        allocId,
        planId,
        alloc.batchId,
        alloc.demandOrderId,
        rawRouteId,
        alloc.allocatedQuantityKg,
        alloc.discountPercent,
        alloc.effectivePricePerKgUsd,
        alloc.grossRevenueUsd,
        alloc.transportCostUsd,
        alloc.inventoryCostUsd,
        alloc.netMarginUsd,
        alloc.arrivalShelfLifeDays,
        prismaReasonCode,
        alloc.reasonExplanation,
      ]
    );

    // If dynamic markdown applied, record discount recommendation
    if (alloc.discountPercent > 0) {
      await db.query(
        `
        INSERT INTO "DiscountRecommendation" (
          id,
          "organizationId",
          "batchId",
          "destinationId",
          "suggestedDiscountPercent",
          "originalPricePerUnit",
          "discountedPricePerUnit",
          "quantityKg",
          "estimatedDisposalLossAvoided",
          "projectedGrossMarginUsd",
          status,
          "reasonExplanation",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11, NOW(), NOW());
      `,
        [
          `disc-${planId}-${idx + 1}`,
          organizationId,
          alloc.batchId,
          alloc.destinationId,
          alloc.discountPercent,
          alloc.auditFacts.contractedPricePerKg,
          alloc.effectivePricePerKgUsd,
          alloc.allocatedQuantityKg,
          alloc.inventoryCostUsd,
          alloc.netMarginUsd,
          `Dynamic markdown applied by FreshRoute solver: ${alloc.reasonExplanation}`,
        ]
      );
    }
  }

  // 12. Persist Plan Metrics (Comparative Evaluation vs Baseline FIFO)
  await db.query(
    `
    INSERT INTO "PlanMetrics" (
      id,
      "distributionPlanId",
      "baselineProfitUsd",
      "proposedProfitUsd",
      "profitUpliftUsd",
      "profitUpliftPercent",
      "baselineSpoilageKg",
      "proposedSpoilageKg",
      "spoilageReductionKg",
      "spoilageReductionPercent",
      "baselineSlaCompliancePercent",
      "proposedSlaCompliancePercent",
      "baselineRejectionsCount",
      "proposedRejectionsCount",
      "createdAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW());
  `,
    [
      `pm-${planId}`,
      planId,
      evaluationRun.baselineLedger.netEconomicOutcomeUsd,
      ledger.netEconomicOutcomeUsd,
      comparison.netOutcomeDeltaUsd,
      comparison.netOutcomeDeltaPercent,
      evaluationRun.baselineLedger.spoiledExpiredStockKg,
      ledger.spoiledExpiredStockKg,
      comparison.spoilageReductionKg,
      comparison.spoilageReductionPercent,
      evaluationRun.baselinePlan.metrics.slaComplianceRatePercent,
      freshRoutePlan.metrics.slaComplianceRatePercent,
      evaluationRun.baselinePlan.rejections.length,
      freshRoutePlan.rejections.length,
    ]
  );

  // 13. Retrieve and return the populated plan detail
  const fullPlan = await getDistributionPlanById(organizationId, planId);
  if (!fullPlan) {
    throw new Error(`Failed to retrieve newly created plan ${planId}`);
  }

  return {
    plan: fullPlan,
    evaluationRun,
  };
}

// ============================================================================
// 5. LIST PLANS
// ============================================================================

export async function listDistributionPlans(
  organizationId: string,
  limit: number = 30
): Promise<DistributionPlanListItem[]> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const queryResult = await db.query<any>(
    `
    SELECT 
      p.id,
      p."planNumber",
      p.status,
      p."algorithmVersion",
      p."snapshotHash",
      p."planTimestamp",
      p."targetDate",
      p."totalAllocatedKg",
      p."unfulfilledDemandKg",
      p."surplusStockKg",
      p."totalRevenueUsd",
      p."totalCostUsd",
      p."netMarginUsd",
      p."spoilagePreventedKg",
      p."spoilagePreventedUsd",
      p."createdAt",
      COUNT(a.id)::int as "allocationsCount",
      m."profitUpliftUsd",
      m."profitUpliftPercent",
      m."spoilageReductionPercent"
    FROM "DistributionPlan" p
    LEFT JOIN "Allocation" a ON p.id = a."distributionPlanId"
    LEFT JOIN "PlanMetrics" m ON p.id = m."distributionPlanId"
    WHERE p."organizationId" = $1
    GROUP BY p.id, m.id
    ORDER BY p."createdAt" DESC
    LIMIT $2;
  `,
    [organizationId, limit]
  );

  return queryResult.rows.map((r) => ({
    id: r.id,
    planNumber: r.planNumber,
    status: r.status,
    algorithmVersion: r.algorithmVersion,
    snapshotHash: r.snapshotHash,
    planTimestamp: new Date(r.planTimestamp).toISOString(),
    targetDate: new Date(r.targetDate).toISOString(),
    totalAllocatedKg: Number(r.totalAllocatedKg),
    unfulfilledDemandKg: Number(r.unfulfilledDemandKg),
    surplusStockKg: Number(r.surplusStockKg),
    totalRevenueUsd: Number(r.totalRevenueUsd),
    totalCostUsd: Number(r.totalCostUsd),
    netMarginUsd: Number(r.netMarginUsd),
    spoilagePreventedKg: Number(r.spoilagePreventedKg),
    spoilagePreventedUsd: Number(r.spoilagePreventedUsd),
    allocationsCount: Number(r.allocationsCount || 0),
    profitUpliftUsd: r.profitUpliftUsd != null ? Number(r.profitUpliftUsd) : undefined,
    profitUpliftPercent: r.profitUpliftPercent != null ? Number(r.profitUpliftPercent) : undefined,
    spoilageReductionPercent: r.spoilageReductionPercent != null ? Number(r.spoilageReductionPercent) : undefined,
    winnerStatus:
      r.profitUpliftUsd != null
        ? Number(r.profitUpliftUsd) > 0.05
          ? "FRESHROUTE_SUPERIOR"
          : Number(r.profitUpliftUsd) < -0.05
          ? "BASELINE_SUPERIOR"
          : "EQUIVALENT"
        : undefined,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

// ============================================================================
// 6. GET PLAN BY ID
// ============================================================================

export async function getDistributionPlanById(
  organizationId: string,
  planId: string
): Promise<DistributionPlanDetail | null> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // 1. Fetch Plan
  const planQuery = await db.query<any>(
    `
    SELECT 
      p.id,
      p."organizationId",
      p."planNumber",
      p.status,
      p."algorithmVersion",
      p."snapshotHash",
      p."planTimestamp",
      p."targetDate",
      p."totalAllocatedKg",
      p."unfulfilledDemandKg",
      p."surplusStockKg",
      p."totalRevenueUsd",
      p."totalCostUsd",
      p."netMarginUsd",
      p."spoilagePreventedKg",
      p."spoilagePreventedUsd",
      p."createdAt"
    FROM "DistributionPlan" p
    WHERE (p.id = $1 OR p."planNumber" = $1) AND p."organizationId" = $2;
  `,
    [planId, organizationId]
  );

  if (planQuery.rows.length === 0) return null;
  const p = planQuery.rows[0];

  // 2. Fetch Snapshot
  const snapQuery = await db.query<any>(
    `
    SELECT "snapshotJson", "hashSha256"
    FROM "PlanSnapshot"
    WHERE "distributionPlanId" = $1;
  `,
    [p.id]
  );

  let snapshotData: { snapshotJson: string; hashSha256: string } | undefined;
  let evaluationRun: ScenarioEvaluationRun | undefined;

  if (snapQuery.rows.length > 0) {
    snapshotData = {
      snapshotJson: snapQuery.rows[0].snapshotJson,
      hashSha256: snapQuery.rows[0].hashSha256,
    };
    try {
      const parsed = JSON.parse(snapQuery.rows[0].snapshotJson);
      evaluationRun = parsed.evaluationRun || undefined;
    } catch {
      // Ignore parse failure if raw string
    }
  }

  // 3. Fetch Metrics
  const metricsQuery = await db.query<any>(
    `
    SELECT 
      "baselineProfitUsd",
      "proposedProfitUsd",
      "profitUpliftUsd",
      "profitUpliftPercent",
      "baselineSpoilageKg",
      "proposedSpoilageKg",
      "spoilageReductionKg",
      "spoilageReductionPercent",
      "baselineSlaCompliancePercent",
      "proposedSlaCompliancePercent",
      "baselineRejectionsCount",
      "proposedRejectionsCount"
    FROM "PlanMetrics"
    WHERE "distributionPlanId" = $1;
  `,
    [p.id]
  );

  const metrics =
    metricsQuery.rows.length > 0
      ? {
          baselineProfitUsd: Number(metricsQuery.rows[0].baselineProfitUsd),
          proposedProfitUsd: Number(metricsQuery.rows[0].proposedProfitUsd),
          profitUpliftUsd: Number(metricsQuery.rows[0].profitUpliftUsd),
          profitUpliftPercent: Number(metricsQuery.rows[0].profitUpliftPercent),
          baselineSpoilageKg: Number(metricsQuery.rows[0].baselineSpoilageKg),
          proposedSpoilageKg: Number(metricsQuery.rows[0].proposedSpoilageKg),
          spoilageReductionKg: Number(metricsQuery.rows[0].spoilageReductionKg),
          spoilageReductionPercent: Number(metricsQuery.rows[0].spoilageReductionPercent),
          baselineSlaCompliancePercent: Number(metricsQuery.rows[0].baselineSlaCompliancePercent),
          proposedSlaCompliancePercent: Number(metricsQuery.rows[0].proposedSlaCompliancePercent),
          baselineRejectionsCount: Number(metricsQuery.rows[0].baselineRejectionsCount),
          proposedRejectionsCount: Number(metricsQuery.rows[0].proposedRejectionsCount),
          proposedFulfillmentKg:
            evaluationRun?.freshRouteLedger?.fulfilledDemandKg ?? Number(p.totalAllocatedKg ?? 0),
          baselineFulfillmentKg:
            evaluationRun?.baselineLedger?.fulfilledDemandKg ?? Number(p.totalAllocatedKg ?? 0),
          fulfillmentRateDeltaPercent:
            evaluationRun?.comparison?.fulfillmentRateDeltaPercent ??
            Number(
              (
                Number(metricsQuery.rows[0].proposedSlaCompliancePercent ?? 0) -
                Number(metricsQuery.rows[0].baselineSlaCompliancePercent ?? 0)
              ).toFixed(2)
            ),
          strategyWinner:
            evaluationRun?.comparison?.outcomeStatus ??
            (Number(metricsQuery.rows[0].profitUpliftUsd) > 0.05
              ? "FRESHROUTE_SUPERIOR"
              : "EQUIVALENT"),
        }
      : evaluationRun
      ? {
          baselineProfitUsd: evaluationRun.baselineLedger.netEconomicOutcomeUsd,
          proposedProfitUsd: evaluationRun.freshRouteLedger.netEconomicOutcomeUsd,
          profitUpliftUsd: evaluationRun.comparison.netOutcomeDeltaUsd,
          profitUpliftPercent: evaluationRun.comparison.netOutcomeDeltaPercent,
          baselineSpoilageKg: evaluationRun.baselineLedger.spoiledExpiredStockKg,
          proposedSpoilageKg: evaluationRun.freshRouteLedger.spoiledExpiredStockKg,
          spoilageReductionKg: evaluationRun.comparison.spoilageReductionKg,
          spoilageReductionPercent: evaluationRun.comparison.spoilageReductionPercent,
          baselineSlaCompliancePercent: evaluationRun.baselineLedger.fulfillmentRatePercent,
          proposedSlaCompliancePercent: evaluationRun.freshRouteLedger.fulfillmentRatePercent,
          baselineRejectionsCount: 0,
          proposedRejectionsCount: 0,
          proposedFulfillmentKg: evaluationRun.freshRouteLedger.fulfilledDemandKg,
          baselineFulfillmentKg: evaluationRun.baselineLedger.fulfilledDemandKg,
          fulfillmentRateDeltaPercent: evaluationRun.comparison.fulfillmentRateDeltaPercent,
          strategyWinner: evaluationRun.comparison.outcomeStatus,
        }
      : undefined;

  // 4. Fetch Allocations with Joins
  const allocQuery = await db.query<any>(
    `
    SELECT 
      a.id,
      a."batchId",
      b."batchCode",
      b."commodityId",
      c.name as "commodityName",
      a."destinationDemandId",
      d."orderNumber",
      dest.id as "destinationId",
      dest.name as "destinationName",
      dest.code as "destinationCode",
      a."routeId",
      r."routeCode",
      a."allocatedQuantity",
      a."discountPercent",
      a."effectivePricePerUnit",
      a."grossRevenueUsd",
      a."transportCostUsd",
      a."purchaseCostUsd",
      a."netMarginUsd",
      a."arrivalShelfLifeDays",
      a."reasonCode",
      a."reasonExplanation",
      a."createdAt"
    FROM "Allocation" a
    JOIN "InventoryBatch" b ON a."batchId" = b.id
    JOIN "Commodity" c ON b."commodityId" = c.id
    JOIN "DestinationDemand" d ON a."destinationDemandId" = d.id
    JOIN "Destination" dest ON d."destinationId" = dest.id
    JOIN "Route" r ON a."routeId" = r.id
    WHERE a."distributionPlanId" = $1
    ORDER BY a."createdAt" ASC;
  `,
    [p.id]
  );

  const allocations = allocQuery.rows.map((a) => ({
    id: a.id,
    batchId: a.batchId,
    batchCode: a.batchCode,
    commodityId: a.commodityId,
    commodityName: a.commodityName,
    destinationDemandId: a.destinationDemandId,
    orderNumber: a.orderNumber,
    destinationId: a.destinationId,
    destinationName: a.destinationName,
    destinationCode: a.destinationCode,
    routeId: a.routeId,
    routeCode: a.routeCode,
    allocatedQuantity: Number(a.allocatedQuantity),
    discountPercent: Number(a.discountPercent),
    effectivePricePerUnit: Number(a.effectivePricePerUnit),
    grossRevenueUsd: Number(a.grossRevenueUsd),
    transportCostUsd: Number(a.transportCostUsd),
    purchaseCostUsd: Number(a.purchaseCostUsd),
    netMarginUsd: Number(a.netMarginUsd),
    arrivalShelfLifeDays: Number(a.arrivalShelfLifeDays),
    reasonCode: a.reasonCode,
    reasonExplanation: a.reasonExplanation,
    createdAt: new Date(a.createdAt).toISOString(),
  }));

  return {
    id: p.id,
    organizationId: p.organizationId,
    planNumber: p.planNumber,
    status: p.status,
    algorithmVersion: p.algorithmVersion,
    snapshotHash: p.snapshotHash,
    planTimestamp: new Date(p.planTimestamp).toISOString(),
    targetDate: new Date(p.targetDate).toISOString(),
    totalAllocatedKg: Number(p.totalAllocatedKg),
    unfulfilledDemandKg: Number(p.unfulfilledDemandKg),
    surplusStockKg: Number(p.surplusStockKg),
    totalRevenueUsd: Number(p.totalRevenueUsd),
    totalCostUsd: Number(p.totalCostUsd),
    netMarginUsd: Number(p.netMarginUsd),
    spoilagePreventedKg: Number(p.spoilagePreventedKg),
    spoilagePreventedUsd: Number(p.spoilagePreventedUsd),
    allocationsCount: allocations.length,
    profitUpliftPercent: metrics?.profitUpliftPercent,
    profitUpliftUsd: metrics?.profitUpliftUsd,
    spoilageReductionPercent: metrics?.spoilageReductionPercent,
    winnerStatus:
      metrics?.profitUpliftUsd != null
        ? metrics.profitUpliftUsd > 0.05
          ? "FRESHROUTE_SUPERIOR"
          : metrics.profitUpliftUsd < -0.05
          ? "BASELINE_SUPERIOR"
          : "EQUIVALENT"
        : undefined,
    createdAt: new Date(p.createdAt).toISOString(),
    snapshot: snapshotData,
    metrics,
    allocations,
    evaluationRun,
  };
}

// ============================================================================
// 7. APPROVE & COMMIT PLAN
// ============================================================================

export async function approveDistributionPlan(
  organizationId: string,
  planId: string
): Promise<{
  plan: DistributionPlanDetail;
  alreadyCommitted: boolean;
  reservedBatchesCount: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await getDistributionPlanById(organizationId, planId);
  if (!existing) {
    throw new Error(`Distribution plan not found: ${planId}`);
  }

  if (existing.status === "COMMITTED") {
    return {
      plan: existing,
      alreadyCommitted: true,
      reservedBatchesCount: 0,
    };
  }

  // 1. Update Plan Status to COMMITTED
  await db.query(
    `
    UPDATE "DistributionPlan"
    SET status = 'COMMITTED', "updatedAt" = NOW()
    WHERE id = $1 AND "organizationId" = $2;
  `,
    [existing.id, organizationId]
  );

  // 2. Lock & Reserve Quantities on Inventory Batches
  let reservedBatchesCount = 0;
  for (const alloc of existing.allocations) {
    // Get batch to calculate resulting balances
    const bRes = await db.query<any>(
      `
      SELECT id, "availableQuantity", "reservedQuantity"
      FROM "InventoryBatch"
      WHERE id = $1;
    `,
      [alloc.batchId]
    );

    if (bRes.rows.length > 0) {
      const b = bRes.rows[0];
      const curAvail = new Decimal(b.availableQuantity);
      const curReserved = new Decimal(b.reservedQuantity || 0);
      const allocQty = new Decimal(alloc.allocatedQuantity);

      const nextAvail = Decimal.max(0, curAvail.minus(allocQty));
      const nextReserved = curReserved.plus(allocQty);
      const nextStatus = nextAvail.isZero() ? "ALLOCATED" : "PARTIALLY_ALLOCATED";

      await db.query(
        `
        UPDATE "InventoryBatch"
        SET 
          "availableQuantity" = $1,
          "reservedQuantity" = $2,
          status = $3,
          "updatedAt" = NOW()
        WHERE id = $4;
      `,
        [nextAvail.toFixed(2), nextReserved.toFixed(2), nextStatus, alloc.batchId]
      );

      // Audit log entry
      await db.query(
        `
        INSERT INTO "BatchQuantityAudit" (
          id,
          "batchId",
          "changeType",
          "deltaQuantity",
          "resultingAvailable",
          "resultingReserved",
          "reason",
          "createdAt"
        )
        VALUES ($1, $2, 'RESERVATION', $3, $4, $5, $6, NOW());
      `,
        [
          `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          alloc.batchId,
          allocQty.negated().toFixed(2),
          nextAvail.toFixed(2),
          nextReserved.toFixed(2),
          `Committed by Distribution Plan ${existing.planNumber} (${alloc.reasonCode})`,
        ]
      );

      reservedBatchesCount++;
    }

    // Update Destination Demand status
    await db.query(
      `
      UPDATE "DestinationDemand"
      SET 
        "fulfilledQuantity" = "fulfilledQuantity" + $1,
        status = CASE 
          WHEN ("fulfilledQuantity" + $1) >= "requestedQuantity" THEN 'ALLOCATED'::"DemandStatus"
          ELSE 'PARTIALLY_ALLOCATED'::"DemandStatus"
        END,
        "updatedAt" = NOW()
      WHERE id = $2;
    `,
      [alloc.allocatedQuantity, alloc.destinationDemandId]
    );
  }

  const updated = await getDistributionPlanById(organizationId, existing.id);
  if (!updated) {
    throw new Error(`Failed to reload committed plan ${planId}`);
  }

  return {
    plan: updated,
    alreadyCommitted: false,
    reservedBatchesCount,
  };
}

// ============================================================================
// 8. RFC-4180 CSV EXPORTERS
// ============================================================================

function escapeCsvField(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Generates an RFC-4180 compliant Dispatch Manifest CSV
 */
export async function exportDispatchManifestCsv(
  organizationId: string,
  planId: string
): Promise<string> {
  const plan = await getDistributionPlanById(organizationId, planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const headers = [
    "Sequence",
    "PlanNumber",
    "BatchCode",
    "Commodity",
    "DestinationCode",
    "DestinationName",
    "RouteCode",
    "AllocatedQuantityKg",
    "DiscountPercent",
    "EffectivePricePerKgINR",
    "GrossRevenueINR",
    "AttributableTransportCostINR",
    "AttributableInventoryCostINR",
    "NetMarginINR",
    "ArrivalRSLDays",
    "FeasibilityStatus",
    "ReasonCode",
    "Explanation",
  ];

  const rows: string[] = [headers.join(",")];

  plan.allocations.forEach((alloc, idx) => {
    const row = [
      escapeCsvField(idx + 1),
      escapeCsvField(plan.planNumber),
      escapeCsvField(alloc.batchCode),
      escapeCsvField(alloc.commodityName),
      escapeCsvField(alloc.destinationCode),
      escapeCsvField(alloc.destinationName),
      escapeCsvField(alloc.routeCode),
      escapeCsvField(alloc.allocatedQuantity.toFixed(2)),
      escapeCsvField(alloc.discountPercent.toFixed(1) + "%"),
      escapeCsvField(alloc.effectivePricePerUnit.toFixed(2)),
      escapeCsvField(alloc.grossRevenueUsd.toFixed(2)),
      escapeCsvField(alloc.transportCostUsd.toFixed(2)),
      escapeCsvField(alloc.purchaseCostUsd.toFixed(2)),
      escapeCsvField(alloc.netMarginUsd.toFixed(2)),
      escapeCsvField(alloc.arrivalShelfLifeDays.toFixed(2)),
      escapeCsvField("FEASIBLE"),
      escapeCsvField(alloc.reasonCode),
      escapeCsvField(alloc.reasonExplanation),
    ];
    rows.push(row.join(","));
  });

  return rows.join("\r\n");
}

/**
 * Generates an RFC-4180 compliant Baseline Comparison Report CSV
 */
export async function exportComparisonReportCsv(
  organizationId: string,
  planId: string
): Promise<string> {
  const plan = await getDistributionPlanById(organizationId, planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const run = plan.evaluationRun;
  const fLedger = run?.freshRouteLedger;
  const bLedger = run?.baselineLedger;
  const comp = run?.comparison;

  const headers = [
    "MetricCategory",
    "MetricName",
    "Unit",
    "FreshRouteFEFO",
    "BaselineFIFO",
    "AbsoluteDelta",
    "PercentageDelta",
    "StrategicImpact",
  ];

  const rows: string[] = [headers.join(",")];

  const addMetric = (
    category: string,
    name: string,
    unit: string,
    fVal: number | string,
    bVal: number | string,
    delta: number | string,
    pct: string,
    impact: string
  ) => {
    rows.push(
      [
        escapeCsvField(category),
        escapeCsvField(name),
        escapeCsvField(unit),
        escapeCsvField(typeof fVal === "number" ? fVal.toFixed(2) : fVal),
        escapeCsvField(typeof bVal === "number" ? bVal.toFixed(2) : bVal),
        escapeCsvField(typeof delta === "number" ? delta.toFixed(2) : delta),
        escapeCsvField(pct),
        escapeCsvField(impact),
      ].join(",")
    );
  };

  if (fLedger && bLedger && comp) {
    // Physical Mass
    addMetric("Mass Balance", "Sold Quantity", "kg", fLedger.soldQuantityKg, bLedger.soldQuantityKg, comp.soldQuantityDeltaKg, "+/-", "Physical volume dispatched");
    addMetric("Mass Balance", "Perishable Waste Spoilage", "kg", fLedger.spoiledExpiredStockKg, bLedger.spoiledExpiredStockKg, -comp.spoilageReductionKg, `${comp.spoilageReductionPercent}% reduction`, comp.spoilageReductionKg > 0 ? "Mitigated Waste" : "Neutral");
    addMetric("Mass Balance", "At-Risk Inventory Remaining", "kg", fLedger.atRiskStockKg, bLedger.atRiskStockKg, fLedger.atRiskStockKg - bLedger.atRiskStockKg, "+/-", "Produce with 0-7d RSL");
    addMetric("Mass Balance", "Unsold Healthy Reserve", "kg", fLedger.unsoldHealthyStockKg, bLedger.unsoldHealthyStockKg, fLedger.unsoldHealthyStockKg - bLedger.unsoldHealthyStockKg, "+/-", "Preserved fresh asset value");

    // Demand Fulfillment
    addMetric("Demand", "Total Customer Demand", "kg", fLedger.totalDemandKg, bLedger.totalDemandKg, 0, "0%", "Identical demand order baseline");
    addMetric("Demand", "Fulfilled Demand", "kg", fLedger.fulfilledDemandKg, bLedger.fulfilledDemandKg, comp.fulfillmentDeltaKg, `${comp.fulfillmentRateDeltaPercent}%`, "Customer SLA delivery");
    addMetric("Demand", "Unmet Demand Shortage", "kg", fLedger.unmetDemandKg, bLedger.unmetDemandKg, -comp.unmetDemandReductionKg, "+/-", "Lost market opportunity");

    // Revenue Ledger
    addMetric("Revenue", "Realized Gross Inflow", "INR", fLedger.realizedSalesRevenueUsd, bLedger.realizedSalesRevenueUsd, comp.realizedRevenueDeltaUsd, `${comp.realizedRevenueDeltaPercent}%`, "Actual cash revenue received");
    addMetric("Revenue", "Salvage Discount Foregone", "INR", fLedger.discountForegoneRevenueUsd, bLedger.discountForegoneRevenueUsd, comp.discountImpactDeltaUsd, "+/-", "Discount concessions to clear stock");

    // Incurred Logistics & Handling Costs
    addMetric("Logistics Costs", "Fixed Route Freight Fee", "INR", fLedger.incurredTransportFixedCostUsd, bLedger.incurredTransportFixedCostUsd, fLedger.incurredTransportFixedCostUsd - bLedger.incurredTransportFixedCostUsd, "+/-", "Fleet dispatch fees");
    addMetric("Logistics Costs", "Variable Ton-Kilometer Cost", "INR", fLedger.incurredTransportVariableCostUsd, bLedger.incurredTransportVariableCostUsd, fLedger.incurredTransportVariableCostUsd - bLedger.incurredTransportVariableCostUsd, "+/-", "Weight-based fuel and wear");
    addMetric("Logistics Costs", "Total Incurred Freight", "INR", fLedger.incurredTransportTotalCostUsd, bLedger.incurredTransportTotalCostUsd, comp.transportCostDeltaUsd, "+/-", "Total transport spend");
    addMetric("Logistics Costs", "Dock Handling & Cold Chain", "INR", fLedger.incurredHandlingCostUsd, bLedger.incurredHandlingCostUsd, comp.handlingCostDeltaUsd, "+/-", "Loading/cross-dock fee");
    addMetric("Disposal Costs", "Spoilage Tipping Penalty", "INR", fLedger.incurredDisposalPenaltyUsd, bLedger.incurredDisposalPenaltyUsd, fLedger.incurredDisposalPenaltyUsd - bLedger.incurredDisposalPenaltyUsd, "+/-", "Bio-waste environmental disposal");

    // Financial Outcomes
    addMetric("Economic Outcome", "Cost of Goods Sold (COGS)", "INR", fLedger.cogsSoldInventoryUsd, bLedger.cogsSoldInventoryUsd, fLedger.cogsSoldInventoryUsd - bLedger.cogsSoldInventoryUsd, "+/-", "Direct inventory cost of sold stock");
    addMetric("Economic Outcome", "Spoilage Economic Loss", "INR", fLedger.totalSpoilageEconomicLossUsd, bLedger.totalSpoilageEconomicLossUsd, -comp.spoilageLossReductionUsd, "+/-", comp.spoilageLossReductionUsd > 0 ? "Saved Spoilage Loss" : "Neutral");
    addMetric("Economic Outcome", "Net Profit Margin", "INR", fLedger.netEconomicOutcomeUsd, bLedger.netEconomicOutcomeUsd, comp.netOutcomeDeltaUsd, `${comp.netOutcomeDeltaPercent}%`, comp.outcomeStatus);
    addMetric("Economic Outcome", "Operational Cash Contribution", "INR", fLedger.operationalCashContributionUsd, bLedger.operationalCashContributionUsd, comp.operationalCashUpliftUsd, "+/-", "Net cash generated");
  } else if (plan.metrics) {
    // Fallback to persisted PlanMetrics
    addMetric("Financial", "Net Profit", "INR", plan.metrics.proposedProfitUsd, plan.metrics.baselineProfitUsd, plan.metrics.profitUpliftUsd, `${plan.metrics.profitUpliftPercent}%`, "Overall profit uplift");
    addMetric("Waste", "Spoilage Waste", "kg", plan.metrics.proposedSpoilageKg, plan.metrics.baselineSpoilageKg, -plan.metrics.spoilageReductionKg, `${plan.metrics.spoilageReductionPercent}%`, "Produce saved");
    addMetric("SLA", "SLA Compliance Rate", "%", plan.metrics.proposedSlaCompliancePercent, plan.metrics.baselineSlaCompliancePercent, plan.metrics.proposedSlaCompliancePercent - plan.metrics.baselineSlaCompliancePercent, "+/-", "Customer quality SLA");
  }

  return rows.join("\r\n");
}
