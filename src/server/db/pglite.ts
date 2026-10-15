import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

// Global cache for development / test hot reload
const globalForPgLite = globalThis as unknown as {
  pgliteInstance: PGlite | undefined;
  pgliteInitialized: boolean | undefined;
};

let dbInstance: PGlite | null = globalForPgLite.pgliteInstance ?? null;
let isInitialized = globalForPgLite.pgliteInitialized ?? false;
let isSeeding = false;

/**
 * Get or create the singleton embedded PGlite PostgreSQL WASM instance.
 */
export async function getPgLite(dataDir?: string): Promise<PGlite> {
  if (!dbInstance) {
    // If a persistent data directory is provided or configured, use it, otherwise in-memory
    const targetPath = dataDir || (process.env.PGLITE_DATA_DIR ? path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR) : undefined);
    dbInstance = new PGlite(targetPath);
    globalForPgLite.pgliteInstance = dbInstance;
  }
  return dbInstance;
}

/**
 * Initializes the schema by applying the Prisma DDL migration script.
 */
export async function initPgLiteSchema(db?: PGlite): Promise<void> {
  const client = db || (await getPgLite());
  
  // Check if tables already exist
  const checkResult = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Organization'
    ) as exists;
  `);

  if (!checkResult.rows[0]?.exists) {
    // Load migration DDL
    const migrationPath = path.resolve(
      process.cwd(),
      "prisma/migrations/20261014000000_init/migration.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration SQL not found at ${migrationPath}`);
    }

    let migrationSql = fs.readFileSync(migrationPath, "utf8");
    // Ensure UTF-8 BOM is stripped if present
    if (migrationSql.charCodeAt(0) === 0xfeff) {
      migrationSql = migrationSql.slice(1);
    }

    try {
      await client.exec(migrationSql);
    } catch (migErr: any) {
      if (!migErr.message?.includes("already exists")) {
        throw migErr;
      }
    }
  }

  isInitialized = true;
  globalForPgLite.pgliteInitialized = true;

  // Auto-seed canonical baseline demo data if database has no organizations yet (and not in test mode, and not currently seeding)
  if (
    !isSeeding &&
    process.env.NODE_ENV !== "test" &&
    process.env.ENABLE_DEMO_DATA_SEEDING !== "false"
  ) {
    isSeeding = true;
    try {
      const orgCountRes = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM "Organization";`
      );
      const count = parseInt(orgCountRes.rows[0]?.count || "0", 10);
      if (count === 0) {
        const { seedDemoDataset } = await import("../services/data-foundation.service");
        const { seedMofpiCompleteDataset } = await import("../services/mofpi-data.service");
        await seedDemoDataset();
        await seedMofpiCompleteDataset("org-freshroute-demo");
      }
    } catch (seedErr) {
      console.warn("Auto-seeding initial dataset skipped/failed:", seedErr);
    } finally {
      isSeeding = false;
    }
  }
}

/**
 * Resets the public schema by dropping all tables and re-applying migration DDL.
 */
export async function resetPgLiteDatabase(db?: PGlite): Promise<void> {
  const client = db || (await getPgLite());
  await client.exec(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
  isInitialized = false;
  globalForPgLite.pgliteInitialized = false;
  await initPgLiteSchema(client);
}

/**
 * Helper to close and teardown PGlite database
 */
export async function closePgLite(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    isInitialized = false;
    globalForPgLite.pgliteInstance = undefined;
    globalForPgLite.pgliteInitialized = undefined;
  }
}
