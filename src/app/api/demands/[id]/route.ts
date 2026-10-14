import { NextRequest, NextResponse } from "next/server";
import { UpdateDestinationDemandSchema } from "@/server/db/schema.zod";
import { updateDemand } from "@/server/services/destinations.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = UpdateDestinationDemandSchema.safeParse(body);
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
    const updated = await updateDemand(orgId, id, {
      requestedQuantityKg: data.requestedQuantity,
      fulfilledQuantityKg: data.fulfilledQuantity,
      contractedPricePerKg: data.contractedPricePerUnit,
      deliveryWindowStart: data.deliveryWindowStart,
      deliveryWindowEnd: data.deliveryWindowEnd,
      status: data.status,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update demand order" },
      { status: 422 }
    );
  }
}
