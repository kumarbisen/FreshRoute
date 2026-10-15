import { NextRequest, NextResponse } from "next/server";
import { getPgLite, resetPgLiteDatabase } from "@/server/db/pglite";
import {
  seedDemoDataset,
  DEMO_ORGANIZATION_ID,
  DEMO_WAREHOUSE_SALINAS_ID,
} from "@/server/services/data-foundation.service";
import { seedMofpiCompleteDataset } from "@/server/services/mofpi-data.service";
import { generateDistributionPlan } from "@/server/services/planning.service";
import { evaluatePlanDiscounts } from "@/server/services/discount.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const db = await getPgLite();
    // 1. Reset database tables and schema
    await resetPgLiteDatabase(db);

    // 2. Seed canonical demo dataset (5 canonical edge cases) + complete MoFPI operational network from raw CSV
    await seedDemoDataset();
    await seedMofpiCompleteDataset(orgId);

    // 3. Generate initial canonical distribution plan for Salinas Coolport
    const { plan } = await generateDistributionPlan(orgId, {
      warehouseId: DEMO_WAREHOUSE_SALINAS_ID,
    });

    // 4. Evaluate initial discount recommendations for the plan
    await evaluatePlanDiscounts(orgId, plan.id);

    return NextResponse.json({
      success: true,
      message: "Competition demo environment successfully reset to canonical baseline state.",
      seededOrganizationId: orgId,
      initialPlanNumber: plan.planNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Demo reset failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset demo dataset" },
      { status: 500 }
    );
  }
}
