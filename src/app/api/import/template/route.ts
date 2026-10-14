import { NextRequest, NextResponse } from "next/server";
import { getCsvSampleTemplate, CsvTemplateType } from "@/server/services/csv-import.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as CsvTemplateType) || "inventory";

    if (!["inventory", "destinations-demand", "transport"].includes(type)) {
      return NextResponse.json(
        { error: `Invalid CSV template type. Must be one of: 'inventory', 'destinations-demand', 'transport'` },
        { status: 400 }
      );
    }

    const { filename, content } = getCsvSampleTemplate(type);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate CSV template" }, { status: 500 });
  }
}
