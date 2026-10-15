import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import { DemandStatus, UnitOfMeasure } from "../db/schema.zod";

export interface DestinationRecord {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  tier: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  minShelfLifeDays: number;
  acceptsDiscounts: boolean;
  maxDiscountPercent: number;
  receivingHoursStart: string;
  receivingHoursEnd: string;
  isDemo: boolean;
  activeDemandsCount?: number;
  totalRequestedKg?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationDemandRecord {
  id: string;
  organizationId: string;
  destinationId: string;
  destinationCode: string;
  destinationName: string;
  destinationTier: string;
  minShelfLifeDays: number;
  commodityId: string;
  commodityCode: string;
  commodityName: string;
  commodityCategory: string;
  orderNumber: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  unfulfilledQuantity: number;
  unitOfMeasure: UnitOfMeasure;
  contractedPricePerUnit: number;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  maxReceivingLimitKg: number;
  status: DemandStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listDestinations(
  organizationId: string,
  params: {
    search?: string;
    tier?: string;
    acceptsDiscounts?: boolean;
    sortBy?: "name" | "code" | "minShelfLifeDays" | "createdAt";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  destinations: DestinationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const {
    search,
    tier,
    acceptsDiscounts,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 10,
  } = params;

  const conditions: string[] = ['d."organizationId" = $1'];
  const values: unknown[] = [organizationId];
  let paramIdx = 2;

  if (tier) {
    conditions.push(`d.tier = $${paramIdx++}`);
    values.push(tier);
  }

  if (acceptsDiscounts !== undefined) {
    conditions.push(`d."acceptsDiscounts" = $${paramIdx++}`);
    values.push(acceptsDiscounts);
  }

  if (search) {
    conditions.push(`(
      d.name ILIKE $${paramIdx} 
      OR d.code ILIKE $${paramIdx} 
      OR d.city ILIKE $${paramIdx} 
      OR d.tier ILIKE $${paramIdx}
    )`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");
  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
  const sortCol =
    sortBy === "code"
      ? 'd.code'
      : sortBy === "minShelfLifeDays"
      ? 'd."minShelfLifeDays"'
      : sortBy === "createdAt"
      ? 'd."createdAt"'
      : 'd.name';

  const rawRows = await db.query<any>(
    `
    SELECT 
      d.id,
      d."organizationId",
      d.code,
      d.name,
      d.tier,
      d.address,
      d.city,
      d.state,
      d."postalCode",
      d.latitude,
      d.longitude,
      d."minShelfLifeDays",
      d."acceptsDiscounts",
      d."maxDiscountPercent",
      d."receivingHoursStart",
      d."receivingHoursEnd",
      d."isDemo",
      d."createdAt",
      d."updatedAt",
      COUNT(dd.id)::int as "activeDemandsCount",
      COALESCE(SUM(dd."requestedQuantity"), 0)::float as "totalRequestedKg"
    FROM "Destination" d
    LEFT JOIN "DestinationDemand" dd ON d.id = dd."destinationId"
    WHERE ${whereClause}
    GROUP BY d.id
    ORDER BY ${sortCol} ${sortDirection};
  `,
    values
  );

  const destinations: DestinationRecord[] = rawRows.rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    code: r.code,
    name: r.name,
    tier: r.tier,
    address: r.address,
    city: r.city,
    state: r.state,
    postalCode: r.postalCode,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    minShelfLifeDays: Number(r.minShelfLifeDays),
    acceptsDiscounts: Boolean(r.acceptsDiscounts),
    maxDiscountPercent: Number(r.maxDiscountPercent),
    receivingHoursStart: r.receivingHoursStart,
    receivingHoursEnd: r.receivingHoursEnd,
    isDemo: Boolean(r.isDemo),
    activeDemandsCount: Number(r.activeDemandsCount ?? 0),
    totalRequestedKg: Number(r.totalRequestedKg ?? 0),
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  }));

  const total = destinations.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const paginated = destinations.slice(offset, offset + pageSize);

  return {
    destinations: paginated,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getDestinationById(
  organizationId: string,
  destinationId: string
): Promise<{
  destination: DestinationRecord;
  demands: DestinationDemandRecord[];
} | null> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const res = await db.query<any>(
    `
    SELECT * FROM "Destination" 
    WHERE id = $1 AND "organizationId" = $2;
  `,
    [destinationId, organizationId]
  );

  if (res.rows.length === 0) return null;

  const r = res.rows[0];
  const destination: DestinationRecord = {
    id: r.id,
    organizationId: r.organizationId,
    code: r.code,
    name: r.name,
    tier: r.tier,
    address: r.address,
    city: r.city,
    state: r.state,
    postalCode: r.postalCode,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    minShelfLifeDays: Number(r.minShelfLifeDays),
    acceptsDiscounts: Boolean(r.acceptsDiscounts),
    maxDiscountPercent: Number(r.maxDiscountPercent),
    receivingHoursStart: r.receivingHoursStart,
    receivingHoursEnd: r.receivingHoursEnd,
    isDemo: Boolean(r.isDemo),
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };

  const demandsResult = await listDemands(organizationId, { destinationId });

  return {
    destination,
    demands: demandsResult.demands,
  };
}

export interface CreateDestinationInput {
  code: string;
  name: string;
  tier: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | string;
  longitude: number | string;
  minShelfLifeDays: number;
  acceptsDiscounts?: boolean;
  maxDiscountPercent?: number | string;
  receivingHoursStart?: string;
  receivingHoursEnd?: string;
  isDemo?: boolean;
}

export async function createDestination(
  organizationId: string,
  input: CreateDestinationInput
): Promise<DestinationRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await db.query(
    `SELECT id FROM "Destination" WHERE code = $1 AND "organizationId" = $2;`,
    [input.code, organizationId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Destination with code '${input.code}' already exists`);
  }

  const id = `dest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const lat = new Decimal(input.latitude);
  const lng = new Decimal(input.longitude);
  const discountPct = new Decimal(input.maxDiscountPercent ?? 0);

  await db.query(
    `
    INSERT INTO "Destination" (
      id, "organizationId", code, name, tier, address, city, state, "postalCode", 
      latitude, longitude, "minShelfLifeDays", "acceptsDiscounts", "maxDiscountPercent", 
      "receivingHoursStart", "receivingHoursEnd", "isDemo", "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 
      $10, $11, $12, $13, $14, 
      $15, $16, $17, NOW(), NOW()
    );
  `,
    [
      id,
      organizationId,
      input.code,
      input.name,
      input.tier,
      input.address,
      input.city,
      input.state,
      input.postalCode,
      lat.toFixed(6),
      lng.toFixed(6),
      input.minShelfLifeDays,
      Boolean(input.acceptsDiscounts),
      discountPct.toFixed(2),
      input.receivingHoursStart || "04:00",
      input.receivingHoursEnd || "14:00",
      Boolean(input.isDemo),
    ]
  );

  const detail = await getDestinationById(organizationId, id);
  return detail!.destination;
}

export async function updateDestination(
  organizationId: string,
  destinationId: string,
  input: Partial<CreateDestinationInput>
): Promise<DestinationRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await getDestinationById(organizationId, destinationId);
  if (!existing) {
    throw new Error(`Destination with ID '${destinationId}' not found`);
  }

  await db.query(
    `
    UPDATE "Destination"
    SET 
      name = COALESCE($1, name),
      tier = COALESCE($2, tier),
      address = COALESCE($3, address),
      city = COALESCE($4, city),
      state = COALESCE($5, state),
      "postalCode" = COALESCE($6, "postalCode"),
      latitude = COALESCE($7, latitude),
      longitude = COALESCE($8, longitude),
      "minShelfLifeDays" = COALESCE($9, "minShelfLifeDays"),
      "acceptsDiscounts" = COALESCE($10, "acceptsDiscounts"),
      "maxDiscountPercent" = COALESCE($11, "maxDiscountPercent"),
      "receivingHoursStart" = COALESCE($12, "receivingHoursStart"),
      "receivingHoursEnd" = COALESCE($13, "receivingHoursEnd"),
      "updatedAt" = NOW()
    WHERE id = $14 AND "organizationId" = $15;
  `,
    [
      input.name ?? null,
      input.tier ?? null,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.postalCode ?? null,
      input.latitude ? new Decimal(input.latitude).toFixed(6) : null,
      input.longitude ? new Decimal(input.longitude).toFixed(6) : null,
      input.minShelfLifeDays ?? null,
      input.acceptsDiscounts !== undefined ? Boolean(input.acceptsDiscounts) : null,
      input.maxDiscountPercent ? new Decimal(input.maxDiscountPercent).toFixed(2) : null,
      input.receivingHoursStart ?? null,
      input.receivingHoursEnd ?? null,
      destinationId,
      organizationId,
    ]
  );

  const detail = await getDestinationById(organizationId, destinationId);
  return detail!.destination;
}

// -------------------------------------------------------------
// DEMAND SERVICES
// -------------------------------------------------------------

export async function listDemands(
  organizationId: string,
  params: {
    destinationId?: string;
    commodityId?: string;
    status?: string;
    search?: string;
    sortBy?: "deliveryWindowStart" | "requestedQuantity" | "orderNumber";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  demands: DestinationDemandRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const {
    destinationId,
    commodityId,
    status,
    search,
    sortBy = "deliveryWindowStart",
    sortOrder = "asc",
    page = 1,
    pageSize = 10,
  } = params;

  const conditions: string[] = ['dd."organizationId" = $1'];
  const values: unknown[] = [organizationId];
  let paramIdx = 2;

  if (destinationId) {
    conditions.push(`dd."destinationId" = $${paramIdx++}`);
    values.push(destinationId);
  }

  if (commodityId) {
    conditions.push(`dd."commodityId" = $${paramIdx++}`);
    values.push(commodityId);
  }

  if (status) {
    conditions.push(`dd.status::text = $${paramIdx++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(
      dd."orderNumber" ILIKE $${paramIdx} 
      OR d.name ILIKE $${paramIdx} 
      OR d.code ILIKE $${paramIdx} 
      OR c.name ILIKE $${paramIdx}
    )`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");
  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
  const sortCol =
    sortBy === "orderNumber"
      ? 'dd."orderNumber"'
      : sortBy === "requestedQuantity"
      ? 'dd."requestedQuantity"'
      : 'dd."deliveryWindowStart"';

  const rawRows = await db.query<any>(
    `
    SELECT 
      dd.id,
      dd."organizationId",
      dd."destinationId",
      d.code as "destinationCode",
      d.name as "destinationName",
      d.tier as "destinationTier",
      d."minShelfLifeDays",
      dd."commodityId",
      c.code as "commodityCode",
      c.name as "commodityName",
      c.category as "commodityCategory",
      dd."orderNumber",
      dd."requestedQuantity",
      dd."fulfilledQuantity",
      dd."unitOfMeasure",
      dd."contractedPricePerUnit",
      dd."deliveryWindowStart",
      dd."deliveryWindowEnd",
      dd."maxReceivingLimitKg",
      dd.status,
      dd."isDemo",
      dd."createdAt",
      dd."updatedAt"
    FROM "DestinationDemand" dd
    JOIN "Destination" d ON dd."destinationId" = d.id
    JOIN "Commodity" c ON dd."commodityId" = c.id
    WHERE ${whereClause}
    ORDER BY ${sortCol} ${sortDirection};
  `,
    values
  );

  const demands: DestinationDemandRecord[] = rawRows.rows.map((r) => {
    const req = Number(r.requestedQuantity);
    const ful = Number(r.fulfilledQuantity ?? 0);
    return {
      id: r.id,
      organizationId: r.organizationId,
      destinationId: r.destinationId,
      destinationCode: r.destinationCode,
      destinationName: r.destinationName,
      destinationTier: r.destinationTier,
      minShelfLifeDays: Number(r.minShelfLifeDays),
      commodityId: r.commodityId,
      commodityCode: r.commodityCode,
      commodityName: r.commodityName,
      commodityCategory: r.commodityCategory,
      orderNumber: r.orderNumber,
      requestedQuantity: req,
      fulfilledQuantity: ful,
      unfulfilledQuantity: Math.max(0, req - ful),
      unitOfMeasure: r.unitOfMeasure,
      contractedPricePerUnit: Number(r.contractedPricePerUnit),
      deliveryWindowStart: new Date(r.deliveryWindowStart).toISOString(),
      deliveryWindowEnd: new Date(r.deliveryWindowEnd).toISOString(),
      maxReceivingLimitKg: Number(r.maxReceivingLimitKg),
      status: r.status,
      isDemo: Boolean(r.isDemo),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  });

  const total = demands.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const paginated = demands.slice(offset, offset + pageSize);

  return {
    demands: paginated,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export interface CreateDemandInput {
  destinationId: string;
  commodityId: string;
  orderNumber: string;
  requestedQuantityKg: number | string;
  contractedPricePerKg: number | string;
  deliveryWindowStart: Date;
  deliveryWindowEnd: Date;
  maxReceivingLimitKg?: number | string;
  isDemo?: boolean;
}

export async function createDemand(
  organizationId: string,
  input: CreateDemandInput
): Promise<DestinationDemandRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await db.query(
    `SELECT id FROM "DestinationDemand" WHERE "orderNumber" = $1 AND "organizationId" = $2;`,
    [input.orderNumber, organizationId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Demand order '${input.orderNumber}' already exists`);
  }

  const [destCheck, cmdCheck] = await Promise.all([
    db.query(`SELECT id FROM "Destination" WHERE id = $1 AND "organizationId" = $2;`, [input.destinationId, organizationId]),
    db.query(`SELECT id FROM "Commodity" WHERE id = $1 AND "organizationId" = $2;`, [input.commodityId, organizationId]),
  ]);

  if (destCheck.rows.length === 0) {
    throw new Error(`Destination '${input.destinationId}' does not exist in your organization`);
  }
  if (cmdCheck.rows.length === 0) {
    throw new Error(`Commodity '${input.commodityId}' does not exist in your organization`);
  }

  const id = `dem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const reqQty = new Decimal(input.requestedQuantityKg);
  const maxLimit = input.maxReceivingLimitKg ? new Decimal(input.maxReceivingLimitKg) : reqQty;
  const price = new Decimal(input.contractedPricePerKg);

  await db.query(
    `
    INSERT INTO "DestinationDemand" (
      id, "organizationId", "destinationId", "commodityId", "orderNumber", 
      "requestedQuantity", "fulfilledQuantity", "unitOfMeasure", "contractedPricePerUnit", 
      "deliveryWindowStart", "deliveryWindowEnd", "maxReceivingLimitKg", status, "isDemo", 
      "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5, 
      $6, '0.00', 'KG', $7, 
      $8, $9, $10, 'PENDING', $11, 
      NOW(), NOW()
    );
  `,
    [
      id,
      organizationId,
      input.destinationId,
      input.commodityId,
      input.orderNumber,
      reqQty.toFixed(2),
      price.toFixed(2),
      input.deliveryWindowStart,
      input.deliveryWindowEnd,
      maxLimit.toFixed(2),
      Boolean(input.isDemo),
    ]
  );

  const result = await listDemands(organizationId, { search: input.orderNumber });
  return result.demands[0];
}

export async function updateDemand(
  organizationId: string,
  demandId: string,
  input: {
    requestedQuantityKg?: number | string;
    fulfilledQuantityKg?: number | string;
    contractedPricePerKg?: number | string;
    deliveryWindowStart?: Date;
    deliveryWindowEnd?: Date;
    status?: DemandStatus;
  }
): Promise<DestinationDemandRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  await db.query(
    `
    UPDATE "DestinationDemand"
    SET 
      "requestedQuantity" = COALESCE($1, "requestedQuantity"),
      "fulfilledQuantity" = COALESCE($2, "fulfilledQuantity"),
      "contractedPricePerUnit" = COALESCE($3, "contractedPricePerUnit"),
      "deliveryWindowStart" = COALESCE($4, "deliveryWindowStart"),
      "deliveryWindowEnd" = COALESCE($5, "deliveryWindowEnd"),
      status = COALESCE($6, status),
      "updatedAt" = NOW()
    WHERE id = $7 AND "organizationId" = $8;
  `,
    [
      input.requestedQuantityKg ? new Decimal(input.requestedQuantityKg).toFixed(2) : null,
      input.fulfilledQuantityKg ? new Decimal(input.fulfilledQuantityKg).toFixed(2) : null,
      input.contractedPricePerKg ? new Decimal(input.contractedPricePerKg).toFixed(2) : null,
      input.deliveryWindowStart ?? null,
      input.deliveryWindowEnd ?? null,
      input.status ?? null,
      demandId,
      organizationId,
    ]
  );

  const res = await db.query<any>(
    `SELECT "orderNumber" FROM "DestinationDemand" WHERE id = $1 AND "organizationId" = $2;`,
    [demandId, organizationId]
  );
  if (res.rows.length === 0) {
    throw new Error(`Demand order not found: ${demandId}`);
  }
  const orderNum = res.rows[0]?.orderNumber;
  const list = await listDemands(organizationId, { search: orderNum });
  return list.demands[0];
}
