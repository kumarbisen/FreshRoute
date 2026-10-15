import Decimal from "decimal.js";
import { getPgLite, initPgLiteSchema } from "../db/pglite";
import {
  evaluatePlanDiscountOpportunities,
  simulatePlanWithApprovedDiscounts,
  BatchDiscountRecommendation,
  DiscountEngineOptions,
  DiscountOpportunityEvaluationResult,
  SimulatedDiscountPlanResult,
} from "@/engine/discount-engine";
import { EnginePlanOutput, EnginePlannerInput } from "@/engine/contracts";
import { DEMO_ORGANIZATION_ID } from "./data-foundation.service";
import { getDistributionPlanById } from "./planning.service";

export interface PersistedDiscountRecord {
  id: string;
  organizationId: string;
  batchId: string;
  batchCode: string;
  commodityId: string;
  commodityName: string;
  destinationId: string;
  destinationCode: string;
  destinationName: string;
  suggestedDiscountPercent: number;
  originalPricePerUnit: number;
  discountedPricePerUnit: number;
  quantityKg: number;
  estimatedDisposalLossAvoided: number;
  projectedGrossMarginUsd: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  reasonExplanation: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluates explainable dynamic discount opportunities for a saved distribution plan.
 * Persists actionable recommendations to the database.
 */
export async function evaluatePlanDiscounts(
  organizationId: string,
  planId?: string,
  options: DiscountEngineOptions = {}
): Promise<{
  planId: string;
  planNumber: string;
  evaluationResult: DiscountOpportunityEvaluationResult;
}> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  // 1. Locate Plan
  let targetPlanId = planId;
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
      throw new Error("No distribution plan found. Please generate a distribution plan before evaluating discounts.");
    }
    targetPlanId = latestPlanQuery.rows[0].id;
  }

  const planDetail = await getDistributionPlanById(organizationId, targetPlanId!);
  if (!planDetail) {
    throw new Error(`Distribution plan not found: ${targetPlanId}`);
  }

  if (!planDetail.snapshot?.snapshotJson) {
    throw new Error(`Plan snapshot data missing for plan ${planDetail.planNumber}`);
  }

  const parsedSnapshot = JSON.parse(planDetail.snapshot.snapshotJson);
  const input: EnginePlannerInput = parsedSnapshot.input;
  const enginePlan: EnginePlanOutput =
    parsedSnapshot.evaluationRun?.freshRoutePlan || planDetail.evaluationRun?.freshRoutePlan;

  if (!input || !enginePlan) {
    throw new Error("Unable to reconstruct input contracts or solved plan from snapshot.");
  }

  // 2. Execute Pure TypeScript Discount Engine
  const evaluationResult = evaluatePlanDiscountOpportunities(enginePlan, input, options);

  // 3. Persist Active Recommended Discounts to DiscountRecommendation Table
  for (const rec of evaluationResult.recommendations) {
    if (rec.isDiscountRecommended && rec.targetDestinationId && rec.estimatedSalesKg > 0) {
      const discId = `disc-${planDetail.id}-${rec.batchId}`;

      await db.query(
        `
        INSERT INTO "DiscountRecommendation" (
          id,
          "organizationId",
          "batchId",
          "destinationId",
          "suggestedDiscountPercent",
          "originalPricePerUnit",
          "discountedPricePerUnit",
          "quantityKg",
          "estimatedDisposalLossAvoided",
          "projectedGrossMarginUsd",
          status,
          "reasonExplanation",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          "suggestedDiscountPercent" = EXCLUDED."suggestedDiscountPercent",
          "originalPricePerUnit" = EXCLUDED."originalPricePerUnit",
          "discountedPricePerUnit" = EXCLUDED."discountedPricePerUnit",
          "quantityKg" = EXCLUDED."quantityKg",
          "estimatedDisposalLossAvoided" = EXCLUDED."estimatedDisposalLossAvoided",
          "projectedGrossMarginUsd" = EXCLUDED."projectedGrossMarginUsd",
          "reasonExplanation" = EXCLUDED."reasonExplanation",
          "updatedAt" = NOW();
      `,
        [
          discId,
          organizationId,
          rec.batchId,
          rec.targetDestinationId,
          rec.proposedDiscountPercent,
          rec.referencePricePerKgUsd,
          rec.proposedSellingPricePerKgUsd,
          rec.estimatedSalesKg,
          rec.estimatedDisposalLossAvoidedUsd,
          rec.netEconomicImpactUsd,
          rec.reasonExplanation,
        ]
      );
    }
  }

  return {
    planId: planDetail.id,
    planNumber: planDetail.planNumber,
    evaluationResult,
  };
}

/**
 * Lists persisted discount recommendations with joined batch, commodity, and destination metadata.
 */
export async function listDiscountRecommendations(
  organizationId: string,
  params: { status?: string; batchId?: string } = {}
): Promise<PersistedDiscountRecord[]> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  let statusFilter = "";
  if (params.status && params.status !== "ALL") {
    statusFilter = `AND dr.status = '${params.status}'`;
  }

  let batchFilter = "";
  if (params.batchId) {
    batchFilter = `AND dr."batchId" = '${params.batchId}'`;
  }

  const query = await db.query<any>(
    `
    SELECT 
      dr.id,
      dr."organizationId",
      dr."batchId",
      b."batchCode",
      b."commodityId",
      c.name as "commodityName",
      dr."destinationId",
      dest.code as "destinationCode",
      dest.name as "destinationName",
      dr."suggestedDiscountPercent",
      dr."originalPricePerUnit",
      dr."discountedPricePerUnit",
      dr."quantityKg",
      dr."estimatedDisposalLossAvoided",
      dr."projectedGrossMarginUsd",
      dr.status,
      dr."reasonExplanation",
      dr."createdAt",
      dr."updatedAt"
    FROM "DiscountRecommendation" dr
    JOIN "InventoryBatch" b ON dr."batchId" = b.id
    JOIN "Commodity" c ON b."commodityId" = c.id
    JOIN "Destination" dest ON dr."destinationId" = dest.id
    WHERE dr."organizationId" = $1
      ${statusFilter}
      ${batchFilter}
    ORDER BY dr."updatedAt" DESC;
  `,
    [organizationId]
  );

  return query.rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    batchId: r.batchId,
    batchCode: r.batchCode,
    commodityId: r.commodityId,
    commodityName: r.commodityName,
    destinationId: r.destinationId,
    destinationCode: r.destinationCode,
    destinationName: r.destinationName,
    suggestedDiscountPercent: Number(r.suggestedDiscountPercent),
    originalPricePerUnit: Number(r.originalPricePerUnit),
    discountedPricePerUnit: Number(r.discountedPricePerUnit),
    quantityKg: Number(r.quantityKg),
    estimatedDisposalLossAvoided: Number(r.estimatedDisposalLossAvoided),
    projectedGrossMarginUsd: Number(r.projectedGrossMarginUsd),
    status: r.status,
    reasonExplanation: r.reasonExplanation,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  }));
}

/**
 * Updates discount recommendation status (APPROVE, REJECT, DEFER) with audit explanation note.
 */
export async function updateDiscountRecommendationStatus(
  organizationId: string,
  recommendationId: string,
  action: "APPROVE" | "REJECT" | "DEFER",
  reasonNote?: string
): Promise<PersistedDiscountRecord> {
  const db = await getPgLite();
  await initPgLiteSchema(db);

  let targetStatus = "PENDING";
  let explanationPrefix = "";

  if (action === "APPROVE") {
    targetStatus = "APPROVED";
    explanationPrefix = "[APPROVED by Merchandiser]: ";
  } else if (action === "REJECT") {
    targetStatus = "REJECTED";
    explanationPrefix = "[REJECTED by Merchandiser]: ";
  } else if (action === "DEFER") {
    targetStatus = "PENDING";
    explanationPrefix = "[DEFERRED for review]: ";
  }

  const existingRes = await db.query<any>(
    `
    SELECT id, "reasonExplanation" 
    FROM "DiscountRecommendation"
    WHERE id = $1 AND "organizationId" = $2;
  `,
    [recommendationId, organizationId]
  );

  if (existingRes.rows.length === 0) {
    throw new Error(`Discount recommendation not found: ${recommendationId}`);
  }

  const existingExplanation = existingRes.rows[0].reasonExplanation || "";
  const updatedExplanation = reasonNote
    ? `${explanationPrefix}${reasonNote} // Prior: ${existingExplanation}`
    : `${explanationPrefix}Action recorded on ${new Date().toLocaleDateString()} // Prior: ${existingExplanation}`;

  await db.query(
    `
    UPDATE "DiscountRecommendation"
    SET 
      status = $1,
      "reasonExplanation" = $2,
      "updatedAt" = NOW()
    WHERE id = $3 AND "organizationId" = $4;
  `,
    [targetStatus, updatedExplanation, recommendationId, organizationId]
  );

  const updatedList = await listDiscountRecommendations(organizationId, {
    batchId: undefined,
  });
  const updated = updatedList.find((r) => r.id === recommendationId);
  if (!updated) {
    throw new Error(`Failed to reload recommendation ${recommendationId}`);
  }

  return updated;
}

/**
 * Simulates applying approved discount recommendations to a plan.
 * Returns before vs after economic ledger metrics.
 */
export async function simulatePlanWithDiscounts(
  organizationId: string,
  planId: string,
  approvedRecommendations: BatchDiscountRecommendation[]
): Promise<SimulatedDiscountPlanResult> {
  const planDetail = await getDistributionPlanById(organizationId, planId);
  if (!planDetail) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const parsedSnapshot = JSON.parse(planDetail.snapshot!.snapshotJson);
  const input: EnginePlannerInput = parsedSnapshot.input;
  const enginePlan: EnginePlanOutput =
    parsedSnapshot.evaluationRun?.freshRoutePlan || planDetail.evaluationRun?.freshRoutePlan;

  return simulatePlanWithApprovedDiscounts(enginePlan, input, approvedRecommendations);
}
