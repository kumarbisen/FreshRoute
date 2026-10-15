import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  evaluatePlanDiscountOpportunities,
  simulatePlanWithApprovedDiscounts,
  DiscountReasonCode,
  computeSeverity,
} from "@/engine/discount-engine";
import {
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlanOutput,
  EnginePlannerInput,
  EngineTransportRoute,
} from "@/engine/contracts";
import { FreshRoutePlanningEngine } from "@/engine/planner";

describe("PHASE 07 — Pure TypeScript Discount Engine", () => {
  const strawberries: EngineCommodity = {
    id: "cmd-strawberries",
    code: "STR-001",
    name: "Organic Strawberries",
    category: "BERRIES",
    standardShelfLifeDays: 10,
    minTempCelsius: 1.0,
    maxTempCelsius: 4.0,
    decayRateExponent: 1.5,
    wasteDisposalCostPerKgUsd: 0.25,
  };

  const premiumGrocer: EngineDestination = {
    id: "dest-wholefoods",
    code: "WF-DAL",
    name: "Whole Foods DC",
    tier: "PREMIUM_GROCER",
    minShelfLifeDays: 4.0,
    acceptsDiscounts: false,
    maxDiscountPercent: 0,
  };

  const discountSalvageHub: EngineDestination = {
    id: "dest-salvage",
    code: "ALDI-DAL",
    name: "Discount Salvage Hub",
    tier: "DISCOUNT_CHAIN",
    minShelfLifeDays: 1.0,
    acceptsDiscounts: true,
    maxDiscountPercent: 40,
  };

  const routeToSalvage: EngineTransportRoute = {
    id: "route-wh1-salvage",
    routeCode: "RT-SAL-01",
    originWarehouseId: "wh-austin",
    destinationId: "dest-salvage",
    capacityKg: 10000,
    fixedCostUsd: 200,
    costPerKgUsd: 0.08,
    transitDurationHours: 2.0,
    handlingDurationHours: 0.5,
    departureTime: "2026-10-15T08:00:00Z",
    tempZoneMinCelsius: 1.0,
    tempZoneMaxCelsius: 4.0,
  };

  const routeToPremium: EngineTransportRoute = {
    id: "route-wh1-premium",
    routeCode: "RT-PREM-02",
    originWarehouseId: "wh-austin",
    destinationId: "dest-wholefoods",
    capacityKg: 10000,
    fixedCostUsd: 250,
    costPerKgUsd: 0.08,
    transitDurationHours: 2.0,
    handlingDurationHours: 0.5,
    departureTime: "2026-10-15T08:00:00Z",
    tempZoneMinCelsius: 1.0,
    tempZoneMaxCelsius: 4.0,
  };

  // --------------------------------------------------------------------------
  // 1. Perishability Severity Calculation
  // --------------------------------------------------------------------------
  it("Correctly classifies shelf-life risk tiers", () => {
    expect(computeSeverity(-0.5)).toBe("EXPIRED");
    expect(computeSeverity(0)).toBe("EXPIRED");
    expect(computeSeverity(1.2)).toBe("CRITICAL");
    expect(computeSeverity(2.0)).toBe("CRITICAL");
    expect(computeSeverity(3.5)).toBe("HIGH");
    expect(computeSeverity(5.0)).toBe("MEDIUM");
    expect(computeSeverity(8.0)).toBe("STABLE");
  });

  // --------------------------------------------------------------------------
  // 2. Expired Inventory Test
  // --------------------------------------------------------------------------
  it("Rejects expired inventory and recommends NO_DISCOUNT_EXPIRED_INVENTORY", () => {
    const expiredBatch: EngineInventoryBatch = {
      id: "b-expired",
      batchCode: "BATCH-EXP",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1000,
      unitCostUsd: 3.0,
      harvestDate: "2026-10-01T00:00:00Z",
      receivedDate: "2026-10-02T00:00:00Z",
      expiryDate: "2026-10-14T00:00:00Z", // In the past relative to 2026-10-15
      storageTempCelsius: 2.0,
    };

    const input: EnginePlannerInput = {
      batches: [expiredBatch],
      commodities: [strawberries],
      destinations: [discountSalvageHub],
      demands: [
        {
          id: "dem-01",
          orderNumber: "ORD-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 1000,
          contractedPricePerKgUsd: 5.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const planner = new FreshRoutePlanningEngine();
    const solveRes = planner.solve(input);

    const discountRes = evaluatePlanDiscountOpportunities(solveRes.plan, input, {
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    expect(discountRes.recommendations.length).toBe(1);
    const rec = discountRes.recommendations[0];
    expect(rec.isDiscountRecommended).toBe(false);
    expect(rec.reasonCode).toBe(DiscountReasonCode.NO_DISCOUNT_EXPIRED_INVENTORY);
    expect(rec.severity).toBe("EXPIRED");
    expect(rec.estimatedSalesKg).toBe(0);
    expect(rec.estimatedResidualStockKg).toBe(1000);
    expect(rec.reasonExplanation).toContain("Produce expired");
  });

  // --------------------------------------------------------------------------
  // 3. Insufficient Demand Test
  // --------------------------------------------------------------------------
  it("Handles insufficient demand by strictly capping sales at unfulfilled customer orders", () => {
    const atRiskBatch: EngineInventoryBatch = {
      id: "b-short-demand",
      batchCode: "BATCH-RISK-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000, // 2000 kg available
      unitCostUsd: 3.0,
      harvestDate: "2026-10-10T00:00:00Z",
      receivedDate: "2026-10-11T00:00:00Z",
      expiryDate: "2026-10-17T00:00:00Z", // 2 days RSL at 2026-10-15
      storageTempCelsius: 2.0,
    };

    const input: EnginePlannerInput = {
      batches: [atRiskBatch],
      commodities: [strawberries],
      destinations: [discountSalvageHub],
      demands: [
        {
          id: "dem-small",
          orderNumber: "ORD-SMALL-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 600, // Only 600 kg demand
          contractedPricePerKgUsd: 5.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: { planningTime: "2026-10-15T00:00:00Z", enableDynamicMarkdowns: false },
    };

    const planner = new FreshRoutePlanningEngine();
    const solveRes = planner.solve(input);

    // Initial plan allocated 600 kg, leaving 1400 kg unallocated
    expect(solveRes.plan.metrics.totalAllocatedKg).toBe(600);

    const discountRes = evaluatePlanDiscountOpportunities(solveRes.plan, input, {
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    const rec = discountRes.recommendations[0];
    // Remaining demand on dem-small is now 0 kg (600 - 600 = 0)
    // No other demand exists -> Insufficient demand!
    expect(rec.isDiscountRecommended).toBe(false);
    expect(rec.reasonCode).toBe(DiscountReasonCode.NO_DISCOUNT_INSUFFICIENT_DEMAND);
    expect(rec.residualQuantityKg).toBe(1400);
    expect(rec.estimatedSalesKg).toBe(0);
  });

  // --------------------------------------------------------------------------
  // 4. Infeasible Destinations (Route / Cold Chain Incompatibility)
  // --------------------------------------------------------------------------
  it("Rejects infeasible routes or temperature mismatch as candidate destinations", () => {
    const warmBatch: EngineInventoryBatch = {
      id: "b-warm",
      batchCode: "BATCH-WARM-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1000,
      unitCostUsd: 3.0,
      harvestDate: "2026-10-10T00:00:00Z",
      receivedDate: "2026-10-11T00:00:00Z",
      expiryDate: "2026-10-17T00:00:00Z",
      storageTempCelsius: 8.0, // Strawberries need 1.0 - 4.0 C, batch stored at 8.0 C
    };

    const input: EnginePlannerInput = {
      batches: [warmBatch],
      commodities: [strawberries],
      destinations: [discountSalvageHub],
      demands: [
        {
          id: "dem-01",
          orderNumber: "ORD-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 1000,
          contractedPricePerKgUsd: 5.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const planner = new FreshRoutePlanningEngine();
    const solveRes = planner.solve(input);

    const discountRes = evaluatePlanDiscountOpportunities(solveRes.plan, input, {
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    const rec = discountRes.recommendations[0];
    expect(rec.isDiscountRecommended).toBe(false);
    expect(rec.reasonCode).toBe(DiscountReasonCode.NO_DISCOUNT_INSUFFICIENT_DEMAND);
  });

  // --------------------------------------------------------------------------
  // 5. Zero Discount Preferable (Fresh Produce at List Price)
  // --------------------------------------------------------------------------
  it("Recommends NO_DISCOUNT_FRESH_HOLDING_SUPERIOR when 0% list price is feasible", () => {
    const freshBatch: EngineInventoryBatch = {
      id: "b-fresh",
      batchCode: "BATCH-FRESH-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1000,
      unitCostUsd: 3.0,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z", // 10 days RSL
      storageTempCelsius: 2.0,
    };

    // Demand that was not allocated because route had not been processed
    const emptyPlan: EnginePlanOutput = {
      planId: "empty-plan",
      snapshotHash: "hash-01",
      algorithmVersion: "v1.0.0",
      engineMetadata: { engineName: "FEFO", version: "1.0", executionTimestamp: "2026-10-15T00:00:00Z", solveDurationMs: 1 },
      config: {
        algorithmVersion: "1.0",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 40,
        minGrossMarginThresholdPercent: 0,
        shelfLifeSafetyBufferHours: 4.0,
        spoilageAvoidanceWeight: 1.5,
        planningTime: "2026-10-15T00:00:00Z",
        disposalPenaltyPerKgUsd: 0.25,
        handlingCostPerKgUsd: 0.05,
      },
      metrics: {
        totalAllocatedKg: 0,
        totalRequestedDemandKg: 1000,
        totalUnfulfilledDemandKg: 1000,
        totalSurplusInventoryKg: 1000,
        totalAtRiskInventoryKg: 0,
        totalSpoiledInventoryKg: 0,
        demandFillRatePercent: 0,
        slaComplianceRatePercent: 100,
        grossRevenueUsd: 0,
        inventoryCostUsd: 0,
        transportCostUsd: 0,
        spoilageDisposalPenaltyUsd: 0,
        netMarginUsd: 0,
        netMarginPercent: 0,
        spoilagePreventedKg: 0,
        spoilagePreventedValueUsd: 0,
        totalAllocationsCount: 0,
        activeRoutesCount: 0,
      },
      allocations: [],
      routeDispatches: [],
      batchLeftoverBreakdowns: [],
      demandFulfillments: [],
      rejections: [],
    };

    const input: EnginePlannerInput = {
      batches: [freshBatch],
      commodities: [strawberries],
      destinations: [discountSalvageHub],
      demands: [
        {
          id: "dem-01",
          orderNumber: "ORD-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 1000,
          contractedPricePerKgUsd: 5.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: emptyPlan.config,
    };

    const discountRes = evaluatePlanDiscountOpportunities(emptyPlan, input, {
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    const rec = discountRes.recommendations[0];
    expect(rec.isDiscountRecommended).toBe(false);
    expect(rec.reasonCode).toBe(DiscountReasonCode.NO_DISCOUNT_FRESH_HOLDING_SUPERIOR);
    expect(rec.proposedDiscountPercent).toBe(0);
    expect(rec.proposedSellingPricePerKgUsd).toBe(5.0);
  });

  // --------------------------------------------------------------------------
  // 6. Multiple Candidate Discounts & Optimal Margin Maximization
  // --------------------------------------------------------------------------
  it("Evaluates step-wise markdown percentages and picks the optimal profit-maximizing candidate", () => {
    // Batch with 2.2 days RSL (breaches Whole Foods 4d SLA, but viable for salvage hub at 1d SLA)
    const atRiskBatch: EngineInventoryBatch = {
      id: "b-salvage",
      batchCode: "BATCH-SALVAGE-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.8,
      harvestDate: "2026-10-08T00:00:00Z",
      receivedDate: "2026-10-09T00:00:00Z",
      expiryDate: "2026-10-17T06:00:00Z", // ~2.25 days RSL from planning time
      storageTempCelsius: 2.0,
    };

    const emptyPlan: EnginePlanOutput = {
      planId: "empty-plan-02",
      snapshotHash: "hash-02",
      algorithmVersion: "v1.0.0",
      engineMetadata: { engineName: "FEFO", version: "1.0", executionTimestamp: "2026-10-15T00:00:00Z", solveDurationMs: 1 },
      config: {
        algorithmVersion: "1.0",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 40,
        minGrossMarginThresholdPercent: 0,
        shelfLifeSafetyBufferHours: 2.0,
        spoilageAvoidanceWeight: 1.5,
        planningTime: "2026-10-15T00:00:00Z",
        disposalPenaltyPerKgUsd: 0.25,
        handlingCostPerKgUsd: 0.05,
      },
      metrics: {
        totalAllocatedKg: 0,
        totalRequestedDemandKg: 3000,
        totalUnfulfilledDemandKg: 3000,
        totalSurplusInventoryKg: 3000,
        totalAtRiskInventoryKg: 3000,
        totalSpoiledInventoryKg: 0,
        demandFillRatePercent: 0,
        slaComplianceRatePercent: 100,
        grossRevenueUsd: 0,
        inventoryCostUsd: 0,
        transportCostUsd: 0,
        spoilageDisposalPenaltyUsd: 0,
        netMarginUsd: 0,
        netMarginPercent: 0,
        spoilagePreventedKg: 0,
        spoilagePreventedValueUsd: 0,
        totalAllocationsCount: 0,
        activeRoutesCount: 0,
      },
      allocations: [],
      routeDispatches: [],
      batchLeftoverBreakdowns: [],
      demandFulfillments: [],
      rejections: [],
    };

    const input: EnginePlannerInput = {
      batches: [atRiskBatch],
      commodities: [strawberries],
      destinations: [{ ...discountSalvageHub, minShelfLifeDays: 3.0 }],
      demands: [
        {
          id: "dem-salvage-01",
          orderNumber: "ORD-SALVAGE-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 3000,
          contractedPricePerKgUsd: 4.8,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: emptyPlan.config,
    };

    const discountRes = evaluatePlanDiscountOpportunities(emptyPlan, input, {
      candidateDiscountSteps: [5, 10, 15, 20, 25, 30],
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    expect(discountRes.summary.discountRecommendedBatchesCount).toBe(1);
    const rec = discountRes.recommendations[0];
    expect(rec.isDiscountRecommended).toBe(true);
    expect(rec.proposedDiscountPercent).toBe(5); // Lowest discount that clears volume and maximizes revenue
    expect(rec.proposedSellingPricePerKgUsd).toBe(4.56); // 4.80 * 0.95 = 4.56
    expect(rec.estimatedSalesKg).toBe(3000);
    expect(rec.projectedSalesRevenueUsd).toBe(13680); // 3000 * 4.56
    expect(rec.estimatedDisposalLossAvoidedUsd).toBe(750); // 3000 * 0.25
    expect(rec.netEconomicImpactUsd).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 7. Loss-Making Discounts (Freight & Costs Exceed Salvage Return)
  // --------------------------------------------------------------------------
  it("Recommends NO_DISCOUNT_LOSS_MAKING when freight costs exceed salvage revenue + avoided disposal fee", () => {
    const expensiveFreightRoute: EngineTransportRoute = {
      id: "route-expensive",
      routeCode: "RT-EXP-99",
      originWarehouseId: "wh-austin",
      destinationId: "dest-salvage",
      capacityKg: 5000,
      fixedCostUsd: 1000,
      costPerKgUsd: 4.50, // Huge variable freight: $4.50/kg
      transitDurationHours: 2.0,
      handlingDurationHours: 0.5,
      departureTime: "2026-10-15T08:00:00Z",
      tempZoneMinCelsius: 1.0,
      tempZoneMaxCelsius: 4.0,
    };

    const atRiskBatch: EngineInventoryBatch = {
      id: "b-freight-trap",
      batchCode: "BATCH-TRAP-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 500,
      unitCostUsd: 3.0,
      harvestDate: "2026-10-08T00:00:00Z",
      receivedDate: "2026-10-09T00:00:00Z",
      expiryDate: "2026-10-17T06:00:00Z",
      storageTempCelsius: 2.0,
    };

    const emptyPlan: EnginePlanOutput = {
      planId: "empty-plan-03",
      snapshotHash: "hash-03",
      algorithmVersion: "v1.0.0",
      engineMetadata: { engineName: "FEFO", version: "1.0", executionTimestamp: "2026-10-15T00:00:00Z", solveDurationMs: 1 },
      config: {
        algorithmVersion: "1.0",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 40,
        minGrossMarginThresholdPercent: 0,
        shelfLifeSafetyBufferHours: 2.0,
        spoilageAvoidanceWeight: 1.5,
        planningTime: "2026-10-15T00:00:00Z",
        disposalPenaltyPerKgUsd: 0.25,
        handlingCostPerKgUsd: 0.05,
      },
      metrics: {
        totalAllocatedKg: 0,
        totalRequestedDemandKg: 500,
        totalUnfulfilledDemandKg: 500,
        totalSurplusInventoryKg: 500,
        totalAtRiskInventoryKg: 500,
        totalSpoiledInventoryKg: 0,
        demandFillRatePercent: 0,
        slaComplianceRatePercent: 100,
        grossRevenueUsd: 0,
        inventoryCostUsd: 0,
        transportCostUsd: 0,
        spoilageDisposalPenaltyUsd: 0,
        netMarginUsd: 0,
        netMarginPercent: 0,
        spoilagePreventedKg: 0,
        spoilagePreventedValueUsd: 0,
        totalAllocationsCount: 0,
        activeRoutesCount: 0,
      },
      allocations: [],
      routeDispatches: [],
      batchLeftoverBreakdowns: [],
      demandFulfillments: [],
      rejections: [],
    };

    // Demand contracted at $4.00/kg; with 20% discount = $3.20/kg
    // Freight is $4.50/kg + handling $0.05/kg = $4.55/kg
    // Net cash flow = 3.20 - 4.55 + 0.25 (penalty avoided) = -$1.10/kg loss!
    const input: EnginePlannerInput = {
      batches: [atRiskBatch],
      commodities: [strawberries],
      destinations: [discountSalvageHub],
      demands: [
        {
          id: "dem-01",
          orderNumber: "ORD-01",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 500,
          contractedPricePerKgUsd: 4.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [expensiveFreightRoute],
      config: emptyPlan.config,
    };

    const discountRes = evaluatePlanDiscountOpportunities(emptyPlan, input, {
      candidateDiscountSteps: [10, 20, 30],
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    const rec = discountRes.recommendations[0];
    expect(rec.isDiscountRecommended).toBe(false);
    expect(rec.reasonCode).toBe(DiscountReasonCode.NO_DISCOUNT_LOSS_MAKING);
    expect(rec.reasonExplanation).toContain("negative cash return");
  });

  // --------------------------------------------------------------------------
  // 8. Plan Before-and-After Recalculation Through Shared Evaluator
  // --------------------------------------------------------------------------
  it("Simulates applying approved discounts and recalculates economic metrics with strict mass and financial balance", () => {
    const batchToSalvage: EngineInventoryBatch = {
      id: "b-sim-salvage",
      batchCode: "BATCH-SIM-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 2.50,
      harvestDate: "2026-10-08T00:00:00Z",
      receivedDate: "2026-10-09T00:00:00Z",
      expiryDate: "2026-10-17T06:00:00Z",
      storageTempCelsius: 2.0,
    };

    const input: EnginePlannerInput = {
      batches: [batchToSalvage],
      commodities: [strawberries],
      destinations: [{ ...discountSalvageHub, minShelfLifeDays: 3.0 }],
      demands: [
        {
          id: "dem-salvage-sim",
          orderNumber: "ORD-SALVAGE-SIM",
          destinationId: "dest-salvage",
          commodityId: "cmd-strawberries",
          requestedQuantityKg: 2000,
          contractedPricePerKgUsd: 5.0,
          deliveryWindowStart: "2026-10-15T06:00:00Z",
          deliveryWindowEnd: "2026-10-15T18:00:00Z",
        },
      ],
      routes: [routeToSalvage],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        enableDynamicMarkdowns: false, // Turn off markdowns in initial solve to create at-risk residual
        disposalPenaltyPerKgUsd: 0.25,
        handlingCostPerKgUsd: 0.05,
      },
    };

    const planner = new FreshRoutePlanningEngine();
    const initialSolve = planner.solve(input);

    // Initial plan sold 0 kg because dynamic markdowns were disabled and SLA was tight
    expect(initialSolve.plan.metrics.totalAllocatedKg).toBe(0);

    // Evaluate discount opportunities
    const discountRes = evaluatePlanDiscountOpportunities(initialSolve.plan, input, {
      candidateDiscountSteps: [10, 20],
      evaluationTimestamp: "2026-10-15T00:00:00Z",
    });

    expect(discountRes.recommendations.length).toBe(1);
    const approvedRec = discountRes.recommendations[0];
    expect(approvedRec.isDiscountRecommended).toBe(true);

    // Simulate applying this approved recommendation
    const simResult = simulatePlanWithApprovedDiscounts(initialSolve.plan, input, [approvedRec]);

    expect(simResult.additionalAllocationsCount).toBe(1);
    expect(simResult.additionalSoldKg).toBe(2000);
    expect(simResult.additionalNetMarginUsd).toBeGreaterThan(0);

    // Verify Mass Balances
    expect(simResult.beforeLedger.massBalanceReconciled).toBe(true);
    expect(simResult.afterLedger.massBalanceReconciled).toBe(true);
    expect(simResult.beforeLedger.initialStockKg).toBe(2000);
    expect(simResult.afterLedger.soldQuantityKg).toBe(2000);
    expect(simResult.afterLedger.remainingQuantityKg).toBe(0);

    // Verify Revenue & Cost reconciliation
    expect(simResult.afterLedger.revenueReconciled).toBe(true);
    expect(simResult.afterLedger.financialLedgerReconciled).toBe(true);

    // Comparison verification
    expect(simResult.comparison.soldQuantityDeltaKg).toBe(2000);
    expect(simResult.beforeLedger.remainingQuantityKg).toBe(2000);
    expect(simResult.afterLedger.remainingQuantityKg).toBe(0);
    expect(simResult.comparison.netOutcomeDeltaUsd).toBeGreaterThan(0);
    expect(simResult.comparison.operationalCashUpliftUsd).toBeGreaterThan(0);
  });
});
