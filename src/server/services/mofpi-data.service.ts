import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import { parseRawCsvText } from "./csv-import.service";
import {
  InventoryCsvRowSchema,
  DestinationDemandCsvRowSchema,
  TransportCsvRowSchema,
} from "../db/schema.zod";
import {
  MOFPI_COMMODITIES_CATALOG_CSV,
  MOFPI_WAREHOUSES_CSV,
  MOFPI_INVENTORY_CSV,
  MOFPI_DESTINATIONS_DEMAND_CSV,
  MOFPI_TRANSPORT_ROUTES_CSV,
  MOFPI_15_AGRO_ZONES_CSV,
  MOFPI_54_COMMODITIES_LOSSES_CSV,
  MOFPI_ZONE_COMMODITY_MATRIX_CSV,
} from "../../data/mofpi-raw-csv";

export interface MofpiCommodityRecord {
  commodity_code: string;
  commodity_name: string;
  category: string;
  farm_level_loss_percent: number;
  market_level_loss_percent: number;
  total_post_harvest_loss_percent: number;
  national_production_000_mt: number;
  estimated_annual_loss_mt: number;
  optimum_temp_celsius: string;
  optimum_humidity_percent: string;
  ambient_shelf_life_days: number;
  cold_chain_shelf_life_days: number;
  decay_rate_exponent: number;
  primary_loss_drivers: string;
  key_agro_climatic_zones: string;
}

export interface MofpiAgroZoneRecord {
  zone_code: string;
  zone_number: string;
  zone_name: string;
  states_covered: string;
  climate_type: string;
  rainfall_mm: string;
  soil_types: string;
  key_mofpi_commodities: string;
  post_harvest_vulnerability_index: string;
  cold_chain_infrastructure_gap: string;
  logistics_hub: string;
}

export interface MofpiZoneCommodityMatrixRecord {
  matrix_id: string;
  zone_code: string;
  zone_name: string;
  commodity_code: string;
  commodity_name: string;
  category: string;
  peak_harvest_months: string;
  baseline_farm_loss_percent: number;
  baseline_market_loss_percent: number;
  baseline_total_loss_percent: number;
  freshroute_projected_loss_reduction_percent: number;
  freshroute_projected_salvage_percent: number;
  recommended_pre_cooling_hours: number;
  optimal_transit_temp_celsius: number;
}

/**
 * Loads and returns all 54 commodities from the MoFPI / NABCONS (2020-22) dataset.
 * Uses embedded raw CSV string directly for zero-latency, zero-I/O parsing.
 */
export function getMofpi54Commodities(): MofpiCommodityRecord[] {
  const { rows } = parseRawCsvText(MOFPI_54_COMMODITIES_LOSSES_CSV);

  return rows.map((r) => ({
    commodity_code: r.commodity_code,
    commodity_name: r.commodity_name,
    category: r.category,
    farm_level_loss_percent: parseFloat(r.farm_level_loss_percent),
    market_level_loss_percent: parseFloat(r.market_level_loss_percent),
    total_post_harvest_loss_percent: parseFloat(r.total_post_harvest_loss_percent),
    national_production_000_mt: parseFloat(r.national_production_000_mt),
    estimated_annual_loss_mt: parseFloat(r.estimated_annual_loss_mt),
    optimum_temp_celsius: r.optimum_temp_celsius,
    optimum_humidity_percent: r.optimum_humidity_percent,
    ambient_shelf_life_days: parseInt(r.ambient_shelf_life_days, 10),
    cold_chain_shelf_life_days: parseInt(r.cold_chain_shelf_life_days, 10),
    decay_rate_exponent: parseFloat(r.decay_rate_exponent),
    primary_loss_drivers: r.primary_loss_drivers,
    key_agro_climatic_zones: r.key_agro_climatic_zones,
  }));
}

/**
 * Loads and returns all 15 Agro-Climatic Zones of India.
 * Uses embedded raw CSV string directly for zero-latency parsing.
 */
export function getMofpi15AgroZones(): MofpiAgroZoneRecord[] {
  const { rows } = parseRawCsvText(MOFPI_15_AGRO_ZONES_CSV);

  return rows.map((r) => ({
    zone_code: r.zone_code,
    zone_number: r.zone_number,
    zone_name: r.zone_name,
    states_covered: r.states_covered,
    climate_type: r.climate_type,
    rainfall_mm: r.rainfall_mm,
    soil_types: r.soil_types,
    key_mofpi_commodities: r.key_mofpi_commodities,
    post_harvest_vulnerability_index: r.post_harvest_vulnerability_index,
    cold_chain_infrastructure_gap: r.cold_chain_infrastructure_gap,
    logistics_hub: r.logistics_hub,
  }));
}

/**
 * Loads the interaction matrix mapping 15 agro-climatic zones to commodities.
 * Uses embedded raw CSV string directly for zero-latency parsing.
 */
export function getMofpiZoneCommodityMatrix(): MofpiZoneCommodityMatrixRecord[] {
  const { rows } = parseRawCsvText(MOFPI_ZONE_COMMODITY_MATRIX_CSV);

  return rows.map((r) => ({
    matrix_id: r.matrix_id,
    zone_code: r.zone_code,
    zone_name: r.zone_name,
    commodity_code: r.commodity_code,
    commodity_name: r.commodity_name,
    category: r.category,
    peak_harvest_months: r.peak_harvest_months,
    baseline_farm_loss_percent: parseFloat(r.baseline_farm_loss_percent),
    baseline_market_loss_percent: parseFloat(r.baseline_market_loss_percent),
    baseline_total_loss_percent: parseFloat(r.baseline_total_loss_percent),
    freshroute_projected_loss_reduction_percent: parseFloat(r.freshroute_projected_loss_reduction_percent),
    freshroute_projected_salvage_percent: parseFloat(r.freshroute_projected_salvage_percent),
    recommended_pre_cooling_hours: parseFloat(r.recommended_pre_cooling_hours),
    optimal_transit_temp_celsius: parseFloat(r.optimal_transit_temp_celsius),
  }));
}

/**
 * Validates the operational CSVs against FreshRoute's Zod schemas in-memory directly from raw CSV strings.
 */
export function validateOperationalMofpiCsvs(): {
  inventoryValidCount: number;
  destinationsValidCount: number;
  transportValidCount: number;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Inventory CSV
  const invParsed = parseRawCsvText(MOFPI_INVENTORY_CSV);
  let invValid = 0;
  invParsed.rows.forEach((r, idx) => {
    const res = InventoryCsvRowSchema.safeParse(r);
    if (!res.success) {
      errors.push(`Inventory row ${idx + 2}: ${res.error.message}`);
    } else {
      invValid++;
    }
  });

  // 2. Destinations & Demand CSV
  const destParsed = parseRawCsvText(MOFPI_DESTINATIONS_DEMAND_CSV);
  let destValid = 0;
  destParsed.rows.forEach((r, idx) => {
    const res = DestinationDemandCsvRowSchema.safeParse(r);
    if (!res.success) {
      errors.push(`DestinationsDemand row ${idx + 2}: ${res.error.message}`);
    } else {
      destValid++;
    }
  });

  // 3. Transport Routes CSV
  const transParsed = parseRawCsvText(MOFPI_TRANSPORT_ROUTES_CSV);
  let transValid = 0;
  transParsed.rows.forEach((r, idx) => {
    const res = TransportCsvRowSchema.safeParse(r);
    if (!res.success) {
      errors.push(`Transport row ${idx + 2}: ${res.error.message}`);
    } else {
      transValid++;
    }
  });

  return {
    inventoryValidCount: invValid,
    destinationsValidCount: destValid,
    transportValidCount: transValid,
    errors,
  };
}

/**
 * Seeds the MoFPI Commodities catalog and Indian Agro-Climatic Zone warehouses into FreshRoute database
 * directly from embedded raw CSV strings (without dummy seed data or filesystem reading).
 */
export async function seedMofpiProduceNetwork(organizationId: string = "freshroute-org-canonical"): Promise<{
  commoditiesCount: number;
  warehousesCount: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // Ensure organization exists
  await db.query(
    `INSERT INTO "Organization" (id, slug, name, "billingPlan", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING;`,
    [organizationId, "freshroute-india-network", "FreshRoute India Produce Network", "ENTERPRISE_COLD_CHAIN"]
  );

  // 1. Seed all 54 commodities from raw catalog CSV string
  const catalogParsed = parseRawCsvText(MOFPI_COMMODITIES_CATALOG_CSV);

  let commCount = 0;
  for (const row of catalogParsed.rows) {
    const commId = `cmd-mofpi-${row.code.toLowerCase()}`;
    await db.query(
      `INSERT INTO "Commodity" (
        id, "organizationId", code, name, category, "defaultUnit",
        "standardShelfLifeDays", "minTempCelsius", "maxTempCelsius",
        "decayRateExponent", "defaultPricePerUnit", "defaultCostPerUnit",
        "wasteDisposalCostPerKg", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 'KG', $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        "standardShelfLifeDays" = EXCLUDED."standardShelfLifeDays",
        "minTempCelsius" = EXCLUDED."minTempCelsius",
        "maxTempCelsius" = EXCLUDED."maxTempCelsius",
        "decayRateExponent" = EXCLUDED."decayRateExponent",
        "defaultPricePerUnit" = EXCLUDED."defaultPricePerUnit",
        "defaultCostPerUnit" = EXCLUDED."defaultCostPerUnit",
        "wasteDisposalCostPerKg" = EXCLUDED."wasteDisposalCostPerKg";`,
      [
        commId,
        organizationId,
        row.code,
        row.name,
        row.category,
        parseInt(row.standardShelfLifeDays, 10),
        row.minTempCelsius,
        row.maxTempCelsius,
        row.decayRateExponent,
        row.defaultPricePerUnit,
        row.defaultCostPerUnit,
        row.wasteDisposalCostPerKg,
      ]
    );
    commCount++;
  }

  // 2. Seed all 15 warehouses across the 15 Agro-Climatic Zones from raw CSV string
  const whParsed = parseRawCsvText(MOFPI_WAREHOUSES_CSV);

  let whCount = 0;
  for (const row of whParsed.rows) {
    const whId = `wh-mofpi-${row.code.toLowerCase()}`;
    await db.query(
      `INSERT INTO "Warehouse" (
        id, "organizationId", code, name, address, city, state, "postalCode",
        latitude, longitude, "totalCapacityKg", "totalVolumeM3", "coldStorageType",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        "totalCapacityKg" = EXCLUDED."totalCapacityKg",
        "totalVolumeM3" = EXCLUDED."totalVolumeM3",
        "coldStorageType" = EXCLUDED."coldStorageType";`,
      [
        whId,
        organizationId,
        row.code,
        row.name,
        row.address,
        row.city,
        row.state,
        row.postalCode,
        row.latitude,
        row.longitude,
        row.totalCapacityKg,
        row.totalVolumeM3,
        row.coldStorageType,
      ]
    );
    whCount++;
  }

  return {
    commoditiesCount: commCount,
    warehousesCount: whCount,
  };
}

/**
 * Seeds the MoFPI operational batches, destinations, demand orders, and transport routes
 * directly from embedded raw CSV strings into FreshRoute database.
 */
export async function seedMofpiOperationalDataset(organizationId: string = "freshroute-org-canonical"): Promise<{
  batchesCount: number;
  destinationsCount: number;
  demandsCount: number;
  routesCount: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // Ensure commodities and warehouses exist first
  await seedMofpiProduceNetwork(organizationId);

  // Reference lookups for mapping
  const whRes = await db.query<any>(`SELECT id, code FROM "Warehouse" WHERE "organizationId" = $1;`, [organizationId]);
  const cmdRes = await db.query<any>(`SELECT id, code FROM "Commodity" WHERE "organizationId" = $1;`, [organizationId]);

  const whMap = new Map<string, string>(whRes.rows.map((w) => [w.code.toUpperCase(), w.id]));
  const cmdMap = new Map<string, string>(cmdRes.rows.map((c) => [c.code.toUpperCase(), c.id]));

  // 1. Seed Inventory Batches from raw inventory CSV string
  const invParsed = parseRawCsvText(MOFPI_INVENTORY_CSV);
  let batchCount = 0;
  for (const row of invParsed.rows) {
    const whId = whMap.get(row.warehouseCode.toUpperCase()) || `wh-mofpi-${row.warehouseCode.toLowerCase()}`;
    const cmdId = cmdMap.get(row.commodityCode.toUpperCase()) || `cmd-mofpi-${row.commodityCode.toLowerCase()}`;
    const batchId = `batch-mofpi-${row.batchCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const initialQty = row.initialQuantityKg;
    const unitCost = row.unitCostUsd || "0.50";
    const basePrice = row.basePriceUsd || "1.00";
    const storageTemp = row.storageTempCelsius || "2.5";
    const grade = row.qualityGrade || "GRADE_A";

    await db.query(
      `INSERT INTO "InventoryBatch" (
        id, "organizationId", "warehouseId", "commodityId", "batchCode",
        "harvestDate", "receivedDate", "expiryDate", "initialQuantity", "availableQuantity",
        "reservedQuantity", "dispatchedQuantity", "spoiledQuantity", "unitOfMeasure",
        "qualityGrade", "storageTempCelsius", "unitCost", "basePrice", status, "isDemo",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $8, 0, 0, 0, 'KG', $9, $10, $11, $12, 'AVAILABLE', false, NOW(), NOW())
      ON CONFLICT ("batchCode") DO UPDATE SET
        "availableQuantity" = EXCLUDED."availableQuantity",
        "initialQuantity" = EXCLUDED."initialQuantity",
        "unitCost" = EXCLUDED."unitCost",
        "basePrice" = EXCLUDED."basePrice",
        "expiryDate" = EXCLUDED."expiryDate",
        "storageTempCelsius" = EXCLUDED."storageTempCelsius",
        "updatedAt" = NOW();`,
      [
        batchId,
        organizationId,
        whId,
        cmdId,
        row.batchCode,
        new Date(row.harvestDate),
        new Date(row.expiryDate),
        initialQty,
        grade,
        storageTemp,
        unitCost,
        basePrice,
      ]
    );
    batchCount++;
  }

  // 2. Seed Destinations & Demands from raw destinations/demand CSV string
  const destParsed = parseRawCsvText(MOFPI_DESTINATIONS_DEMAND_CSV);
  let destCount = 0;
  let demandCount = 0;
  const destSeen = new Set<string>();

  for (const row of destParsed.rows) {
    const destCode = row.destinationCode;
    const destId = `dest-mofpi-${destCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const acceptsDiscounts =
      String(row.acceptsDiscounts).toLowerCase() === "true" || String(row.acceptsDiscounts).toLowerCase() === "yes";

    if (!destSeen.has(destCode)) {
      await db.query(
        `INSERT INTO "Destination" (
          id, "organizationId", code, name, tier, address, city, state, "postalCode",
          latitude, longitude, "minShelfLifeDays", "acceptsDiscounts", "maxDiscountPercent",
          "receivingHoursStart", "receivingHoursEnd", "isDemo", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '04:00', '22:00', false, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          tier = EXCLUDED.tier,
          "minShelfLifeDays" = EXCLUDED."minShelfLifeDays",
          "acceptsDiscounts" = EXCLUDED."acceptsDiscounts",
          "updatedAt" = NOW();`,
        [
          destId,
          organizationId,
          destCode,
          row.destinationName,
          row.tier,
          row.address,
          row.city,
          row.state,
          row.postalCode,
          row.latitude,
          row.longitude,
          parseInt(row.minShelfLifeDays, 10),
          acceptsDiscounts,
          acceptsDiscounts ? "30.00" : "0.00",
        ]
      );
      destSeen.add(destCode);
      destCount++;
    }

    // Insert demand order
    const cmdId = cmdMap.get(row.commodityCode.toUpperCase()) || `cmd-mofpi-${row.commodityCode.toLowerCase()}`;
    const demandId = `dem-mofpi-${row.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const qty = row.requestedQuantityKg;
    const contractedPrice = row.contractedPricePerKg;

    await db.query(
      `INSERT INTO "DestinationDemand" (
        id, "organizationId", "destinationId", "commodityId", "orderNumber",
        "requestedQuantity", "fulfilledQuantity", "unitOfMeasure", "contractedPricePerUnit",
        "deliveryWindowStart", "deliveryWindowEnd", "maxReceivingLimitKg", status, "isDemo",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'KG', $7, $8, $9, $6, 'PENDING', false, NOW(), NOW())
      ON CONFLICT ("orderNumber") DO UPDATE SET
        "requestedQuantity" = EXCLUDED."requestedQuantity",
        "contractedPricePerUnit" = EXCLUDED."contractedPricePerUnit",
        "deliveryWindowStart" = EXCLUDED."deliveryWindowStart",
        "deliveryWindowEnd" = EXCLUDED."deliveryWindowEnd",
        "updatedAt" = NOW();`,
      [
        demandId,
        organizationId,
        destId,
        cmdId,
        row.orderNumber,
        qty,
        contractedPrice,
        new Date(row.deliveryWindowStart),
        new Date(row.deliveryWindowEnd),
      ]
    );
    demandCount++;
  }

  // 3. Seed Transport Routes from raw transport CSV string
  const transParsed = parseRawCsvText(MOFPI_TRANSPORT_ROUTES_CSV);
  let routeCount = 0;
  for (const row of transParsed.rows) {
    const whId = whMap.get(row.originWarehouseCode.toUpperCase()) || `wh-mofpi-${row.originWarehouseCode.toLowerCase()}`;
    const routeId = `route-mofpi-${row.routeCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const fixedCost = row.fixedTripCostUsd || "300.00";
    const varCost = row.variableCostPerKgUsd || "0.05";
    const transitHours = row.transitDurationHours;
    const handlingHours = row.handlingDurationHours || "0.5";
    const capacityKg = row.maxWeightCapacityKg;

    await db.query(
      `INSERT INTO "Route" (
        id, "organizationId", "routeCode", "originWarehouseId", "destinationRegion",
        "vehicleType", "maxWeightCapacityKg", "maxVolumeCapacityM3",
        "currentAvailableWeightKg", "currentAvailableVolumeM3", "tempZoneMinCelsius",
        "tempZoneMaxCelsius", "transitDurationHours", "handlingDurationHours",
        "fixedTripCost", "variableCostPerKg", "departureTime", "estimatedArrivalTime",
        status, "isDemo", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 80.00, $7, 80.00, 0.0, 15.0, $8, $9, $10, $11, $12, $13, 'SCHEDULED', false, NOW(), NOW())
      ON CONFLICT ("routeCode") DO UPDATE SET
        "originWarehouseId" = EXCLUDED."originWarehouseId",
        "destinationRegion" = EXCLUDED."destinationRegion",
        "maxWeightCapacityKg" = EXCLUDED."maxWeightCapacityKg",
        "fixedTripCost" = EXCLUDED."fixedTripCost",
        "variableCostPerKg" = EXCLUDED."variableCostPerKg",
        "transitDurationHours" = EXCLUDED."transitDurationHours",
        "updatedAt" = NOW();`,
      [
        routeId,
        organizationId,
        row.routeCode,
        whId,
        row.destinationRegion,
        row.vehicleType || "REEFER_HEAVY_TRUCK",
        capacityKg,
        transitHours,
        handlingHours,
        fixedCost,
        varCost,
        new Date(row.departureTime),
        new Date(row.estimatedArrivalTime),
      ]
    );
    routeCount++;
  }

  return {
    batchesCount: batchCount,
    destinationsCount: destCount,
    demandsCount: demandCount,
    routesCount: routeCount,
  };
}

/**
 * Seeds the complete MoFPI produce network and operational dataset directly from raw CSV strings.
 */
export async function seedMofpiCompleteDataset(organizationId: string = "freshroute-org-canonical"): Promise<{
  commoditiesCount: number;
  warehousesCount: number;
  batchesCount: number;
  destinationsCount: number;
  demandsCount: number;
  routesCount: number;
}> {
  const produce = await seedMofpiProduceNetwork(organizationId);
  const operational = await seedMofpiOperationalDataset(organizationId);

  return {
    commoditiesCount: produce.commoditiesCount,
    warehousesCount: produce.warehousesCount,
    batchesCount: operational.batchesCount,
    destinationsCount: operational.destinationsCount,
    demandsCount: operational.demandsCount,
    routesCount: operational.routesCount,
  };
}
