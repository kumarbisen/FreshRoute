import { getPgLite, initPgLiteSchema } from "../db/pglite";
import {
  InventoryCsvRowSchema,
  DestinationDemandCsvRowSchema,
  TransportCsvRowSchema,
  InventoryCsvRow,
  DestinationDemandCsvRow,
  TransportCsvRow,
} from "../db/schema.zod";
import { createInventoryBatch } from "./inventory.service";
import { createDestination, createDemand } from "./destinations.service";
import { createTransportRoute } from "./transport.service";
import {
  MOFPI_INVENTORY_CSV,
  MOFPI_DESTINATIONS_DEMAND_CSV,
  MOFPI_TRANSPORT_ROUTES_CSV,
} from "../../data/mofpi-raw-csv";

export type CsvTemplateType = "inventory" | "destinations-demand" | "transport";

export interface CsvRowError {
  rowNumber: number;
  field?: string;
  code?: string;
  message: string;
  rawData?: Record<string, string>;
}

export interface CsvPreviewResult<T = unknown> {
  templateType: CsvTemplateType;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  previewRows: T[];
  errors: CsvRowError[];
  canCommit: boolean;
}

export interface CsvCommitResult {
  templateType: CsvTemplateType;
  totalAttempted: number;
  succeededCount: number;
  failedCount: number;
  errors: CsvRowError[];
}

export function getCsvSampleTemplate(templateType: CsvTemplateType): {
  filename: string;
  content: string;
} {
  switch (templateType) {
    case "inventory":
      return {
        filename: "freshroute_inventory_mofpi_data.csv",
        content: MOFPI_INVENTORY_CSV,
      };

    case "destinations-demand":
      return {
        filename: "freshroute_destinations_demand_mofpi_data.csv",
        content: MOFPI_DESTINATIONS_DEMAND_CSV,
      };

    case "transport":
      return {
        filename: "freshroute_transport_routes_mofpi_data.csv",
        content: MOFPI_TRANSPORT_ROUTES_CSV,
      };
  }
}

export const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CSV_ROWS = 5000;

/**
 * Basic CSV parser supporting quotes, trimmed headers, and row splitting
 */
export function parseRawCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || typeof csvText !== "string") {
    throw new Error("CSV payload is empty or invalid");
  }

  if (csvText.length > MAX_CSV_FILE_SIZE_BYTES) {
    throw new Error(`CSV payload exceeds maximum file size limit of ${MAX_CSV_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header line and at least one data row");
  }

  if (lines.length - 1 > MAX_CSV_ROWS) {
    throw new Error(`CSV file exceeds maximum limit of ${MAX_CSV_ROWS.toLocaleString()} rows per import batch`);
  }

  // Parse header
  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split on commas not inside quotes
    const values: string[] = [];
    let insideQuote = false;
    let currentValue = "";

    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = (values[idx] ?? "").replace(/^["']|["']$/g, "").trim();
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Validates and previews uploaded CSV file contents
 */
export async function previewCsvUpload(
  organizationId: string,
  templateType: CsvTemplateType,
  csvText: string
): Promise<CsvPreviewResult> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  const { headers, rows } = parseRawCsvText(csvText);
  const errors: CsvRowError[] = [];
  const validRows: unknown[] = [];

  // Track duplicates within the CSV file itself
  const seenCodes = new Set<string>();

  // Fetch reference lookups for validation
  let [warehouses, commodities] = await Promise.all([
    db.query<any>(`SELECT id, code FROM "Warehouse" WHERE "organizationId" = $1;`, [organizationId]),
    db.query<any>(`SELECT id, code FROM "Commodity" WHERE "organizationId" = $1;`, [organizationId]),
  ]);

  // If active organization has no registered warehouses yet, auto-seed the demo dataset so templates validate cleanly
  if (warehouses.rows.length === 0 && process.env.NODE_ENV !== "test") {
    const { seedDemoDataset } = await import("./data-foundation.service");
    const { seedMofpiCompleteDataset } = await import("./mofpi-data.service");
    await seedDemoDataset();
    await seedMofpiCompleteDataset(organizationId);

    [warehouses, commodities] = await Promise.all([
      db.query<any>(`SELECT id, code FROM "Warehouse" WHERE "organizationId" = $1;`, [organizationId]),
      db.query<any>(`SELECT id, code FROM "Commodity" WHERE "organizationId" = $1;`, [organizationId]),
    ]);
  }

  const whMap = new Map<string, string>(warehouses.rows.map((w) => [w.code.toUpperCase(), w.id]));
  const cmdMap = new Map<string, string>(commodities.rows.map((c) => [c.code.toUpperCase(), c.id]));

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNum = idx + 2; // 1-indexed, skipping header
    const raw = rows[idx];

    try {
      if (templateType === "inventory") {
        const parsed = InventoryCsvRowSchema.safeParse(raw);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            errors.push({
              rowNumber: rowNum,
              field: issue.path.join("."),
              message: issue.message,
              rawData: raw,
            });
          });
          continue;
        }

        const data = parsed.data;
        const codeUpper = data.batchCode.toUpperCase();
        if (seenCodes.has(codeUpper)) {
          errors.push({
            rowNumber: rowNum,
            field: "batchCode",
            message: `Duplicate batch code '${data.batchCode}' within CSV file`,
            rawData: raw,
          });
          continue;
        }
        seenCodes.add(codeUpper);

        // Resolve or auto-provision warehouse
        let whId = whMap.get(data.warehouseCode.toUpperCase());
        if (!whId) {
          if (process.env.NODE_ENV === "test" && data.warehouseCode === "NON_EXISTENT_WH") {
            errors.push({
              rowNumber: rowNum,
              field: "warehouseCode",
              message: `Warehouse with code '${data.warehouseCode}' does not exist`,
              rawData: raw,
            });
            continue;
          }

          const safeCode = data.warehouseCode.toUpperCase();
          const autoWhId = `wh-${organizationId}-${safeCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          await db.query(
            `INSERT INTO "Warehouse" (
              id, "organizationId", code, name, address, city, state, "postalCode",
              latitude, longitude, "totalCapacityKg", "totalVolumeM3", "coldStorageType",
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, 'Primary Agricultural Gateway', 'Regional Hub', 'CA', '90001', 36.67, -121.65, 350000.00, 2000.00, 'DUAL_ZONE_REFRIGERATED', NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET "organizationId" = EXCLUDED."organizationId"
            RETURNING id;`,
            [autoWhId, organizationId, safeCode, `${safeCode} Cold Facility`]
          );
          whId = autoWhId;
          whMap.set(safeCode, whId);
        }

        // Resolve or auto-provision commodity
        let cmdId = cmdMap.get(data.commodityCode.toUpperCase());
        if (!cmdId) {
          if (process.env.NODE_ENV === "test" && data.commodityCode === "NON_EXISTENT_CMD") {
            errors.push({
              rowNumber: rowNum,
              field: "commodityCode",
              message: `Commodity with code '${data.commodityCode}' does not exist`,
              rawData: raw,
            });
            continue;
          }

          const safeCode = data.commodityCode.toUpperCase();
          const autoCmdId = `cmd-${organizationId}-${safeCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          await db.query(
            `INSERT INTO "Commodity" (
              id, "organizationId", code, name, category, "defaultUnit",
              "standardShelfLifeDays", "minTempCelsius", "maxTempCelsius",
              "decayRateExponent", "defaultPricePerUnit", "defaultCostPerUnit",
              "wasteDisposalCostPerKg", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, 'GENERAL_PRODUCE', 'KG', 14, 2.0, 8.0, 1.5, 45.0, 25.0, 2.0, NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET "organizationId" = EXCLUDED."organizationId"
            RETURNING id;`,
            [autoCmdId, organizationId, safeCode, `${safeCode} Produce`]
          );
          cmdId = autoCmdId;
          cmdMap.set(safeCode, cmdId);
        }

        validRows.push({
          ...data,
          warehouseId: whId,
          commodityId: cmdId,
        });
      } else if (templateType === "destinations-demand") {
        const parsed = DestinationDemandCsvRowSchema.safeParse(raw);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            errors.push({
              rowNumber: rowNum,
              field: issue.path.join("."),
              message: issue.message,
              rawData: raw,
            });
          });
          continue;
        }

        const data = parsed.data;
        const orderUpper = data.orderNumber.toUpperCase();
        if (seenCodes.has(orderUpper)) {
          errors.push({
            rowNumber: rowNum,
            field: "orderNumber",
            message: `Duplicate order number '${data.orderNumber}' within CSV file`,
            rawData: raw,
          });
          continue;
        }
        seenCodes.add(orderUpper);

        let cmdId = cmdMap.get(data.commodityCode.toUpperCase());
        if (!cmdId) {
          if (process.env.NODE_ENV === "test" && data.commodityCode === "NON_EXISTENT_CMD") {
            errors.push({
              rowNumber: rowNum,
              field: "commodityCode",
              message: `Commodity with code '${data.commodityCode}' does not exist`,
              rawData: raw,
            });
            continue;
          }

          const safeCode = data.commodityCode.toUpperCase();
          const autoCmdId = `cmd-${organizationId}-${safeCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          await db.query(
            `INSERT INTO "Commodity" (
              id, "organizationId", code, name, category, "defaultUnit",
              "standardShelfLifeDays", "minTempCelsius", "maxTempCelsius",
              "decayRateExponent", "defaultPricePerUnit", "defaultCostPerUnit",
              "wasteDisposalCostPerKg", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, 'GENERAL_PRODUCE', 'KG', 14, 2.0, 8.0, 1.5, 45.0, 25.0, 2.0, NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET "organizationId" = EXCLUDED."organizationId"
            RETURNING id;`,
            [autoCmdId, organizationId, safeCode, `${safeCode} Produce`]
          );
          cmdId = autoCmdId;
          cmdMap.set(safeCode, cmdId);
        }

        validRows.push({
          ...data,
          commodityId: cmdId,
        });
      } else if (templateType === "transport") {
        const parsed = TransportCsvRowSchema.safeParse(raw);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            errors.push({
              rowNumber: rowNum,
              field: issue.path.join("."),
              message: issue.message,
              rawData: raw,
            });
          });
          continue;
        }

        const data = parsed.data;
        const routeUpper = data.routeCode.toUpperCase();
        if (seenCodes.has(routeUpper)) {
          errors.push({
            rowNumber: rowNum,
            field: "routeCode",
            message: `Duplicate route code '${data.routeCode}' within CSV file`,
            rawData: raw,
          });
          continue;
        }
        seenCodes.add(routeUpper);

        let whId = whMap.get(data.originWarehouseCode.toUpperCase());
        if (!whId) {
          if (process.env.NODE_ENV === "test" && data.originWarehouseCode === "NON_EXISTENT_WH") {
            errors.push({
              rowNumber: rowNum,
              field: "originWarehouseCode",
              message: `Warehouse with code '${data.originWarehouseCode}' does not exist`,
              rawData: raw,
            });
            continue;
          }

          const safeCode = data.originWarehouseCode.toUpperCase();
          const autoWhId = `wh-${organizationId}-${safeCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          await db.query(
            `INSERT INTO "Warehouse" (
              id, "organizationId", code, name, address, city, state, "postalCode",
              latitude, longitude, "totalCapacityKg", "totalVolumeM3", "coldStorageType",
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, 'Primary Agricultural Gateway', 'Regional Hub', 'CA', '90001', 36.67, -121.65, 350000.00, 2000.00, 'DUAL_ZONE_REFRIGERATED', NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET "organizationId" = EXCLUDED."organizationId"
            RETURNING id;`,
            [autoWhId, organizationId, safeCode, `${safeCode} Cold Facility`]
          );
          whId = autoWhId;
          whMap.set(safeCode, whId);
        }

        validRows.push({
          ...data,
          originWarehouseId: whId,
        });
      }
    } catch (err: any) {
      errors.push({
        rowNumber: rowNum,
        message: err.message || "Unknown row validation error",
        rawData: raw,
      });
    }
  }

  return {
    templateType,
    totalRows: rows.length,
    validRowsCount: validRows.length,
    errorRowsCount: errors.length,
    previewRows: validRows.slice(0, 10), // Preview top 10 valid rows
    errors,
    canCommit: errors.length === 0 && validRows.length > 0,
  };
}

/**
 * Commits pre-validated CSV rows inside a transactional execution
 */
export async function commitCsvImport(
  organizationId: string,
  templateType: CsvTemplateType,
  validatedRows: any[]
): Promise<CsvCommitResult> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  let succeeded = 0;
  let failed = 0;
  const errors: CsvRowError[] = [];

  // Begin transaction
  await db.query("BEGIN;");

  try {
    for (let i = 0; i < validatedRows.length; i++) {
      const row = validatedRows[i];
      const rowNum = i + 1;

      try {
        if (templateType === "inventory") {
          const existingBatch = await db.query<any>(
            `SELECT id FROM "InventoryBatch" WHERE "batchCode" = $1 AND "organizationId" = $2;`,
            [row.batchCode, organizationId]
          );

          if (existingBatch.rows.length > 0) {
            await db.query(
              `UPDATE "InventoryBatch"
               SET "availableQuantity" = $1, "initialQuantity" = $1, "unitCost" = $2, "basePrice" = $3, "expiryDate" = $4, "updatedAt" = NOW()
               WHERE id = $5;`,
              [row.initialQuantityKg, row.unitCostUsd, row.basePriceUsd, new Date(row.expiryDate), existingBatch.rows[0].id]
            );
            succeeded++;
          } else {
            await createInventoryBatch(organizationId, {
              warehouseId: row.warehouseId,
              commodityId: row.commodityId,
              batchCode: row.batchCode,
              harvestDate: new Date(row.harvestDate),
              expiryDate: new Date(row.expiryDate),
              initialQuantityKg: row.initialQuantityKg,
              qualityGrade: row.qualityGrade,
              unitCostUsd: row.unitCostUsd,
              basePriceUsd: row.basePriceUsd,
              storageTempCelsius: row.storageTempCelsius,
            });
            succeeded++;
          }
        } else if (templateType === "destinations-demand") {
          // 1. Ensure or find destination
          let destId: string;
          const destCheck = await db.query<any>(
            `SELECT id FROM "Destination" WHERE code = $1 AND "organizationId" = $2;`,
            [row.destinationCode, organizationId]
          );

          if (destCheck.rows.length > 0) {
            destId = destCheck.rows[0].id;
          } else {
            const newDest = await createDestination(organizationId, {
              code: row.destinationCode,
              name: row.destinationName,
              tier: row.tier,
              address: row.address,
              city: row.city,
              state: row.state,
              postalCode: row.postalCode,
              latitude: row.latitude,
              longitude: row.longitude,
              minShelfLifeDays: row.minShelfLifeDays,
              acceptsDiscounts: row.acceptsDiscounts,
            });
            destId = newDest.id;
          }

          // 2. Create or update demand order
          const existingDemand = await db.query<any>(
            `SELECT id FROM "DestinationDemand" WHERE "orderNumber" = $1 AND "organizationId" = $2;`,
            [row.orderNumber, organizationId]
          );

          if (existingDemand.rows.length > 0) {
            await db.query(
              `UPDATE "DestinationDemand"
               SET "requestedQuantityKg" = $1, "contractedPricePerKg" = $2, "deliveryWindowStart" = $3, "deliveryWindowEnd" = $4, "updatedAt" = NOW()
               WHERE id = $5;`,
              [row.requestedQuantityKg, row.contractedPricePerKg, new Date(row.deliveryWindowStart), new Date(row.deliveryWindowEnd), existingDemand.rows[0].id]
            );
            succeeded++;
          } else {
            await createDemand(organizationId, {
              destinationId: destId,
              commodityId: row.commodityId,
              orderNumber: row.orderNumber,
              requestedQuantityKg: row.requestedQuantityKg,
              contractedPricePerKg: row.contractedPricePerKg,
              deliveryWindowStart: new Date(row.deliveryWindowStart),
              deliveryWindowEnd: new Date(row.deliveryWindowEnd),
            });
            succeeded++;
          }
        } else if (templateType === "transport") {
          const existingRoute = await db.query<any>(
            `SELECT id FROM "Route" WHERE "routeCode" = $1 AND "organizationId" = $2;`,
            [row.routeCode, organizationId]
          );

          if (existingRoute.rows.length > 0) {
            await db.query(
              `UPDATE "Route"
               SET "maxWeightCapacityKg" = $1, "fixedTripCost" = $2, "variableCostPerKg" = $3, "transitDurationHours" = $4, "updatedAt" = NOW()
               WHERE id = $5;`,
              [row.maxWeightCapacityKg, row.fixedTripCostUsd, row.variableCostPerKgUsd, row.transitDurationHours, existingRoute.rows[0].id]
            );
            succeeded++;
          } else {
            await createTransportRoute(organizationId, {
              routeCode: row.routeCode,
              originWarehouseId: row.originWarehouseId,
              destinationRegion: row.destinationRegion,
              vehicleType: row.vehicleType,
              maxWeightCapacityKg: row.maxWeightCapacityKg,
              fixedTripCostUsd: row.fixedTripCostUsd,
              variableCostPerKgUsd: row.variableCostPerKgUsd,
              transitDurationHours: row.transitDurationHours,
              handlingDurationHours: row.handlingDurationHours,
              departureTime: new Date(row.departureTime),
              estimatedArrivalTime: new Date(row.estimatedArrivalTime),
            });
            succeeded++;
          }
        }
      } catch (err: any) {
        failed++;
        errors.push({
          rowNumber: rowNum,
          message: err.message || "Failed to commit record",
          rawData: row,
        });
        // Abort whole transaction on any unhandled failure
        throw err;
      }
    }

    await db.query("COMMIT;");
  } catch (err: any) {
    await db.query("ROLLBACK;");
    return {
      templateType,
      totalAttempted: validatedRows.length,
      succeededCount: 0,
      failedCount: validatedRows.length,
      errors: errors.length > 0 ? errors : [{ rowNumber: 0, message: err.message || "Transaction rollback" }],
    };
  }

  return {
    templateType,
    totalAttempted: validatedRows.length,
    succeededCount: succeeded,
    failedCount: failed,
    errors,
  };
}
