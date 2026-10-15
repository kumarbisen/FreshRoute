import { NextRequest, NextResponse } from "next/server";
import { updateDiscountRecommendationStatus } from "@/server/services/discount.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const action = body.action as "APPROVE" | "REJECT" | "DEFER";
    if (!action || !["APPROVE", "REJECT", "DEFER"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action ('APPROVE', 'REJECT', or 'DEFER') is required." },
        { status: 400 }
      );
    }

    const updated = await updateDiscountRecommendationStatus(
      orgId,
      id,
      action,
      body.reasonNote || body.reason
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update discount recommendation status" },
      { status: 400 }
    );
  }
}
