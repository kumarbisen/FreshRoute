import { describe, it, expect, beforeEach } from "vitest";
import { getPgLite, resetPgLiteDatabase } from "@/server/db/pglite";
import {
  seedDemoDataset,
  DEMO_ORGANIZATION_ID,
  DEMO_WAREHOUSE_SALINAS_ID,
} from "@/server/services/data-foundation.service";
import { generateDistributionPlan } from "@/server/services/planning.service";
import {
  evaluatePlanDiscounts,
  listDiscountRecommendations,
  updateDiscountRecommendationStatus,
  simulatePlanWithDiscounts,
} from "@/server/services/discount.service";

describe("PHASE 07 — Discount Center Workflow & Database Integration", () => {
  beforeEach(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
    await seedDemoDataset();
  });

  it("1. Evaluates discount opportunities for a generated plan and persists recommendations to database", async () => {
    // Generate a distribution plan with dynamic markdowns disabled to leave at-risk residual inventory
    const { plan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
      config: {
        enableDynamicMarkdowns: false,
      },
    });

    const res = await evaluatePlanDiscounts(DEMO_ORGANIZATION_ID, plan.id);

    expect(res.planId).toBe(plan.id);
    expect(res.evaluationResult).toBeDefined();
    expect(res.evaluationResult.recommendations.length).toBeGreaterThan(0);
    expect(res.evaluationResult.methodology.disclaimer).toContain("simulated decisions");

    // Verify recommendations persisted to database
    const persisted = await listDiscountRecommendations(DEMO_ORGANIZATION_ID);
    expect(persisted.length).toBeGreaterThan(0);
    expect(persisted[0].batchCode).toBeDefined();
    expect(persisted[0].destinationName).toBeDefined();
    expect(persisted[0].suggestedDiscountPercent).toBeGreaterThanOrEqual(0);
  });

  it("2. Transitions recommendation status to APPROVED with merchandiser audit explanation", async () => {
    const { plan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
      config: { enableDynamicMarkdowns: false },
    });

    await evaluatePlanDiscounts(DEMO_ORGANIZATION_ID, plan.id);
    const persisted = await listDiscountRecommendations(DEMO_ORGANIZATION_ID);
    expect(persisted.length).toBeGreaterThan(0);

    const targetRec = persisted[0];
    const approved = await updateDiscountRecommendationStatus(
      DEMO_ORGANIZATION_ID,
      targetRec.id,
      "APPROVE",
      "Approved secondary salvage tier for regional food hub clearance"
    );

    expect(approved.status).toBe("APPROVED");
    expect(approved.reasonExplanation).toContain("[APPROVED by Merchandiser]");
    expect(approved.reasonExplanation).toContain("Approved secondary salvage tier");
  });

  it("3. Transitions recommendation status to REJECTED with merchandiser audit reason", async () => {
    const { plan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
      config: { enableDynamicMarkdowns: false },
    });

    await evaluatePlanDiscounts(DEMO_ORGANIZATION_ID, plan.id);
    const persisted = await listDiscountRecommendations(DEMO_ORGANIZATION_ID);
    const targetRec = persisted[0];

    const rejected = await updateDiscountRecommendationStatus(
      DEMO_ORGANIZATION_ID,
      targetRec.id,
      "REJECT",
      "Margin floor deemed too low relative to customer brand perception"
    );

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.reasonExplanation).toContain("[REJECTED by Merchandiser]");
  });

  it("4. Transitions recommendation status to DEFERRED for subsequent commercial review", async () => {
    const { plan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
      config: { enableDynamicMarkdowns: false },
    });

    await evaluatePlanDiscounts(DEMO_ORGANIZATION_ID, plan.id);
    const persisted = await listDiscountRecommendations(DEMO_ORGANIZATION_ID);
    const targetRec = persisted[0];

    const deferred = await updateDiscountRecommendationStatus(
      DEMO_ORGANIZATION_ID,
      targetRec.id,
      "DEFER",
      "Awaiting secondary buyer confirmation call tomorrow morning"
    );

    expect(deferred.status).toBe("PENDING");
    expect(deferred.reasonExplanation).toContain("[DEFERRED for review]");
  });

  it("5. Simulates plan recalculation with approved discounts through shared economic evaluator", async () => {
    const { plan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
      config: { enableDynamicMarkdowns: false },
    });

    const evalRes = await evaluatePlanDiscounts(DEMO_ORGANIZATION_ID, plan.id);
    const approved = evalRes.evaluationResult.recommendations.filter(
      (r) => r.isDiscountRecommended && r.estimatedSalesKg > 0
    );

    if (approved.length > 0) {
      const sim = await simulatePlanWithDiscounts(DEMO_ORGANIZATION_ID, plan.id, approved);

      expect(sim.beforeLedger.massBalanceReconciled).toBe(true);
      expect(sim.afterLedger.massBalanceReconciled).toBe(true);
      expect(sim.afterLedger.revenueReconciled).toBe(true);
      expect(sim.afterLedger.financialLedgerReconciled).toBe(true);
      expect(sim.additionalSoldKg).toBeGreaterThan(0);
      expect(sim.additionalNetMarginUsd).toBeGreaterThanOrEqual(0);
    }
  });
});
