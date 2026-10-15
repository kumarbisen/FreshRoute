import { NextRequest, NextResponse } from "next/server";
import { createAndRunScenario } from "@/server/services/scenario.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const name = body.name || `Scenario ${new Date().toLocaleTimeString()}`;
    const description = body.description || "What-If operational simulation";
    const basePlanId = body.basePlanId;
    const overrides = body.overrides || {};

    const result = await createAndRunScenario(orgId, {
      basePlanId,
      name,
      description,
      overrides,
    });

    return NextResponse.json({
      success: true,
      scenario: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute scenario" },
      { status: 400 }
    );
  }
}
