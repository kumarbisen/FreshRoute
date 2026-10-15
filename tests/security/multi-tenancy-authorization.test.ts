import { describe, it, expect, beforeEach } from "vitest";
import { getPgLite, resetPgLiteDatabase } from "@/server/db/pglite";
import {
  seedDemoDataset,
  DEMO_ORGANIZATION_ID,
  DEMO_WAREHOUSE_SALINAS_ID,
  DEMO_COMMODITIES,
} from "@/server/services/data-foundation.service";
import {
  listInventoryBatches,
  getInventoryBatchById,
  updateInventoryBatch,
  createInventoryBatch,
} from "@/server/services/inventory.service";
import {
  listDestinations,
  getDestinationById,
  listDemands,
  updateDemand,
  createDemand,
} from "@/server/services/destinations.service";
import {
  listTransportRoutes,
  getTransportRouteById,
  createTransportRoute,
} from "@/server/services/transport.service";
import {
  generateDistributionPlan,
  listDistributionPlans,
  getDistributionPlanById,
  approveDistributionPlan,
  exportDispatchManifestCsv,
  exportComparisonReportCsv,
} from "@/server/services/planning.service";
import {
  evaluatePlanDiscounts,
  listDiscountRecommendations,
  updateDiscountRecommendationStatus,
} from "@/server/services/discount.service";
import {
  createAndRunScenario,
  listScenarios,
  getScenarioById,
  deleteScenario,
} from "@/server/services/scenario.service";

describe("PHASE 09 — Multi-Tenancy & Authorization Security Audit", () => {
  const ORG_A = DEMO_ORGANIZATION_ID;
  const ORG_B = "org-competitor-logistics-corp";

  beforeEach(async () => {
    const db = await getPgLite();
    await resetPgLiteDatabase(db);
    await seedDemoDataset();

    // Register Organization B in the database
    await db.query(
      `
      INSERT INTO "Organization" (id, name, slug, "createdAt", "updatedAt")
      VALUES ($1, 'Competitor Logistics Corp', 'competitor-logistics', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `,
      [ORG_B]
    );
  });

  it("1. Proves strict cross-organization isolation for Inventory Batches", async () => {
    // Org A has seeded batches
    const { batches: batchesA } = await listInventoryBatches(ORG_A);
    expect(batchesA.length).toBeGreaterThan(0);
    const targetBatchA = batchesA[0];

    // Org B must see 0 batches
    const { batches: batchesB } = await listInventoryBatches(ORG_B);
    expect(batchesB.length).toBe(0);

    // Org B cannot retrieve Org A's batch by ID
    const retrievedByB = await getInventoryBatchById(ORG_B, targetBatchA.id);
    expect(retrievedByB).toBeNull();

    // Org B cannot adjust Org A's batch quantity
    await expect(
      updateInventoryBatch(ORG_B, targetBatchA.id, {
        availableQuantity: 0,
      })
    ).rejects.toThrow();

    // Org B cannot create a batch pointing to Org A's warehouse
    await expect(
      createInventoryBatch(ORG_B, {
        warehouseId: DEMO_WAREHOUSE_SALINAS_ID, // Belongs to Org A
        commodityId: DEMO_COMMODITIES.STRAWBERRIES.id, // Belongs to Org A
        batchCode: "BATCH-INTRUDER-99",
        initialQuantityKg: 1000,
        unitCostUsd: 2.0,
        basePriceUsd: 4.0,
        harvestDate: new Date(),
        expiryDate: new Date(Date.now() + 86400000 * 5),
        storageTempCelsius: 2.0,
      })
    ).rejects.toThrow(/does not exist in your organization/i);
  });

  it("2. Proves strict cross-organization isolation for Destinations and Demands", async () => {
    const { destinations: destsA } = await listDestinations(ORG_A);
    expect(destsA.length).toBeGreaterThan(0);
    const targetDestA = destsA[0];

    // Org B cannot see Org A's destinations
    const { destinations: destsB } = await listDestinations(ORG_B);
    expect(destsB.length).toBe(0);

    const destRetrievedByB = await getDestinationById(ORG_B, targetDestA.id);
    expect(destRetrievedByB).toBeNull();

    // Org B cannot see Org A's customer demands
    const { demands: demandsA } = await listDemands(ORG_A);
    expect(demandsA.length).toBeGreaterThan(0);
    const targetDemandA = demandsA[0];

    const { demands: demandsB } = await listDemands(ORG_B);
    expect(demandsB.length).toBe(0);

    // Org B cannot update Org A's demand
    await expect(
      updateDemand(ORG_B, targetDemandA.id, {
        status: "CANCELLED",
      })
    ).rejects.toThrow();

    // Org B cannot create demand against Org A's destination
    await expect(
      createDemand(ORG_B, {
        destinationId: targetDestA.id,
        commodityId: DEMO_COMMODITIES.STRAWBERRIES.id,
        orderNumber: "ORD-INTRUSION-01",
        requestedQuantityKg: 500,
        contractedPricePerKg: 5.0,
        deliveryWindowStart: new Date(),
        deliveryWindowEnd: new Date(Date.now() + 86400000 * 2),
      })
    ).rejects.toThrow(/does not exist in your organization/i);
  });

  it("3. Proves strict cross-organization isolation for Transport Routes", async () => {
    const { routes: routesA } = await listTransportRoutes(ORG_A);
    expect(routesA.length).toBeGreaterThan(0);
    const targetRouteA = routesA[0];

    // Org B sees 0 routes
    const { routes: routesB } = await listTransportRoutes(ORG_B);
    expect(routesB.length).toBe(0);

    // Org B cannot inspect route details
    const routeRetrievedByB = await getTransportRouteById(ORG_B, targetRouteA.id);
    expect(routeRetrievedByB).toBeNull();

    // Org B cannot create route referencing Org A's warehouse
    await expect(
      createTransportRoute(ORG_B, {
        routeCode: "RT-INTRUSION-01",
        originWarehouseId: DEMO_WAREHOUSE_SALINAS_ID, // Belongs to Org A
        destinationRegion: "San Francisco Bay Area",
        vehicleType: "REEFER_53FT_MULTI_ZONE",
        maxWeightCapacityKg: 10000,
        fixedTripCostUsd: 300,
        variableCostPerKgUsd: 0.08,
        transitDurationHours: 2.5,
        departureTime: new Date(),
        estimatedArrivalTime: new Date(Date.now() + 3600000 * 3),
      })
    ).rejects.toThrow(/does not exist in your organization/i);
  });

  it("4. Proves Organization B cannot access, approve, or export Organization A's Distribution Plans", async () => {
    // Generate base plan for Org A
    const { plan: planA } = await generateDistributionPlan(ORG_A, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });
    expect(planA.id).toBeDefined();

    // Org B lists 0 plans
    const plansB = await listDistributionPlans(ORG_B);
    expect(plansB.length).toBe(0);

    // Org B cannot retrieve Org A's plan details
    const planRetrievedByB = await getDistributionPlanById(ORG_B, planA.id);
    expect(planRetrievedByB).toBeNull();

    // Org B cannot approve or lock inventory for Org A's plan
    await expect(approveDistributionPlan(ORG_B, planA.id)).rejects.toThrow(/Distribution plan not found/i);

    // Org B cannot export Org A's dispatch manifest CSV
    await expect(exportDispatchManifestCsv(ORG_B, planA.id)).rejects.toThrow(/Plan not found/i);

    // Org B cannot export Org A's baseline comparison KPI CSV
    await expect(exportComparisonReportCsv(ORG_B, planA.id)).rejects.toThrow(/Plan not found/i);
  });

  it("5. Proves Organization B cannot view or approve Organization A's Discount Recommendations", async () => {
    const { plan: planA } = await generateDistributionPlan(ORG_A, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    // Evaluate discounts for Org A
    await evaluatePlanDiscounts(ORG_A, planA.id);
    const recsA = await listDiscountRecommendations(ORG_A);
    expect(recsA.length).toBeGreaterThan(0);
    const targetRecA = recsA[0];

    // Org B sees 0 recommendations
    const recsB = await listDiscountRecommendations(ORG_B);
    expect(recsB.length).toBe(0);

    // Org B cannot transition status of Org A's recommendation
    await expect(
      updateDiscountRecommendationStatus(ORG_B, targetRecA.id, "APPROVE", "Malicious authorization test")
    ).rejects.toThrow(/Discount recommendation not found/i);
  });

  it("6. Proves Organization B cannot access, simulate against, or delete Organization A's Scenarios", async () => {
    const { plan: planA } = await generateDistributionPlan(ORG_A, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    // Org A runs a scenario
    const scenA = await createAndRunScenario(ORG_A, {
      basePlanId: planA.id,
      name: "Org A Coastal Fog Delay",
      description: "Transit stress test",
      overrides: { transitDelayHours: 2.0 },
    });
    expect(scenA.scenarioId).toBeDefined();

    // Org B lists 0 scenarios
    const scensB = await listScenarios(ORG_B);
    expect(scensB.length).toBe(0);

    // Org B cannot view Org A's scenario details
    const scenRetrievedByB = await getScenarioById(ORG_B, scenA.scenarioId);
    expect(scenRetrievedByB).toBeNull();

    // Org B cannot execute a scenario against Org A's base plan
    await expect(
      createAndRunScenario(ORG_B, {
        basePlanId: planA.id,
        name: "Intruder Simulation",
        description: "Cross-tenant access attempt",
        overrides: { transitDelayHours: 3.0 },
      })
    ).rejects.toThrow(/Base distribution plan not found/i);

    // Org B cannot delete Org A's scenario
    const deleteResult = await deleteScenario(ORG_B, scenA.scenarioId);
    expect(deleteResult).toBe(false);

    // Verify Org A's scenario is still intact
    const stillExistsForA = await getScenarioById(ORG_A, scenA.scenarioId);
    expect(stillExistsForA).not.toBeNull();
  });
});
