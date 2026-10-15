import { NextRequest, NextResponse } from "next/server";
import { listDistributionPlans } from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const plans = await listDistributionPlans(orgId, limit);
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch distribution plans" },
      { status: 500 }
    );
  }
}
