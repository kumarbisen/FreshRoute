import { NextRequest, NextResponse } from "next/server";
import { runSensitivitySweep } from "@/server/services/scenario.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";
import { SensitivityParameter } from "@/engine/scenario-engine";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const basePlanId = body.basePlanId;
    const parameter: SensitivityParameter = body.parameter || "transitDelayPercent";
    const rangeValues: number[] | undefined = body.rangeValues;
    const baseOverrides = body.baseOverrides;

    const result = await runSensitivitySweep(orgId, {
      basePlanId,
      parameter,
      rangeValues,
      baseOverrides,
    });

    return NextResponse.json({
      success: true,
      sensitivityResult: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute sensitivity sweep" },
      { status: 400 }
    );
  }
}
