import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import { BatchStatus, QualityGrade, UnitOfMeasure } from "../db/schema.zod";

export type ShelfLifeRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "EXPIRED";

export interface ShelfLifeRiskInfo {
  remainingHours: number;
  remainingDays: number;
  riskLevel: ShelfLifeRiskLevel;
  riskLabel: string;
  riskColor: string; // CSS color token
}

export function computeShelfLifeRisk(expiryDate: Date, now: Date = new Date()): ShelfLifeRiskInfo {
  const diffMillis = expiryDate.getTime() - now.getTime();
  const remainingHours = Number((diffMillis / (3600 * 1000)).toFixed(1));
  const remainingDays = Number((diffMillis / (24 * 3600 * 1000)).toFixed(2));

  if (diffMillis <= 0) {
    return {
      remainingHours: 0,
      remainingDays: 0,
      riskLevel: "EXPIRED",
      riskLabel: "Expired",
      riskColor: "var(--danger, #ef4444)",
    };
  }

  if (remainingDays <= 2.0) {
    return {
      remainingHours,
      remainingDays,
      riskLevel: "CRITICAL",
      riskLabel: "Critical (< 48h)",
      riskColor: "var(--danger, #ef4444)",
    };
  }

  if (remainingDays <= 4.0) {
    return {
      remainingHours,
      remainingDays,
      riskLevel: "HIGH",
      riskLabel: "High Urgency (2-4d)",
      riskColor: "var(--warning, #f59e0b)",
    };
  }

  if (remainingDays <= 7.0) {
    return {
      remainingHours,
      remainingDays,
      riskLevel: "MEDIUM",
      riskLabel: "Medium Shelf-Life (4-7d)",
      riskColor: "var(--fresh-lime, #d4f933)",
    };
  }

  return {
    remainingHours,
    remainingDays,
    riskLevel: "LOW",
    riskLabel: "Stable (> 7d)",
    riskColor: "var(--success, #10b981)",
  };
}

export interface InventoryBatchRecord {
  id: string;
  organizationId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseCity: string;
  commodityId: string;
  commodityCode: string;
  commodityName: string;
  commodityCategory: string;
  batchCode: string;
  harvestDate: string;
  receivedDate: string;
  expiryDate: string;
  initialQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  spoiledQuantity: number;
  unitOfMeasure: UnitOfMeasure;
  qualityGrade: QualityGrade;
  storageTempCelsius: number;
  unitCost: number;
  basePrice: number;
  status: BatchStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  risk: ShelfLifeRiskInfo;
}

export interface BatchQuantityAuditRecord {
  id: string;
  batchId: string;
  changeType: string;
  deltaQuantity: number;
  resultingAvailable: number;
  resultingReserved: number;
  reason: string;
  createdAt: string;
}

export interface InventoryQueryParams {
  search?: string;
  commodityId?: string;
  warehouseId?: string;
  status?: string;
  riskLevel?: ShelfLifeRiskLevel;
  sortBy?: "expiryDate" | "availableQuantity" | "unitCost" | "batchCode" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listInventoryBatches(
  organizationId: string,
  params: InventoryQueryParams = {}
): Promise<{
  batches: InventoryBatchRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const {
    search,
    commodityId,
    warehouseId,
    status,
    riskLevel,
    sortBy = "expiryDate",
    sortOrder = "asc",
    page = 1,
    pageSize = 10,
  } = params;

  // Build parameterized conditions with mandatory organization-level data isolation
  const conditions: string[] = ['b."organizationId" = $1'];
  const values: unknown[] = [organizationId];
  let paramIdx = 2;

  if (commodityId) {
    conditions.push(`b."commodityId" = $${paramIdx++}`);
    values.push(commodityId);
  }

  if (warehouseId) {
    conditions.push(`b."warehouseId" = $${paramIdx++}`);
    values.push(warehouseId);
  }

  if (status) {
    conditions.push(`b.status::text = $${paramIdx++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(
      b."batchCode" ILIKE $${paramIdx} 
      OR c.name ILIKE $${paramIdx} 
      OR c.code ILIKE $${paramIdx} 
      OR w.name ILIKE $${paramIdx} 
      OR w.code ILIKE $${paramIdx}
      OR w.city ILIKE $${paramIdx}
    )`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  // Base query joining warehouse and commodity
  const whereClause = conditions.join(" AND ");

  const allowedSortColumns: Record<string, string> = {
    expiryDate: 'b."expiryDate"',
    availableQuantity: 'b."availableQuantity"',
    unitCost: 'b."unitCost"',
    batchCode: 'b."batchCode"',
    createdAt: 'b."createdAt"',
  };
  const sortColumn = allowedSortColumns[sortBy] || 'b."expiryDate"';
  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

  const rawRows = await db.query<any>(
    `
    SELECT 
      b.id,
      b."organizationId",
      b."warehouseId",
      w.code as "warehouseCode",
      w.name as "warehouseName",
      w.city as "warehouseCity",
      b."commodityId",
      c.code as "commodityCode",
      c.name as "commodityName",
      c.category as "commodityCategory",
      b."batchCode",
      b."harvestDate",
      b."receivedDate",
      b."expiryDate",
      b."initialQuantity",
      b."availableQuantity",
      b."reservedQuantity",
      b."dispatchedQuantity",
      b."spoiledQuantity",
      b."unitOfMeasure",
      b."qualityGrade",
      b."storageTempCelsius",
      b."unitCost",
      b."basePrice",
      b.status,
      b."isDemo",
      b."createdAt",
      b."updatedAt"
    FROM "InventoryBatch" b
    JOIN "Warehouse" w ON b."warehouseId" = w.id
    JOIN "Commodity" c ON b."commodityId" = c.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
  `,
    values
  );

  const now = new Date();
  let batches: InventoryBatchRecord[] = rawRows.rows.map((r) => {
    const expiry = new Date(r.expiryDate);
    return {
      id: r.id,
      organizationId: r.organizationId,
      warehouseId: r.warehouseId,
      warehouseCode: r.warehouseCode,
      warehouseName: r.warehouseName,
      warehouseCity: r.warehouseCity,
      commodityId: r.commodityId,
      commodityCode: r.commodityCode,
      commodityName: r.commodityName,
      commodityCategory: r.commodityCategory,
      batchCode: r.batchCode,
      harvestDate: new Date(r.harvestDate).toISOString(),
      receivedDate: new Date(r.receivedDate).toISOString(),
      expiryDate: expiry.toISOString(),
      initialQuantity: Number(r.initialQuantity),
      availableQuantity: Number(r.availableQuantity),
      reservedQuantity: Number(r.reservedQuantity ?? 0),
      dispatchedQuantity: Number(r.dispatchedQuantity ?? 0),
      spoiledQuantity: Number(r.spoiledQuantity ?? 0),
      unitOfMeasure: r.unitOfMeasure,
      qualityGrade: r.qualityGrade,
      storageTempCelsius: Number(r.storageTempCelsius),
      unitCost: Number(r.unitCost),
      basePrice: Number(r.basePrice),
      status: r.status,
      isDemo: Boolean(r.isDemo),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      risk: computeShelfLifeRisk(expiry, now),
    };
  });

  // Client-side filter for computed riskLevel if provided
  if (riskLevel) {
    batches = batches.filter((b) => b.risk.riskLevel === riskLevel);
  }

  const total = batches.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const paginatedBatches = batches.slice(offset, offset + pageSize);

  return {
    batches: paginatedBatches,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getInventoryBatchById(
  organizationId: string,
  batchId: string
): Promise<{
  batch: InventoryBatchRecord;
  audits: BatchQuantityAuditRecord[];
  allocations: any[];
} | null> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const batchResult = await db.query<any>(
    `
    SELECT 
      b.id,
      b."organizationId",
      b."warehouseId",
      w.code as "warehouseCode",
      w.name as "warehouseName",
      w.city as "warehouseCity",
      b."commodityId",
      c.code as "commodityCode",
      c.name as "commodityName",
      c.category as "commodityCategory",
      b."batchCode",
      b."harvestDate",
      b."receivedDate",
      b."expiryDate",
      b."initialQuantity",
      b."availableQuantity",
      b."reservedQuantity",
      b."dispatchedQuantity",
      b."spoiledQuantity",
      b."unitOfMeasure",
      b."qualityGrade",
      b."storageTempCelsius",
      b."unitCost",
      b."basePrice",
      b.status,
      b."isDemo",
      b."createdAt",
      b."updatedAt"
    FROM "InventoryBatch" b
    JOIN "Warehouse" w ON b."warehouseId" = w.id
    JOIN "Commodity" c ON b."commodityId" = c.id
    WHERE (b.id = $1 OR b."batchCode" = $1) AND b."organizationId" = $2;
  `,
    [batchId, organizationId]
  );

  if (batchResult.rows.length === 0) {
    return null;
  }

  const r = batchResult.rows[0];
  const expiry = new Date(r.expiryDate);
  const batch: InventoryBatchRecord = {
    id: r.id,
    organizationId: r.organizationId,
    warehouseId: r.warehouseId,
    warehouseCode: r.warehouseCode,
    warehouseName: r.warehouseName,
    warehouseCity: r.warehouseCity,
    commodityId: r.commodityId,
    commodityCode: r.commodityCode,
    commodityName: r.commodityName,
    commodityCategory: r.commodityCategory,
    batchCode: r.batchCode,
    harvestDate: new Date(r.harvestDate).toISOString(),
    receivedDate: new Date(r.receivedDate).toISOString(),
    expiryDate: expiry.toISOString(),
    initialQuantity: Number(r.initialQuantity),
    availableQuantity: Number(r.availableQuantity),
    reservedQuantity: Number(r.reservedQuantity ?? 0),
    dispatchedQuantity: Number(r.dispatchedQuantity ?? 0),
    spoiledQuantity: Number(r.spoiledQuantity ?? 0),
    unitOfMeasure: r.unitOfMeasure,
    qualityGrade: r.qualityGrade,
    storageTempCelsius: Number(r.storageTempCelsius),
    unitCost: Number(r.unitCost),
    basePrice: Number(r.basePrice),
    status: r.status,
    isDemo: Boolean(r.isDemo),
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
    risk: computeShelfLifeRisk(expiry),
  };

  const auditResult = await db.query<any>(
    `
    SELECT id, "batchId", "changeType", "deltaQuantity", "resultingAvailable", "resultingReserved", reason, "createdAt"
    FROM "BatchQuantityAudit"
    WHERE "batchId" = $1
    ORDER BY "createdAt" DESC;
  `,
    [r.id]
  );

  const audits: BatchQuantityAuditRecord[] = auditResult.rows.map((a) => ({
    id: a.id,
    batchId: a.batchId,
    changeType: a.changeType,
    deltaQuantity: Number(a.deltaQuantity),
    resultingAvailable: Number(a.resultingAvailable),
    resultingReserved: Number(a.resultingReserved),
    reason: a.reason,
    createdAt: new Date(a.createdAt).toISOString(),
  }));

  const allocResult = await db.query<any>(
    `
    SELECT 
      a.id, 
      a."allocatedQuantity", 
      a."effectivePricePerUnit", 
      a."grossRevenueUsd", 
      a."reasonCode", 
      a."reasonExplanation",
      d.name as "destinationName",
      p."planNumber"
    FROM "Allocation" a
    JOIN "DestinationDemand" dd ON a."destinationDemandId" = dd.id
    JOIN "Destination" d ON dd."destinationId" = d.id
    JOIN "DistributionPlan" p ON a."distributionPlanId" = p.id
    WHERE a."batchId" = $1
    ORDER BY a."createdAt" DESC;
  `,
    [r.id]
  );

  return {
    batch,
    audits,
    allocations: allocResult.rows,
  };
}

export interface CreateBatchInput {
  warehouseId: string;
  commodityId: string;
  batchCode: string;
  harvestDate: Date;
  receivedDate?: Date;
  expiryDate: Date;
  initialQuantityKg: number | string;
  unitCostUsd: number | string;
  basePriceUsd: number | string;
  qualityGrade?: QualityGrade;
  storageTempCelsius?: number | string;
  isDemo?: boolean;
}

export async function createInventoryBatch(
  organizationId: string,
  input: CreateBatchInput
): Promise<InventoryBatchRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const initialQty = new Decimal(input.initialQuantityKg);
  if (initialQty.lessThanOrEqualTo(0)) {
    throw new Error("Initial quantity must be strictly greater than 0 kg");
  }

  // Validate duplicate batch code within organization
  const existing = await db.query(
    `SELECT id FROM "InventoryBatch" WHERE "batchCode" = $1 AND "organizationId" = $2;`,
    [input.batchCode, organizationId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Batch code '${input.batchCode}' already exists in your organization`);
  }

  // Validate warehouse & commodity exist within organization
  const [whCheck, cmdCheck] = await Promise.all([
    db.query(`SELECT id FROM "Warehouse" WHERE id = $1 AND "organizationId" = $2;`, [input.warehouseId, organizationId]),
    db.query(`SELECT id FROM "Commodity" WHERE id = $1 AND "organizationId" = $2;`, [input.commodityId, organizationId]),
  ]);

  if (whCheck.rows.length === 0) {
    throw new Error(`Warehouse with ID '${input.warehouseId}' does not exist in your organization`);
  }
  if (cmdCheck.rows.length === 0) {
    throw new Error(`Commodity with ID '${input.commodityId}' does not exist in your organization`);
  }

  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const receivedDate = input.receivedDate || new Date();
  const grade = input.qualityGrade || "GRADE_A";
  const temp = new Decimal(input.storageTempCelsius ?? 2.5);
  const unitCost = new Decimal(input.unitCostUsd);
  const basePrice = new Decimal(input.basePriceUsd);

  await db.query(
    `
    INSERT INTO "InventoryBatch" (
      id, "organizationId", "warehouseId", "commodityId", "batchCode", 
      "harvestDate", "receivedDate", "expiryDate", "initialQuantity", 
      "availableQuantity", "reservedQuantity", "dispatchedQuantity", "spoiledQuantity",
      "unitOfMeasure", "qualityGrade", "storageTempCelsius", "unitCost", "basePrice", 
      status, "isDemo", "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5, 
      $6, $7, $8, $9, 
      $9, '0.00', '0.00', '0.00',
      'KG', $10, $11, $12, $13, 
      'AVAILABLE', $14, NOW(), NOW()
    );
  `,
    [
      batchId,
      organizationId,
      input.warehouseId,
      input.commodityId,
      input.batchCode,
      input.harvestDate,
      receivedDate,
      input.expiryDate,
      initialQty.toFixed(2),
      grade,
      temp.toFixed(1),
      unitCost.toFixed(2),
      basePrice.toFixed(2),
      Boolean(input.isDemo),
    ]
  );

  // Record initial intake quantity audit
  await db.query(
    `
    INSERT INTO "BatchQuantityAudit" (
      id, "batchId", "changeType", "deltaQuantity", "resultingAvailable", "resultingReserved", reason, "createdAt"
    )
    VALUES ($1, $2, 'INTAKE', $3, $3, '0.00', 'Initial warehouse lot intake', NOW());
  `,
    [`audit-${Date.now()}`, batchId, initialQty.toFixed(2)]
  );

  const detail = await getInventoryBatchById(organizationId, batchId);
  if (!detail) {
    throw new Error("Failed to retrieve created batch");
  }
  return detail.batch;
}

export interface UpdateBatchInput {
  qualityGrade?: QualityGrade;
  storageTempCelsius?: number | string;
  unitCost?: number | string;
  basePrice?: number | string;
  expiryDate?: Date;
  status?: BatchStatus;
  availableQuantity?: number | string;
  reservedQuantity?: number | string;
  dispatchedQuantity?: number | string;
  spoiledQuantity?: number | string;
  reason?: string;
}

export async function updateInventoryBatch(
  organizationId: string,
  batchId: string,
  input: UpdateBatchInput
): Promise<InventoryBatchRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const existing = await getInventoryBatchById(organizationId, batchId);
  if (!existing) {
    throw new Error(`Batch with ID '${batchId}' not found`);
  }

  const current = existing.batch;

  // 1. Lifecycle Transition Invariants
  if (input.status && input.status !== current.status) {
    if (current.status === "EXPIRED" && (input.status === "AVAILABLE" || input.status === "ALLOCATED")) {
      throw new Error("Inappropriate lifecycle transition: An expired batch cannot be reinstated to AVAILABLE or ALLOCATED.");
    }
    if (current.status === "SALVAGED" && input.status === "AVAILABLE") {
      throw new Error("Inappropriate lifecycle transition: A salvaged batch cannot be returned to standard AVAILABLE inventory.");
    }
  }

  // 2. Quantity Invariants
  const initialQty = new Decimal(current.initialQuantity);
  const newAvailable = input.availableQuantity !== undefined ? new Decimal(input.availableQuantity) : new Decimal(current.availableQuantity);
  const newReserved = input.reservedQuantity !== undefined ? new Decimal(input.reservedQuantity) : new Decimal(current.reservedQuantity);
  const newDispatched = input.dispatchedQuantity !== undefined ? new Decimal(input.dispatchedQuantity) : new Decimal(current.dispatchedQuantity);
  const newSpoiled = input.spoiledQuantity !== undefined ? new Decimal(input.spoiledQuantity) : new Decimal(current.spoiledQuantity);

  if (newAvailable.isNegative() || newReserved.isNegative() || newDispatched.isNegative() || newSpoiled.isNegative()) {
    throw new Error("Quantity values cannot be negative");
  }

  const totalAccounted = newAvailable.plus(newReserved).plus(newDispatched).plus(newSpoiled);
  if (totalAccounted.greaterThan(initialQty)) {
    throw new Error(`Sum of available (${newAvailable}), reserved (${newReserved}), dispatched (${newDispatched}), and spoiled (${newSpoiled}) exceeds initial batch quantity (${initialQty} kg)`);
  }

  // Update query
  await db.query(
    `
    UPDATE "InventoryBatch"
    SET 
      "qualityGrade" = COALESCE($1, "qualityGrade"),
      "storageTempCelsius" = COALESCE($2, "storageTempCelsius"),
      "unitCost" = COALESCE($3, "unitCost"),
      "basePrice" = COALESCE($4, "basePrice"),
      "expiryDate" = COALESCE($5, "expiryDate"),
      status = COALESCE($6, status),
      "availableQuantity" = $7,
      "reservedQuantity" = $8,
      "dispatchedQuantity" = $9,
      "spoiledQuantity" = $10,
      "updatedAt" = NOW()
    WHERE id = $11 AND "organizationId" = $12;
  `,
    [
      input.qualityGrade ?? null,
      input.storageTempCelsius ? new Decimal(input.storageTempCelsius).toFixed(1) : null,
      input.unitCost ? new Decimal(input.unitCost).toFixed(2) : null,
      input.basePrice ? new Decimal(input.basePrice).toFixed(2) : null,
      input.expiryDate ?? null,
      input.status ?? null,
      newAvailable.toFixed(2),
      newReserved.toFixed(2),
      newDispatched.toFixed(2),
      newSpoiled.toFixed(2),
      batchId,
      organizationId,
    ]
  );

  // If quantity changed, log audit
  const delta = newAvailable.minus(current.availableQuantity);
  if (!delta.isZero() || !newReserved.equals(current.reservedQuantity)) {
    await db.query(
      `
      INSERT INTO "BatchQuantityAudit" (
        id, "batchId", "changeType", "deltaQuantity", "resultingAvailable", "resultingReserved", reason, "createdAt"
      )
      VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, $6, NOW());
    `,
      [
        `audit-${Date.now()}`,
        batchId,
        delta.toFixed(2),
        newAvailable.toFixed(2),
        newReserved.toFixed(2),
        input.reason || "Manual inventory adjustment",
      ]
    );
  }

  const updated = await getInventoryBatchById(organizationId, batchId);
  return updated!.batch;
}
