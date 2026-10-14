import Decimal from "decimal.js";
import crypto from "crypto";
import { getPgLite, initPgLiteSchema } from "../db/pglite";

// -------------------------------------------------------------------
// DOMAIN CALCULATION RESULTS & TYPES
// -------------------------------------------------------------------

export interface ArrivalShelfLifeCalculationInput {
  harvestDate?: Date;
  expiryDate: Date;
  plannedDepartureDate: Date;
  handlingDurationHours: number | Decimal | string;
  transitDurationHours: number | Decimal | string;
  bufferDurationHours?: number | Decimal | string;
  minShelfLifeDays: number | Decimal | string;
}

export interface ArrivalShelfLifeResult {
  plannedArrivalTimestamp: Date;
  totalLeadTimeHours: number;
  remainingShelfLifeHours: number;
  remainingShelfLifeDays: number;
  minShelfLifeDaysRequired: number;
  meetsShelfLifeSla: boolean;
  reasonCode: "FEFO_URGENCY_PRIORITY" | "SHELF_LIFE_SLA_SATISFIED" | "REJECTED_INSUFFICIENT_SHELF_LIFE";
  explanation: string;
}

export interface RouteTransportCostInput {
  fixedTripCostUsd: number | Decimal | string;
  variableCostPerKgUsd: number | Decimal | string;
  allocatedKg: number | Decimal | string;
  capacityKg: number | Decimal | string;
}

export interface RouteTransportCostResult {
  fixedCostUsd: Decimal;
  variableCostUsd: Decimal;
  totalTransportCostUsd: Decimal;
  allocatedKg: Decimal;
  capacityKg: Decimal;
  capacityUtilizationPercent: Decimal;
  isCapacityExceeded: boolean;
}

export interface EconomicMarginSummaryInput {
  grossRevenueUsd: number | Decimal | string;
  purchaseCostUsd: number | Decimal | string;
  transportCostUsd: number | Decimal | string;
  spoilageWasteCostUsd: number | Decimal | string;
}

export interface EconomicMarginSummaryResult {
  grossRevenueUsd: Decimal;
  totalCostUsd: Decimal;
  netMarginUsd: Decimal;
  marginPercent: Decimal;
}

// -------------------------------------------------------------------
// SHELF-LIFE & LOGISTICS DOMAIN LOGIC (INVARIANT: NO DOUBLE SUBTRACTION)
// -------------------------------------------------------------------

/**
 * Calculates absolute shelf-life at arrival dock.
 * Invariant: Never subtract elapsed time twice.
 * T_arrival = T_departure + handlingHours + transitHours + bufferHours
 * RSL_arrival = T_expiry - T_arrival
 */
export function calculateArrivalShelfLife(
  input: ArrivalShelfLifeCalculationInput
): ArrivalShelfLifeResult {
  const handlingHours = new Decimal(input.handlingDurationHours);
  const transitHours = new Decimal(input.transitDurationHours);
  const bufferHours = new Decimal(input.bufferDurationHours ?? 0);
  const minRequiredDays = new Decimal(input.minShelfLifeDays);

  const totalLeadTimeHours = handlingHours.plus(transitHours).plus(bufferHours);
  const leadTimeMillis = totalLeadTimeHours.times(3600 * 1000).toNumber();

  const departureMillis = input.plannedDepartureDate.getTime();
  const arrivalMillis = departureMillis + leadTimeMillis;
  const plannedArrivalTimestamp = new Date(arrivalMillis);

  const expiryMillis = input.expiryDate.getTime();
  const remainingMillis = expiryMillis - arrivalMillis;

  const remainingShelfLifeHours = new Decimal(remainingMillis).dividedBy(3600 * 1000);
  const remainingShelfLifeDays = remainingShelfLifeHours.dividedBy(24);

  const meetsShelfLifeSla = remainingShelfLifeDays.greaterThanOrEqualTo(minRequiredDays);

  let reasonCode: "FEFO_URGENCY_PRIORITY" | "SHELF_LIFE_SLA_SATISFIED" | "REJECTED_INSUFFICIENT_SHELF_LIFE";
  let explanation: string;

  if (meetsShelfLifeSla) {
    if (remainingShelfLifeDays.lessThan(minRequiredDays.plus(2))) {
      reasonCode = "FEFO_URGENCY_PRIORITY";
      explanation = `Arrival RSL of ${remainingShelfLifeDays.toFixed(2)}d tightly satisfies SLA (${minRequiredDays.toFixed(2)}d) - high FEFO dispatch urgency.`;
    } else {
      reasonCode = "SHELF_LIFE_SLA_SATISFIED";
      explanation = `Arrival RSL of ${remainingShelfLifeDays.toFixed(2)}d comfortably clears SLA minimum of ${minRequiredDays.toFixed(2)}d.`;
    }
  } else {
    reasonCode = "REJECTED_INSUFFICIENT_SHELF_LIFE";
    explanation = `Arrival RSL of ${remainingShelfLifeDays.toFixed(2)}d breaches customer receiving SLA minimum of ${minRequiredDays.toFixed(2)}d by ${minRequiredDays.minus(remainingShelfLifeDays).toFixed(2)}d.`;
  }

  return {
    plannedArrivalTimestamp,
    totalLeadTimeHours: totalLeadTimeHours.toNumber(),
    remainingShelfLifeHours: remainingShelfLifeHours.toDecimalPlaces(2).toNumber(),
    remainingShelfLifeDays: remainingShelfLifeDays.toDecimalPlaces(2).toNumber(),
    minShelfLifeDaysRequired: minRequiredDays.toNumber(),
    meetsShelfLifeSla,
    reasonCode,
    explanation,
  };
}

/**
 * Evaluates two-part transport logistics cost:
 * TransportCost = FixedTripCost + (AllocatedKg * VariableCostPerKg)
 */
export function calculateRouteTransportCost(
  input: RouteTransportCostInput
): RouteTransportCostResult {
  const fixedCost = new Decimal(input.fixedTripCostUsd);
  const varRate = new Decimal(input.variableCostPerKgUsd);
  const kg = new Decimal(input.allocatedKg);
  const cap = new Decimal(input.capacityKg);

  const isExceeded = kg.greaterThan(cap);
  const utilization = cap.isZero() ? new Decimal(0) : kg.dividedBy(cap).times(100);

  if (kg.isZero()) {
    return {
      fixedCostUsd: new Decimal(0),
      variableCostUsd: new Decimal(0),
      totalTransportCostUsd: new Decimal(0),
      allocatedKg: kg,
      capacityKg: cap,
      capacityUtilizationPercent: new Decimal(0),
      isCapacityExceeded: isExceeded,
    };
  }

  const variableCost = kg.times(varRate);
  const totalCost = fixedCost.plus(variableCost);

  return {
    fixedCostUsd: fixedCost,
    variableCostUsd: variableCost,
    totalTransportCostUsd: totalCost,
    allocatedKg: kg,
    capacityKg: cap,
    capacityUtilizationPercent: utilization.toDecimalPlaces(2),
    isCapacityExceeded: isExceeded,
  };
}

/**
 * Calculates net realized margin: Gross Revenue - (Purchase + Transport + Spoilage)
 */
export function calculateEconomicMargin(
  input: EconomicMarginSummaryInput
): EconomicMarginSummaryResult {
  const rev = new Decimal(input.grossRevenueUsd);
  const totalCost = new Decimal(input.purchaseCostUsd)
    .plus(input.transportCostUsd)
    .plus(input.spoilageWasteCostUsd);
  const netMargin = rev.minus(totalCost);
  const marginPct = rev.isZero()
    ? new Decimal(0)
    : netMargin.dividedBy(rev).times(100).toDecimalPlaces(2);

  return {
    grossRevenueUsd: rev,
    totalCostUsd: totalCost,
    netMarginUsd: netMargin,
    marginPercent: marginPct,
  };
}

/**
 * Deterministically computes SHA-256 hash of immutable plan input snapshot
 */
export function computePlanSnapshotHash(snapshotData: Record<string, unknown>): string {
  const canonicalJson = JSON.stringify(snapshotData, Object.keys(snapshotData).sort());
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

// -------------------------------------------------------------------
// SEED DATA CONSTANTS FOR 5 CANONICAL EDGE CASES
// -------------------------------------------------------------------

export const DEMO_ORGANIZATION_ID = "org-freshroute-demo";
export const DEMO_WAREHOUSE_SALINAS_ID = "wh-salinas-01";
export const DEMO_WAREHOUSE_FRESNO_ID = "wh-fresno-02";

export const DEMO_COMMODITIES = {
  STRAWBERRIES: {
    id: "cmd-strawberries",
    code: "STR-01",
    name: "California Albion Strawberries",
    category: "BERRIES",
    standardShelfLifeDays: 10,
    minTempCelsius: "0.5",
    maxTempCelsius: "2.0",
    decayRateExponent: "1.45",
    defaultPricePerUnit: "5.50",
    defaultCostPerUnit: "3.20",
    wasteDisposalCostPerKg: "0.25",
  },
  SPINACH: {
    id: "cmd-spinach",
    code: "SPN-01",
    name: "Baby Spinach Tender Leaf",
    category: "LEAFY_GREENS",
    standardShelfLifeDays: 12,
    minTempCelsius: "1.0",
    maxTempCelsius: "3.0",
    decayRateExponent: "1.30",
    defaultPricePerUnit: "3.80",
    defaultCostPerUnit: "2.10",
    wasteDisposalCostPerKg: "0.20",
  },
  AVOCADOS: {
    id: "cmd-avocados",
    code: "AVO-01",
    name: "Hass Avocados Pre-Conditioned",
    category: "AVOCADOS",
    standardShelfLifeDays: 21,
    minTempCelsius: "4.5",
    maxTempCelsius: "7.0",
    decayRateExponent: "1.10",
    defaultPricePerUnit: "6.20",
    defaultCostPerUnit: "3.80",
    wasteDisposalCostPerKg: "0.30",
  },
  ORANGES: {
    id: "cmd-oranges",
    code: "ORG-01",
    name: "Valencia Juice Oranges",
    category: "CITRUS",
    standardShelfLifeDays: 30,
    minTempCelsius: "4.0",
    maxTempCelsius: "8.0",
    decayRateExponent: "1.05",
    defaultPricePerUnit: "2.20",
    defaultCostPerUnit: "1.10",
    wasteDisposalCostPerKg: "0.15",
  },
};

// -------------------------------------------------------------------
// SEED RUNNER UTILITIES (PGlite in-process execution)
// -------------------------------------------------------------------

export async function seedDemoDataset(): Promise<{
  organizationsCount: number;
  warehousesCount: number;
  commoditiesCount: number;
  batchesCount: number;
  destinationsCount: number;
  demandsCount: number;
  routesCount: number;
  plansCount: number;
  allocationsCount: number;
  discountsCount: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // 1. Create Organization & Memberships
  await db.query(`
    INSERT INTO "Organization" (id, slug, name, "billingPlan", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `, [DEMO_ORGANIZATION_ID, "freshroute-produce-network", "FreshRoute Produce Network LLC", "ENTERPRISE_COLD_CHAIN"]);

  await db.query(`
    INSERT INTO "OrganizationMembership" (id, "organizationId", "userId", role, "createdAt", "updatedAt")
    VALUES 
      ('mem-01', $1, 'user-ben-founder', 'OWNER', NOW(), NOW()),
      ('mem-02', $1, 'user-dispatch-lead', 'DISPATCHER', NOW(), NOW())
    ON CONFLICT ("organizationId", "userId") DO NOTHING;
  `, [DEMO_ORGANIZATION_ID]);

  // 2. Warehouses (Prisma Schema: address, city, state, postalCode, latitude, longitude, totalCapacityKg, totalVolumeM3, coldStorageType)
  await db.query(`
    INSERT INTO "Warehouse" (id, "organizationId", code, name, address, city, state, "postalCode", latitude, longitude, "totalCapacityKg", "totalVolumeM3", "coldStorageType", "createdAt", "updatedAt")
    VALUES 
      ($1, $2, 'DC-SALINAS', 'Salinas Cold Hub Terminal 1', '100 Harvest Road', 'Salinas', 'CA', '93901', 36.677700, -121.655500, 250000.00, 1800.00, 'DUAL_ZONE_REFRIGERATED', NOW(), NOW()),
      ($3, $2, 'DC-FRESNO', 'Central Valley Distribution Depot', '450 Agro Way', 'Fresno', 'CA', '93725', 36.746800, -119.772600, 350000.00, 2400.00, 'MULTI_TEMP_CONTROLLED', NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;
  `, [DEMO_WAREHOUSE_SALINAS_ID, DEMO_ORGANIZATION_ID, DEMO_WAREHOUSE_FRESNO_ID]);

  // 3. Commodities
  for (const c of Object.values(DEMO_COMMODITIES)) {
    await db.query(`
      INSERT INTO "Commodity" (id, "organizationId", code, name, category, "defaultUnit", "standardShelfLifeDays", "minTempCelsius", "maxTempCelsius", "decayRateExponent", "defaultPricePerUnit", "defaultCostPerUnit", "wasteDisposalCostPerKg", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'KG', $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `, [c.id, DEMO_ORGANIZATION_ID, c.code, c.name, c.category, c.standardShelfLifeDays, c.minTempCelsius, c.maxTempCelsius, c.decayRateExponent, c.defaultPricePerUnit, c.defaultCostPerUnit, c.wasteDisposalCostPerKg]);
  }

  // Current Base Timestamp for reference (UTC)
  const now = new Date();
  const dayMs = 24 * 3600 * 1000;

  // 4. Inventory Batches (5 Edge Cases)
  // Batch A: URGENT FEFO DISPATCH (Strawberries expiring in 2 days)
  const batchAUrgentExpiry = new Date(now.getTime() + 2 * dayMs);
  const batchAHarvest = new Date(now.getTime() - 8 * dayMs);

  // Batch B: INFEASIBLE DELIVERY (Spinach expiring in 3 days, cannot satisfy Tier-1 5-day SLA)
  const batchBInfeasibleExpiry = new Date(now.getTime() + 3 * dayMs);
  const batchBHarvest = new Date(now.getTime() - 9 * dayMs);

  // Batch C: EXCESS SUPPLY (Oranges with 20,000 kg supply against 5,000 kg demand)
  const batchCExcessExpiry = new Date(now.getTime() + 25 * dayMs);
  const batchCHarvest = new Date(now.getTime() - 5 * dayMs);

  // Batch D: UNMET DEMAND (Hass Avocados only 2,000 kg supply against 6,000 kg demand)
  const batchDShortageExpiry = new Date(now.getTime() + 15 * dayMs);
  const batchDHarvest = new Date(now.getTime() - 4 * dayMs);

  // Batch E: DISCOUNT SALVAGE (High grade strawberries with 3.2 days RSL, unacceptable for Tier 1 7d SLA, ideal for Secondary 2d SLA with 20% markdown)
  const batchESalvageExpiry = new Date(now.getTime() + 3.2 * dayMs);
  const batchEHarvest = new Date(now.getTime() - 7 * dayMs);

  const batches = [
    {
      id: "batch-edge-a-urgent",
      orgId: DEMO_ORGANIZATION_ID,
      whId: DEMO_WAREHOUSE_SALINAS_ID,
      cmdId: DEMO_COMMODITIES.STRAWBERRIES.id,
      code: "BATCH-STR-URGENT-01",
      harvestDate: batchAHarvest,
      expiryDate: batchAUrgentExpiry,
      initialKg: "4500.00",
      availableKg: "4500.00",
      grade: "GRADE_A",
      tempCelsius: "1.5",
      unitCost: "3.20",
      basePrice: "5.50",
    },
    {
      id: "batch-edge-b-infeasible",
      orgId: DEMO_ORGANIZATION_ID,
      whId: DEMO_WAREHOUSE_SALINAS_ID,
      cmdId: DEMO_COMMODITIES.SPINACH.id,
      code: "BATCH-SPN-LOW-RSL-02",
      harvestDate: batchBHarvest,
      expiryDate: batchBInfeasibleExpiry,
      initialKg: "3000.00",
      availableKg: "3000.00",
      grade: "GRADE_A",
      tempCelsius: "2.0",
      unitCost: "2.10",
      basePrice: "3.80",
    },
    {
      id: "batch-edge-c-excess",
      orgId: DEMO_ORGANIZATION_ID,
      whId: DEMO_WAREHOUSE_FRESNO_ID,
      cmdId: DEMO_COMMODITIES.ORANGES.id,
      code: "BATCH-ORG-SURPLUS-03",
      harvestDate: batchCHarvest,
      expiryDate: batchCExcessExpiry,
      initialKg: "20000.00",
      availableKg: "20000.00",
      grade: "GRADE_B",
      tempCelsius: "5.0",
      unitCost: "1.10",
      basePrice: "2.20",
    },
    {
      id: "batch-edge-d-shortage",
      orgId: DEMO_ORGANIZATION_ID,
      whId: DEMO_WAREHOUSE_FRESNO_ID,
      cmdId: DEMO_COMMODITIES.AVOCADOS.id,
      code: "BATCH-AVO-SHORTAGE-04",
      harvestDate: batchDHarvest,
      expiryDate: batchDShortageExpiry,
      initialKg: "2000.00",
      availableKg: "2000.00",
      grade: "GRADE_A",
      tempCelsius: "5.5",
      unitCost: "3.80",
      basePrice: "6.20",
    },
    {
      id: "batch-edge-e-salvage",
      orgId: DEMO_ORGANIZATION_ID,
      whId: DEMO_WAREHOUSE_SALINAS_ID,
      cmdId: DEMO_COMMODITIES.STRAWBERRIES.id,
      code: "BATCH-STR-SALVAGE-05",
      harvestDate: batchEHarvest,
      expiryDate: batchESalvageExpiry,
      initialKg: "3500.00",
      availableKg: "3500.00",
      grade: "GRADE_A",
      tempCelsius: "1.5",
      unitCost: "3.10",
      basePrice: "5.20",
    },
  ];

  for (const b of batches) {
    await db.query(`
      INSERT INTO "InventoryBatch" (id, "organizationId", "warehouseId", "commodityId", "batchCode", "harvestDate", "receivedDate", "expiryDate", "initialQuantity", "availableQuantity", "unitOfMeasure", "qualityGrade", "storageTempCelsius", "unitCost", "basePrice", status, "isDemo", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, 'KG', $10, $11, $12, $13, 'AVAILABLE', true, NOW(), NOW())
      ON CONFLICT ("batchCode") DO NOTHING;
    `, [b.id, b.orgId, b.whId, b.cmdId, b.code, b.harvestDate, b.expiryDate, b.initialKg, b.availableKg, b.grade, b.tempCelsius, b.unitCost, b.basePrice]);
  }

  // 5. Destinations (Tiers & minShelfLifeDays)
  const destinations = [
    {
      id: "dest-metro-tier1",
      code: "DEST-METRO-01",
      name: "Metro Fresh Premium Grocers (SF Flagship)",
      tier: "PREMIUM_GROCER",
      address: "888 Market St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      lat: 37.774900,
      lng: -122.419400,
      minShelfLifeDays: 5,
      acceptsDiscounts: false,
      maxDiscountPercent: "0.00",
    },
    {
      id: "dest-pacific-tier1",
      code: "DEST-PACIFIC-02",
      name: "Pacific Regional Hypermarkets (Oakland DC)",
      tier: "REGIONAL_SUPERMARKET",
      address: "2000 Maritime St",
      city: "Oakland",
      state: "CA",
      postalCode: "94607",
      lat: 37.804400,
      lng: -122.271200,
      minShelfLifeDays: 7, // Strict 7-day RSL requirement
      acceptsDiscounts: false,
      maxDiscountPercent: "0.00",
    },
    {
      id: "dest-valley-processor",
      code: "DEST-VALLEY-03",
      name: "Valley Pre-Cut & Fresh Juicers (San Jose)",
      tier: "FOOD_SERVICE_PROCESSOR",
      address: "1500 Commercial St",
      city: "San Jose",
      state: "CA",
      postalCode: "95112",
      lat: 37.338200,
      lng: -121.886300,
      minShelfLifeDays: 2, // Forgiving 2-day SLA
      acceptsDiscounts: true,
      maxDiscountPercent: "25.00",
    },
    {
      id: "dest-bay-salvage",
      code: "DEST-BAY-04",
      name: "Bay Area Community Discount Food Hub",
      tier: "DISCOUNT_CHAIN",
      address: "3200 Depot Road",
      city: "Hayward",
      state: "CA",
      postalCode: "94545",
      lat: 37.668800,
      lng: -122.080800,
      minShelfLifeDays: 1, // Low SLA hurdle for dynamic markdown salvage
      acceptsDiscounts: true,
      maxDiscountPercent: "40.00",
    },
  ];

  for (const d of destinations) {
    await db.query(`
      INSERT INTO "Destination" (id, "organizationId", code, name, tier, address, city, state, "postalCode", latitude, longitude, "minShelfLifeDays", "acceptsDiscounts", "maxDiscountPercent", "receivingHoursStart", "receivingHoursEnd", "isDemo", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '04:00', '14:00', true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `, [d.id, DEMO_ORGANIZATION_ID, d.code, d.name, d.tier, d.address, d.city, d.state, d.postalCode, d.lat, d.lng, d.minShelfLifeDays, d.acceptsDiscounts, d.maxDiscountPercent]);
  }

  // 6. Destination Demands (Pairing with the Edge Cases)
  const windowStart = new Date(now.getTime() + 12 * 3600 * 1000);
  const windowEnd = new Date(now.getTime() + 36 * 3600 * 1000);

  const demands = [
    // Demand 1: Metro Fresh urgently wants 4,000 kg Strawberries (Matches Batch A Urgent)
    {
      id: "dem-urgent-metro-str",
      destId: "dest-metro-tier1",
      cmdId: DEMO_COMMODITIES.STRAWBERRIES.id,
      orderNumber: "ORD-METRO-STR-001",
      qtyKg: "4000.00",
      agreedPrice: "5.80",
    },
    // Demand 2: Pacific Hypermarket wants 3,000 kg Spinach with 7d SLA (Will REJECT Batch B because RSL is 2.8d < 7d)
    {
      id: "dem-infeasible-pac-spn",
      destId: "dest-pacific-tier1",
      cmdId: DEMO_COMMODITIES.SPINACH.id,
      orderNumber: "ORD-PAC-SPN-002",
      qtyKg: "3000.00",
      agreedPrice: "4.10",
    },
    // Demand 3: Metro Fresh wants 5,000 kg Oranges (Against 20,000 kg Supply = 15,000 kg Excess Supply)
    {
      id: "dem-excess-metro-org",
      destId: "dest-metro-tier1",
      cmdId: DEMO_COMMODITIES.ORANGES.id,
      orderNumber: "ORD-METRO-ORG-003",
      qtyKg: "5000.00",
      agreedPrice: "2.50",
    },
    // Demand 4: Pacific Hypermarket wants 6,000 kg Avocados (Against 2,000 kg Supply = 4,000 kg Shortage / Unmet Demand)
    {
      id: "dem-shortage-pac-avo",
      destId: "dest-pacific-tier1",
      cmdId: DEMO_COMMODITIES.AVOCADOS.id,
      orderNumber: "ORD-PAC-AVO-004",
      qtyKg: "6000.00",
      agreedPrice: "6.80",
    },
    // Demand 5: Bay Area Discount Hub wants 3,500 kg Strawberries if discounted (Markdown Salvage)
    {
      id: "dem-salvage-bay-str",
      destId: "dest-bay-salvage",
      cmdId: DEMO_COMMODITIES.STRAWBERRIES.id,
      orderNumber: "ORD-BAY-SALVAGE-005",
      qtyKg: "3500.00",
      agreedPrice: "4.40",
    },
  ];

  for (const d of demands) {
    await db.query(`
      INSERT INTO "DestinationDemand" (id, "organizationId", "destinationId", "commodityId", "orderNumber", "requestedQuantity", "unitOfMeasure", "contractedPricePerUnit", "deliveryWindowStart", "deliveryWindowEnd", "maxReceivingLimitKg", status, "isDemo", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, 'KG', $7, $8, $9, $6, 'PENDING', true, NOW(), NOW())
      ON CONFLICT ("orderNumber") DO NOTHING;
    `, [d.id, DEMO_ORGANIZATION_ID, d.destId, d.cmdId, d.orderNumber, d.qtyKg, d.agreedPrice, windowStart, windowEnd]);
  }

  // 7. Routes (Two-Part Tariff Logistics: Fixed + Variable)
  const routes = [
    {
      id: "route-salinas-sf-reefer",
      originWh: DEMO_WAREHOUSE_SALINAS_ID,
      code: "RT-SAL-SF-01",
      region: "San Francisco Bay",
      transitHours: "2.50",
      fixedCost: "350.00", // Fixed truck dispatch fee
      varCostPerKg: "0.08", // Variable per kg
      capacityKg: "12000.00",
    },
    {
      id: "route-salinas-oakland-heavy",
      originWh: DEMO_WAREHOUSE_SALINAS_ID,
      code: "RT-SAL-OAK-02",
      region: "East Bay Terminal",
      transitHours: "2.75",
      fixedCost: "380.00",
      varCostPerKg: "0.09",
      capacityKg: "15000.00",
    },
    {
      id: "route-fresno-bay-intercity",
      originWh: DEMO_WAREHOUSE_FRESNO_ID,
      code: "RT-FRE-BAY-03",
      region: "Central Bay Corridor",
      transitHours: "3.50",
      fixedCost: "500.00",
      varCostPerKg: "0.11",
      capacityKg: "22000.00",
    },
  ];

  for (const r of routes) {
    await db.query(`
      INSERT INTO "Route" (id, "organizationId", "routeCode", "originWarehouseId", "destinationRegion", "vehicleType", "maxWeightCapacityKg", "maxVolumeCapacityM3", "currentAvailableWeightKg", "currentAvailableVolumeM3", "tempZoneMinCelsius", "tempZoneMaxCelsius", "transitDurationHours", "handlingDurationHours", "fixedTripCost", "variableCostPerKg", "departureTime", "estimatedArrivalTime", status, "isDemo", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'REEFER_HEAVY_TRUCK', $6, 75.00, $6, 75.00, 1.0, 4.0, $7, 0.50, $8, $9, $10, $11, 'SCHEDULED', true, NOW(), NOW())
      ON CONFLICT ("routeCode") DO NOTHING;
    `, [r.id, DEMO_ORGANIZATION_ID, r.code, r.originWh, r.region, r.capacityKg, r.transitHours, r.fixedCost, r.varCostPerKg, windowStart, windowEnd]);
  }

  // 8. Canonical Distribution Plan & Snapshot Hash
  const snapshotData = {
    planNumber: "PLAN-2026-DEMO-01",
    timestamp: now.toISOString(),
    warehouses: [DEMO_WAREHOUSE_SALINAS_ID, DEMO_WAREHOUSE_FRESNO_ID],
    batchesCount: batches.length,
    demandsCount: demands.length,
    routesCount: routes.length,
    edgeCases: [
      "FEFO_URGENT_DISPATCH",
      "REJECTED_INSUFFICIENT_SHELF_LIFE",
      "EXCESS_SUPPLY_SURPLUS",
      "UNMET_DEMAND_SHORTAGE",
      "DYNAMIC_MARKDOWN_SALVAGE",
    ],
  };
  const snapshotHash = computePlanSnapshotHash(snapshotData);

  const planId = "plan-demo-canonical-01";
  await db.query(`
    INSERT INTO "DistributionPlan" (id, "organizationId", "planNumber", status, "algorithmVersion", "snapshotHash", "planTimestamp", "targetDate", "totalAllocatedKg", "unfulfilledDemandKg", "surplusStockKg", "totalRevenueUsd", "totalCostUsd", "netMarginUsd", "spoilagePreventedKg", "spoilagePreventedUsd", "isDemo", "createdAt", "updatedAt")
    VALUES ($1, $2, 'PLAN-2026-DEMO-01', 'OPTIMIZED', 'v1.0.0-fefo-elastic', $3, NOW(), $4, 7500.00, 4000.00, 15000.00, 35520.00, 25265.00, 10255.00, 7500.00, 35520.00, true, NOW(), NOW())
    ON CONFLICT ("planNumber") DO NOTHING;
  `, [planId, DEMO_ORGANIZATION_ID, snapshotHash, windowStart]);

  await db.query(`
    INSERT INTO "PlanSnapshot" (id, "distributionPlanId", "snapshotJson", "hashSha256", "createdAt")
    VALUES ('snap-01', $1, $2, $3, NOW())
    ON CONFLICT ("distributionPlanId") DO NOTHING;
  `, [planId, JSON.stringify(snapshotData), snapshotHash]);

  // 9. Allocations demonstrating verified execution of the 5 Edge Cases:
  // Allocation 1: Case A - Urgent FEFO Dispatch of Strawberries to Metro Fresh
  // 4,000 kg allocated via route-salinas-sf-reefer
  const rslA = calculateArrivalShelfLife({
    expiryDate: batchAUrgentExpiry,
    plannedDepartureDate: now,
    handlingDurationHours: 0.5,
    transitDurationHours: 2.5,
    bufferDurationHours: 0.5,
    minShelfLifeDays: 1.0,
  });

  await db.query(`
    INSERT INTO "Allocation" (id, "distributionPlanId", "batchId", "destinationDemandId", "routeId", "allocatedQuantity", "unitOfMeasure", "discountPercent", "effectivePricePerUnit", "grossRevenueUsd", "transportCostUsd", "purchaseCostUsd", "netMarginUsd", "arrivalShelfLifeDays", "reasonCode", "reasonExplanation", "createdAt")
    VALUES ('alloc-edge-a', $1, 'batch-edge-a-urgent', 'dem-urgent-metro-str', 'route-salinas-sf-reefer', 4000.00, 'KG', 0.00, 5.80, 23200.00, 670.00, 12800.00, 9730.00, $2, $3, $4, NOW())
    ON CONFLICT (id) DO NOTHING;
  `, [planId, rslA.remainingShelfLifeDays, rslA.reasonCode, rslA.explanation]);

  // Allocation 2: Case E - Salvage Markdown Allocation to Bay Area Discount Hub
  // 3,500 kg allocated with 20% markdown
  const rslE = calculateArrivalShelfLife({
    expiryDate: batchESalvageExpiry,
    plannedDepartureDate: now,
    handlingDurationHours: 0.5,
    transitDurationHours: 2.75,
    bufferDurationHours: 0.5,
    minShelfLifeDays: 1.0,
  });

  await db.query(`
    INSERT INTO "Allocation" (id, "distributionPlanId", "batchId", "destinationDemandId", "routeId", "allocatedQuantity", "unitOfMeasure", "discountPercent", "effectivePricePerUnit", "grossRevenueUsd", "transportCostUsd", "purchaseCostUsd", "netMarginUsd", "arrivalShelfLifeDays", "reasonCode", "reasonExplanation", "createdAt")
    VALUES ('alloc-edge-e', $1, 'batch-edge-e-salvage', 'dem-salvage-bay-str', 'route-salinas-oakland-heavy', 3500.00, 'KG', 20.00, 3.52, 12320.00, 695.00, 10850.00, 775.00, $2, 'DYNAMIC_MARKDOWN_SALVAGE', '20% dynamic markdown applied to salvage high-grade strawberries before SLA expiration.', NOW())
    ON CONFLICT (id) DO NOTHING;
  `, [planId, rslE.remainingShelfLifeDays]);

  // 10. Discount Recommendation (Case E)
  await db.query(`
    INSERT INTO "DiscountRecommendation" (id, "organizationId", "batchId", "destinationId", "suggestedDiscountPercent", "originalPricePerUnit", "discountedPricePerUnit", "quantityKg", "estimatedDisposalLossAvoided", "projectedGrossMarginUsd", status, "reasonExplanation", "createdAt", "updatedAt")
    VALUES ('disc-edge-e', $1, 'batch-edge-e-salvage', 'dest-bay-salvage', 20.00, 4.40, 3.52, 3500.00, 10850.00, 775.00, 'APPROVED', 'Batch nearing Tier-1 SLA cutoff; secondary salvage recovers $12,320 gross revenue vs total bio-waste dump.', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `, [DEMO_ORGANIZATION_ID]);

  // 11. Plan Metrics (Comparative Evaluation vs FIFO Baseline)
  await db.query(`
    INSERT INTO "PlanMetrics" (id, "distributionPlanId", "baselineProfitUsd", "proposedProfitUsd", "profitUpliftUsd", "profitUpliftPercent", "baselineSpoilageKg", "proposedSpoilageKg", "spoilageReductionKg", "spoilageReductionPercent", "baselineSlaCompliancePercent", "proposedSlaCompliancePercent", "baselineRejectionsCount", "proposedRejectionsCount", "createdAt")
    VALUES ('pm-01', $1, 6200.00, 10255.00, 4055.00, 65.40, 7500.00, 0.00, 7500.00, 100.00, 72.50, 100.00, 2, 0, NOW())
    ON CONFLICT ("distributionPlanId") DO NOTHING;
  `, [planId]);

  // Query counts to return summary
  const orgCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Organization"`);
  const whCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Warehouse"`);
  const cmdCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Commodity"`);
  const batchCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "InventoryBatch"`);
  const destCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Destination"`);
  const demCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "DestinationDemand"`);
  const routeCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Route"`);
  const planCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "DistributionPlan"`);
  const allocCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Allocation"`);
  const discCount = await db.query<{ count: number }>(`SELECT count(*)::int as count FROM "DiscountRecommendation"`);

  return {
    organizationsCount: orgCount.rows[0].count,
    warehousesCount: whCount.rows[0].count,
    commoditiesCount: cmdCount.rows[0].count,
    batchesCount: batchCount.rows[0].count,
    destinationsCount: destCount.rows[0].count,
    demandsCount: demCount.rows[0].count,
    routesCount: routeCount.rows[0].count,
    plansCount: planCount.rows[0].count,
    allocationsCount: allocCount.rows[0].count,
    discountsCount: discCount.rows[0].count,
  };
}
