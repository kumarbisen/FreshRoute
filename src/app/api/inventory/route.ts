import { NextRequest, NextResponse } from "next/server";
import { CreateInventoryBatchSchema } from "@/server/db/schema.zod";
import {
  listInventoryBatches,
  createInventoryBatch,
  ShelfLifeRiskLevel,
} from "@/server/services/inventory.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const search = searchParams.get("search") || undefined;
    const commodityId = searchParams.get("commodityId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const status = searchParams.get("status") || undefined;
    const riskLevel = (searchParams.get("riskLevel") as ShelfLifeRiskLevel) || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "expiryDate";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await listInventoryBatches(orgId, {
      search,
      commodityId,
      warehouseId,
      status,
      riskLevel,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory batches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = CreateInventoryBatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const created = await createInventoryBatch(orgId, {
      warehouseId: data.warehouseId,
      commodityId: data.commodityId,
      batchCode: data.batchCode,
      harvestDate: data.harvestDate,
      receivedDate: data.receivedDate,
      expiryDate: data.expiryDate,
      initialQuantityKg: data.initialQuantity,
      unitCostUsd: data.unitCost,
      basePriceUsd: data.basePrice,
      qualityGrade: data.qualityGrade,
      storageTempCelsius: data.storageTempCelsius,
      isDemo: data.isDemo,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create inventory batch" },
      { status: 422 }
    );
  }
}
