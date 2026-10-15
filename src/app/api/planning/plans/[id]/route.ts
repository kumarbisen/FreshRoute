import { NextRequest, NextResponse } from "next/server";
import { getDistributionPlanById } from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const plan = await getDistributionPlanById(orgId, id);
    if (!plan) {
      return NextResponse.json(
        { error: `Distribution plan with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch distribution plan" },
      { status: 500 }
    );
  }
}
