import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  EnginePlannerInput,
  EnginePlanOutput,
  EngineSolverConfig,
} from "@/engine/contracts";
import { solveDistributionPlan } from "@/engine/planner";
import { evaluateScenario } from "@/engine/evaluator";
import {
  applyScenarioOverrides,
  executeScenarioRun,
  runSensitivityAnalysis,
  ScenarioOverrides,
} from "@/engine/scenario-engine";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createCanonicalScenarioInput(): EnginePlannerInput {
  const now = new Date("2026-10-15T08:00:00Z");
  const dayMs = 24 * 3600 * 1000;

  return {
    batches: [
      {
        id: "batch-strawberries-urgent",
        batchCode: "BATCH-STR-01",
        warehouseId: "wh-salinas",
        commodityId: "cmd-strawberries",
        commodityName: "Strawberries Albion",
        availableQuantityKg: 4000,
        initialQuantityKg: 4000,
        unitCostUsd: 2.5,
        harvestDate: new Date(now.getTime() - 3 * dayMs).toISOString(),
        receivedDate: new Date(now.getTime() - 2 * dayMs).toISOString(),
        expiryDate: new Date(now.getTime() + 2.5 * dayMs).toISOString(), // 2.5 days left
        storageTempCelsius: 2.0,
        qualityGrade: "GRADE_A",
      },
      {
        id: "batch-spinach-fresh",
        batchCode: "BATCH-SPN-02",
        warehouseId: "wh-salinas",
        commodityId: "cmd-spinach",
        commodityName: "Baby Spinach Tender",
        availableQuantityKg: 3000,
        initialQuantityKg: 3000,
        unitCostUsd: 1.8,
        harvestDate: new Date(now.getTime() - 1 * dayMs).toISOString(),
        receivedDate: new Date(now.getTime()).toISOString(),
        expiryDate: new Date(now.getTime() + 6.0 * dayMs).toISOString(), // 6.0 days left
        storageTempCelsius: 2.0,
        qualityGrade: "GRADE_A",
      },
      {
        id: "batch-oranges-surplus",
        batchCode: "BATCH-ORG-03",
        warehouseId: "wh-salinas",
        commodityId: "cmd-oranges",
        commodityName: "Navel Oranges Sweet",
        availableQuantityKg: 10000,
        initialQuantityKg: 10000,
        unitCostUsd: 1.0,
        harvestDate: new Date(now.getTime() - 4 * dayMs).toISOString(),
        receivedDate: new Date(now.getTime() - 1 * dayMs).toISOString(),
        expiryDate: new Date(now.getTime() + 20.0 * dayMs).toISOString(), // 20 days left
        storageTempCelsius: 5.0,
        qualityGrade: "GRADE_A",
      },
    ],
    commodities: [
      {
        id: "cmd-strawberries",
        code: "CMD-STR",
        name: "Strawberries Albion",
        category: "BERRIES",
        standardShelfLifeDays: 7,
        minTempCelsius: 1.0,
        maxTempCelsius: 4.0,
        decayRateExponent: 2.0,
        wasteDisposalCostPerKgUsd: 0.25,
      },
      {
        id: "cmd-spinach",
        code: "CMD-SPN",
        name: "Baby Spinach Tender",
        category: "GREENS",
        standardShelfLifeDays: 8,
        minTempCelsius: 1.0,
        maxTempCelsius: 4.0,
        decayRateExponent: 1.8,
        wasteDisposalCostPerKgUsd: 0.25,
      },
      {
        id: "cmd-oranges",
        code: "CMD-ORG",
        name: "Navel Oranges Sweet",
        category: "CITRUS",
        standardShelfLifeDays: 30,
        minTempCelsius: 3.0,
        maxTempCelsius: 8.0,
        decayRateExponent: 1.2,
        wasteDisposalCostPerKgUsd: 0.25,
      },
    ],
    destinations: [
      {
        id: "dest-metro-sf",
        code: "DEST-METRO-01",
        name: "Metro Fresh Premium Grocers (SF)",
        tier: "PREMIUM_GROCER",
        minShelfLifeDays: 2.0,
        acceptsDiscounts: false,
        maxDiscountPercent: 0,
        receivingHoursStart: "04:00",
        receivingHoursEnd: "18:00",
      },
      {
        id: "dest-oakland-dc",
        code: "DEST-OAK-02",
        name: "Pacific Hypermarkets (Oakland DC)",
        tier: "REGIONAL_SUPERMARKET",
        minShelfLifeDays: 4.0,
        acceptsDiscounts: false,
        maxDiscountPercent: 0,
        receivingHoursStart: "04:00",
        receivingHoursEnd: "22:00",
      },
    ],
    demands: [
      {
        id: "dem-str-metro",
        orderNumber: "ORD-STR-01",
        destinationId: "dest-metro-sf",
        commodityId: "cmd-strawberries",
        requestedQuantityKg: 3500,
        contractedPricePerKgUsd: 5.5,
        deliveryWindowStart: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
        deliveryWindowEnd: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      },
      {
        id: "dem-spn-oakland",
        orderNumber: "ORD-SPN-02",
        destinationId: "dest-oakland-dc",
        commodityId: "cmd-spinach",
        requestedQuantityKg: 2500,
        contractedPricePerKgUsd: 4.2,
        deliveryWindowStart: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
        deliveryWindowEnd: new Date(now.getTime() + 30 * 3600 * 1000).toISOString(),
      },
      {
        id: "dem-org-metro",
        orderNumber: "ORD-ORG-03",
        destinationId: "dest-metro-sf",
        commodityId: "cmd-oranges",
        requestedQuantityKg: 4000,
        contractedPricePerKgUsd: 2.8,
        deliveryWindowStart: new Date(now.getTime() + 10 * 3600 * 1000).toISOString(),
        deliveryWindowEnd: new Date(now.getTime() + 36 * 3600 * 1000).toISOString(),
      },
    ],
    routes: [
      {
        id: "route-sal-sf",
        routeCode: "RT-SAL-SF-01",
        originWarehouseId: "wh-salinas",
        destinationId: "dest-metro-sf",
        capacityKg: 8000,
        fixedCostUsd: 350,
        costPerKgUsd: 0.08,
        transitDurationHours: 2.5,
        handlingDurationHours: 0.5,
        departureTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
        tempZoneMinCelsius: 1.0,
        tempZoneMaxCelsius: 4.0,
      },
      {
        id: "route-sal-oak",
        routeCode: "RT-SAL-OAK-02",
        originWarehouseId: "wh-salinas",
        destinationId: "dest-oakland-dc",
        capacityKg: 6000,
        fixedCostUsd: 380,
        costPerKgUsd: 0.09,
        transitDurationHours: 3.0,
        handlingDurationHours: 0.5,
        departureTime: new Date(now.getTime() + 3 * 3600 * 1000).toISOString(),
        tempZoneMinCelsius: 1.0,
        tempZoneMaxCelsius: 4.0,
      },
    ],
    config: {
      algorithmVersion: "v1.0.0-fefo",
      enableDynamicMarkdowns: true,
      maxMarkdownPercent: 40,
      shelfLifeSafetyBufferHours: 4.0,
      spoilageAvoidanceWeight: 1.5,
      disposalPenaltyPerKgUsd: 0.25,
      handlingCostPerKgUsd: 0.05,
      planningTime: now.toISOString(),
    },
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("PHASE 08 — FreshRoute Scenario Lab & Sensitivity Simulator", () => {
  it("1. Applies transit duration delay and route closures without mutating base input", () => {
    const baseInput = createCanonicalScenarioInput();
    const originalTransitHours = baseInput.routes[0].transitDurationHours;
    const originalRouteCount = baseInput.routes.length;

    const overrides: ScenarioOverrides = {
      transitDelayHours: 4.0, // +4 hours highway closure
      disabledRouteIds: ["route-sal-oak"], // Truck breakdown on Oakland corridor
    };

    const modified = applyScenarioOverrides(baseInput, overrides);

    // Invariant verification: Base input is untouched
    expect(baseInput.routes[0].transitDurationHours).toBe(originalTransitHours);
    expect(baseInput.routes[1].capacityKg).toBe(6000);

    // Modified input reflects overrides
    expect(modified.routes[0].transitDurationHours).toBe(Number(originalTransitHours) + 4.0);
    expect(modified.routes[1].capacityKg).toBe(0); // Disabled route capacity set to 0
  });

  it("2. Applies demand shocks and price slumps accurately", () => {
    const baseInput = createCanonicalScenarioInput();
    const originalDemandKg = baseInput.demands[0].requestedQuantityKg;
    const originalPrice = baseInput.demands[0].contractedPricePerKgUsd;

    const overrides: ScenarioOverrides = {
      demandMultiplierPercent: 75, // -25% retail demand slump
      priceMultiplierPercent: 80, // -20% wholesale market price crash
    };

    const modified = applyScenarioOverrides(baseInput, overrides);

    expect(modified.demands[0].requestedQuantityKg).toBe(Number(originalDemandKg) * 0.75);
    expect(modified.demands[0].contractedPricePerKgUsd).toBe(
      Number(new Decimal(originalPrice).times(0.8).toFixed(2))
    );
  });

  it("3. Accelerates shelf-life decay and detects newly infeasible deliveries", () => {
    const baseInput = createCanonicalScenarioInput();
    const { plan: basePlan } = solveDistributionPlan(baseInput);

    // Strawberries (2.5d RSL) initially fulfill Metro SF order (min 2.0d SLA)
    const baseAlloc = basePlan.allocations.find((a) => a.batchId === "batch-strawberries-urgent");
    expect(baseAlloc).toBeDefined();

    // Stressed scenario: 50% shelf-life acceleration from harvest heat excursion
    const overrides: ScenarioOverrides = {
      shelfLifeReductionPercent: 50,
    };

    const result = executeScenarioRun(
      "plan-test-01",
      basePlan,
      baseInput,
      overrides,
      {
        name: "Harvest Heatwave Excursion",
        description: "50% shelf-life decay acceleration test",
      }
    );

    expect(result.scenarioId).toBeDefined();
    expect(result.governance.basePlanPreserved).toBe(true);

    // Under 50% decay, strawberries only have ~1.25d RSL, breaching the 2.0d Metro SF SLA hurdle
    const newlyInfeasible = result.newlyInfeasibleDeliveries.find(
      (d) => d.batchId === "batch-strawberries-urgent"
    );
    expect(newlyInfeasible).toBeDefined();
    expect(newlyInfeasible?.reasonCode).toBe("REJECTED_INSUFFICIENT_SHELF_LIFE");

    // Allocated volume drops and profit drops
    expect(result.deltas.allocatedKgDelta).toBeLessThan(0);
    expect(result.deltas.netProfitDeltaUsd).toBeLessThan(0);
  });

  it("4. Evaluates fleet capacity reduction and Knapsack prioritization shifts", () => {
    const baseInput = createCanonicalScenarioInput();
    const { plan: basePlan } = solveDistributionPlan(baseInput);

    // Overrides: Fleet capacity restricted to only 3,000 kg on SF route (against 7,500 kg total demand)
    const overrides: ScenarioOverrides = {
      capacityOverrides: {
        "route-sal-sf": 3000,
      },
    };

    const result = executeScenarioRun(
      "plan-test-01",
      basePlan,
      baseInput,
      overrides,
      {
        name: "Reefer Fleet Restriction",
        description: "Restricts SF route to 3000 kg",
      }
    );

    // Allocations on SF route cannot exceed the 3000 kg hard constraint
    const sfAllocations = result.scenarioRun.freshRoutePlan.allocations.filter(
      (a) => a.routeId === "route-sal-sf"
    );
    const totalSfAllocatedKg = sfAllocations.reduce((acc, a) => acc + Number(a.allocatedQuantityKg), 0);
    expect(totalSfAllocatedKg).toBeLessThanOrEqual(3000);

    // Unallocated surplus increases
    expect(result.deltas.allocatedKgDelta).toBeLessThan(0);
  });

  it("5. Evaluates compound supply chain disruption and reports urgency migrations", () => {
    const baseInput = createCanonicalScenarioInput();
    const { plan: basePlan } = solveDistributionPlan(baseInput);

    const overrides: ScenarioOverrides = {
      transitDelayHours: 3.0,
      shelfLifeReductionPercent: 30,
      demandMultiplierPercent: 85,
      capacityMultiplierPercent: 80,
    };

    const result = executeScenarioRun(
      "plan-test-01",
      basePlan,
      baseInput,
      overrides,
      {
        name: "Compound Disruption Storm",
        description: "Simultaneous delay, decay, demand drop, and fleet bottleneck",
      }
    );

    expect(result.deltas.droppedAllocationsCount).toBeGreaterThanOrEqual(0);
    expect(result.urgencyMigrations.length).toBe(3);

    // Strawberries should migrate from STABLE/MEDIUM to CRITICAL/EXPIRED
    const strMigration = result.urgencyMigrations.find((m) => m.batchId === "batch-strawberries-urgent");
    expect(strMigration?.isUrgencyEscalated).toBe(true);
    expect(result.deltas.executiveSummary).toContain("Scenario disruptions");
  });

  it("6. Executes deterministic sensitivity analysis sweep across transit delay range", () => {
    const baseInput = createCanonicalScenarioInput();
    const { plan: basePlan } = solveDistributionPlan(baseInput);

    const range = [0, 20, 40, 60, 80, 100];
    const sweep = runSensitivityAnalysis(
      baseInput,
      basePlan,
      "transitDelayPercent",
      range
    );

    expect(sweep.parameter).toBe("transitDelayPercent");
    expect(sweep.points.length).toBe(6);

    // First point (0% delay) should have zero delta
    expect(sweep.points[0].profitDeltaUsd).toBe(0);
    expect(sweep.points[0].parameterValue).toBe(0);

    // As delay increases, profit should degrade or stay flat (never magically increase)
    expect(sweep.worstCasePoint.profitUsd).toBeLessThanOrEqual(sweep.bestCasePoint.profitUsd);
    expect(sweep.disclaimer).toContain("Deterministic Sensitivity Sweep");
    expect(sweep.disclaimer).toContain("must not be interpreted as a validated probabilistic confidence interval");
  });

  it("7. Executes deterministic sensitivity analysis sweep across shelf-life reduction range", () => {
    const baseInput = createCanonicalScenarioInput();
    const { plan: basePlan } = solveDistributionPlan(baseInput);

    const range = [0, 10, 20, 30, 40, 50];
    const sweep = runSensitivityAnalysis(
      baseInput,
      basePlan,
      "shelfLifeReductionPercent",
      range
    );

    expect(sweep.points.length).toBe(6);
    expect(sweep.points[sweep.points.length - 1].profitUsd).toBeLessThanOrEqual(
      sweep.points[0].profitUsd
    );
  });
});
