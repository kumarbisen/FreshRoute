import { describe, it, expect, beforeEach } from "vitest";
import { getPgLite, resetPgLiteDatabase } from "@/server/db/pglite";
import { seedDemoDataset, DEMO_ORGANIZATION_ID, DEMO_WAREHOUSE_SALINAS_ID } from "@/server/services/data-foundation.service";
import {
  checkPlanningReadiness,
  generateDistributionPlan,
  getDistributionPlanById,
  listDistributionPlans,
  approveDistributionPlan,
  exportDispatchManifestCsv,
  exportComparisonReportCsv,
} from "@/server/services/planning.service";

describe("PHASE 06 — Distribution Planner Workflow & Persistence", () => {
  beforeEach(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
    await seedDemoDataset();
  });

  describe("1. Planning Readiness Assessment", () => {
    it("Verifies full system readiness with seeded canonical inventory, demand, and routes", async () => {
      const readiness = await checkPlanningReadiness(DEMO_ORGANIZATION_ID);

      expect(readiness.isReady).toBe(true);
      expect(readiness.reasons.length).toBe(0);
      expect(readiness.warehouses.length).toBe(2);
      expect(readiness.summary.availableBatchesCount).toBeGreaterThanOrEqual(4);
      expect(readiness.summary.pendingDemandsCount).toBeGreaterThanOrEqual(4);
      expect(readiness.summary.activeRoutesCount).toBeGreaterThanOrEqual(3);
      expect(readiness.summary.matchedCommoditiesCount).toBeGreaterThan(0);
    });

    it("Correctly identifies readiness for a specific warehouse", async () => {
      const readiness = await checkPlanningReadiness(DEMO_ORGANIZATION_ID, DEMO_WAREHOUSE_SALINAS_ID);

      expect(readiness.isReady).toBe(true);
      expect(readiness.summary.selectedWarehouseId).toBe(DEMO_WAREHOUSE_SALINAS_ID);
      expect(readiness.summary.availableBatchesCount).toBeGreaterThan(0);
      expect(readiness.summary.activeRoutesCount).toBeGreaterThan(0);
    });

    it("Fails readiness check with explicit reasons when warehouse has no stock", async () => {
      const readiness = await checkPlanningReadiness(DEMO_ORGANIZATION_ID, "wh-non-existent");

      expect(readiness.isReady).toBe(false);
      expect(readiness.reasons.length).toBeGreaterThan(0);
      expect(readiness.reasons.some((r) => r.includes("No available inventory batches found"))).toBe(true);
    });
  });

  describe("2. Plan Generation & Scenario Evaluation", () => {
    it("Generates and persists a reproducible distribution plan with comparative metrics", async () => {
      const result = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
        warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
        config: {
          enableDynamicMarkdowns: true,
          maxMarkdownPercent: 35,
          shelfLifeSafetyBufferHours: 2.0,
        },
      });

      expect(result.plan).toBeDefined();
      expect(result.plan.id).toBeDefined();
      expect(result.plan.planNumber).toMatch(/^PLAN-\d{8}-[A-Z0-9]{4}$/);
      expect(result.plan.status).toBe("OPTIMIZED");
      expect(result.plan.snapshotHash).toHaveLength(64);
      expect(result.plan.totalAllocatedKg).toBeGreaterThan(0);
      expect(result.plan.totalRevenueUsd).toBeGreaterThan(0);
      expect(typeof result.plan.netMarginUsd).toBe("number");

      // Allocations
      expect(result.plan.allocations.length).toBeGreaterThan(0);
      const firstAlloc = result.plan.allocations[0];
      expect(firstAlloc.batchCode).toBeDefined();
      expect(firstAlloc.orderNumber).toBeDefined();
      expect(firstAlloc.destinationName).toBeDefined();
      expect(firstAlloc.allocatedQuantity).toBeGreaterThan(0);
      expect(firstAlloc.grossRevenueUsd).toBeGreaterThan(0);
      expect(firstAlloc.arrivalShelfLifeDays).toBeGreaterThan(0);

      // Metrics vs baseline FIFO
      expect(result.plan.metrics).toBeDefined();
      expect(result.plan.metrics?.baselineProfitUsd).toBeDefined();
      expect(result.plan.metrics?.proposedProfitUsd).toBeDefined();
      expect(result.plan.metrics?.profitUpliftUsd).toBeDefined();

      // Mass Balance verification in evaluation run
      expect(result.evaluationRun.freshRouteLedger.massBalanceReconciled).toBe(true);
      expect(result.evaluationRun.freshRouteLedger.revenueReconciled).toBe(true);
      expect(result.evaluationRun.freshRouteLedger.financialLedgerReconciled).toBe(true);
    });

    it("Lists generated distribution plans in descending chronological order", async () => {
      await generateDistributionPlan(DEMO_ORGANIZATION_ID, { warehouseId: DEMO_WAREHOUSE_SALINAS_ID });
      const plans = await listDistributionPlans(DEMO_ORGANIZATION_ID);

      expect(plans.length).toBeGreaterThanOrEqual(2); // Seeded demo plan + newly generated plan
      expect(plans[0].planNumber).toBeDefined();
      expect(plans[0].totalAllocatedKg).toBeGreaterThan(0);
    });

    it("Retrieves plan by ID with parsed evaluation metrics and joined allocations", async () => {
      const created = await generateDistributionPlan(DEMO_ORGANIZATION_ID, { warehouseId: DEMO_WAREHOUSE_SALINAS_ID });
      const retrieved = await getDistributionPlanById(DEMO_ORGANIZATION_ID, created.plan.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.plan.id);
      expect(retrieved?.planNumber).toBe(created.plan.planNumber);
      expect(retrieved?.allocations.length).toBe(created.plan.allocations.length);
      expect(retrieved?.snapshot?.hashSha256).toBe(created.plan.snapshotHash);
      expect(retrieved?.evaluationRun).toBeDefined();
    });
  });

  describe("3. Manual Review & Approval State Machine", () => {
    it("Transitions an OPTIMIZED plan to COMMITTED, locking stock and recording quantity audits", async () => {
      const created = await generateDistributionPlan(DEMO_ORGANIZATION_ID, { warehouseId: DEMO_WAREHOUSE_SALINAS_ID });
      expect(created.plan.status).toBe("OPTIMIZED");

      const approval = await approveDistributionPlan(DEMO_ORGANIZATION_ID, created.plan.id);

      expect(approval.plan.status).toBe("COMMITTED");
      expect(approval.alreadyCommitted).toBe(false);
      expect(approval.reservedBatchesCount).toBeGreaterThan(0);

      // Verify that re-approving an already COMMITTED plan is idempotent
      const secondApproval = await approveDistributionPlan(DEMO_ORGANIZATION_ID, created.plan.id);
      expect(secondApproval.alreadyCommitted).toBe(true);
      expect(secondApproval.plan.status).toBe("COMMITTED");
    });
  });

  describe("4. RFC-4180 CSV Export Manifest & Comparative KPI Report", () => {
    it("Exports a well-formed RFC-4180 dispatch manifest CSV with headers and line items", async () => {
      const created = await generateDistributionPlan(DEMO_ORGANIZATION_ID, { warehouseId: DEMO_WAREHOUSE_SALINAS_ID });
      const csv = await exportDispatchManifestCsv(DEMO_ORGANIZATION_ID, created.plan.id);

      expect(csv).toContain("Sequence,PlanNumber,BatchCode,Commodity,DestinationCode");
      expect(csv).toContain(created.plan.planNumber);
      expect(csv.split("\r\n").length).toBeGreaterThan(created.plan.allocations.length);
    });

    it("Exports a comprehensive Baseline-vs-FreshRoute comparative KPI report CSV", async () => {
      const created = await generateDistributionPlan(DEMO_ORGANIZATION_ID, { warehouseId: DEMO_WAREHOUSE_SALINAS_ID });
      const csv = await exportComparisonReportCsv(DEMO_ORGANIZATION_ID, created.plan.id);

      expect(csv).toContain("MetricCategory,MetricName,Unit,FreshRouteFEFO,BaselineFIFO");
      expect(csv).toContain("Sold Quantity");
      expect(csv).toContain("Perishable Waste Spoilage");
      expect(csv).toContain("Realized Gross Inflow");
      expect(csv).toContain("Net Profit Margin");
    });
  });
});
