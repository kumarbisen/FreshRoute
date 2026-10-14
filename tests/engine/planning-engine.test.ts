/**
 * Comprehensive Vitest Test Suite for FreshRoute Distribution Planning Engine
 * Verifies feasibility, FEFO prioritization, shared capacity, two-part tariffs,
 * leftover breakdown, reproducible determinism, and all 10 required fixtures.
 */

import { describe, it, expect } from "vitest";
import {
  AllocationReasonCode,
  EngineCommodity,
  EngineDemandOrder,
  EngineDestination,
  EngineInventoryBatch,
  EnginePlannerInput,
  EngineTransportRoute,
  FreshRoutePlanningEngine,
  solveDistributionPlan,
} from "@/engine";

describe("PHASE 04 — FreshRoute Distribution Planning Engine", () => {
  // Common test entities
  const strawberriesCommodity: EngineCommodity = {
    id: "cmd-strawberries",
    code: "STR-001",
    name: "Organic Strawberries",
    category: "BERRIES",
    standardShelfLifeDays: 10,
    minTempCelsius: 1.0,
    maxTempCelsius: 4.0,
    decayRateExponent: 1.6,
    wasteDisposalCostPerKgUsd: 0.35,
  };

  const spinachCommodity: EngineCommodity = {
    id: "cmd-spinach",
    code: "SPN-001",
    name: "Baby Spinach",
    category: "LEAFY_GREENS",
    standardShelfLifeDays: 8,
    minTempCelsius: 1.0,
    maxTempCelsius: 3.5,
    decayRateExponent: 1.8,
    wasteDisposalCostPerKgUsd: 0.25,
  };

  const premiumGrocer: EngineDestination = {
    id: "dest-wholefoods",
    code: "WF-DAL",
    name: "Whole Foods Central Texas DC",
    tier: "PREMIUM_GROCER",
    minShelfLifeDays: 5.0, // Strict 5-day arrival SLA
    acceptsDiscounts: false,
    maxDiscountPercent: 0,
  };

  const discountChain: EngineDestination = {
    id: "dest-salvage",
    code: "ALDI-DAL",
    name: "Discount Fresh Foods Hub",
    tier: "DISCOUNT_CHAIN",
    minShelfLifeDays: 2.0, // Accepts 2-day arrival SLA
    acceptsDiscounts: true,
    maxDiscountPercent: 35,
  };

  const standardRoute: EngineTransportRoute = {
    id: "route-wh1-wf",
    routeCode: "RT-DAL-01",
    originWarehouseId: "wh-austin",
    destinationId: "dest-wholefoods",
    capacityKg: 10000,
    fixedCostUsd: 250,
    costPerKgUsd: 0.08,
    transitDurationHours: 3.5,
    handlingDurationHours: 1.0,
    departureTime: "2026-10-15T08:00:00Z",
    tempZoneMinCelsius: 1.0,
    tempZoneMaxCelsius: 4.0,
  };

  const salvageRoute: EngineTransportRoute = {
    id: "route-wh1-salvage",
    routeCode: "RT-DAL-02",
    originWarehouseId: "wh-austin",
    destinationId: "dest-salvage",
    capacityKg: 10000,
    fixedCostUsd: 200,
    costPerKgUsd: 0.07,
    transitDurationHours: 3.0,
    handlingDurationHours: 1.0,
    departureTime: "2026-10-15T08:00:00Z",
    tempZoneMinCelsius: 1.0,
    tempZoneMaxCelsius: 4.0,
  };

  // --------------------------------------------------------------------------
  // FIXTURE 1: Highly Perishable Batch with Urgent Feasible Route
  // --------------------------------------------------------------------------
  it("Fixture 1: Allocates a highly perishable batch with an urgent feasible route under FEFO priority", () => {
    // Planning time: 2026-10-15T00:00:00Z
    // Batch 1: Expires in 6.0 days (urgent, but satisfies 5.0d SLA after 4.5h transit+handling)
    // Batch 2: Expires in 9.0 days (non-urgent)
    const urgentBatch: EngineInventoryBatch = {
      id: "b-urgent",
      batchCode: "LOT-URGENT-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.50,
      harvestDate: "2026-10-11T00:00:00Z",
      receivedDate: "2026-10-12T00:00:00Z",
      expiryDate: "2026-10-21T08:00:00Z", // 6 days from departure
      storageTempCelsius: 2.5,
    };

    const regularBatch: EngineInventoryBatch = {
      id: "b-regular",
      batchCode: "LOT-REG-02",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.50,
      harvestDate: "2026-10-14T00:00:00Z",
      receivedDate: "2026-10-14T12:00:00Z",
      expiryDate: "2026-10-24T08:00:00Z", // 9 days from departure
      storageTempCelsius: 2.5,
    };

    const demand: EngineDemandOrder = {
      id: "dem-01",
      orderNumber: "PO-WF-100",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2500,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [regularBatch, urgentBatch], // Note regular is first in list to test prioritizer
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
      },
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    const alloc = plan.allocations[0];

    // Crucial: Urgent batch must be selected first despite arriving later in input array
    expect(alloc.batchCode).toBe("LOT-URGENT-01");
    expect(alloc.allocatedQuantityKg).toBe(2500);
    expect(alloc.reasonCodes).toContain(AllocationReasonCode.FEFO_EXPIRATION_PRIORITY);
    expect(alloc.handlingShelfLifeDays).toBeGreaterThanOrEqual(5.0);
    expect(alloc.netMarginUsd).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // FIXTURE 2: Batch that Cannot Reach Any Destination in Time
  // --------------------------------------------------------------------------
  it("Fixture 2: Rejects a batch that cannot reach any destination in time due to SLA expiration", () => {
    // Batch expires in 2.5 days. Standard route takes 4.5h handling+transit, leaving ~2.3d RSL.
    // Destination requires strict 5.0 days SLA and does NOT accept discounts.
    const expiredBatch: EngineInventoryBatch = {
      id: "b-too-old",
      batchCode: "LOT-OLD-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 2.50,
      harvestDate: "2026-10-05T00:00:00Z",
      receivedDate: "2026-10-06T00:00:00Z",
      expiryDate: "2026-10-17T12:00:00Z", // expires in ~2.1 days
      storageTempCelsius: 2.5,
    };

    const demand: EngineDemandOrder = {
      id: "dem-02",
      orderNumber: "PO-WF-200",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [expiredBatch],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
      },
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(0);
    expect(plan.rejections.length).toBeGreaterThan(0);
    expect(plan.rejections[0].reasonCode).toBe(AllocationReasonCode.REJECTED_INSUFFICIENT_SHELF_LIFE);

    // Leftover categorization must label it INFEASIBLE_CONSTRAINTS (not merely spoiled or feasible)
    const leftover = plan.batchLeftoverBreakdowns.find((l) => l.batchCode === "LOT-OLD-01");
    expect(leftover).toBeDefined();
    expect(leftover?.infeasibleKg).toBe(2000);
    expect(leftover?.category).toBe("INFEASIBLE_CONSTRAINTS");
  });

  // --------------------------------------------------------------------------
  // FIXTURE 3: Partial Destination Demand Satisfaction
  // --------------------------------------------------------------------------
  it("Fixture 3: Correctly allocates partial quantities when batch stock is less than demand", () => {
    // Demand wants 5,000 kg, but batch only has 3,200 kg
    const batch: EngineInventoryBatch = {
      id: "b-partial",
      batchCode: "LOT-PARTIAL-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3200,
      unitCostUsd: 2.20,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-23T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-large",
      orderNumber: "PO-WF-300",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 5000,
      contractedPricePerKgUsd: 4.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    const alloc = plan.allocations[0];
    expect(alloc.allocatedQuantityKg).toBe(3200);
    expect(alloc.bindingConstraint).toBe("BATCH_STOCK");

    // Demand fulfillment must record partial completion
    const fulfillment = plan.demandFulfillments[0];
    expect(fulfillment.requestedKg).toBe(5000);
    expect(fulfillment.fulfilledKg).toBe(3200);
    expect(fulfillment.unfulfilledKg).toBe(1800);
    expect(fulfillment.status).toBe("PARTIALLY_FULFILLED");
    expect(fulfillment.fillRatePercent).toBe(64.0);
  });

  // --------------------------------------------------------------------------
  // FIXTURE 4: Limited Vehicle Capacity (Truncating Allocation)
  // --------------------------------------------------------------------------
  it("Fixture 4: Respects vehicle capacity limits when batch stock and demand exceed vehicle limit", () => {
    // Batch has 8,000 kg, demand wants 8,000 kg, but route vehicle can only carry 4,500 kg
    const routeSmallVehicle: EngineTransportRoute = {
      ...standardRoute,
      id: "route-small",
      routeCode: "RT-SMALL-VEHICLE",
      capacityKg: 4500,
    };

    const batch: EngineInventoryBatch = {
      id: "b-oversized",
      batchCode: "LOT-OVERSIZE-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 8000,
      unitCostUsd: 2.20,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-23T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-huge",
      orderNumber: "PO-WF-400",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 8000,
      contractedPricePerKgUsd: 4.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [routeSmallVehicle],
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    const alloc = plan.allocations[0];
    expect(alloc.allocatedQuantityKg).toBe(4500);
    expect(alloc.bindingConstraint).toBe("VEHICLE_CAPACITY");

    // Route utilization must be exactly 100%
    const routeDispatch = plan.routeDispatches.find((r) => r.routeCode === "RT-SMALL-VEHICLE");
    expect(routeDispatch?.loadedKg).toBe(4500);
    expect(routeDispatch?.remainingCapacityKg).toBe(0);
    expect(routeDispatch?.utilizationPercent).toBe(100.0);

    // Remaining unallocated inventory must be 3,500 kg
    const leftover = plan.batchLeftoverBreakdowns[0];
    expect(leftover.unallocatedKg).toBe(3500);
    expect(leftover.category).toBe("UNALLOCATED_FEASIBLE");
  });

  // --------------------------------------------------------------------------
  // FIXTURE 5: Shared Vehicle Capacity Across Multiple Batches
  // --------------------------------------------------------------------------
  it("Fixture 5: Correctly shares a single vehicle capacity across multiple distinct batches", () => {
    // Route vehicle capacity: 6,000 kg
    // Batch 1: 3,000 kg Strawberries
    // Batch 2: 4,000 kg Strawberries
    // Demand 1: 3,000 kg Strawberries
    // Demand 2: 4,000 kg Strawberries
    // Vehicle should pack 3,000 kg of Batch 1 and 3,000 kg of Batch 2 (total 6,000 kg), capping vehicle
    const sharedRoute: EngineTransportRoute = {
      ...standardRoute,
      id: "route-shared",
      routeCode: "RT-SHARED-6T",
      capacityKg: 6000,
    };

    const batch1: EngineInventoryBatch = {
      id: "b-share-1",
      batchCode: "LOT-SH-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.20,
      harvestDate: "2026-10-10T00:00:00Z",
      receivedDate: "2026-10-11T00:00:00Z",
      expiryDate: "2026-10-21T00:00:00Z", // Earlier expiry
      storageTempCelsius: 2.0,
    };

    const batch2: EngineInventoryBatch = {
      id: "b-share-2",
      batchCode: "LOT-SH-02",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 4000,
      unitCostUsd: 2.20,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-24T00:00:00Z", // Later expiry
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-shared",
      orderNumber: "PO-WF-500",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 7000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch2, batch1], // batch2 passed first
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [sharedRoute],
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(2);

    // Sum of allocations on the route must be exactly 6,000 kg (vehicle limit)
    const totalLoaded = plan.allocations.reduce((acc, a) => acc + a.allocatedQuantityKg, 0);
    expect(totalLoaded).toBe(6000);

    // Batch 1 (earlier expiry) was allocated first in full (3,000 kg)
    const alloc1 = plan.allocations.find((a) => a.batchCode === "LOT-SH-01");
    expect(alloc1?.allocatedQuantityKg).toBe(3000);

    // Batch 2 was allocated remaining 3,000 kg
    const alloc2 = plan.allocations.find((a) => a.batchCode === "LOT-SH-02");
    expect(alloc2?.allocatedQuantityKg).toBe(3000);
    expect(alloc2?.bindingConstraint).toBe("VEHICLE_CAPACITY");

    // Route dispatch summary checks
    const routeSummary = plan.routeDispatches.find((r) => r.routeCode === "RT-SHARED-6T");
    expect(routeSummary?.loadedKg).toBe(6000);
    expect(routeSummary?.batchCount).toBe(2);
    expect(routeSummary?.utilizationPercent).toBe(100.0);
  });

  // --------------------------------------------------------------------------
  // FIXTURE 6: Competing Destinations with Different Prices & Costs
  // --------------------------------------------------------------------------
  it("Fixture 6: Prioritizes higher net contribution destination when produce shelf life satisfies both", () => {
    // Batch has 2,000 kg
    // Destination A (Whole Foods): Price $5.00/kg, Route Var Cost $0.08/kg => Unit Margin $2.92
    // Destination B (Regional Supermarket): Price $4.00/kg, Route Var Cost $0.05/kg => Unit Margin $1.95
    // Both orders want 2,000 kg. Engine should allocate to Destination A for maximum profit.
    const batch: EngineInventoryBatch = {
      id: "b-compete",
      batchCode: "LOT-COMPETE-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-25T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const regionalSupermarket: EngineDestination = {
      id: "dest-regional",
      code: "REG-SUPER",
      name: "Regional Supermarket Hub",
      tier: "REGIONAL_SUPERMARKET",
      minShelfLifeDays: 4.0,
      acceptsDiscounts: false,
      maxDiscountPercent: 0,
    };

    const routeRegional: EngineTransportRoute = {
      id: "route-regional",
      routeCode: "RT-REG-01",
      originWarehouseId: "wh-austin",
      destinationId: "dest-regional",
      capacityKg: 10000,
      fixedCostUsd: 200,
      costPerKgUsd: 0.05,
      transitDurationHours: 2.5,
      handlingDurationHours: 1.0,
      departureTime: "2026-10-15T08:00:00Z",
      tempZoneMinCelsius: 1.0,
      tempZoneMaxCelsius: 4.0,
    };

    const demandHighPrice: EngineDemandOrder = {
      id: "dem-high",
      orderNumber: "PO-HIGH-01",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 5.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const demandLowPrice: EngineDemandOrder = {
      id: "dem-low",
      orderNumber: "PO-LOW-02",
      destinationId: "dest-regional",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch],
      commodities: [strawberriesCommodity],
      destinations: [regionalSupermarket, premiumGrocer],
      demands: [demandLowPrice, demandHighPrice], // Low price listed first
      routes: [routeRegional, standardRoute],
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    const alloc = plan.allocations[0];
    expect(alloc.orderNumber).toBe("PO-HIGH-01");
    expect(alloc.destinationId).toBe("dest-wholefoods");
    expect(alloc.allocatedQuantityKg).toBe(2000);
  });

  // --------------------------------------------------------------------------
  // FIXTURE 7: Tied Priority Scores (Stable Deterministic Tie-Breakers)
  // --------------------------------------------------------------------------
  it("Fixture 7: Uses strict alphabetical and timestamp tie-breakers for perfectly identical priority scores", () => {
    // Two batches with exact identical expiry, cost, temp, quantity
    const batchA: EngineInventoryBatch = {
      id: "b-tie-a",
      batchCode: "LOT-AAA-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-22T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const batchB: EngineInventoryBatch = {
      id: "b-tie-b",
      batchCode: "LOT-BBB-02",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-22T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    // Demand wants 1,000 kg (only one batch can be allocated)
    const demand: EngineDemandOrder = {
      id: "dem-tie",
      orderNumber: "PO-TIE-01",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 1000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    // Run 1: Passed in order [batchB, batchA]
    const input1: EnginePlannerInput = {
      batches: [batchB, batchA],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
    };

    // Run 2: Passed in order [batchA, batchB]
    const input2: EnginePlannerInput = {
      batches: [batchA, batchB],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
    };

    const res1 = solveDistributionPlan(input1);
    const res2 = solveDistributionPlan(input2);

    // Both runs must choose LOT-AAA-01 due to stable alphabetical tie-breaking
    expect(res1.plan.allocations[0].batchCode).toBe("LOT-AAA-01");
    expect(res2.plan.allocations[0].batchCode).toBe("LOT-AAA-01");
  });

  // --------------------------------------------------------------------------
  // FIXTURE 8: Insufficient Demand & Excess Inventory (Leftover Categorization)
  // --------------------------------------------------------------------------
  it("Fixture 8: Explicitly categorizes leftover inventory into unallocated feasible, at-risk, and spoiled without false spoilage labeling", () => {
    // Total Inventory: 10,000 kg across 3 batches
    // Demand: only 2,000 kg
    // Batch 1 (3,000 kg): Expired yesterday => SPOILED_EXPIRED
    // Batch 2 (3,000 kg): Remaining RSL 36h (< 48h) => AT_RISK
    // Batch 3 (4,000 kg): Remaining RSL 7 days => 2,000 kg allocated, 2,000 kg UNALLOCATED_FEASIBLE
    const spoiledBatch: EngineInventoryBatch = {
      id: "b-spoiled",
      batchCode: "LOT-SPOILED",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-01T00:00:00Z",
      receivedDate: "2026-10-02T00:00:00Z",
      expiryDate: "2026-10-14T00:00:00Z", // expired before planningTime 2026-10-15
      storageTempCelsius: 2.0,
    };

    const atRiskBatch: EngineInventoryBatch = {
      id: "b-atrisk",
      batchCode: "LOT-ATRISK",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 3000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-08T00:00:00Z",
      receivedDate: "2026-10-09T00:00:00Z",
      expiryDate: "2026-10-16T12:00:00Z", // ~36h from planningTime
      storageTempCelsius: 2.0,
    };

    const healthyBatch: EngineInventoryBatch = {
      id: "b-healthy",
      batchCode: "LOT-HEALTHY",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 4000,
      unitCostUsd: 2.00,
      harvestDate: "2026-10-13T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-23T00:00:00Z", // 8 days from planningTime
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-small",
      orderNumber: "PO-WF-SMALL",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [spoiledBatch, atRiskBatch, healthyBatch],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
      },
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    expect(plan.allocations[0].batchCode).toBe("LOT-HEALTHY");
    expect(plan.allocations[0].allocatedQuantityKg).toBe(2000);

    const spoiledLeftover = plan.batchLeftoverBreakdowns.find((l) => l.batchCode === "LOT-SPOILED");
    expect(spoiledLeftover?.category).toBe("SPOILED_EXPIRED");
    expect(spoiledLeftover?.spoiledKg).toBe(3000);

    const atRiskLeftover = plan.batchLeftoverBreakdowns.find((l) => l.batchCode === "LOT-ATRISK");
    expect(atRiskLeftover?.category).toBe("INFEASIBLE_CONSTRAINTS"); // Wholefoods needs 5d, atrisk has 1.5d, no salvage destination

    const healthyLeftover = plan.batchLeftoverBreakdowns.find((l) => l.batchCode === "LOT-HEALTHY");
    expect(healthyLeftover?.category).toBe("UNALLOCATED_FEASIBLE");
    expect(healthyLeftover?.allocatedKg).toBe(2000);
    expect(healthyLeftover?.unallocatedFeasibleKg).toBe(2000);
    expect(healthyLeftover?.spoiledKg).toBe(0); // MUST NOT be labeled as spoiled!
  });

  // --------------------------------------------------------------------------
  // FIXTURE 9: Invalid or Inconsistent Input Units
  // --------------------------------------------------------------------------
  it("Fixture 9: Validates input integrity and throws descriptive errors for negative or invalid units", () => {
    const invalidBatch: EngineInventoryBatch = {
      id: "b-invalid",
      batchCode: "LOT-NEG",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: -500, // Invalid negative quantity
      unitCostUsd: 2.00,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-22T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand: EngineDemandOrder = {
      id: "dem-test",
      orderNumber: "PO-TEST",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 1000,
      contractedPricePerKgUsd: 4.50,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [invalidBatch],
      commodities: [strawberriesCommodity],
      destinations: [premiumGrocer],
      demands: [demand],
      routes: [standardRoute],
    };

    expect(() => solveDistributionPlan(input)).toThrow(
      "Batch LOT-NEG has invalid availableQuantityKg: -500"
    );
  });

  // --------------------------------------------------------------------------
  // FIXTURE 10: Multiple Runs with Identical Inputs (100% Determinism & SHA-256)
  // --------------------------------------------------------------------------
  it("Fixture 10: Produces bit-for-bit identical allocation plans and matching SHA-256 snapshot hashes across repeated runs", () => {
    const batch1: EngineInventoryBatch = {
      id: "b-det-1",
      batchCode: "LOT-DET-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 2500,
      unitCostUsd: 2.30,
      harvestDate: "2026-10-12T00:00:00Z",
      receivedDate: "2026-10-13T00:00:00Z",
      expiryDate: "2026-10-22T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const batch2: EngineInventoryBatch = {
      id: "b-det-2",
      batchCode: "LOT-DET-02",
      warehouseId: "wh-austin",
      commodityId: "cmd-spinach",
      availableQuantityKg: 1800,
      unitCostUsd: 1.80,
      harvestDate: "2026-10-13T00:00:00Z",
      receivedDate: "2026-10-14T00:00:00Z",
      expiryDate: "2026-10-21T00:00:00Z",
      storageTempCelsius: 2.0,
    };

    const demand1: EngineDemandOrder = {
      id: "dem-det-1",
      orderNumber: "PO-DET-101",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 2000,
      contractedPricePerKgUsd: 4.80,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const demand2: EngineDemandOrder = {
      id: "dem-det-2",
      orderNumber: "PO-DET-102",
      destinationId: "dest-wholefoods",
      commodityId: "cmd-spinach",
      requestedQuantityKg: 1500,
      contractedPricePerKgUsd: 3.90,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [batch1, batch2],
      commodities: [strawberriesCommodity, spinachCommodity],
      destinations: [premiumGrocer],
      demands: [demand1, demand2],
      routes: [standardRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
      },
    };

    const run1 = solveDistributionPlan(input, { compareWithBaseline: true });
    const run2 = solveDistributionPlan(input, { compareWithBaseline: true });
    const run3 = solveDistributionPlan(input, { compareWithBaseline: true });

    // Snapshot hashes must be identical 64-character hex strings
    expect(run1.plan.snapshotHash).toHaveLength(64);
    expect(run1.plan.snapshotHash).toBe(run2.plan.snapshotHash);
    expect(run2.plan.snapshotHash).toBe(run3.plan.snapshotHash);

    // Allocations count and details must be bit-for-bit identical
    expect(run1.plan.allocations).toEqual(run2.plan.allocations);
    expect(run2.plan.allocations).toEqual(run3.plan.allocations);

    // Leftover stock and metrics must be identical
    expect(run1.plan.metrics).toEqual(run2.plan.metrics);
    expect(run1.plan.batchLeftoverBreakdowns).toEqual(run2.plan.batchLeftoverBreakdowns);

    // Baseline comparisons must be identical
    expect(run1.baselineComparison?.deltas).toEqual(run2.baselineComparison?.deltas);
    expect(run1.baselineComparison?.deltas.profitUpliftUsd).toBeGreaterThanOrEqual(0);
  });

  // --------------------------------------------------------------------------
  // DYNAMIC MARKDOWN SALVAGE TEST
  // --------------------------------------------------------------------------
  it("Applies secondary channel dynamic markdown salvage for at-risk produce when destination accepts discounts", () => {
    // Batch has remaining RSL of 3.2 days at arrival.
    // Whole Foods SLA requires 5.0 days and does NOT accept discounts (infeasible).
    // Salvage Hub accepts 2.0 days SLA and accepts up to 35% discount.
    // The engine should allocate to the Salvage Hub with DYNAMIC_MARKDOWN_SALVAGE.
    const atRiskBatch: EngineInventoryBatch = {
      id: "b-markdown",
      batchCode: "LOT-MKD-01",
      warehouseId: "wh-austin",
      commodityId: "cmd-strawberries",
      availableQuantityKg: 1500,
      unitCostUsd: 1.80,
      harvestDate: "2026-10-09T00:00:00Z",
      receivedDate: "2026-10-10T00:00:00Z",
      expiryDate: "2026-10-18T18:00:00Z", // ~3.4 days from departure
      storageTempCelsius: 2.0,
    };

    const salvageDemand: EngineDemandOrder = {
      id: "dem-salvage",
      orderNumber: "PO-SALVAGE-01",
      destinationId: "dest-salvage",
      commodityId: "cmd-strawberries",
      requestedQuantityKg: 1500,
      contractedPricePerKgUsd: 4.00,
      deliveryWindowStart: "2026-10-15T11:00:00Z",
      deliveryWindowEnd: "2026-10-15T16:00:00Z",
    };

    const input: EnginePlannerInput = {
      batches: [atRiskBatch],
      commodities: [strawberriesCommodity],
      destinations: [discountChain],
      demands: [salvageDemand],
      routes: [salvageRoute],
      config: {
        planningTime: "2026-10-15T00:00:00Z",
        enableDynamicMarkdowns: true,
        maxMarkdownPercent: 35,
      },
    };

    const { plan } = solveDistributionPlan(input);

    expect(plan.allocations.length).toBe(1);
    const alloc = plan.allocations[0];
    expect(alloc.isSalvageDiscount).toBe(true);
    expect(alloc.discountPercent).toBeGreaterThan(0);
    expect(alloc.discountPercent).toBeLessThanOrEqual(35);
    expect(alloc.effectivePricePerKgUsd).toBeLessThan(4.00);
    expect(alloc.reasonCodes).toContain(AllocationReasonCode.DYNAMIC_MARKDOWN_SALVAGE);
    expect(alloc.netMarginUsd).toBeGreaterThan(0);
  });
});
