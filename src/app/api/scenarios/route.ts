import { NextRequest, NextResponse } from "next/server";
import { listScenarios } from "@/server/services/scenario.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const scenarios = await listScenarios(orgId);
    return NextResponse.json({ scenarios });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list scenarios" },
      { status: 500 }
    );
  }
}
