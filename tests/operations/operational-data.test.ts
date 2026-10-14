import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema, resetPgLiteDatabase, closePgLite } from "@/server/db/pglite";
import { seedDemoDataset, DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";
import {
  listInventoryBatches,
  getInventoryBatchById,
  createInventoryBatch,
  updateInventoryBatch,
  computeShelfLifeRisk,
} from "@/server/services/inventory.service";
import {
  listDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  listDemands,
  createDemand,
  updateDemand,
} from "@/server/services/destinations.service";
import {
  listTransportRoutes,
  getTransportRouteById,
  createTransportRoute,
  updateTransportRoute,
} from "@/server/services/transport.service";
import {
  getCsvSampleTemplate,
  parseRawCsvText,
  previewCsvUpload,
  commitCsvImport,
} from "@/server/services/csv-import.service";

describe("Phase 03 Operational Data Management", () => {
  const TEST_ORG_A = DEMO_ORGANIZATION_ID;
  const TEST_ORG_B = "org-isolated-tenant-b";

  beforeAll(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
    await seedDemoDataset();

    // Create secondary organization to verify multi-tenant isolation
    await db.query(`
      INSERT INTO "Organization" (id, slug, name, "billingPlan", "createdAt", "updatedAt")
      VALUES ($1, 'isolated-tenant-b', 'Isolated Tenant B LLC', 'ENTERPRISE_COLD_CHAIN', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_ORG_B]);
  });

  afterAll(async () => {
    await closePgLite();
  });

  // -------------------------------------------------------------
  // 1. INVENTORY OPERATIONS & AUDIT TRAIL
  // -------------------------------------------------------------
  describe("1. Inventory Management & Lifecycle Invariants", () => {
    it("should list inventory batches with search, filters, and pagination", async () => {
      const result = await listInventoryBatches(TEST_ORG_A, { page: 1, pageSize: 5 });
      expect(result.batches.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(5);
      expect(result.batches[0]).toHaveProperty("risk");
      expect(result.batches[0].risk).toHaveProperty("riskLevel");
    });

    it("should filter batches by riskLevel correctly", async () => {
      // Find critical batches (< 48h)
      const criticalResult = await listInventoryBatches(TEST_ORG_A, { riskLevel: "CRITICAL" });
      for (const batch of criticalResult.batches) {
        expect(batch.risk.riskLevel).toBe("CRITICAL");
        expect(batch.risk.remainingHours).toBeLessThanOrEqual(48);
      }
    });

    it("should compute accurate shelf-life risk thresholds", () => {
      const now = new Date("2026-10-15T00:00:00Z");

      // Critical: 30 hours remaining
      const critDate = new Date("2026-10-16T06:00:00Z");
      const crit = computeShelfLifeRisk(critDate, now);
      expect(crit.riskLevel).toBe("CRITICAL");

      // High: 3.5 days remaining
      const highDate = new Date("2026-10-18T12:00:00Z");
      const high = computeShelfLifeRisk(highDate, now);
      expect(high.riskLevel).toBe("HIGH");

      // Medium: 6 days remaining
      const medDate = new Date("2026-10-21T00:00:00Z");
      const med = computeShelfLifeRisk(medDate, now);
      expect(med.riskLevel).toBe("MEDIUM");

      // Low: 14 days remaining
      const lowDate = new Date("2026-10-29T00:00:00Z");
      const low = computeShelfLifeRisk(lowDate, now);
      expect(low.riskLevel).toBe("LOW");

      // Expired: past expiry
      const expDate = new Date("2026-10-14T00:00:00Z");
      const exp = computeShelfLifeRisk(expDate, now);
      expect(exp.riskLevel).toBe("EXPIRED");
    });

    it("should create a new batch and automatically log an INTAKE audit record", async () => {
      const uniqueCode = `BATCH-TEST-${Date.now()}`;
      const created = await createInventoryBatch(TEST_ORG_A, {
        warehouseId: "wh-salinas-01",
        commodityId: "cmd-strawberries",
        batchCode: uniqueCode,
        harvestDate: new Date("2026-10-10"),
        expiryDate: new Date("2026-10-25"),
        initialQuantityKg: 5000,
        qualityGrade: "GRADE_A",
        unitCostUsd: 3.25,
        basePriceUsd: 5.6,
        storageTempCelsius: 1.8,
      });

      expect(created.batchCode).toBe(uniqueCode);
      expect(created.availableQuantity).toBe(5000);
      expect(created.status).toBe("AVAILABLE");

      // Verify detail view includes INTAKE audit log
      const detail = await getInventoryBatchById(TEST_ORG_A, created.id);
      expect(detail).not.toBeNull();
      expect(detail!.audits.length).toBeGreaterThanOrEqual(1);
      expect(detail!.audits[0].changeType).toBe("INTAKE");
      expect(detail!.audits[0].deltaQuantity).toBe(5000);
    });

    it("should enforce invariant: sum of available, reserved, dispatched, and spoiled cannot exceed initial quantity", async () => {
      const batches = await listInventoryBatches(TEST_ORG_A);
      const target = batches.batches[0];

      await expect(
        updateInventoryBatch(TEST_ORG_A, target.id, {
          availableQuantity: target.initialQuantity + 500, // Exceeds initial
        })
      ).rejects.toThrow(/exceeds initial batch quantity/);
    });

    it("should reject negative quantities", async () => {
      const batches = await listInventoryBatches(TEST_ORG_A);
      const target = batches.batches[0];

      await expect(
        updateInventoryBatch(TEST_ORG_A, target.id, {
          availableQuantity: -100,
        })
      ).rejects.toThrow(/cannot be negative/);
    });

    it("should reject inappropriate lifecycle transitions from EXPIRED to AVAILABLE", async () => {
      const batches = await listInventoryBatches(TEST_ORG_A);
      const target = batches.batches[0];

      // Mark expired
      await updateInventoryBatch(TEST_ORG_A, target.id, { status: "EXPIRED" });

      // Attempt to reinstate
      await expect(
        updateInventoryBatch(TEST_ORG_A, target.id, { status: "AVAILABLE" })
      ).rejects.toThrow(/An expired batch cannot be reinstated to AVAILABLE/);
    });

    it("should log quantity adjustment audits on available stock changes", async () => {
      const batches = await listInventoryBatches(TEST_ORG_A);
      const target = batches.batches.find((b) => b.status === "AVAILABLE")!;

      await updateInventoryBatch(TEST_ORG_A, target.id, {
        availableQuantity: target.availableQuantity - 500,
        reason: "Pre-cooler quality sorting loss",
      });

      const detail = await getInventoryBatchById(TEST_ORG_A, target.id);
      const adjustmentAudit = detail!.audits.find((a) => a.reason === "Pre-cooler quality sorting loss");
      expect(adjustmentAudit).toBeDefined();
      expect(adjustmentAudit!.changeType).toBe("ADJUSTMENT");
      expect(adjustmentAudit!.deltaQuantity).toBe(-500);
    });
  });

  // -------------------------------------------------------------
  // 2. DESTINATIONS AND DEMAND MANAGEMENT
  // -------------------------------------------------------------
  describe("2. Destinations & Demand Order Management", () => {
    it("should list destinations with active demand counts and total requested kg", async () => {
      const result = await listDestinations(TEST_ORG_A);
      expect(result.destinations.length).toBeGreaterThanOrEqual(4);
      expect(result.destinations[0]).toHaveProperty("minShelfLifeDays");
      expect(result.destinations[0]).toHaveProperty("activeDemandsCount");
    });

    it("should create and update a destination", async () => {
      const destCode = `DEST-TEST-${Date.now()}`;
      const created = await createDestination(TEST_ORG_A, {
        code: destCode,
        name: "Test Organic Co-op",
        tier: "PREMIUM_GROCER",
        address: "700 Vine St",
        city: "San Jose",
        state: "CA",
        postalCode: "95110",
        latitude: 37.3382,
        longitude: -121.8863,
        minShelfLifeDays: 6,
        acceptsDiscounts: true,
        maxDiscountPercent: 15.0,
      });

      expect(created.code).toBe(destCode);
      expect(created.minShelfLifeDays).toBe(6);
      expect(created.acceptsDiscounts).toBe(true);

      const updated = await updateDestination(TEST_ORG_A, created.id, {
        name: "Test Organic Co-op Updated",
        minShelfLifeDays: 5,
      });

      expect(updated.name).toBe("Test Organic Co-op Updated");
      expect(updated.minShelfLifeDays).toBe(5);
    });

    it("should list demands with fulfilled and unfulfilled shortage quantities", async () => {
      const result = await listDemands(TEST_ORG_A);
      expect(result.demands.length).toBeGreaterThanOrEqual(5);

      const sampleDemand = result.demands[0];
      expect(sampleDemand).toHaveProperty("requestedQuantity");
      expect(sampleDemand).toHaveProperty("fulfilledQuantity");
      expect(sampleDemand).toHaveProperty("unfulfilledQuantity");
      expect(sampleDemand.unfulfilledQuantity).toBe(
        Math.max(0, sampleDemand.requestedQuantity - sampleDemand.fulfilledQuantity)
      );
    });

    it("should create a customer demand order with delivery windows", async () => {
      const orderNum = `ORD-TEST-${Date.now()}`;
      const windowStart = new Date("2026-10-18T08:00:00Z");
      const windowEnd = new Date("2026-10-18T18:00:00Z");

      const created = await createDemand(TEST_ORG_A, {
        destinationId: "dest-metro-tier1",
        commodityId: "cmd-strawberries",
        orderNumber: orderNum,
        requestedQuantityKg: 3500,
        contractedPricePerKg: 5.75,
        deliveryWindowStart: windowStart,
        deliveryWindowEnd: windowEnd,
      });

      expect(created.orderNumber).toBe(orderNum);
      expect(created.requestedQuantity).toBe(3500);
      expect(created.contractedPricePerUnit).toBe(5.75);
      expect(created.status).toBe("PENDING");
    });
  });

  // -------------------------------------------------------------
  // 3. TRANSPORT ROUTE OPERATIONS
  // -------------------------------------------------------------
  describe("3. Transport Logistics & Two-Part Tariffs", () => {
    it("should list transport routes with two-part cost tariffs and utilization", async () => {
      const result = await listTransportRoutes(TEST_ORG_A);
      expect(result.routes.length).toBeGreaterThanOrEqual(3);

      const route = result.routes[0];
      expect(route).toHaveProperty("fixedTripCostUsd");
      expect(route).toHaveProperty("variableCostPerKgUsd");
      expect(route).toHaveProperty("sampleCostFor1000KgUsd");
      expect(route).toHaveProperty("capacityUtilizationPercent");

      // Verify sample cost calculation: Fixed + (1000 * Variable)
      const expectedSample = route.fixedTripCostUsd + 1000 * route.variableCostPerKgUsd;
      expect(route.sampleCostFor1000KgUsd).toBeCloseTo(expectedSample, 1);
    });

    it("should create and update a transport route", async () => {
      const routeCode = `RT-TEST-${Date.now()}`;
      const depTime = new Date("2026-10-17T06:00:00Z");
      const arrTime = new Date("2026-10-17T09:30:00Z");

      const created = await createTransportRoute(TEST_ORG_A, {
        routeCode,
        originWarehouseId: "wh-salinas-01",
        destinationRegion: "Silicon Valley Corridor",
        vehicleType: "REEFER_53FT_MULTI_ZONE",
        maxWeightCapacityKg: 16000,
        fixedTripCostUsd: 450,
        variableCostPerKgUsd: 0.09,
        transitDurationHours: 3.5,
        handlingDurationHours: 0.5,
        departureTime: depTime,
        estimatedArrivalTime: arrTime,
      });

      expect(created.routeCode).toBe(routeCode);
      expect(created.fixedTripCostUsd).toBe(450);
      expect(created.totalLeadTimeHours).toBe(4.0); // 3.5 + 0.5

      const updated = await updateTransportRoute(TEST_ORG_A, created.id, {
        fixedTripCostUsd: 420,
        status: "LOADING",
      });

      expect(updated.fixedTripCostUsd).toBe(420);
      expect(updated.status).toBe("LOADING");
    });
  });

  // -------------------------------------------------------------
  // 4. CSV IMPORT WORKFLOW: PREVIEW, VALIDATION & COMMIT
  // -------------------------------------------------------------
  describe("4. CSV Import Workflows & Transactional Integrity", () => {
    it("should generate sample CSV templates with correct headers", () => {
      const invTemplate = getCsvSampleTemplate("inventory");
      expect(invTemplate.content).toContain("batchCode,commodityCode,warehouseCode,initialQuantityKg");

      const destTemplate = getCsvSampleTemplate("destinations-demand");
      expect(destTemplate.content).toContain("destinationCode,destinationName,tier,address");

      const transTemplate = getCsvSampleTemplate("transport");
      expect(transTemplate.content).toContain("routeCode,originWarehouseCode,destinationRegion");
    });

    it("should parse raw CSV text properly handling quotes and commas", () => {
      const csv = `name,address,qty\n"Fresh Foods, Inc.","123 Bay St, Apt 4",500\n"Standard Co",456 Main,1000`;
      const parsed = parseRawCsvText(csv);
      expect(parsed.rows.length).toBe(2);
      expect(parsed.rows[0].name).toBe("Fresh Foods, Inc.");
      expect(parsed.rows[0].address).toBe("123 Bay St, Apt 4");
    });

    it("should preview CSV and report row-level errors for invalid rows", async () => {
      const invalidCsv = `batchCode,commodityCode,warehouseCode,initialQuantityKg,qualityGrade,unitCostUsd,basePriceUsd,harvestDate,expiryDate,storageTempCelsius
BATCH-VALID-01,STR-01,DC-SALINAS,2500,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0
BATCH-BAD-QTY,STR-01,DC-SALINAS,-500,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0
BATCH-BAD-WH,STR-01,NON_EXISTENT_WH,3000,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0`;

      const preview = await previewCsvUpload(TEST_ORG_A, "inventory", invalidCsv);
      expect(preview.totalRows).toBe(3);
      expect(preview.validRowsCount).toBe(1);
      expect(preview.errorRowsCount).toBeGreaterThanOrEqual(2);
      expect(preview.canCommit).toBe(false);

      const badQtyErr = preview.errors.find((e) => e.rowNumber === 3);
      expect(badQtyErr).toBeDefined();

      const badWhErr = preview.errors.find((e) => e.rowNumber === 4);
      expect(badWhErr?.message).toContain("Warehouse with code 'NON_EXISTENT_WH' does not exist");
    });

    it("should detect duplicate batch codes within the CSV file", async () => {
      const dupCsv = `batchCode,commodityCode,warehouseCode,initialQuantityKg,qualityGrade,unitCostUsd,basePriceUsd,harvestDate,expiryDate,storageTempCelsius
BATCH-DUP-01,STR-01,DC-SALINAS,2500,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0
BATCH-DUP-01,STR-01,DC-SALINAS,3000,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0`;

      const preview = await previewCsvUpload(TEST_ORG_A, "inventory", dupCsv);
      expect(preview.canCommit).toBe(false);
      const dupErr = preview.errors.find((e) => e.message.includes("Duplicate batch code"));
      expect(dupErr).toBeDefined();
    });

    it("should transactionally commit valid CSV rows", async () => {
      const validCode1 = `BATCH-CSV-${Date.now()}-1`;
      const validCode2 = `BATCH-CSV-${Date.now()}-2`;
      const validCsv = `batchCode,commodityCode,warehouseCode,initialQuantityKg,qualityGrade,unitCostUsd,basePriceUsd,harvestDate,expiryDate,storageTempCelsius
${validCode1},STR-01,DC-SALINAS,2000,GRADE_A,2.50,4.50,2026-10-10,2026-10-25,2.0
${validCode2},SPN-01,DC-SALINAS,1500,GRADE_A,1.80,3.20,2026-10-11,2026-10-24,2.0`;

      const preview = await previewCsvUpload(TEST_ORG_A, "inventory", validCsv);
      expect(preview.canCommit).toBe(true);

      const commit = await commitCsvImport(TEST_ORG_A, "inventory", preview.previewRows);
      expect(commit.succeededCount).toBe(2);
      expect(commit.failedCount).toBe(0);

      // Verify batches exist in database
      const batch1 = await getInventoryBatchById(TEST_ORG_A, validCode1);
      const batch2 = await getInventoryBatchById(TEST_ORG_A, validCode2);
      expect(batch1).not.toBeNull();
      expect(batch2).not.toBeNull();
    });
  });

  // -------------------------------------------------------------
  // 5. MULTI-TENANT ORGANIZATION DATA ISOLATION
  // -------------------------------------------------------------
  describe("5. Multi-Tenant Organization Data Isolation", () => {
    it("should never return tenant A inventory batches when querying tenant B", async () => {
      const batchesOrgA = await listInventoryBatches(TEST_ORG_A);
      const batchesOrgB = await listInventoryBatches(TEST_ORG_B);

      expect(batchesOrgA.total).toBeGreaterThan(0);
      expect(batchesOrgB.total).toBe(0); // Tenant B has no batches yet
    });

    it("should prevent tenant B from reading or modifying tenant A records", async () => {
      const batchesOrgA = await listInventoryBatches(TEST_ORG_A);
      const targetId = batchesOrgA.batches[0].id;

      // Tenant B attempting to read Tenant A's batch
      const detailFromB = await getInventoryBatchById(TEST_ORG_B, targetId);
      expect(detailFromB).toBeNull();

      // Tenant B attempting to modify Tenant A's batch
      await expect(
        updateInventoryBatch(TEST_ORG_B, targetId, {
          availableQuantity: 100,
        })
      ).rejects.toThrow(/not found/);
    });
  });
});
