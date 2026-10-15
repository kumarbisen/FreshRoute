import { NextRequest, NextResponse } from "next/server";
import { evaluatePlanDiscounts } from "@/server/services/discount.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json().catch(() => ({}));

    const planId = body.planId || undefined;
    const options = body.options || {};

    const result = await evaluatePlanDiscounts(orgId, planId, options);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to evaluate discount opportunities" },
      { status: 400 }
    );
  }
}
