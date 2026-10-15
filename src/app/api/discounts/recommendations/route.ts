import { NextRequest, NextResponse } from "next/server";
import { listDiscountRecommendations } from "@/server/services/discount.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const status = searchParams.get("status") || undefined;
    const batchId = searchParams.get("batchId") || undefined;

    const recommendations = await listDiscountRecommendations(orgId, { status, batchId });
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch discount recommendations" },
      { status: 500 }
    );
  }
}
