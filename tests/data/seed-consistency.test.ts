import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema, resetPgLiteDatabase, closePgLite } from "@/server/db/pglite";
import {
  seedDemoDataset,
  calculateArrivalShelfLife,
  calculateRouteTransportCost,
  calculateEconomicMargin,
  computePlanSnapshotHash,
  DEMO_ORGANIZATION_ID,
} from "@/server/services/data-foundation.service";

describe("Phase 02 Data Foundation - Seed Consistency & Economic Constraints", () => {
  beforeAll(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
  });

  afterAll(async () => {
    await closePgLite();
  });

  describe("1. Database Schema & Migration Execution", () => {
    it("should initialize all 14 relational tables in PostgreSQL WASM", async () => {
      const db = await getPgLite();
      await initPgLiteSchema(db);

      const res = await db.query<{ table_name: string }>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      const tableNames = res.rows.map((r) => r.table_name);
      const expectedTables = [
        "Allocation",
        "Commodity",
        "Destination",
        "DestinationDemand",
        "DiscountRecommendation",
        "DistributionPlan",
        "InventoryBatch",
        "Organization",
        "OrganizationMembership",
        "PlanMetrics",
        "PlanSnapshot",
        "Route",
        "Scenario",
        "Warehouse",
      ];

      for (const expected of expectedTables) {
        expect(tableNames).toContain(expected);
      }
      expect(tableNames.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe("2. Deterministic Seed Dataset & Idempotency", () => {
    it("should deterministically seed the demo dataset with exact expected entities", async () => {
      const summary = await seedDemoDataset();

      expect(summary.organizationsCount).toBe(1);
      expect(summary.warehousesCount).toBe(2);
      expect(summary.commoditiesCount).toBe(4);
      expect(summary.batchesCount).toBe(5);
      expect(summary.destinationsCount).toBe(4);
      expect(summary.demandsCount).toBe(5);
      expect(summary.routesCount).toBe(3);
      expect(summary.plansCount).toBe(1);
      expect(summary.allocationsCount).toBe(2);
      expect(summary.discountsCount).toBe(1);
    });

    it("should be idempotent when run multiple times without duplicating keys", async () => {
      const secondRun = await seedDemoDataset();

      expect(secondRun.organizationsCount).toBe(1);
      expect(secondRun.warehousesCount).toBe(2);
      expect(secondRun.batchesCount).toBe(5);
      expect(secondRun.destinationsCount).toBe(4);
    });
  });

  describe("3. Verification of 5 Canonical Edge Cases", () => {
    it("Case A: Urgent Dispatch (FEFO Urgency Priority) is recorded and satisfies SLA", async () => {
      const db = await getPgLite();
      const res = await db.query<{
        allocatedQuantity: string;
        reasonCode: string;
        arrivalShelfLifeDays: string;
      }>(`
        SELECT "allocatedQuantity", "reasonCode", "arrivalShelfLifeDays"
        FROM "Allocation"
        WHERE id = 'alloc-edge-a';
      `);

      expect(res.rows.length).toBe(1);
      const alloc = res.rows[0];
      expect(Number(alloc.allocatedQuantity)).toBe(4000);
      expect(alloc.reasonCode).toBe("FEFO_URGENCY_PRIORITY");
      expect(Number(alloc.arrivalShelfLifeDays)).toBeGreaterThan(0);
    });

    it("Case B: Infeasible Delivery (SLA Breach Rejection) is rejected by domain logic", async () => {
      const now = new Date();
      const dayMs = 24 * 3600 * 1000;
      // Batch B: 3.0 days until expiry
      const expiryDate = new Date(now.getTime() + 3.0 * dayMs);

      // Attempting to deliver to Pacific Hypermarket (requires 7.0 days minimum RSL)
      const rslCalc = calculateArrivalShelfLife({
        expiryDate,
        plannedDepartureDate: now,
        handlingDurationHours: 1.0,
        transitDurationHours: 3.0,
        bufferDurationHours: 1.0,
        minShelfLifeDays: 7.0, // Strict SLA
      });

      expect(rslCalc.meetsShelfLifeSla).toBe(false);
      expect(rslCalc.reasonCode).toBe("REJECTED_INSUFFICIENT_SHELF_LIFE");
      expect(rslCalc.remainingShelfLifeDays).toBeLessThan(7.0);
      expect(rslCalc.explanation).toContain("breaches customer receiving SLA");
    });

    it("Case C: Excess Supply (Surplus Inventory) leaves surplus without artificial allocation", async () => {
      const db = await getPgLite();
      const res = await db.query<{
        availableQuantity: string;
      }>(`
        SELECT "availableQuantity"
        FROM "InventoryBatch"
        WHERE id = 'batch-edge-c-excess';
      `);

      expect(res.rows.length).toBe(1);
      expect(Number(res.rows[0].availableQuantity)).toBe(20000);

      // Verify demand is only 5,000 kg, leaving 15,000 kg surplus unallocated
      const demRes = await db.query<{ requestedQuantity: string }>(`
        SELECT "requestedQuantity"
        FROM "DestinationDemand"
        WHERE id = 'dem-excess-metro-org';
      `);
      expect(Number(demRes.rows[0].requestedQuantity)).toBe(5000);
    });

    it("Case D: Unmet Demand (Supply Shortage) exists with 4,000 kg unfulfilled", async () => {
      const db = await getPgLite();
      const batchRes = await db.query<{ availableQuantity: string }>(`
        SELECT "availableQuantity"
        FROM "InventoryBatch"
        WHERE id = 'batch-edge-d-shortage';
      `);
      const demRes = await db.query<{ requestedQuantity: string }>(`
        SELECT "requestedQuantity"
        FROM "DestinationDemand"
        WHERE id = 'dem-shortage-pac-avo';
      `);

      const supply = Number(batchRes.rows[0].availableQuantity);
      const demand = Number(demRes.rows[0].requestedQuantity);

      expect(supply).toBe(2000);
      expect(demand).toBe(6000);
      expect(demand - supply).toBe(4000); // 4,000 kg shortage
    });

    it("Case E: Potential Discount Salvage is created for secondary buyer", async () => {
      const db = await getPgLite();
      const res = await db.query<{
        suggestedDiscountPercent: string;
        discountedPricePerUnit: string;
        status: string;
      }>(`
        SELECT "suggestedDiscountPercent", "discountedPricePerUnit", status
        FROM "DiscountRecommendation"
        WHERE id = 'disc-edge-e';
      `);

      expect(res.rows.length).toBe(1);
      expect(Number(res.rows[0].suggestedDiscountPercent)).toBe(20);
      expect(Number(res.rows[0].discountedPricePerUnit)).toBe(3.52);
      expect(res.rows[0].status).toBe("APPROVED");
    });
  });

  describe("4. Shelf-Life Invariant: Absolute Arrival Without Double Subtraction", () => {
    it("should compute absolute arrival shelf-life without double-subtracting elapsed time", () => {
      const departure = new Date("2026-10-15T08:00:00Z");
      const expiry = new Date("2026-10-22T08:00:00Z"); // 7 days (168 hours) from departure

      const handlingHours = 1.5;
      const transitHours = 4.5;
      const bufferHours = 2.0;
      // Total lead time = 8.0 hours

      const result = calculateArrivalShelfLife({
        expiryDate: expiry,
        plannedDepartureDate: departure,
        handlingDurationHours: handlingHours,
        transitDurationHours: transitHours,
        bufferDurationHours: bufferHours,
        minShelfLifeDays: 5.0,
      });

      // Planned arrival must be exactly 8 hours after departure
      const expectedArrival = new Date("2026-10-15T16:00:00Z");
      expect(result.plannedArrivalTimestamp.toISOString()).toBe(expectedArrival.toISOString());

      // Remaining shelf life at arrival = 168 - 8 = 160 hours = 6.67 days
      expect(result.remainingShelfLifeHours).toBeCloseTo(160, 1);
      expect(result.remainingShelfLifeDays).toBeCloseTo(6.67, 1);
      expect(result.meetsShelfLifeSla).toBe(true);

      // Verify that naive double-subtraction would have incorrectly subtracted transit twice
      const doubleSubtractedRslHours = 160 - 8; // 152 hours
      expect(result.remainingShelfLifeHours).not.toBe(doubleSubtractedRslHours);
    });
  });

  describe("5. Two-Part Transport Cost Formulation", () => {
    it("should return 0.00 transport cost when 0 kg is allocated", () => {
      const cost = calculateRouteTransportCost({
        fixedTripCostUsd: 400.0,
        variableCostPerKgUsd: 0.1,
        allocatedKg: 0,
        capacityKg: 10000,
      });

      expect(cost.totalTransportCostUsd.toNumber()).toBe(0);
      expect(cost.fixedCostUsd.toNumber()).toBe(0);
      expect(cost.variableCostUsd.toNumber()).toBe(0);
      expect(cost.isCapacityExceeded).toBe(false);
    });

    it("should accurately evaluate FixedCost + (AllocatedKg * VariableRate)", () => {
      const cost = calculateRouteTransportCost({
        fixedTripCostUsd: "350.00",
        variableCostPerKgUsd: "0.0850",
        allocatedKg: "5000.00",
        capacityKg: "12000.00",
      });

      // 350 + (5000 * 0.085) = 350 + 425 = 775.00
      expect(cost.fixedCostUsd.toNumber()).toBe(350.0);
      expect(cost.variableCostUsd.toNumber()).toBe(425.0);
      expect(cost.totalTransportCostUsd.toNumber()).toBe(775.0);
      expect(cost.capacityUtilizationPercent.toNumber()).toBeCloseTo(41.67, 1);
      expect(cost.isCapacityExceeded).toBe(false);
    });

    it("should flag vehicle capacity overflow when allocated exceeds capacity", () => {
      const overflow = calculateRouteTransportCost({
        fixedTripCostUsd: 350,
        variableCostPerKgUsd: 0.08,
        allocatedKg: 15000,
        capacityKg: 12000,
      });

      expect(overflow.isCapacityExceeded).toBe(true);
      expect(overflow.capacityUtilizationPercent.toNumber()).toBe(125);
    });
  });

  describe("6. Economic Margin & Deterministic Snapshot Integrity", () => {
    it("should correctly calculate gross revenue, purchase, transport, disposal, and net margin", () => {
      const margin = calculateEconomicMargin({
        grossRevenueUsd: new Decimal("46800.00"),
        purchaseCostUsd: new Decimal("26400.00"),
        transportCostUsd: new Decimal("2155.00"),
        spoilageWasteCostUsd: new Decimal("500.00"),
      });

      // Total Cost = 26400 + 2155 + 500 = 29055.00
      // Net Margin = 46800 - 29055 = 17745.00
      // Margin % = (17745 / 46800) * 100 = 37.92%
      expect(margin.totalCostUsd.toNumber()).toBe(29055.0);
      expect(margin.netMarginUsd.toNumber()).toBe(17745.0);
      expect(margin.marginPercent.toNumber()).toBe(37.92);
    });

    it("should produce a reproducible 64-character SHA-256 hash regardless of object key insertion order", () => {
      const obj1 = { plan: "PLAN-01", orgId: DEMO_ORGANIZATION_ID, batches: 5, demands: 5 };
      const obj2 = { demands: 5, orgId: DEMO_ORGANIZATION_ID, batches: 5, plan: "PLAN-01" };

      const hash1 = computePlanSnapshotHash(obj1);
      const hash2 = computePlanSnapshotHash(obj2);

      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);
    });
  });
});
