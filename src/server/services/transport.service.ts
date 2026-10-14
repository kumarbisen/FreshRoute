import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import { RouteStatus } from "../db/schema.zod";

export interface TransportRouteRecord {
  id: string;
  organizationId: string;
  routeCode: string;
  originWarehouseId: string;
  originWarehouseCode: string;
  originWarehouseName: string;
  originWarehouseCity: string;
  destinationRegion: string;
  vehicleType: string;
  maxWeightCapacityKg: number;
  maxVolumeCapacityM3: number;
  currentAvailableWeightKg: number;
  currentAvailableVolumeM3: number;
  allocatedWeightKg: number;
  capacityUtilizationPercent: number;
  tempZoneMinCelsius: number;
  tempZoneMaxCelsius: number;
  transitDurationHours: number;
  handlingDurationHours: number;
  totalLeadTimeHours: number;
  fixedTripCostUsd: number;
  variableCostPerKgUsd: number;
  sampleCostFor1000KgUsd: number;
  departureTime: string;
  estimatedArrivalTime: string;
  status: RouteStatus;
  isDemo: boolean;
  activeAllocationsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export async function listTransportRoutes(
  organizationId: string,
  params: {
    originWarehouseId?: string;
    destinationRegion?: string;
    status?: string;
    search?: string;
    sortBy?: "routeCode" | "transitDurationHours" | "maxWeightCapacityKg" | "fixedTripCost";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  routes: TransportRouteRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const {
    originWarehouseId,
    destinationRegion,
    status,
    search,
    sortBy = "routeCode",
    sortOrder = "asc",
    page = 1,
    pageSize = 10,
  } = params;

  const conditions: string[] = ['r."organizationId" = $1'];
  const values: unknown[] = [organizationId];
  let paramIdx = 2;

  if (originWarehouseId) {
    conditions.push(`r."originWarehouseId" = $${paramIdx++}`);
    values.push(originWarehouseId);
  }

  if (destinationRegion) {
    conditions.push(`r."destinationRegion" ILIKE $${paramIdx++}`);
    values.push(`%${destinationRegion}%`);
  }

  if (status) {
    conditions.push(`r.status::text = $${paramIdx++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(
      r."routeCode" ILIKE $${paramIdx} 
      OR r."destinationRegion" ILIKE $${paramIdx} 
      OR w.name ILIKE $${paramIdx} 
      OR w.code ILIKE $${paramIdx}
    )`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");
  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
  const sortCol =
    sortBy === "transitDurationHours"
      ? 'r."transitDurationHours"'
      : sortBy === "maxWeightCapacityKg"
      ? 'r."maxWeightCapacityKg"'
      : sortBy === "fixedTripCost"
      ? 'r."fixedTripCost"'
      : 'r."routeCode"';

  const rawRows = await db.query<any>(
    `
    SELECT 
      r.id,
      r."organizationId",
      r."routeCode",
      r."originWarehouseId",
      w.code as "originWarehouseCode",
      w.name as "originWarehouseName",
      w.city as "originWarehouseCity",
      r."destinationRegion",
      r."vehicleType",
      r."maxWeightCapacityKg",
      r."maxVolumeCapacityM3",
      r."currentAvailableWeightKg",
      r."currentAvailableVolumeM3",
      r."tempZoneMinCelsius",
      r."tempZoneMaxCelsius",
      r."transitDurationHours",
      r."handlingDurationHours",
      r."fixedTripCost",
      r."variableCostPerKg",
      r."departureTime",
      r."estimatedArrivalTime",
      r.status,
      r."isDemo",
      r."createdAt",
      r."updatedAt",
      COUNT(a.id)::int as "activeAllocationsCount",
      COALESCE(SUM(a."allocatedQuantity"), 0)::float as "allocatedWeightKg"
    FROM "Route" r
    JOIN "Warehouse" w ON r."originWarehouseId" = w.id
    LEFT JOIN "Allocation" a ON r.id = a."routeId"
    WHERE ${whereClause}
    GROUP BY r.id, w.id
    ORDER BY ${sortCol} ${sortDirection};
  `,
    values
  );

  const routes: TransportRouteRecord[] = rawRows.rows.map((r) => {
    const maxKg = Number(r.maxWeightCapacityKg);
    const allocatedKg = Number(r.allocatedWeightKg ?? 0);
    const availKg = Number(r.currentAvailableWeightKg ?? maxKg - allocatedKg);
    const utilization = maxKg > 0 ? Number(((allocatedKg / maxKg) * 100).toFixed(1)) : 0;
    const transitH = Number(r.transitDurationHours);
    const handlingH = Number(r.handlingDurationHours ?? 0.5);
    const fixedCost = Number(r.fixedTripCost);
    const varCost = Number(r.variableCostPerKg);
    const sampleCost = Number((fixedCost + 1000 * varCost).toFixed(2));

    return {
      id: r.id,
      organizationId: r.organizationId,
      routeCode: r.routeCode,
      originWarehouseId: r.originWarehouseId,
      originWarehouseCode: r.originWarehouseCode,
      originWarehouseName: r.originWarehouseName,
      originWarehouseCity: r.originWarehouseCity,
      destinationRegion: r.destinationRegion,
      vehicleType: r.vehicleType,
      maxWeightCapacityKg: maxKg,
      maxVolumeCapacityM3: Number(r.maxVolumeCapacityM3),
      currentAvailableWeightKg: availKg,
      currentAvailableVolumeM3: Number(r.currentAvailableVolumeM3),
      allocatedWeightKg: allocatedKg,
      capacityUtilizationPercent: utilization,
      tempZoneMinCelsius: Number(r.tempZoneMinCelsius),
      tempZoneMaxCelsius: Number(r.tempZoneMaxCelsius),
      transitDurationHours: transitH,
      handlingDurationHours: handlingH,
      totalLeadTimeHours: Number((transitH + handlingH).toFixed(2)),
      fixedTripCostUsd: fixedCost,
      variableCostPerKgUsd: varCost,
      sampleCostFor1000KgUsd: sampleCost,
      departureTime: new Date(r.departureTime).toISOString(),
      estimatedArrivalTime: new Date(r.estimatedArrivalTime).toISOString(),
      status: r.status,
      isDemo: Boolean(r.isDemo),
      activeAllocationsCount: Number(r.activeAllocationsCount ?? 0),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  });

  const total = routes.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const paginated = routes.slice(offset, offset + pageSize);

  return {
    routes: paginated,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getTransportRouteById(
  organizationId: string,
  routeId: string
): Promise<TransportRouteRecord | null> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const rawRows = await db.query<any>(
    `
    SELECT 
      r.id,
      r."organizationId",
      r."routeCode",
      r."originWarehouseId",
      w.code as "originWarehouseCode",
      w.name as "originWarehouseName",
      w.city as "originWarehouseCity",
      r."destinationRegion",
      r."vehicleType",
      r."maxWeightCapacityKg",
      r."maxVolumeCapacityM3",
      r."currentAvailableWeightKg",
      r."currentAvailableVolumeM3",
      r."tempZoneMinCelsius",
      r."tempZoneMaxCelsius",
      r."transitDurationHours",
      r."handlingDurationHours",
      r."fixedTripCost",
      r."variableCostPerKg",
      r."departureTime",
      r."estimatedArrivalTime",
      r.status,
      r."isDemo",
      r."createdAt",
      r."updatedAt",
      COUNT(a.id)::int as "activeAllocationsCount",
      COALESCE(SUM(a."allocatedQuantity"), 0)::float as "allocatedWeightKg"
    FROM "Route" r
    JOIN "Warehouse" w ON r."originWarehouseId" = w.id
    LEFT JOIN "Allocation" a ON r.id = a."routeId"
    WHERE (r.id = $1 OR r."routeCode" = $1) AND r."organizationId" = $2
    GROUP BY r.id, w.id;
  `,
    [routeId, organizationId]
  );

  if (rawRows.rows.length === 0) return null;
  const r = rawRows.rows[0];

  const maxKg = Number(r.maxWeightCapacityKg);
  const allocatedKg = Number(r.allocatedWeightKg ?? 0);
  const availKg = Number(r.currentAvailableWeightKg ?? maxKg - allocatedKg);
  const utilization = maxKg > 0 ? Number(((allocatedKg / maxKg) * 100).toFixed(1)) : 0;
  const transitH = Number(r.transitDurationHours);
  const handlingH = Number(r.handlingDurationHours ?? 0.5);
  const fixedCost = Number(r.fixedTripCost);
  const varCost = Number(r.variableCostPerKg);
  const sampleCost = Number((fixedCost + 1000 * varCost).toFixed(2));

  return {
    id: r.id,
    organizationId: r.organizationId,
    routeCode: r.routeCode,
    originWarehouseId: r.originWarehouseId,
    originWarehouseCode: r.originWarehouseCode,
    originWarehouseName: r.originWarehouseName,
    originWarehouseCity: r.originWarehouseCity,
    destinationRegion: r.destinationRegion,
    vehicleType: r.vehicleType,
    maxWeightCapacityKg: maxKg,
    maxVolumeCapacityM3: Number(r.maxVolumeCapacityM3),
    currentAvailableWeightKg: availKg,
    currentAvailableVolumeM3: Number(r.currentAvailableVolumeM3),
    allocatedWeightKg: allocatedKg,
    capacityUtilizationPercent: utilization,
    tempZoneMinCelsius: Number(r.tempZoneMinCelsius),
    tempZoneMaxCelsius: Number(r.tempZoneMaxCelsius),
    transitDurationHours: transitH,
    handlingDurationHours: handlingH,
    totalLeadTimeHours: Number((transitH + handlingH).toFixed(2)),
    fixedTripCostUsd: fixedCost,
    variableCostPerKgUsd: varCost,
    sampleCostFor1000KgUsd: sampleCost,
    departureTime: new Date(r.departureTime).toISOString(),
    estimatedArrivalTime: new Date(r.estimatedArrivalTime).toISOString(),
    status: r.status,
    isDemo: Boolean(r.isDemo),
    activeAllocationsCount: Number(r.activeAllocationsCount ?? 0),
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export interface CreateRouteInput {
  routeCode: string;
  originWarehouseId: string;
  destinationRegion: string;
  vehicleType?: string;
  maxWeightCapacityKg: number | string;
  maxVolumeCapacityM3?: number | string;
  tempZoneMinCelsius?: number | string;
  tempZoneMaxCelsius?: number | string;
  transitDurationHours: number | string;
  handlingDurationHours?: number | string;
  fixedTripCostUsd: number | string;
  variableCostPerKgUsd: number | string;
  departureTime: Date;
  estimatedArrivalTime: Date;
  status?: RouteStatus;
  isDemo?: boolean;
}

export async function createTransportRoute(
  organizationId: string,
  input: CreateRouteInput
): Promise<TransportRouteRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await db.query(
    `SELECT id FROM "Route" WHERE "routeCode" = $1 AND "organizationId" = $2;`,
    [input.routeCode, organizationId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Route code '${input.routeCode}' already exists`);
  }

  const whCheck = await db.query(
    `SELECT id FROM "Warehouse" WHERE id = $1 AND "organizationId" = $2;`,
    [input.originWarehouseId, organizationId]
  );
  if (whCheck.rows.length === 0) {
    throw new Error(`Origin warehouse '${input.originWarehouseId}' does not exist in your organization`);
  }

  const id = `rt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const capKg = new Decimal(input.maxWeightCapacityKg);
  const capM3 = new Decimal(input.maxVolumeCapacityM3 ?? 65);
  const fixedCost = new Decimal(input.fixedTripCostUsd);
  const varCost = new Decimal(input.variableCostPerKgUsd);
  const transitH = new Decimal(input.transitDurationHours);
  const handlingH = new Decimal(input.handlingDurationHours ?? 0.5);

  await db.query(
    `
    INSERT INTO "Route" (
      id, "organizationId", "routeCode", "originWarehouseId", "destinationRegion", 
      "vehicleType", "maxWeightCapacityKg", "maxVolumeCapacityM3", "currentAvailableWeightKg", 
      "currentAvailableVolumeM3", "tempZoneMinCelsius", "tempZoneMaxCelsius", 
      "transitDurationHours", "handlingDurationHours", "fixedTripCost", "variableCostPerKg", 
      "departureTime", "estimatedArrivalTime", status, "isDemo", "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5, 
      $6, $7, $8, $7, 
      $8, $9, $10, 
      $11, $12, $13, $14, 
      $15, $16, $17, $18, NOW(), NOW()
    );
  `,
    [
      id,
      organizationId,
      input.routeCode,
      input.originWarehouseId,
      input.destinationRegion,
      input.vehicleType || "REEFER_HEAVY_TRUCK",
      capKg.toFixed(2),
      capM3.toFixed(2),
      new Decimal(input.tempZoneMinCelsius ?? 1.0).toFixed(1),
      new Decimal(input.tempZoneMaxCelsius ?? 4.0).toFixed(1),
      transitH.toFixed(2),
      handlingH.toFixed(2),
      fixedCost.toFixed(2),
      varCost.toFixed(2),
      input.departureTime,
      input.estimatedArrivalTime,
      input.status || "SCHEDULED",
      Boolean(input.isDemo),
    ]
  );

  const created = await getTransportRouteById(organizationId, id);
  return created!;
}

export async function updateTransportRoute(
  organizationId: string,
  routeId: string,
  input: {
    destinationRegion?: string;
    vehicleType?: string;
    maxWeightCapacityKg?: number | string;
    currentAvailableWeightKg?: number | string;
    tempZoneMinCelsius?: number | string;
    tempZoneMaxCelsius?: number | string;
    transitDurationHours?: number | string;
    handlingDurationHours?: number | string;
    fixedTripCostUsd?: number | string;
    variableCostPerKgUsd?: number | string;
    departureTime?: Date;
    estimatedArrivalTime?: Date;
    status?: RouteStatus;
  }
): Promise<TransportRouteRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  await db.query(
    `
    UPDATE "Route"
    SET 
      "destinationRegion" = COALESCE($1, "destinationRegion"),
      "vehicleType" = COALESCE($2, "vehicleType"),
      "maxWeightCapacityKg" = COALESCE($3, "maxWeightCapacityKg"),
      "currentAvailableWeightKg" = COALESCE($4, "currentAvailableWeightKg"),
      "tempZoneMinCelsius" = COALESCE($5, "tempZoneMinCelsius"),
      "tempZoneMaxCelsius" = COALESCE($6, "tempZoneMaxCelsius"),
      "transitDurationHours" = COALESCE($7, "transitDurationHours"),
      "handlingDurationHours" = COALESCE($8, "handlingDurationHours"),
      "fixedTripCost" = COALESCE($9, "fixedTripCost"),
      "variableCostPerKg" = COALESCE($10, "variableCostPerKg"),
      "departureTime" = COALESCE($11, "departureTime"),
      "estimatedArrivalTime" = COALESCE($12, "estimatedArrivalTime"),
      status = COALESCE($13, status),
      "updatedAt" = NOW()
    WHERE id = $14 AND "organizationId" = $15;
  `,
    [
      input.destinationRegion ?? null,
      input.vehicleType ?? null,
      input.maxWeightCapacityKg ? new Decimal(input.maxWeightCapacityKg).toFixed(2) : null,
      input.currentAvailableWeightKg ? new Decimal(input.currentAvailableWeightKg).toFixed(2) : null,
      input.tempZoneMinCelsius ? new Decimal(input.tempZoneMinCelsius).toFixed(1) : null,
      input.tempZoneMaxCelsius ? new Decimal(input.tempZoneMaxCelsius).toFixed(1) : null,
      input.transitDurationHours ? new Decimal(input.transitDurationHours).toFixed(2) : null,
      input.handlingDurationHours ? new Decimal(input.handlingDurationHours).toFixed(2) : null,
      input.fixedTripCostUsd ? new Decimal(input.fixedTripCostUsd).toFixed(2) : null,
      input.variableCostPerKgUsd ? new Decimal(input.variableCostPerKgUsd).toFixed(2) : null,
      input.departureTime ?? null,
      input.estimatedArrivalTime ?? null,
      input.status ?? null,
      routeId,
      organizationId,
    ]
  );

  const updated = await getTransportRouteById(organizationId, routeId);
  return updated!;
}
