import { NextRequest, NextResponse } from "next/server";
import { generateDistributionPlan } from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json().catch(() => ({}));

    const warehouseId = body.warehouseId || undefined;
    const targetDate = body.targetDate || undefined;
    const config = body.config || undefined;

    const result = await generateDistributionPlan(orgId, {
      warehouseId,
      targetDate,
      config,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate distribution plan" },
      { status: 400 }
    );
  }
}
