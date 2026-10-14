import { NextRequest, NextResponse } from "next/server";
import { CreateDestinationDemandSchema } from "@/server/db/schema.zod";
import { listDemands, createDemand } from "@/server/services/destinations.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const destinationId = searchParams.get("destinationId") || undefined;
    const commodityId = searchParams.get("commodityId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "deliveryWindowStart";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await listDemands(orgId, {
      destinationId,
      commodityId,
      status,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch demand orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = CreateDestinationDemandSchema.safeParse(body);
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
    const created = await createDemand(orgId, {
      destinationId: data.destinationId,
      commodityId: data.commodityId,
      orderNumber: data.orderNumber,
      requestedQuantityKg: data.requestedQuantity,
      contractedPricePerKg: data.contractedPricePerUnit,
      deliveryWindowStart: data.deliveryWindowStart,
      deliveryWindowEnd: data.deliveryWindowEnd,
      maxReceivingLimitKg: data.maxReceivingLimitKg,
      isDemo: data.isDemo,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create demand order" },
      { status: 422 }
    );
  }
}
