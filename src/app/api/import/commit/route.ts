import { NextRequest, NextResponse } from "next/server";
import { commitCsvImport, CsvTemplateType } from "@/server/services/csv-import.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    const body = await req.json();

    const { type, rows } = body as { type: CsvTemplateType; rows: any[] };

    if (!type || !["inventory", "destinations-demand", "transport"].includes(type)) {
      return NextResponse.json({ error: `Invalid template type '${type}'` }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No validated rows provided for commit" }, { status: 400 });
    }

    if (rows.length > 5000) {
      return NextResponse.json({ error: "Batch commit exceeds maximum limit of 5,000 rows" }, { status: 400 });
    }

    const result = await commitCsvImport(orgId, type, rows);

    const statusCode = result.failedCount > 0 ? 207 : 200; // Multi-Status or OK
    return NextResponse.json(result, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to commit CSV records" },
      { status: 500 }
    );
  }
}
