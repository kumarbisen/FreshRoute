import { NextResponse } from "next/server";
import { getPgLite, initPgLiteSchema } from "@/server/db/pglite";

export async function GET() {
  const startTime = Date.now();
  try {
    const db = await getPgLite();
    await initPgLiteSchema(db);

    const pingResult = await db.query<{ ping: number }>("SELECT 1 as ping;");
    const isDbConnected = pingResult.rows[0]?.ping === 1;

    // Fetch entity metrics
    const [orgs, whs, batches, demands, routes, plans] = await Promise.all([
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Organization"`),
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Warehouse"`),
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "InventoryBatch"`),
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "DestinationDemand"`),
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "Route"`),
      db.query<{ count: number }>(`SELECT count(*)::int as count FROM "DistributionPlan"`),
    ]);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      database: isDbConnected ? "connected" : "disconnected",
      latencyMs,
      timestamp: new Date().toISOString(),
      version: "0.2.0",
      dataSummary: {
        organizations: orgs.rows[0]?.count ?? 0,
        warehouses: whs.rows[0]?.count ?? 0,
        inventoryBatches: batches.rows[0]?.count ?? 0,
        demands: demands.rows[0]?.count ?? 0,
        routes: routes.rows[0]?.count ?? 0,
        distributionPlans: plans.rows[0]?.count ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
