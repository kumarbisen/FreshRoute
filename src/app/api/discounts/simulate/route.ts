import { NextRequest, NextResponse } from "next/server";
import { simulatePlanWithDiscounts } from "@/server/services/discount.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const planId = body.planId;
    if (!planId) {
      return NextResponse.json(
        { error: "planId is required for discount simulation" },
        { status: 400 }
      );
    }

    const approvedRecommendations = body.approvedRecommendations || [];

    const result = await simulatePlanWithDiscounts(orgId, planId, approvedRecommendations);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to simulate plan with discounts" },
      { status: 400 }
    );
  }
}
