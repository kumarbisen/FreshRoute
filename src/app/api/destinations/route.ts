import { NextRequest, NextResponse } from "next/server";
import { CreateDestinationSchema } from "@/server/db/schema.zod";
import { listDestinations, createDestination } from "@/server/services/destinations.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const search = searchParams.get("search") || undefined;
    const tier = searchParams.get("tier") || undefined;
    const acceptsDiscountsParam = searchParams.get("acceptsDiscounts");
    const acceptsDiscounts =
      acceptsDiscountsParam !== null
        ? acceptsDiscountsParam === "true" || acceptsDiscountsParam === "1"
        : undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "name";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await listDestinations(orgId, {
      search,
      tier,
      acceptsDiscounts,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch destinations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = CreateDestinationSchema.safeParse(body);
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
    const created = await createDestination(orgId, {
      code: data.code,
      name: data.name,
      tier: data.tier,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      latitude: data.latitude,
      longitude: data.longitude,
      minShelfLifeDays: data.minShelfLifeDays,
      acceptsDiscounts: data.acceptsDiscounts,
      maxDiscountPercent: data.maxDiscountPercent,
      receivingHoursStart: data.receivingHoursStart,
      receivingHoursEnd: data.receivingHoursEnd,
      isDemo: data.isDemo,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create destination" },
      { status: 422 }
    );
  }
}
