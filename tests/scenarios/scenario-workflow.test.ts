import { describe, it, expect, beforeEach } from "vitest";
import { getPgLite, resetPgLiteDatabase } from "@/server/db/pglite";
import {
  seedDemoDataset,
  DEMO_ORGANIZATION_ID,
  DEMO_WAREHOUSE_SALINAS_ID,
} from "@/server/services/data-foundation.service";
import { generateDistributionPlan, getDistributionPlanById } from "@/server/services/planning.service";
import {
  createAndRunScenario,
  listScenarios,
  getScenarioById,
  runSensitivitySweep,
  deleteScenario,
} from "@/server/services/scenario.service";

describe("PHASE 08 — Scenario Lab Workflow & Database Integration", () => {
  beforeEach(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
    await seedDemoDataset();
  });

  it("1. Executes a transit disruption scenario against a base plan and persists to database", async () => {
    // Generate canonical base plan
    const { plan: basePlan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    // Execute transit delay scenario
    const scenario = await createAndRunScenario(DEMO_ORGANIZATION_ID, {
      basePlanId: basePlan.id,
      name: "Highway 101 Freight Corridor Delay",
      description: "+3.0 hours traffic delay on Salinas-to-Bay Area routes",
      overrides: {
        transitDelayHours: 3.0,
      },
    });

    expect(scenario.scenarioId).toBeDefined();
    expect(scenario.basePlanId).toBe(basePlan.id);
    expect(scenario.deltas).toBeDefined();
    expect(scenario.governance.basePlanPreserved).toBe(true);
    expect(scenario.scenarioSnapshotHash).toBeDefined();

    // Verify persisted record in Scenario table
    const savedList = await listScenarios(DEMO_ORGANIZATION_ID);
    expect(savedList.length).toBeGreaterThan(0);
    const saved = savedList.find((s) => s.id === scenario.scenarioId);
    expect(saved).toBeDefined();
    expect(saved?.name).toBe("Highway 101 Freight Corridor Delay");
    expect(saved?.transitDelayHours).toBe(3.0);
    expect(saved?.status).toBe("EVALUATED");
  });

  it("2. Verifies base plan remains 100% immutable and unmutated after scenario run", async () => {
    const { plan: basePlanBefore } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    const beforeDetail = await getDistributionPlanById(DEMO_ORGANIZATION_ID, basePlanBefore.id);
    const beforeHash = beforeDetail?.snapshot?.hashSha256;
    const beforeAllocationsCount = beforeDetail?.allocations.length;
    const beforeProfit = Number(beforeDetail?.metrics?.proposedProfitUsd);

    // Execute severe compound disruption
    await createAndRunScenario(DEMO_ORGANIZATION_ID, {
      basePlanId: basePlanBefore.id,
      name: "Compound Disruption Storm",
      description: "Severe shock test",
      overrides: {
        transitDelayHours: 6.0,
        demandMultiplierPercent: 50,
        shelfLifeReductionPercent: 40,
      },
    });

    // Re-query base plan and verify exact bit-for-bit immutability
    const afterDetail = await getDistributionPlanById(DEMO_ORGANIZATION_ID, basePlanBefore.id);
    expect(afterDetail?.snapshot?.hashSha256).toBe(beforeHash);
    expect(afterDetail?.allocations.length).toBe(beforeAllocationsCount);
    expect(Number(afterDetail?.metrics?.proposedProfitUsd)).toBe(beforeProfit);
  });

  it("3. Retrieves detailed scenario diffs and newly infeasible deliveries by ID", async () => {
    const { plan: basePlan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    const created = await createAndRunScenario(DEMO_ORGANIZATION_ID, {
      basePlanId: basePlan.id,
      name: "Harvest Heat Stress",
      description: "Simulates accelerated biological decay",
      overrides: {
        shelfLifeReductionPercent: 40,
      },
    });

    const fetched = await getScenarioById(DEMO_ORGANIZATION_ID, created.scenarioId);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe("Harvest Heat Stress");
    expect(fetched?.deltas.spoilageKgDelta).toBeDefined();
    expect(Array.isArray(fetched?.allocationDiffs)).toBe(true);
    expect(Array.isArray(fetched?.newlyInfeasibleDeliveries)).toBe(true);
  });

  it("4. Runs a deterministic sensitivity sweep across transit delay range", async () => {
    const { plan: basePlan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    const sweep = await runSensitivitySweep(DEMO_ORGANIZATION_ID, {
      basePlanId: basePlan.id,
      parameter: "transitDelayPercent",
      rangeValues: [0, 25, 50, 75, 100],
    });

    expect(sweep.parameter).toBe("transitDelayPercent");
    expect(sweep.points.length).toBe(5);
    expect(sweep.points[0].parameterValue).toBe(0);
    expect(sweep.points[4].parameterValue).toBe(100);
    expect(sweep.disclaimer).toContain("Deterministic Sensitivity Sweep");
  });

  it("5. Deletes a saved scenario record successfully", async () => {
    const { plan: basePlan } = await generateDistributionPlan(DEMO_ORGANIZATION_ID, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    const created = await createAndRunScenario(DEMO_ORGANIZATION_ID, {
      basePlanId: basePlan.id,
      name: "Temporary Test Scenario",
      description: "To be deleted",
      overrides: { demandMultiplierPercent: 90 },
    });

    const deleted = await deleteScenario(DEMO_ORGANIZATION_ID, created.scenarioId);
    expect(deleted).toBe(true);

    const fetched = await getScenarioById(DEMO_ORGANIZATION_ID, created.scenarioId);
    expect(fetched).toBeNull();
  });
});
