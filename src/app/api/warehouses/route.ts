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
      SELECT id, code, name, city, state, "totalCapacityKg", "coldStorageType"
      FROM "Warehouse"
      WHERE "organizationId" = $1
      ORDER BY name ASC;
    `,
      [orgId]
    );

    return NextResponse.json({
      warehouses: result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        city: r.city,
        state: r.state,
        totalCapacityKg: Number(r.totalCapacityKg),
        coldStorageType: r.coldStorageType,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch warehouses" }, { status: 500 });
  }
}
