import { NextRequest, NextResponse } from "next/server";
import { getPgLite, initPgLiteSchema } from "@/server/db/pglite";
import { DEMO_ORGANIZATION_ID } from "@/server/services/data-foundation.service";

export async function GET(req: NextRequest) {
  try {
    const db = await getPgLite();
    await initPgLiteSchema(db);

    const orgId = req.headers.get("x-organization-id") || DEMO_ORGANIZATION_ID;

    const result = await db.query<any>(
      `
      SELECT id, code, name, category, "standardShelfLifeDays", "minTempCelsius", "maxTempCelsius", "defaultPricePerUnit", "defaultCostPerUnit"
      FROM "Commodity"
      WHERE "organizationId" = $1
      ORDER BY name ASC;
    `,
      [orgId]
    );

    return NextResponse.json({
      commodities: result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        standardShelfLifeDays: Number(r.standardShelfLifeDays),
        minTempCelsius: Number(r.minTempCelsius),
        maxTempCelsius: Number(r.maxTempCelsius),
        defaultPricePerUnit: Number(r.defaultPricePerUnit),
        defaultCostPerUnit: Number(r.defaultCostPerUnit),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch commodities" }, { status: 500 });
  }
}
