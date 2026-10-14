import { NextRequest, NextResponse } from "next/server";
import { previewCsvUpload, CsvTemplateType } from "@/server/services/csv-import.service";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;
    
    // Support either FormData upload or raw JSON
    const contentType = req.headers.get("content-type") || "";
    let templateType: CsvTemplateType;
    let csvContent: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      templateType = (formData.get("type") as CsvTemplateType) || "inventory";
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded in form data" }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      const json = await req.json();
      templateType = json.type;
      csvContent = json.csvContent;
    }

    if (!templateType || !["inventory", "destinations-demand", "transport"].includes(templateType)) {
      return NextResponse.json(
        { error: `Invalid template type '${templateType}'. Must be 'inventory', 'destinations-demand', or 'transport'` },
        { status: 400 }
      );
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: "CSV content cannot be empty" }, { status: 400 });
    }

    const preview = await previewCsvUpload(orgId, templateType, csvContent);
    return NextResponse.json(preview);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to preview and validate CSV content" },
      { status: 422 }
    );
  }
}
