import { NextRequest, NextResponse } from "next/server";
import { UpdateRouteSchema } from "@/server/db/schema.zod";
import { getTransportRouteById, updateTransportRoute } from "@/server/services/transport.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const result = await getTransportRouteById(orgId, id);
    if (!result) {
      return NextResponse.json(
        { error: `Route with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch route details" },
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

    const parseResult = UpdateRouteSchema.safeParse(body);
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
    const updated = await updateTransportRoute(orgId, id, {
      destinationRegion: data.destinationRegion,
      vehicleType: data.vehicleType,
      maxWeightCapacityKg: data.maxWeightCapacityKg,
      currentAvailableWeightKg: data.currentAvailableWeightKg,
      tempZoneMinCelsius: data.tempZoneMinCelsius,
      tempZoneMaxCelsius: data.tempZoneMaxCelsius,
      transitDurationHours: data.transitDurationHours,
      handlingDurationHours: data.handlingDurationHours,
      fixedTripCostUsd: data.fixedTripCost,
      variableCostPerKgUsd: data.variableCostPerKg,
      departureTime: data.departureTime,
      estimatedArrivalTime: data.estimatedArrivalTime,
      status: data.status,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update transport route" },
      { status: 422 }
    );
  }
}
