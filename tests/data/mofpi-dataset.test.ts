import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  getMofpi54Commodities,
  getMofpi15AgroZones,
  getMofpiZoneCommodityMatrix,
  validateOperationalMofpiCsvs,
  seedMofpiProduceNetwork,
  seedMofpiOperationalDataset,
  seedMofpiCompleteDataset,
} from "../../src/server/services/mofpi-data.service";
import { previewCsvUpload } from "../../src/server/services/csv-import.service";
import { getPgLite, initPgLiteSchema } from "../../src/server/db/pglite";

describe("MoFPI Post-Harvest Losses (2020-22) Study & FreshRoute SaaS Data Integration", () => {
  const DATA_DIR = path.join(process.cwd(), "data", "mofpi-post-harvest");
  const ORG_ID = "org-india-agro-test";

  beforeAll(async () => {
    const db = await getPgLite();
    await initPgLiteSchema(db);
  });

  describe("1. MoFPI 54 Commodities Post-Harvest Losses Dataset Integrity", () => {
    it("should contain exactly 54 commodities matching the MoFPI / NABCONS benchmark study", () => {
      const commodities = getMofpi54Commodities();
      expect(commodities).toHaveLength(54);
    });

    it("should accurately reflect official loss percentages across categories", () => {
      const commodities = getMofpi54Commodities();
      const cmdMap = new Map(commodities.map((c) => [c.commodity_code, c]));

      // Verify Tomato (Highest major vegetable loss in report: 11.62%)
      const tomato = cmdMap.get("CMD-TOM-01");
      expect(tomato).toBeDefined();
      expect(tomato?.farm_level_loss_percent).toBeCloseTo(8.37, 2);
      expect(tomato?.market_level_loss_percent).toBeCloseTo(3.25, 2);
      expect(tomato?.total_post_harvest_loss_percent).toBeCloseTo(11.62, 2);

      // Verify Guava (Highest fruit loss in report: 15.05%)
      const guava = cmdMap.get("CMD-GUA-01");
      expect(guava).toBeDefined();
      expect(guava?.farm_level_loss_percent).toBeCloseTo(11.59, 2);
      expect(guava?.market_level_loss_percent).toBeCloseTo(3.46, 2);
      expect(guava?.total_post_harvest_loss_percent).toBeCloseTo(15.05, 2);

      // Verify Apple (9.51%)
      const apple = cmdMap.get("CMD-APP-01");
      expect(apple).toBeDefined();
      expect(apple?.total_post_harvest_loss_percent).toBeCloseTo(9.51, 2);

      // Verify Paddy (4.77%) & Wheat (4.17%)
      const paddy = cmdMap.get("CMD-PAD-01");
      const wheat = cmdMap.get("CMD-WHT-01");
      expect(paddy?.total_post_harvest_loss_percent).toBeCloseTo(4.77, 2);
      expect(wheat?.total_post_harvest_loss_percent).toBeCloseTo(4.17, 2);

      // Verify Soybean (7.51% - highest oilseed)
      const soybean = cmdMap.get("CMD-SOY-01");
      expect(soybean?.total_post_harvest_loss_percent).toBeCloseTo(7.51, 2);

      // Verify Milk (0.87% - lowest loss in study due to dairy cold-chains)
      const milk = cmdMap.get("CMD-MLK-01");
      expect(milk?.total_post_harvest_loss_percent).toBeCloseTo(0.87, 2);

      // Verify Black Pepper (1.30% - lowest in crops)
      const pepper = cmdMap.get("CMD-BKP-01");
      expect(pepper?.total_post_harvest_loss_percent).toBeCloseTo(1.30, 2);
    });

    it("should correctly partition commodities into standard agricultural classifications", () => {
      const commodities = getMofpi54Commodities();
      const byCat = commodities.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byCat["CEREALS"]).toBe(5);
      expect(byCat["PULSES"]).toBe(4);
      expect(byCat["OILSEEDS"]).toBe(6);
      expect(byCat["FRUITS"]).toBe(11);
      expect(byCat["VEGETABLES"]).toBe(14);
      expect(byCat["PLANTATION_SPICES"]).toBe(8);
      expect(byCat["DAIRY"]).toBe(1);
      expect(byCat["FISHERIES"]).toBe(2);
      expect(byCat["MEAT"]).toBe(1);
      expect(byCat["POULTRY"]).toBe(1);
      expect(byCat["EGGS"]).toBe(1);

      const total = Object.values(byCat).reduce((a, b) => a + b, 0);
      expect(total).toBe(54);
    });
  });

  describe("2. India 15 Agro-Climatic Zones Dataset Integrity", () => {
    it("should contain all 15 planning commission agro-climatic zones", () => {
      const zones = getMofpi15AgroZones();
      expect(zones).toHaveLength(15);

      const zoneCodes = zones.map((z) => z.zone_code);
      for (let i = 1; i <= 15; i++) {
        const expectedCode = `ZONE-${i.toString().padStart(2, "0")}`;
        expect(zoneCodes).toContain(expectedCode);
      }
    });

    it("should define representative logistics hubs and soil/climatic profiles for every zone", () => {
      const zones = getMofpi15AgroZones();
      zones.forEach((z) => {
        expect(z.zone_name.length).toBeGreaterThan(5);
        expect(z.states_covered.length).toBeGreaterThan(3);
        expect(z.key_mofpi_commodities.length).toBeGreaterThan(3);
        expect(z.cold_chain_infrastructure_gap.length).toBeGreaterThan(10);
        expect(z.logistics_hub.length).toBeGreaterThan(5);
      });
    });

    it("should generate a rich zone-commodity interaction matrix with projected FreshRoute salvage savings", () => {
      const matrix = getMofpiZoneCommodityMatrix();
      expect(matrix.length).toBeGreaterThan(50);

      matrix.forEach((m) => {
        expect(m.baseline_total_loss_percent).toBeGreaterThan(0);
        expect(m.freshroute_projected_loss_reduction_percent).toBeGreaterThan(0);
        expect(m.freshroute_projected_salvage_percent).toBeGreaterThan(0);
        expect(m.freshroute_projected_loss_reduction_percent).toBeLessThan(m.baseline_total_loss_percent);
      });
    });
  });

  describe("3. FreshRoute SaaS Operational CSVs Validation & Ingest Compatibility", () => {
    it("should validate all rows of operational inventory, destinations-demand, and transport CSVs", () => {
      const valResult = validateOperationalMofpiCsvs();
      expect(valResult.errors).toEqual([]);
      expect(valResult.inventoryValidCount).toBe(15);
      expect(valResult.destinationsValidCount).toBe(10);
      expect(valResult.transportValidCount).toBe(6);
    });

    it("should seed Indian MoFPI produce network (54 commodities and 15 warehouses) to database", async () => {
      const seedResult = await seedMofpiProduceNetwork(ORG_ID);
      expect(seedResult.commoditiesCount).toBe(54);
      expect(seedResult.warehousesCount).toBe(15);

      const db = await getPgLite();
      const cmdRes = await db.query(
        `SELECT COUNT(*) as count FROM "Commodity" WHERE "organizationId" = $1;`,
        [ORG_ID]
      );
      expect(parseInt((cmdRes.rows[0] as { count: string }).count, 10)).toBe(54);

      const whRes = await db.query(
        `SELECT COUNT(*) as count FROM "Warehouse" WHERE "organizationId" = $1;`,
        [ORG_ID]
      );
      expect(parseInt((whRes.rows[0] as { count: string }).count, 10)).toBe(15);
    });

    it("should successfully preview and validate MoFPI inventory CSV through FreshRoute previewCsvUpload engine", async () => {
      const invCsvPath = path.join(DATA_DIR, "freshroute_inventory_mofpi_data.csv");
      const invCsvContent = fs.readFileSync(invCsvPath, "utf-8");

      const preview = await previewCsvUpload(ORG_ID, "inventory", invCsvContent);
      expect(preview.errors).toHaveLength(0);
      expect(preview.validRowsCount).toBe(15);
      expect(preview.canCommit).toBe(true);
    });

    it("should successfully preview and validate MoFPI destinations-demand CSV through FreshRoute previewCsvUpload engine", async () => {
      const destCsvPath = path.join(DATA_DIR, "freshroute_destinations_demand_mofpi_data.csv");
      const destCsvContent = fs.readFileSync(destCsvPath, "utf-8");

      const preview = await previewCsvUpload(ORG_ID, "destinations-demand", destCsvContent);
      expect(preview.errors).toHaveLength(0);
      expect(preview.validRowsCount).toBe(10);
      expect(preview.canCommit).toBe(true);
    });

    it("should successfully preview and validate MoFPI transport routes CSV through FreshRoute previewCsvUpload engine", async () => {
      const transCsvPath = path.join(DATA_DIR, "freshroute_transport_routes_mofpi_data.csv");
      const transCsvContent = fs.readFileSync(transCsvPath, "utf-8");

      const preview = await previewCsvUpload(ORG_ID, "transport", transCsvContent);
      expect(preview.errors).toHaveLength(0);
      expect(preview.validRowsCount).toBe(6);
      expect(preview.canCommit).toBe(true);
    });

    it("should seed operational dataset (15 batches, 10 destinations, 10 demands, 6 routes) directly from raw CSV strings", async () => {
      const opResult = await seedMofpiOperationalDataset(ORG_ID);
      expect(opResult.batchesCount).toBe(15);
      expect(opResult.destinationsCount).toBe(10);
      expect(opResult.demandsCount).toBe(10);
      expect(opResult.routesCount).toBe(6);

      const db = await getPgLite();
      const batchRes = await db.query(`SELECT COUNT(*) as count FROM "InventoryBatch" WHERE "organizationId" = $1;`, [ORG_ID]);
      expect(parseInt((batchRes.rows[0] as { count: string }).count, 10)).toBe(15);

      const destRes = await db.query(`SELECT COUNT(*) as count FROM "Destination" WHERE "organizationId" = $1;`, [ORG_ID]);
      expect(parseInt((destRes.rows[0] as { count: string }).count, 10)).toBe(10);

      const demandRes = await db.query(`SELECT COUNT(*) as count FROM "DestinationDemand" WHERE "organizationId" = $1;`, [ORG_ID]);
      expect(parseInt((demandRes.rows[0] as { count: string }).count, 10)).toBe(10);

      const routeRes = await db.query(`SELECT COUNT(*) as count FROM "Route" WHERE "organizationId" = $1;`, [ORG_ID]);
      expect(parseInt((routeRes.rows[0] as { count: string }).count, 10)).toBe(6);
    });

    it("should seed complete MoFPI dataset (produce network + operational entities) idempotently from raw CSV strings", async () => {
      const completeResult = await seedMofpiCompleteDataset(ORG_ID);
      expect(completeResult.commoditiesCount).toBe(54);
      expect(completeResult.warehousesCount).toBe(15);
      expect(completeResult.batchesCount).toBe(15);
      expect(completeResult.destinationsCount).toBe(10);
      expect(completeResult.demandsCount).toBe(10);
      expect(completeResult.routesCount).toBe(6);
    });
  });
});

