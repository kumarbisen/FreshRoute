import { NextRequest, NextResponse } from "next/server";
import {
  exportDispatchManifestCsv,
  exportComparisonReportCsv,
  getDistributionPlanById,
} from "@/server/services/planning.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const exportType = searchParams.get("type") || "manifest"; // "manifest" | "comparison"

    const plan = await getDistributionPlanById(orgId, id);
    if (!plan) {
      return NextResponse.json(
        { error: `Distribution plan with ID '${id}' not found` },
        { status: 404 }
      );
    }

    let csvContent = "";
    let filename = "";

    if (exportType === "comparison") {
      csvContent = await exportComparisonReportCsv(orgId, id);
      filename = `freshroute-plan-${plan.planNumber}-comparison.csv`;
    } else {
      csvContent = await exportDispatchManifestCsv(orgId, id);
      filename = `freshroute-plan-${plan.planNumber}-manifest.csv`;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to export CSV report" },
      { status: 500 }
    );
  }
}
