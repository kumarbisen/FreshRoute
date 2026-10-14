import { NextRequest, NextResponse } from "next/server";
import { UpdateDestinationSchema } from "@/server/db/schema.zod";
import { getDestinationById, updateDestination } from "@/server/services/destinations.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const result = await getDestinationById(orgId, id);
    if (!result) {
      return NextResponse.json(
        { error: `Destination with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch destination details" },
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

    const parseResult = UpdateDestinationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await updateDestination(orgId, id, parseResult.data as any);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update destination" },
      { status: 422 }
    );
  }
}
