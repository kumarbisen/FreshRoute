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
        filename: "freshroute_inventory_template.csv",
        content: `batchCode,commodityCode,warehouseCode,initialQuantityKg,qualityGrade,unitCostUsd,basePriceUsd,harvestDate,expiryDate,storageTempCelsius
BATCH-STR-EXP-101,STR-01,DC-SALINAS,3500.00,GRADE_A,3.10,5.20,2026-10-10,2026-10-22,1.5
BATCH-SPN-EXP-102,SPN-01,DC-SALINAS,2400.00,GRADE_A,2.15,3.90,2026-10-11,2026-10-24,2.0
BATCH-AVO-EXP-103,AVO-01,DC-FRESNO,4800.00,GRADE_A,3.75,6.10,2026-10-08,2026-11-01,5.5
BATCH-ORG-EXP-104,ORG-01,DC-FRESNO,8000.00,GRADE_B,1.05,2.15,2026-10-05,2026-11-15,6.0`,
      };

    case "destinations-demand":
      return {
        filename: "freshroute_destinations_demand_template.csv",
        content: `destinationCode,destinationName,tier,address,city,state,postalCode,latitude,longitude,minShelfLifeDays,acceptsDiscounts,commodityCode,orderNumber,requestedQuantityKg,contractedPricePerKg,deliveryWindowStart,deliveryWindowEnd
DEST-SAC-01,Sacramento Organic Market,PREMIUM_GROCER,450 Capitol Ave,Sacramento,CA,95814,38.5816,-121.4944,5,false,STR-01,ORD-SAC-STR-01,2500.00,5.90,2026-10-16T08:00:00Z,2026-10-17T18:00:00Z
DEST-STOCK-02,Stockton Pre-Cut Salads,FOOD_SERVICE_PROCESSOR,1200 Industrial Way,Stockton,CA,95205,37.9577,-121.2908,2,true,SPN-01,ORD-STK-SPN-02,2000.00,3.60,2026-10-16T06:00:00Z,2026-10-17T14:00:00Z
DEST-MOD-03,Modesto Discount Hub,DISCOUNT_CHAIN,800 S 9th St,Modesto,CA,95351,37.6391,-120.9969,1,true,ORG-01,ORD-MOD-ORG-03,4000.00,1.90,2026-10-18T08:00:00Z,2026-10-19T20:00:00Z`,
      };

    case "transport":
      return {
        filename: "freshroute_transport_routes_template.csv",
        content: `routeCode,originWarehouseCode,destinationRegion,carrierName,vehicleType,maxWeightCapacityKg,fixedTripCostUsd,variableCostPerKgUsd,transitDurationHours,handlingDurationHours,departureTime,estimatedArrivalTime
RT-SAL-SAC-04,DC-SALINAS,Sacramento Valley,Valley Reefer Express,REEFER_53FT_MULTI_ZONE,14000.00,420.00,0.095,3.25,0.50,2026-10-16T04:00:00Z,2026-10-16T07:45:00Z
RT-FRE-SAC-05,DC-FRESNO,Sacramento Valley,NorCal Intermodal Reefer,REEFER_HEAVY_TRUCK,18000.00,480.00,0.105,3.75,0.75,2026-10-16T05:00:00Z,2026-10-16T09:30:00Z`,
      };
  }
}

/**
 * Basic CSV parser supporting quotes, trimmed headers, and row splitting
 */
export function parseRawCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header line and at least one data row");
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
  const [warehouses, commodities] = await Promise.all([
    db.query<any>(`SELECT id, code FROM "Warehouse" WHERE "organizationId" = $1;`, [organizationId]),
    db.query<any>(`SELECT id, code FROM "Commodity" WHERE "organizationId" = $1;`, [organizationId]),
  ]);

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

        // Check foreign key references
        const whId = whMap.get(data.warehouseCode.toUpperCase());
        const cmdId = cmdMap.get(data.commodityCode.toUpperCase());

        if (!whId) {
          errors.push({
            rowNumber: rowNum,
            field: "warehouseCode",
            message: `Warehouse with code '${data.warehouseCode}' does not exist`,
            rawData: raw,
          });
          continue;
        }
        if (!cmdId) {
          errors.push({
            rowNumber: rowNum,
            field: "commodityCode",
            message: `Commodity with code '${data.commodityCode}' does not exist`,
            rawData: raw,
          });
          continue;
        }

        // Check if batchCode already exists in database
        const dupCheck = await db.query(
          `SELECT id FROM "InventoryBatch" WHERE "batchCode" = $1 AND "organizationId" = $2;`,
          [data.batchCode, organizationId]
        );
        if (dupCheck.rows.length > 0) {
          errors.push({
            rowNumber: rowNum,
            field: "batchCode",
            message: `Batch code '${data.batchCode}' already exists in database`,
            rawData: raw,
          });
          continue;
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

        const cmdId = cmdMap.get(data.commodityCode.toUpperCase());
        if (!cmdId) {
          errors.push({
            rowNumber: rowNum,
            field: "commodityCode",
            message: `Commodity with code '${data.commodityCode}' does not exist`,
            rawData: raw,
          });
          continue;
        }

        const dupCheck = await db.query(
          `SELECT id FROM "DestinationDemand" WHERE "orderNumber" = $1 AND "organizationId" = $2;`,
          [data.orderNumber, organizationId]
        );
        if (dupCheck.rows.length > 0) {
          errors.push({
            rowNumber: rowNum,
            field: "orderNumber",
            message: `Order number '${data.orderNumber}' already exists in database`,
            rawData: raw,
          });
          continue;
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

        const whId = whMap.get(data.originWarehouseCode.toUpperCase());
        if (!whId) {
          errors.push({
            rowNumber: rowNum,
            field: "originWarehouseCode",
            message: `Warehouse with code '${data.originWarehouseCode}' does not exist`,
            rawData: raw,
          });
          continue;
        }

        const dupCheck = await db.query(
          `SELECT id FROM "Route" WHERE "routeCode" = $1 AND "organizationId" = $2;`,
          [data.routeCode, organizationId]
        );
        if (dupCheck.rows.length > 0) {
          errors.push({
            rowNumber: rowNum,
            field: "routeCode",
            message: `Route code '${data.routeCode}' already exists in database`,
            rawData: raw,
          });
          continue;
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

          // 2. Create demand order
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
        } else if (templateType === "transport") {
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
