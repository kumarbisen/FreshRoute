import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import { parseRawCsvText } from "./csv-import.service";
import {
  InventoryCsvRowSchema,
  DestinationDemandCsvRowSchema,
  TransportCsvRowSchema,
} from "../db/schema.zod";

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

const DATA_DIR = path.join(process.cwd(), "data", "mofpi-post-harvest");

/**
 * Loads and returns all 54 commodities from the MoFPI / NABCONS (2020-22) dataset.
 */
export function getMofpi54Commodities(): MofpiCommodityRecord[] {
  const filePath = path.join(DATA_DIR, "mofpi_54_commodities_post_harvest_losses.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const { rows } = parseRawCsvText(content);

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
 */
export function getMofpi15AgroZones(): MofpiAgroZoneRecord[] {
  const filePath = path.join(DATA_DIR, "mofpi_15_agro_climatic_zones_india.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const { rows } = parseRawCsvText(content);

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
 */
export function getMofpiZoneCommodityMatrix(): MofpiZoneCommodityMatrixRecord[] {
  const filePath = path.join(DATA_DIR, "freshroute_mofpi_zone_commodity_matrix.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const { rows } = parseRawCsvText(content);

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
 * Validates the operational CSVs against FreshRoute's Zod schemas in-memory.
 */
export function validateOperationalMofpiCsvs(): {
  inventoryValidCount: number;
  destinationsValidCount: number;
  transportValidCount: number;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Inventory CSV
  const invPath = path.join(DATA_DIR, "freshroute_inventory_mofpi_data.csv");
  const invContent = fs.readFileSync(invPath, "utf-8");
  const invParsed = parseRawCsvText(invContent);
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
  const destPath = path.join(DATA_DIR, "freshroute_destinations_demand_mofpi_data.csv");
  const destContent = fs.readFileSync(destPath, "utf-8");
  const destParsed = parseRawCsvText(destContent);
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
  const transPath = path.join(DATA_DIR, "freshroute_transport_routes_mofpi_data.csv");
  const transContent = fs.readFileSync(transPath, "utf-8");
  const transParsed = parseRawCsvText(transContent);
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
 * Seeds the MoFPI Commodities catalog and Indian Agro-Climatic Zone warehouses into FreshRoute database.
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

  // 1. Seed all 54 commodities from catalog
  const catalogPath = path.join(DATA_DIR, "freshroute_india_commodities_catalog.csv");
  const catalogContent = fs.readFileSync(catalogPath, "utf-8");
  const catalogParsed = parseRawCsvText(catalogContent);

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

  // 2. Seed all 15 warehouses across the 15 Agro-Climatic Zones
  const whPath = path.join(DATA_DIR, "freshroute_india_warehouses.csv");
  const whContent = fs.readFileSync(whPath, "utf-8");
  const whParsed = parseRawCsvText(whContent);

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
