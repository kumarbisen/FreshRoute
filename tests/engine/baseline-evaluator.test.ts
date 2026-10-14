/**
 * FreshRoute Distribution Planning Engine - Phase 05 Baseline & Economic Evaluator Tests
 * Tests fair evaluation pipeline, cost ledger reconciliation, safe zero-denominator handling,
 * and the three canonical comparative outcomes (FreshRoute Superior, Equivalent, Baseline Superior).
 */

import { describe, expect, it } from "vitest";
import {
  AllocationReasonCode,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlannerInput,
  EngineTransportRoute,
  evaluatePlanEconomicLedger,
  evaluateScenario,
  safePercentageChange,
  solveDistributionPlan,
} from "../../src/engine";

describe("Phase 05: Baseline Comparison & Economic Evaluation", () => {
  const strawberriesCommodity: EngineCommodity = {
    id: "cmd-strawberries",
    code: "BERRY-01",
    name: "Strawberries",
    category: "BERRIES",
    standardShelfLifeDays: 14,
    minTempCelsius: 1.0,
    maxTempCelsius: 4.0,
    decayRateExponent: 1.5,
    wasteDisposalCostPerKgUsd: 0.25,
  };

  const localGrocer: EngineDestination = {
    id: "dest-local",
    code: "DEST-LOCAL-01",
    name: "Fresh Market Metro",
    tier: "REGIONAL_SUPERMARKET",
    minShelfLifeDays: 5.0,
    acceptsDiscounts: false,
    maxDiscountPercent: 0,
  };

  const discountOutlet: EngineDestination = {
    id: "dest-outlet",
    code: "DEST-OUTLET-01",
    name: "Clearance Food Hub",
    tier: "DISCOUNT_CHAIN",
    minShelfLifeDays: 2.0,
    acceptsDiscounts: true,
    maxDiscountPercent: 35,
  };

  const localRoute: EngineTransportRoute = {
    id: "route-local",
    routeCode: "RT-LOC-01",
    originWarehouseId: "wh-austin",
    destinationId: "dest-local",
    capacityKg: 10000,
    fixedCostUsd: 150,
    costPerKgUsd: 0.05,
    transitDurationHours: 2.0,
    handlingDurationHours: 1.0,
    departureTime: "2026-10-15T08:00:00Z",
    tempZoneMinCelsius: 1.0,
    tempZoneMaxCelsius: 4.0,
  };

  // --------------------------------------------------------------------------
  // TEST 1: Safe Percentage Change with Zero & Negative Denominators
  // --------------------------------------------------------------------------
  it("computes percentage changes safely without NaN or Infinity for zero and negative baselines", () => {
    // Zero baseline
    expect(safePercentageChange(0, 0)).toBe(0.0);
    expect(safePercentageChange(150, 0)).toBe(100.0);
    expect(safePercentageChange(-50, 0)).toBe(-100.0);

    // Normal positive baseline
    expect(safePercentageChange(150, 100)).toBe(50.0);
    expect(safePercentageChange(50, 100)).toBe(-50.0);

    // Negative baseline (e.g. from -$100 loss to +$50 profit = +$150 gain)
    expect(safePercentageChange(50, -100)).toBe(150.0);
    // Negative baseline reducing loss (from -$100 loss to -$50 loss = +$50 improvement)
    expect(safePercentageChange(-50, -100)).toBe(50.0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Zero Spoilage Baseline & Full Mass/Cost Reconciliation
  // --------------------------------------------------------------------------
  it("evaluates a zero-spoilage baseline scenario with full ledger reconciliation", () => {
    // Both batches have 20+ days of shelf life (zero spoilage risk)
    const batch: EngineInventoryBatch = {
      id: "b-fresh",
      batchCode: "LOT-FRESH-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 4000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-11-04T00:00:00Z", // 20 days
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-01",
      orderNumber: "PO-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 4000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [localRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        handlingCostPerKgUsd: 0.04,
      },
    };

    const run = evaluateScenario(input);
    const ledger = run.freshRouteLedger;

    expect(ledger.massBalanceReconciled).toBe(true);
    expect(ledger.demandBalanceReconciled).toBe(true);
    expect(ledger.revenueReconciled).toBe(true);
    expect(ledger.inventoryCostReconciled).toBe(true);
    expect(ledger.financialLedgerReconciled).toBe(true);

    // Quantities
    expect(ledger.initialStockKg).toBe(4000);
    expect(ledger.soldQuantityKg).toBe(4000);
    expect(ledger.remainingQuantityKg).toBe(0);
    expect(ledger.spoiledExpiredStockKg).toBe(0);
    expect(ledger.spoilageRatePercent).toBe(0.0);
    expect(ledger.fulfillmentRatePercent).toBe(100.0);

    // Revenue: 4000kg * $4.50 = $18,000
    expect(ledger.referenceRevenueUsd).toBe(18000);
    expect(ledger.realizedSalesRevenueUsd).toBe(18000);
    expect(ledger.discountForegoneRevenueUsd).toBe(0);

    // Costs
    // COGS: 4000kg * $2.00 = $8,000
    expect(ledger.cogsSoldInventoryUsd).toBe(8000);
    // Transport: $150 fixed + 4000 * $0.05 ($200) = $350
    expect(ledger.incurredTransportTotalCostUsd).toBe(350);
    // Handling: 4000kg * $0.04 = $160
    expect(ledger.incurredHandlingCostUsd).toBe(160);
    // Disposal: $0
    expect(ledger.incurredDisposalPenaltyUsd).toBe(0);

    // Net Outcome: $18,000 - $8,000 - $350 - $160 = $9,490
    expect(ledger.netEconomicOutcomeUsd).toBe(9490);
    expect(ledger.operationalCashContributionUsd).toBe(17490); // $18,000 - $350 - $160
  });

  // --------------------------------------------------------------------------
  // TEST 3: Zero Demand Scenario
  // --------------------------------------------------------------------------
  it("handles a zero-demand scenario cleanly with 100% stock retention and zero sales", () => {
    const batch: EngineInventoryBatch = {
      id: "b-idle",
      batchCode: "LOT-IDLE-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.10,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z", // 10 days
      storageTempCelsius: 2.0,
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [], // ZERO DEMAND
      routes: [localRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run = evaluateScenario(input);
    const ledger = run.freshRouteLedger;

    expect(ledger.massBalanceReconciled).toBe(true);
    expect(ledger.initialStockKg).toBe(3000);
    expect(ledger.soldQuantityKg).toBe(0);
    expect(ledger.remainingQuantityKg).toBe(3000);
    expect(ledger.unsoldHealthyStockKg).toBe(3000);
    expect(ledger.spoiledExpiredStockKg).toBe(0);

    // Financials
    expect(ledger.realizedSalesRevenueUsd).toBe(0);
    expect(ledger.incurredTransportTotalCostUsd).toBe(0);
    expect(ledger.incurredHandlingCostUsd).toBe(0);
    expect(ledger.cogsSoldInventoryUsd).toBe(0);
    expect(ledger.remainingHealthyInventoryValueUsd).toBe(6300); // 3000 * 2.10
    expect(ledger.netEconomicOutcomeUsd).toBe(0);
    expect(ledger.inventoryCostReconciled).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Excess Stock (Unallocated Inventory Asset vs Spoilage)
  // --------------------------------------------------------------------------
  it("distinguishes unsold healthy inventory asset value from spoiled inventory write-off under excess stock", () => {
    // 5000 kg available, demand for only 2000 kg. 3000 kg remains fresh.
    const batch: EngineInventoryBatch = {
      id: "b-excess",
      batchCode: "LOT-EXCESS-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 5000,
      unitCostUsd: 2.20,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-28T00:00:00Z", // 13 days fresh
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-excess",
      orderNumber: "PO-EXC-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [localRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run = evaluateScenario(input);
    const ledger = run.freshRouteLedger;

    expect(ledger.massBalanceReconciled).toBe(true);
    expect(ledger.initialStockKg).toBe(5000);
    expect(ledger.soldQuantityKg).toBe(2000);
    expect(ledger.remainingQuantityKg).toBe(3000);
    expect(ledger.unsoldHealthyStockKg).toBe(3000);
    expect(ledger.spoiledExpiredStockKg).toBe(0);

    // Unsold healthy inventory carries asset value on balance sheet, NOT a spoilage write-off
    expect(ledger.remainingHealthyInventoryValueUsd).toBe(6600); // 3000 * 2.20
    expect(ledger.spoiledInventoryWriteOffUsd).toBe(0);
    expect(ledger.totalSpoilageEconomicLossUsd).toBe(0);
    expect(ledger.inventoryCostReconciled).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Constrained Capacity & Unmet Demand Lost Revenue
  // --------------------------------------------------------------------------
  it("accounts for constrained route capacity and quantifies unmet demand lost revenue potential", () => {
    // 5000 kg demand, 5000 kg stock, but route capacity is capped at 2500 kg
    const batch: EngineInventoryBatch = {
      id: "b-cap",
      batchCode: "LOT-CAP-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 5000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-cap",
      orderNumber: "PO-CAP-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 5000,
      contractedPricePerKgUsd: 5.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const constrainedRoute: EngineTransportRoute = {
      ...localRoute,
      capacityKg: 2500, // Binding ceiling!
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [constrainedRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run = evaluateScenario(input);
    const ledger = run.freshRouteLedger;

    expect(ledger.soldQuantityKg).toBe(2500);
    expect(ledger.totalDemandKg).toBe(5000);
    expect(ledger.fulfilledDemandKg).toBe(2500);
    expect(ledger.unmetDemandKg).toBe(2500);
    expect(ledger.fulfillmentRatePercent).toBe(50.0);

    // Lost revenue potential: 2500 kg unmet * $5.00 contracted = $12,500
    expect(ledger.unmetDemandLostRevenueUsd).toBe(12500);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Infeasible Route & 100% Stock Rejection Recording
  // --------------------------------------------------------------------------
  it("records zero allocations and logs structured rejections when route is temperature-incompatible", () => {
    const batch: EngineInventoryBatch = {
      id: "b-temp",
      batchCode: "LOT-TEMP-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z",
      storageTempCelsius: 2.0, // Strawberries at 2.0°C
    };

    const frozenRoute: EngineTransportRoute = {
      ...localRoute,
      routeCode: "RT-FROZEN-01",
      tempZoneMinCelsius: -20.0,
      tempZoneMaxCelsius: -15.0, // Frozen reefer!
    };

    const demand: EngineDemandOrder = {
      id: "dem-temp",
      orderNumber: "PO-TEMP-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 3000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [frozenRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run = evaluateScenario(input);
    expect(run.freshRoutePlan.allocations.length).toBe(0);
    expect(run.baselinePlan.allocations.length).toBe(0);
    expect(run.freshRoutePlan.rejections.length).toBeGreaterThan(0);
    expect(run.freshRoutePlan.rejections[0].reasonCode).toBe(
      AllocationReasonCode.REJECTED_TEMPERATURE_INCOMPATIBLE
    );
    expect(run.freshRouteLedger.soldQuantityKg).toBe(0);
    expect(run.freshRouteLedger.unmetDemandKg).toBe(3000);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Discount Foregone Revenue vs No Double Counting
  // --------------------------------------------------------------------------
  it("accounts for discounts as foregone reference revenue without double-counting as an operating expense", () => {
    // Produce near expiry (3.2 days RSL at arrival) allocated to discount outlet
    const atRiskBatch: EngineInventoryBatch = {
      id: "b-disc",
      batchCode: "LOT-DISC-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 1.50,
      harvestDate: "2026-10-09T00:00:00Z",
      receivedDate: "2026-10-10T00:00:00Z",
      expiryDate: "2026-10-18T18:00:00Z", // ~3.4 days from departure
      storageTempCelsius: 2.0,
    };

    const outletRoute: EngineTransportRoute = {
      id: "route-outlet",
      routeCode: "RT-OUTLET-01",
      originWarehouseId: "wh-austin",
      destinationId: "dest-outlet",
      capacityKg: 10000,
      fixedCostUsd: 200,
      costPerKgUsd: 0.08,
      transitDurationHours: 3.0,
      handlingDurationHours: 1.0,
      departureTime: "2026-10-15T08:00:00Z",
      tempZoneMinCelsius: 1.0,
      tempZoneMaxCelsius: 4.0,
    };

    const outletDemand: EngineDemandOrder = {
      id: "dem-outlet",
      orderNumber: "PO-OUTLET-01",
      destinationId: "dest-outlet",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [atRiskBatch],
      commodities: [strawberriesCommodity],
      destinations: [discountOutlet],
      demands: [outletDemand],
      routes: [outletRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 35,
      },
    };

    const run = evaluateScenario(input);
    const ledger = run.freshRouteLedger;

    expect(ledger.soldQuantityKg).toBe(2000);
    // Reference revenue: 2000 * $4.00 = $8,000
    expect(ledger.referenceRevenueUsd).toBe(8000);
    // Discount was applied (e.g. ~23.5% discount)
    expect(ledger.realizedSalesRevenueUsd).toBeLessThan(8000);
    expect(ledger.discountForegoneRevenueUsd).toBeGreaterThan(0);

    // CRITICAL: Reference Revenue === Realized Sales Revenue + Discount Foregone Revenue
    expect(ledger.revenueReconciled).toBe(true);
    expect(
      Math.abs(
        ledger.referenceRevenueUsd -
          (ledger.realizedSalesRevenueUsd + ledger.discountForegoneRevenueUsd)
      )
    ).toBeLessThan(0.05);

    // CRITICAL: Financial outcome = Realized - COGS - Transport - Handling - Penalty
    // (Discount is NOT subtracted a second time!)
    expect(ledger.financialLedgerReconciled).toBe(true);
  });

  // --------------------------------------------------------------------------
  // FIXTURE 1: FreshRoute Performs Better (FRESHROUTE_SUPERIOR)
  // --------------------------------------------------------------------------
  it("Fixture 1 (FreshRoute Superior): FreshRoute FEFO salvages at-risk stock via secondary channel markdown while FIFO suffers full expiration", () => {
    // Batch 1: Urgent produce (3.2 days RSL at arrival)
    // Batch 2: Fresh produce (10 days RSL at arrival)
    // Destination 1: Premium Grocer (requires 5.0 days SLA, accepts NO discount)
    // Destination 2: Discount Hub (requires 2.0 days SLA, accepts up to 35% discount)
    const urgentBatch: EngineInventoryBatch = {
      id: "b-urgent",
      batchCode: "LOT-URGENT",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 1.80,
      harvestDate: "2026-10-09T00:00:00Z",
      receivedDate: "2026-10-10T00:00:00Z",
      expiryDate: "2026-10-18T18:00:00Z", // ~3.4 days from departure
      storageTempCelsius: 2.0,
    };

    const freshBatch: EngineInventoryBatch = {
      id: "b-fresh",
      batchCode: "LOT-FRESH",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 1.80,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z", // 10 days
      storageTempCelsius: 2.0,
    };

    const premiumDemand: EngineDemandOrder = {
      id: "dem-prem",
      orderNumber: "PO-PREM-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    // Secondary salvage outlet requires 4.0 days nominal SLA, but accepts discounts
    const salvageOutlet: EngineDestination = {
      id: "dest-salvage-4d",
      code: "DEST-SALV-04",
      name: "Clearance Food Hub 4D",
      tier: "DISCOUNT_CHAIN",
      minShelfLifeDays: 4.0, // Baseline FIFO rejects (3.4d < 4.0d), but FreshRoute salvages with markdown!
      acceptsDiscounts: true,
      maxDiscountPercent: 35,
    };

    const discountDemand: EngineDemandOrder = {
      id: "dem-disc",
      orderNumber: "PO-DISC-01",
      destinationId: "dest-salvage-4d",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 3.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const outletRoute: EngineTransportRoute = {
      id: "route-outlet",
      routeCode: "RT-OUTLET-01",
      originWarehouseId: "wh-austin",
      destinationId: "dest-salvage-4d",
      capacityKg: 10000,
      fixedCostUsd: 150,
      costPerKgUsd: 0.06,
      transitDurationHours: 2.5,
      handlingDurationHours: 1.0,
      departureTime: "2026-10-15T08:00:00Z",
      tempZoneMinCelsius: 1.0,
      tempZoneMaxCelsius: 4.0,
    };

    const input: EnginePlannerInput = {
      batches: [urgentBatch, freshBatch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer, salvageOutlet],
      demands: [premiumDemand, discountDemand],
      routes: [localRoute, outletRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 35,
      },
    };

    const run = evaluateScenario(input);

    expect(run.comparison.outcomeStatus).toBe("FRESHROUTE_SUPERIOR");
    expect(run.comparison.netOutcomeDeltaUsd).toBeGreaterThan(0);
    expect(run.comparison.spoilageReductionKg).toBeGreaterThanOrEqual(0);
    expect(run.comparison.fulfillmentRateDeltaPercent).toBeGreaterThanOrEqual(0);
    expect(run.comparison.narrativeSummary).toContain("FreshRoute outperformed the baseline");
  });

  // --------------------------------------------------------------------------
  // FIXTURE 2: Both Strategies Produce Equivalent Results (EQUIVALENT)
  // --------------------------------------------------------------------------
  it("Fixture 2 (Equivalent Results): Homogeneous fresh batches yield identical allocations and economic metrics", () => {
    // Both batches are equally fresh and received at the same time
    const batch1: EngineInventoryBatch = {
      id: "b-fresh-1",
      batchCode: "LOT-F1",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-28T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const batch2: EngineInventoryBatch = {
      id: "b-fresh-2",
      batchCode: "LOT-F2",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-28T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-equiv",
      orderNumber: "PO-EQ-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 4000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch1, batch2],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [localRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run = evaluateScenario(input);

    expect(run.comparison.outcomeStatus).toBe("EQUIVALENT");
    expect(run.comparison.netOutcomeDeltaUsd).toBe(0);
    expect(run.comparison.soldQuantityDeltaKg).toBe(0);
    expect(run.comparison.spoilageReductionKg).toBe(0);
    expect(run.freshRouteLedger.netEconomicOutcomeUsd).toBe(
      run.baselineLedger.netEconomicOutcomeUsd
    );
    expect(run.comparison.narrativeSummary).toContain("identical economic outcomes");
  });

  // --------------------------------------------------------------------------
  // FIXTURE 3: FreshRoute Performs Worse (BASELINE_SUPERIOR)
  // --------------------------------------------------------------------------
  it("Fixture 3 (Baseline Superior): FreshRoute rolls an expensive carrier to salvage a small batch, incurring higher net loss than FIFO leaving it alone", () => {
    // Realistic Fixed-Fee Trap:
    // A small at-risk batch of 500 kg strawberries has 3.5 days RSL.
    // FreshRoute FEFO urgency prioritizes it and dispatches a dedicated long-haul truck
    // with a huge fixed trip fee ($1,800 fixed fee!) and discount, earning only $1,100 revenue
    // while spending $1,800 fixed + $50 var = $1,850 in freight!
    // Disposing of 500 kg as spoilage write-off only costs: 500 * ($1.50 + $0.25) = $875.
    // Baseline FIFO (with static pricing / no discount) avoids this uneconomic dispatch,
    // thereby achieving higher total net economic return than FreshRoute!

    const urgentSmallBatch: EngineInventoryBatch = {
      id: "b-small-urgent",
      batchCode: "LOT-URG-SMALL",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 500,
      unitCostUsd: 1.50,
      harvestDate: "2026-10-09T00:00:00Z",
      receivedDate: "2026-10-10T00:00:00Z",
      expiryDate: "2026-10-18T18:00:00Z", // 3.4 days RSL
      storageTempCelsius: 2.0,
    };

    const freshLargeBatch: EngineInventoryBatch = {
      id: "b-large-fresh",
      batchCode: "LOT-FRESH-LARGE",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 5000,
      unitCostUsd: 1.50,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-28T00:00:00Z", // 13 days RSL
      storageTempCelsius: 2.0,
    };

    const localPrimaryDemand: EngineDemandOrder = {
      id: "dem-local-primary",
      orderNumber: "PO-LOC-PRI",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 5000,
      contractedPricePerKgUsd: 5.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const clearanceSmallDemand: EngineDemandOrder = {
      id: "dem-clearance",
      orderNumber: "PO-CLR-SMALL",
      destinationId: "dest-outlet",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 500,
      contractedPricePerKgUsd: 3.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    // Extremely expensive dedicated carrier route to the clearance hub
    const expensiveClearanceRoute: EngineTransportRoute = {
      id: "route-expensive",
      routeCode: "RT-EXP-HEAVY",
      originWarehouseId: "wh-austin",
      destinationId: "dest-outlet",
      capacityKg: 10000,
      fixedCostUsd: 1800, // Massive $1,800 fixed fee for a 500 kg load!
      costPerKgUsd: 0.10,
      transitDurationHours: 3.0,
      handlingDurationHours: 1.0,
      departureTime: "2026-10-15T08:00:00Z",
      tempZoneMinCelsius: 1.0,
      tempZoneMaxCelsius: 4.0,
    };

    const input: EnginePlannerInput = {
      batches: [urgentSmallBatch, freshLargeBatch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer, discountOutlet],
      demands: [localPrimaryDemand, clearanceSmallDemand],
      routes: [localRoute, expensiveClearanceRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 25,
      },
    };

    const run = evaluateScenario(input);

    // The evaluator must objectively report that Baseline FIFO won!
    expect(run.comparison.outcomeStatus).toBe("BASELINE_SUPERIOR");
    expect(run.comparison.netOutcomeDeltaUsd).toBeLessThan(0);
    expect(run.baselineLedger.netEconomicOutcomeUsd).toBeGreaterThan(
      run.freshRouteLedger.netEconomicOutcomeUsd
    );
    expect(run.comparison.narrativeSummary).toContain("Baseline FIFO outperformed FreshRoute");
  });

  // --------------------------------------------------------------------------
  // TEST 11: Reproducibility & Identical Snapshot Hash Verification
  // --------------------------------------------------------------------------
  it("guarantees 100% reproducible scenario evaluation with identical snapshot digests", () => {
    const batch: EngineInventoryBatch = {
      id: "b-rep",
      batchCode: "LOT-REP-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-rep",
      orderNumber: "PO-REP-01",
      destinationId: "dest-local",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2500,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [localGrocer],
      demands: [demand],
      routes: [localRoute],
      config: { planningTime: "2026-10-15T00:00:00Z" },
    };

    const run1 = evaluateScenario(input);
    const run2 = evaluateScenario(input);

    expect(run1.inputSnapshotHash).toHaveLength(64);
    expect(run1.inputSnapshotHash).toBe(run2.inputSnapshotHash);
    expect(run1.freshRoutePlan.snapshotHash).toBe(run1.baselinePlan.snapshotHash);
    expect(run1.freshRouteLedger).toEqual(run2.freshRouteLedger);
    expect(run1.baselineLedger).toEqual(run2.baselineLedger);
    expect(run1.comparison).toEqual(run2.comparison);
  });
});
