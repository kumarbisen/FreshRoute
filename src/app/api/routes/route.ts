import { NextRequest, NextResponse } from "next/server";
import { CreateRouteSchema } from "@/server/db/schema.zod";
import { listTransportRoutes, createTransportRoute } from "@/server/services/transport.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const originWarehouseId = searchParams.get("originWarehouseId") || undefined;
    const destinationRegion = searchParams.get("destinationRegion") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "routeCode";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await listTransportRoutes(orgId, {
      originWarehouseId,
      destinationRegion,
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
      { error: error.message || "Failed to fetch transport routes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const parseResult = CreateRouteSchema.safeParse(body);
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
    const created = await createTransportRoute(orgId, {
      routeCode: data.routeCode,
      originWarehouseId: data.originWarehouseId,
      destinationRegion: data.destinationRegion,
      vehicleType: data.vehicleType,
      maxWeightCapacityKg: data.maxWeightCapacityKg,
      maxVolumeCapacityM3: data.maxVolumeCapacityM3,
      tempZoneMinCelsius: data.tempZoneMinCelsius,
      tempZoneMaxCelsius: data.tempZoneMaxCelsius,
      transitDurationHours: data.transitDurationHours,
      handlingDurationHours: data.handlingDurationHours,
      fixedTripCostUsd: data.fixedTripCost,
      variableCostPerKgUsd: data.variableCostPerKg,
      departureTime: data.departureTime,
      estimatedArrivalTime: data.estimatedArrivalTime,
      status: data.status,
      isDemo: data.isDemo,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create transport route" },
      { status: 422 }
    );
  }
}
