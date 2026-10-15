import { NextRequest, NextResponse } from "next/server";
import { checkPlanningReadiness } from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const readiness = await checkPlanningReadiness(orgId, warehouseId);
    return NextResponse.json(readiness);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check planning readiness" },
      { status: 500 }
    );
  }
}
