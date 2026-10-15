/**
 * FreshRoute Server Services - Scenario Lab & Simulation Service
 * Manages persisted What-If scenarios, input override execution, differential comparisons,
 * and deterministic sensitivity analysis sweeps against immutable base plans.
 */

import { getPgLite, initPgLiteSchema } from "../db/pglite";
import {
  applyScenarioOverrides,
  executeScenarioRun,
  runSensitivityAnalysis,
  ScenarioComparisonDeltas,
  ScenarioEvaluationResult,
  ScenarioOverrides,
  SensitivityParameter,
  SensitivityResult,
} from "@/engine/scenario-engine";
import { EnginePlanOutput, EnginePlannerInput } from "@/engine/contracts";
import { DEMO_ORGANIZATION_ID } from "./data-foundation.service";
import { getDistributionPlanById } from "./planning.service";

export interface PersistedScenarioSummary {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  basePlanId: string;
  basePlanNumber?: string;
  transitDelayHours: number;
  temperatureDeltaCelsius: number;
  demandMultiplierPercent: number;
  fuelCostMultiplierPercent: number;
  simulatedProfitDeltaUsd: number;
  simulatedSpoilageDeltaKg: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  overrides?: ScenarioOverrides;
  deltas?: ScenarioComparisonDeltas;
}

/**
 * Ensures schema extensions on Scenario table exist for storing rich JSON results.
 */
async function ensureScenarioSchemaExtensions(db: any): Promise<void> {
  await db.exec(`
    ALTER TABLE "Scenario" ADD COLUMN IF NOT EXISTS "overridesJson" TEXT;
    ALTER TABLE "Scenario" ADD COLUMN IF NOT EXISTS "snapshotHash" TEXT;
    ALTER TABLE "Scenario" ADD COLUMN IF NOT EXISTS "metricsJson" TEXT;
    ALTER TABLE "Scenario" ADD COLUMN IF NOT EXISTS "diffJson" TEXT;
  `);
}

/**
 * Executes and persists a What-If scenario against a saved immutable base distribution plan.
 */
export async function createAndRunScenario(
  organizationId: string,
  params: {
    basePlanId?: string;
    name: string;
    description: string;
    overrides: ScenarioOverrides;
  }
): Promise<ScenarioEvaluationResult> {
  const db = await getPgLite();
  await initPgLiteSchema(db);
  await ensureScenarioSchemaExtensions(db);

  // 1. Locate Target Base Plan
  let targetPlanId = params.basePlanId;
  if (!targetPlanId) {
    const latestPlanQuery = await db.query<any>(
      `
      SELECT id 
      FROM "DistributionPlan" 
      WHERE "organizationId" = $1 
      ORDER BY "createdAt" DESC 
      LIMIT 1;
    `,
      [organizationId]
    );

    if (latestPlanQuery.rows.length === 0) {
      throw new Error(
        "No distribution plan found. Please generate a base distribution plan before simulating scenarios."
      );
    }
    targetPlanId = latestPlanQuery.rows[0].id;
  }

  const basePlanDetail = await getDistributionPlanById(organizationId, targetPlanId!);
  if (!basePlanDetail) {
    throw new Error(`Base distribution plan not found: ${targetPlanId}`);
  }

  if (!basePlanDetail.snapshot?.snapshotJson) {
    throw new Error(
      `Plan snapshot missing for plan ${basePlanDetail.planNumber}. Cannot reconstruct immutable base inputs.`
    );
  }

  // 2. Reconstruct Pure Domain Inputs and Outputs
  const parsedSnapshot = JSON.parse(basePlanDetail.snapshot.snapshotJson);
  const baseInput: EnginePlannerInput = parsedSnapshot.input;
  const baseEnginePlan: EnginePlanOutput =
    parsedSnapshot.evaluationRun?.freshRoutePlan || basePlanDetail.evaluationRun?.freshRoutePlan;

  if (!baseInput || !baseEnginePlan) {
    throw new Error("Unable to reconstruct input contracts or solved plan from base snapshot.");
  }

  // 3. Execute Pure TypeScript Scenario Lab Run
  const scenarioId = `scen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const scenarioResult = executeScenarioRun(
    basePlanDetail.id,
    baseEnginePlan,
    baseInput,
    params.overrides,
    {
      name: params.name,
      description: params.description,
      scenarioId,
    }
  );

  // 4. Persist to Scenario Table
  const overridesJson = JSON.stringify(params.overrides);
  const metricsJson = JSON.stringify(scenarioResult.deltas);
  const diffJson = JSON.stringify({
    allocationDiffs: scenarioResult.allocationDiffs,
    newlyInfeasibleDeliveries: scenarioResult.newlyInfeasibleDeliveries,
    urgencyMigrations: scenarioResult.urgencyMigrations,
  });

  await db.query(
    `
    INSERT INTO "Scenario" (
      id,
      "organizationId",
      name,
      description,
      "basePlanId",
      "transitDelayHours",
      "temperatureDeltaCelsius",
      "demandMultiplierPercent",
      "fuelCostMultiplierPercent",
      "simulatedProfitDeltaUsd",
      "simulatedSpoilageDeltaKg",
      status,
      "overridesJson",
      "snapshotHash",
      "metricsJson",
      "diffJson",
      "createdAt",
      "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'EVALUATED', $12, $13, $14, $15, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      "simulatedProfitDeltaUsd" = EXCLUDED."simulatedProfitDeltaUsd",
      "simulatedSpoilageDeltaKg" = EXCLUDED."simulatedSpoilageDeltaKg",
      "overridesJson" = EXCLUDED."overridesJson",
      "metricsJson" = EXCLUDED."metricsJson",
      "diffJson" = EXCLUDED."diffJson",
      status = 'EVALUATED',
      "updatedAt" = NOW();
  `,
    [
      scenarioId,
      organizationId,
      params.name,
      params.description,
      basePlanDetail.id,
      params.overrides.transitDelayHours || 0,
      params.overrides.storageTempIncreaseCelsius || 0,
      params.overrides.demandMultiplierPercent !== undefined ? params.overrides.demandMultiplierPercent : 100,
      100,
      scenarioResult.deltas.netProfitDeltaUsd,
      scenarioResult.deltas.spoilageKgDelta,
      overridesJson,
      scenarioResult.scenarioSnapshotHash,
      metricsJson,
      diffJson,
    ]
  );

  return scenarioResult;
}

/**
 * Lists all saved What-If scenarios for an organization.
 */
export async function listScenarios(
  organizationId: string
): Promise<PersistedScenarioSummary[]> {
  const db = await getPgLite();
  await initPgLiteSchema(db);
  await ensureScenarioSchemaExtensions(db);

  const query = await db.query<any>(
    `
    SELECT 
      s.id,
      s."organizationId",
      s.name,
      s.description,
      s."basePlanId",
      p."planNumber" as "basePlanNumber",
      s."transitDelayHours",
      s."temperatureDeltaCelsius",
      s."demandMultiplierPercent",
      s."fuelCostMultiplierPercent",
      s."simulatedProfitDeltaUsd",
      s."simulatedSpoilageDeltaKg",
      s.status,
      s."overridesJson",
      s."metricsJson",
      s."createdAt",
      s."updatedAt"
    FROM "Scenario" s
    LEFT JOIN "DistributionPlan" p ON s."basePlanId" = p.id
    WHERE s."organizationId" = $1
    ORDER BY s."createdAt" DESC;
  `,
    [organizationId]
  );

  return query.rows.map((r) => {
    let overrides: ScenarioOverrides | undefined;
    let deltas: ScenarioComparisonDeltas | undefined;

    try {
      if (r.overridesJson) overrides = JSON.parse(r.overridesJson);
      if (r.metricsJson) deltas = JSON.parse(r.metricsJson);
    } catch {
      // Ignore JSON parse errors on legacy rows
    }

    return {
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      description: r.description,
      basePlanId: r.basePlanId,
      basePlanNumber: r.basePlanNumber,
      transitDelayHours: Number(r.transitDelayHours || 0),
      temperatureDeltaCelsius: Number(r.temperatureDeltaCelsius || 0),
      demandMultiplierPercent: Number(r.demandMultiplierPercent || 100),
      fuelCostMultiplierPercent: Number(r.fuelCostMultiplierPercent || 100),
      simulatedProfitDeltaUsd: Number(r.simulatedProfitDeltaUsd || 0),
      simulatedSpoilageDeltaKg: Number(r.simulatedSpoilageDeltaKg || 0),
      status: r.status,
      overrides,
      deltas,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    };
  });
}

/**
 * Retrieves full details of a saved scenario by ID.
 */
export async function getScenarioById(
  organizationId: string,
  scenarioId: string
): Promise<ScenarioEvaluationResult | null> {
  const db = await getPgLite();
  await initPgLiteSchema(db);
  await ensureScenarioSchemaExtensions(db);

  const query = await db.query<any>(
    `
    SELECT *
    FROM "Scenario"
    WHERE "organizationId" = $1 AND id = $2
    LIMIT 1;
  `,
    [organizationId, scenarioId]
  );

  if (query.rows.length === 0) return null;
  const row = query.rows[0];

  const overrides: ScenarioOverrides = row.overridesJson ? JSON.parse(row.overridesJson) : {};
  const deltas: ScenarioComparisonDeltas = row.metricsJson ? JSON.parse(row.metricsJson) : ({} as any);
  const diffs = row.diffJson ? JSON.parse(row.diffJson) : {};

  return {
    scenarioId: row.id,
    name: row.name,
    description: row.description,
    basePlanId: row.basePlanId,
    executionTimestamp: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    engineVersion: "v1.0.0-fefo",
    evaluatorVersion: "v1.0.0-fefo",
    baseSnapshotHash: row.snapshotHash || "N/A",
    scenarioSnapshotHash: row.snapshotHash || "N/A",
    overrides,
    scenarioRun: {} as any,
    deltas,
    allocationDiffs: diffs.allocationDiffs || [],
    newlyInfeasibleDeliveries: diffs.newlyInfeasibleDeliveries || [],
    urgencyMigrations: diffs.urgencyMigrations || [],
    governance: {
      basePlanPreserved: true,
      deterministicMethodology: "Deterministic What-If scenario execution against immutable plan snapshot.",
      disclaimer: "Deterministic Scenario Simulation: Results represent mathematical optimizations across isolated parameter modifications.",
    },
  };
}

/**
 * Executes a deterministic sensitivity analysis sweep across a specified parameter.
 */
export async function runSensitivitySweep(
  organizationId: string,
  params: {
    basePlanId?: string;
    parameter: SensitivityParameter;
    rangeValues?: number[];
    baseOverrides?: ScenarioOverrides;
  }
): Promise<SensitivityResult> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  let targetPlanId = params.basePlanId;
  if (!targetPlanId) {
    const latest = await db.query<any>(
      `SELECT id FROM "DistributionPlan" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1;`,
      [organizationId]
    );
    if (latest.rows.length === 0) {
      throw new Error("No distribution plan found for sensitivity analysis.");
    }
    targetPlanId = latest.rows[0].id;
  }

  const basePlanDetail = await getDistributionPlanById(organizationId, targetPlanId!);
  if (!basePlanDetail || !basePlanDetail.snapshot?.snapshotJson) {
    throw new Error(`Base plan snapshot missing for plan ${targetPlanId}`);
  }

  const parsedSnapshot = JSON.parse(basePlanDetail.snapshot.snapshotJson);
  const baseInput: EnginePlannerInput = parsedSnapshot.input;
  const baseEnginePlan: EnginePlanOutput =
    parsedSnapshot.evaluationRun?.freshRoutePlan || basePlanDetail.evaluationRun?.freshRoutePlan;

  const defaultRanges: Record<SensitivityParameter, number[]> = {
    transitDelayPercent: [0, 20, 40, 60, 80, 100],
    shelfLifeReductionPercent: [0, 10, 20, 30, 40, 50],
    demandMultiplierPercent: [100, 90, 80, 70, 60, 50],
    capacityMultiplierPercent: [100, 90, 80, 70, 60, 50],
    priceMultiplierPercent: [100, 90, 80, 70, 60, 50],
  };

  const range = params.rangeValues || defaultRanges[params.parameter] || [0, 25, 50, 75, 100];

  return runSensitivityAnalysis(
    baseInput,
    baseEnginePlan,
    params.parameter,
    range,
    params.baseOverrides || {}
  );
}

/**
 * Deletes a scenario record.
 */
export async function deleteScenario(organizationId: string, scenarioId: string): Promise<boolean> {
  const db = await getPgLite();
  await initPgLiteSchema(db);
  const res = await db.query(
    `DELETE FROM "Scenario" WHERE "organizationId" = $1 AND id = $2;`,
    [organizationId, scenarioId]
  );
  return (res.affectedRows || 0) > 0;
}
