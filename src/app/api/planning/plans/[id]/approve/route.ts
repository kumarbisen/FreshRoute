import { NextRequest, NextResponse } from "next/server";
import { approveDistributionPlan } from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const result = await approveDistributionPlan(orgId, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to approve distribution plan" },
      { status: 400 }
    );
  }
}
