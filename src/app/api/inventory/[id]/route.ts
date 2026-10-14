import { NextRequest, NextResponse } from "next/server";
import { UpdateInventoryBatchSchema } from "@/server/db/schema.zod";
import {
  getInventoryBatchById,
  updateInventoryBatch,
} from "@/server/services/inventory.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const result = await getInventoryBatchById(orgId, id);
    if (!result) {
      return NextResponse.json(
        { error: `Batch with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch batch details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = UpdateInventoryBatchSchema.safeParse(body);
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
    const updated = await updateInventoryBatch(orgId, id, {
      qualityGrade: data.qualityGrade,
      storageTempCelsius: data.storageTempCelsius,
      unitCost: data.unitCost,
      basePrice: data.basePrice,
      expiryDate: data.expiryDate,
      status: data.status,
      availableQuantity: data.availableQuantity,
      reservedQuantity: data.reservedQuantity,
      dispatchedQuantity: data.dispatchedQuantity,
      spoiledQuantity: data.spoiledQuantity,
      reason: body.reason,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update inventory batch" },
      { status: 422 }
    );
  }
}
