import { NextRequest, NextResponse } from "next/server";
import { getScenarioById, deleteScenario } from "@/server/services/scenario.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const scenario = await getScenarioById(orgId, id);
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch scenario" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const success = await deleteScenario(orgId, id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete scenario" },
      { status: 500 }
    );
  }
}
