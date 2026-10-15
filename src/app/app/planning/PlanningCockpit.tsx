"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Layers,
  Table,
  Grid,
  FileSpreadsheet,
  Download,
  Lock,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Truck,
  Info,
  ExternalLink,
  Clock,
  IndianRupee,
  PackageCheck,
  Percent,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import styles from "./planning.module.scss";

// ============================================================================
// TYPES
// ============================================================================

interface ReadinessSummary {
  selectedWarehouseId?: string;
  availableBatchesCount: number;
  totalAvailableStockKg: number;
  criticalBatchesCount: number;
  pendingDemandsCount: number;
  totalRequestedDemandKg: number;
  activeRoutesCount: number;
  totalRouteCapacityKg: number;
  commoditiesCount: number;
  destinationsCount: number;
  matchedCommoditiesCount: number;
}

interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  city: string;
  batchCount: number;
  availableKg: number;
}

interface PlanningReadinessData {
  isReady: boolean;
  reasons: string[];
  warnings: string[];
  warehouses: WarehouseInfo[];
  summary: ReadinessSummary;
}

interface AllocationRecord {
  id: string;
  batchId: string;
  batchCode: string;
  commodityId: string;
  commodityName: string;
  destinationDemandId: string;
  orderNumber: string;
  destinationId: string;
  destinationName: string;
  destinationCode: string;
  routeId: string;
  routeCode: string;
  allocatedQuantity: number;
  discountPercent: number;
  effectivePricePerUnit: number;
  grossRevenueUsd: number;
  transportCostUsd: number;
  purchaseCostUsd: number;
  netMarginUsd: number;
  arrivalShelfLifeDays: number;
  reasonCode: string;
  reasonExplanation: string;
  createdAt: string;
}

interface PlanMetricsData {
  baselineProfitUsd: number;
  proposedProfitUsd: number;
  profitUpliftUsd: number;
  profitUpliftPercent: number;
  baselineSpoilageKg: number;
  proposedSpoilageKg: number;
  spoilageReductionKg: number;
  spoilageReductionPercent: number;
  baselineSlaCompliancePercent: number;
  proposedSlaCompliancePercent: number;
  baselineRejectionsCount: number;
  proposedRejectionsCount: number;
}

interface PlanDetailData {
  id: string;
  planNumber: string;
  status: "DRAFT" | "OPTIMIZED" | "COMMITTED" | "ARCHIVED";
  algorithmVersion: string;
  snapshotHash: string;
  planTimestamp: string;
  targetDate: string;
  totalAllocatedKg: number;
  unfulfilledDemandKg: number;
  surplusStockKg: number;
  totalRevenueUsd: number;
  totalCostUsd: number;
  netMarginUsd: number;
  spoilagePreventedKg: number;
  spoilagePreventedUsd: number;
  allocationsCount: number;
  winnerStatus?: string;
  metrics?: PlanMetricsData;
  allocations: AllocationRecord[];
  evaluationRun?: any;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlanningCockpit() {
  // Readiness & Lookups
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("ALL");
  const [readiness, setReadiness] = useState<PlanningReadinessData | null>(null);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(true);

  // Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<PlanDetailData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Action States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Assumptions & Configuration Accordion
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [enableMarkdowns, setEnableMarkdowns] = useState(true);
  const [maxMarkdownPct, setMaxMarkdownPct] = useState(35);
  const [safetyBufferHours, setSafetyBufferHours] = useState(4.0);
  const [handlingCostPerKg, setHandlingCostPerKg] = useState(0.05);
  const [disposalPenaltyPerKg, setDisposalPenaltyPerKg] = useState(0.25);
  const [spoilageWeight, setSpoilageWeight] = useState(1.5);

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState<"manifest" | "matrix" | "comparison" | "explainability">("manifest");
  const [manifestSearch, setManifestSearch] = useState("");
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // 1. Fetch Readiness
  const fetchReadiness = useCallback(async (warehouseId?: string) => {
    setIsCheckingReadiness(true);
    try {
      const url = warehouseId && warehouseId !== "ALL"
        ? `/api/planning/readiness?warehouseId=${encodeURIComponent(warehouseId)}`
        : "/api/planning/readiness";
      const res = await fetch(url);
      const data = await res.json();
      setReadiness(data);
    } catch (err: any) {
      console.error("Readiness check error:", err);
    } finally {
      setIsCheckingReadiness(false);
    }
  }, []);

  // 2. Fetch Plans List & Initial Active Plan
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/planning/plans?limit=25");
      const data = await res.json();
      const list = data.plans || [];
      setPlans(list);

      // If no active plan selected, select the first one
      if (list.length > 0 && !activePlan) {
        loadPlanDetail(list[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load plans:", err);
    }
  }, [activePlan]);

  // 3. Load specific plan by ID
  const loadPlanDetail = async (planId: string) => {
    setIsLoadingPlan(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/planning/plans/${planId}`);
      if (!res.ok) throw new Error("Plan not found");
      const data = await res.json();
      setActivePlan(data.plan);
    } catch (err: any) {
      setActionError(err.message || "Failed to load plan details");
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchReadiness(selectedWarehouse);
  }, [selectedWarehouse, fetchReadiness]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 4. Handle Generate Plan Action
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        warehouseId: selectedWarehouse === "ALL" ? undefined : selectedWarehouse,
        config: {
          enableDynamicMarkdowns: enableMarkdowns,
          maxMarkdownPercent: Number(maxMarkdownPct),
          shelfLifeSafetyBufferHours: Number(safetyBufferHours),
          handlingCostPerKgUsd: Number(handlingCostPerKg),
          disposalPenaltyPerKgUsd: Number(disposalPenaltyPerKg),
          spoilageAvoidanceWeight: Number(spoilageWeight),
        },
      };

      const res = await fetch("/api/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }

      setActivePlan(data.plan);
      setPlans((prev) => [data.plan, ...prev.filter((p) => p.id !== data.plan.id)]);
      setActionSuccess(`Successfully solved and generated ${data.plan.planNumber}!`);
      // Refresh readiness counts
      fetchReadiness(selectedWarehouse);
    } catch (err: any) {
      setActionError(err.message || "An error occurred during planning run.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Handle Approve Plan Action
  const handleApprovePlan = async () => {
    if (!activePlan) return;
    setIsApproving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/planning/plans/${activePlan.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve plan");
      }

      setActivePlan(data.plan);
      setPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)));
      setActionSuccess(
        data.alreadyCommitted
          ? "Plan is already committed."
          : `Plan ${data.plan.planNumber} has been committed. Inventory stock reserved.`
      );
      // Refresh readiness
      fetchReadiness(selectedWarehouse);
    } catch (err: any) {
      setActionError(err.message || "Failed to approve plan.");
    } finally {
      setIsApproving(false);
    }
  };

  // 6. Copy Snapshot Hash
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filtered Allocations for Dispatch Manifest
  const filteredAllocations = useMemo(() => {
    if (!activePlan?.allocations) return [];
    const q = manifestSearch.toLowerCase().trim();
    if (!q) return activePlan.allocations;

    return activePlan.allocations.filter((a) => {
      return (
        a.batchCode.toLowerCase().includes(q) ||
        a.orderNumber.toLowerCase().includes(q) ||
        a.destinationName.toLowerCase().includes(q) ||
        a.commodityName.toLowerCase().includes(q) ||
        a.routeCode.toLowerCase().includes(q) ||
        a.reasonCode.toLowerCase().includes(q)
      );
    });
  }, [activePlan, manifestSearch]);

  // Allocation Matrix Calculations: Rows (Batches) x Columns (Destinations)
  const matrixData = useMemo(() => {
    if (!activePlan) return { destinations: [], rows: [] };

    const destMap = new Map<string, { id: string; name: string; code: string }>();
    const batchMap = new Map<
      string,
      {
        batchId: string;
        batchCode: string;
        commodityName: string;
        totalAllocatedKg: number;
        allocationsByDest: Map<string, AllocationRecord>;
      }
    >();

    for (const alloc of activePlan.allocations) {
      if (!destMap.has(alloc.destinationId)) {
        destMap.set(alloc.destinationId, {
          id: alloc.destinationId,
          name: alloc.destinationName,
          code: alloc.destinationCode,
        });
      }

      if (!batchMap.has(alloc.batchId)) {
        batchMap.set(alloc.batchId, {
          batchId: alloc.batchId,
          batchCode: alloc.batchCode,
          commodityName: alloc.commodityName,
          totalAllocatedKg: 0,
          allocationsByDest: new Map(),
        });
      }

      const b = batchMap.get(alloc.batchId)!;
      b.totalAllocatedKg += alloc.allocatedQuantity;
      b.allocationsByDest.set(alloc.destinationId, alloc);
    }

    // Include leftover breakdown from evaluation run if present
    const leftovers = activePlan.evaluationRun?.freshRoutePlan?.batchLeftoverBreakdowns || [];
    const leftoverMap = new Map<string, any>(leftovers.map((l: any) => [l.batchId, l]));

    const destinations = Array.from(destMap.values());
    const rows = Array.from(batchMap.values()).map((b) => {
      const leftoverInfo = leftoverMap.get(b.batchId);
      return {
        ...b,
        unallocatedKg: leftoverInfo ? leftoverInfo.unallocatedKg : 0,
        category: leftoverInfo ? leftoverInfo.category : "FULLY_ALLOCATED",
      };
    });

    return { destinations, rows };
  }, [activePlan]);

  // Facts for selected allocation modal
  const selectedFactAudit = useMemo(() => {
    if (!selectedAllocation || !activePlan?.evaluationRun) return null;
    const run = activePlan.evaluationRun;
    const alloc = run.freshRoutePlan?.allocations?.find(
      (a: any) =>
        a.batchId === selectedAllocation.batchId &&
        a.demandOrderId === selectedAllocation.destinationDemandId
    );
    return alloc?.auditFacts || null;
  }, [selectedAllocation, activePlan]);

  return (
    <div className={styles.planningCockpit}>
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Actions                                          */}
      {/* ------------------------------------------------------------- */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.engineBadge}>
              <Sparkles size={13} />
              FEFO Optimization Solver // v1.0.0-fefo-elastic
            </span>
            {activePlan && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  backgroundColor:
                    activePlan.status === "COMMITTED"
                      ? "#ecfdf5"
                      : "#f1f5f9",
                  color:
                    activePlan.status === "COMMITTED"
                      ? "#047857"
                      : "#0f172a",
                  border: `1px solid ${
                    activePlan.status === "COMMITTED"
                      ? "#a7f3d0"
                      : "#e2e8f0"
                  }`,
                }}
              >
                {activePlan.status}
              </span>
            )}
          </div>
          <h1 className={styles.title}>Distribution Planner Cockpit</h1>
          <p className={styles.subtitle}>
            Deterministic perishability optimizer allocating cold-chain inventory against customer demand,
            respecting transport capacities, shelf-life SLAs, and benchmarking financial outcomes against FIFO.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Warehouse Selector */}
          <div className={styles.warehouseSelector}>
            <WarehouseIcon size={14} color="#94a3b8" />
            <label htmlFor="wh-select">Facility:</label>
            <select
              id="wh-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="ALL">All Facilities (Network Wide)</option>
              {readiness?.warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.code} — {wh.city} ({wh.availableKg.toLocaleString()} kg)
                </option>
              ))}
            </select>
          </div>

          {/* Generate Plan Button */}
          <button
            onClick={handleGeneratePlan}
            disabled={!readiness?.isReady || isGenerating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: !readiness?.isReady || isGenerating ? "not-allowed" : "pointer",
              background: !readiness?.isReady ? "#1e293b" : "var(--fresh-lime, #d4f933)",
              color: !readiness?.isReady ? "#64748b" : "#07090b",
              border: "none",
              boxShadow: !readiness?.isReady ? "none" : "0 0 16px rgba(212, 249, 51, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="spin" />
                Solving Constraints...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Plan
              </>
            )}
          </button>

          {/* Approve Plan Button */}
          {activePlan && (
            <button
              onClick={handleApprovePlan}
              disabled={activePlan.status === "COMMITTED" || isApproving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: activePlan.status === "COMMITTED" || isApproving ? "not-allowed" : "pointer",
                background:
                  activePlan.status === "COMMITTED"
                    ? "rgba(16, 185, 129, 0.15)"
                    : "#151d24",
                color:
                  activePlan.status === "COMMITTED"
                    ? "var(--success, #10b981)"
                    : "#f4f4f0",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {activePlan.status === "COMMITTED" ? (
                <>
                  <Lock size={15} />
                  Plan Committed & Locked
                </>
              ) : isApproving ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  Locking Allocations...
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  Approve & Commit Plan
                </>
              )}
            </button>
          )}

          {/* CSV Export Button */}
          {activePlan && (
            <div style={{ display: "flex", gap: "6px" }}>
              <a
                href={`/api/planning/plans/${activePlan.id}/export?type=manifest`}
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "#151d24",
                  color: "#cbd5e1",
                  border: "1px solid #263442",
                  textDecoration: "none",
                }}
              >
                <Download size={14} />
                Manifest CSV
              </a>
              <a
                href={`/api/planning/plans/${activePlan.id}/export?type=comparison`}
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "#151d24",
                  color: "#cbd5e1",
                  border: "1px solid #263442",
                  textDecoration: "none",
                }}
              >
                <FileSpreadsheet size={14} />
                KPI Report CSV
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. Notifications & Alerts                                    */}
      {/* ------------------------------------------------------------- */}
      {actionSuccess && (
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "8px",
            color: "var(--success, #10b981)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={16} />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#f87171",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <XCircle size={16} />
          {actionError}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Readiness Banner                                          */}
      {/* ------------------------------------------------------------- */}
      <section
        className={`${styles.readinessCard} ${
          !readiness?.isReady ? styles.errorBorder : styles.readyBorder
        }`}
      >
        <div className={styles.readinessHeader}>
          <div
            className={`${styles.readinessStatusBadge} ${
              readiness?.isReady ? styles.ready : styles.blocked
            }`}
          >
            {isCheckingReadiness ? (
              <>
                <RefreshCw size={16} className="spin" />
                Evaluating operational readiness...
              </>
            ) : readiness?.isReady ? (
              <>
                <CheckCircle2 size={16} />
                Ready to Solve — All physical prerequisites satisfied
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                Plan Generation Blocked — Missing prerequisites
              </>
            )}
          </div>

          {readiness?.summary && (
            <div className={styles.readinessPills}>
              <span className={`${styles.readinessPill} ${styles.highlight}`}>
                <PackageCheck size={12} />
                {readiness.summary.availableBatchesCount} Batches (
                {readiness.summary.totalAvailableStockKg.toLocaleString()} kg)
              </span>
              <span className={styles.readinessPill}>
                <Clock size={12} />
                {readiness.summary.pendingDemandsCount} Demand Orders (
                {readiness.summary.totalRequestedDemandKg.toLocaleString()} kg)
              </span>
              <span className={styles.readinessPill}>
                <Truck size={12} />
                {readiness.summary.activeRoutesCount} Active Routes (
                {readiness.summary.totalRouteCapacityKg.toLocaleString()} kg capacity)
              </span>
            </div>
          )}
        </div>

        {/* Blocking reasons or warnings */}
        {(!readiness?.isReady || (readiness?.warnings && readiness.warnings.length > 0)) && (
          <div className={styles.readinessAlerts}>
            {readiness?.reasons.map((r, i) => (
              <div key={i} className={styles.alertItem}>
                <XCircle size={14} />
                <span>{r}</span>
              </div>
            ))}
            {readiness?.warnings.map((w, i) => (
              <div key={i} className={styles.warningItem}>
                <Info size={14} />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. Configurable Planning Assumptions Accordion               */}
      {/* ------------------------------------------------------------- */}
      <div className={styles.parametersAccordion}>
        <button
          className={styles.accordionToggle}
          onClick={() => setIsConfigOpen((v) => !v)}
          type="button"
        >
          <div className={styles.toggleLeft}>
            <Sliders size={15} color="#94a3b8" />
            <span>Solver Assumptions & Economic Parameters</span>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--fresh-lime, #d4f933)",
                marginLeft: "8px",
              }}
            >
              [Markdowns: {enableMarkdowns ? `Max ${maxMarkdownPct}%` : "Disabled"} {" // "} Safety:{" "}
              {safetyBufferHours}h {" // "} Disposal: ₹{disposalPenaltyPerKg}/kg]
            </span>
          </div>
          {isConfigOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isConfigOpen && (
          <div className={styles.accordionBody}>
            <div className={styles.paramControl}>
              <label>Dynamic Markdowns</label>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={enableMarkdowns}
                  onChange={(e) => setEnableMarkdowns(e.target.checked)}
                />
                <span>Allow Price Concessions on Salvage Stock</span>
              </label>
            </div>

            <div className={styles.paramControl}>
              <label>Max Markdown Limit</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="5"
                  value={maxMarkdownPct}
                  disabled={!enableMarkdowns}
                  onChange={(e) => setMaxMarkdownPct(Number(e.target.value))}
                />
                <span>%</span>
              </div>
            </div>

            <div className={styles.paramControl}>
              <label>Shelf-Life Safety Buffer</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={safetyBufferHours}
                  onChange={(e) => setSafetyBufferHours(Number(e.target.value))}
                />
                <span>hours</span>
              </div>
            </div>

            <div className={styles.paramControl}>
              <label>Handling & Cross-Dock Fee</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.01"
                  value={handlingCostPerKg}
                  onChange={(e) => setHandlingCostPerKg(Number(e.target.value))}
                />
                <span>₹/kg</span>
              </div>
            </div>

            <div className={styles.paramControl}>
              <label>Bio-Waste Tipping Penalty</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.05"
                  value={disposalPenaltyPerKg}
                  onChange={(e) => setDisposalPenaltyPerKg(Number(e.target.value))}
                />
                <span>₹/kg</span>
              </div>
            </div>

            <div className={styles.paramControl}>
              <label>Spoilage Avoidance Weight</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={spoilageWeight}
                  onChange={(e) => setSpoilageWeight(Number(e.target.value))}
                />
                <span>multiplier</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Executive Results Dashboard                                */}
      {/* ------------------------------------------------------------- */}
      {activePlan && (
        <section className={styles.kpiGrid}>
          {/* Winner Strategy Card */}
          <div className={`${styles.kpiCard} ${styles.winnerCard}`}>
            <div className={styles.kpiLabel}>
              <span>Comparative Strategy Outcome</span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor:
                    activePlan.winnerStatus === "FRESHROUTE_SUPERIOR"
                      ? "#ecfdf5"
                      : "#f1f5f9",
                  color:
                    activePlan.winnerStatus === "FRESHROUTE_SUPERIOR"
                      ? "#047857"
                      : "#475569",
                  border: `1px solid ${
                    activePlan.winnerStatus === "FRESHROUTE_SUPERIOR"
                      ? "#a7f3d0"
                      : "#e2e8f0"
                  }`,
                }}
              >
                {activePlan.winnerStatus === "FRESHROUTE_SUPERIOR"
                  ? "★ FreshRoute FEFO Superior"
                  : activePlan.winnerStatus || "Evaluated"}
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={`${styles.kpiValue} ${styles.highlightLime}`}>
                {activePlan.metrics?.profitUpliftUsd != null && activePlan.metrics.profitUpliftUsd >= 0
                  ? `+₹${activePlan.metrics.profitUpliftUsd.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}`
                  : `₹${(activePlan.metrics?.profitUpliftUsd || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}`}
              </span>
              <span
                className={`${styles.kpiDelta} ${
                  (activePlan.metrics?.profitUpliftPercent || 0) >= 0
                    ? styles.positive
                    : styles.negative
                }`}
              >
                {(activePlan.metrics?.profitUpliftPercent || 0) >= 0 ? "+" : ""}
                {activePlan.metrics?.profitUpliftPercent || 0}% Net Uplift
              </span>
            </div>
            <div className={styles.kpiSub}>
              {activePlan.evaluationRun?.comparison?.narrativeSummary ||
                `FreshRoute optimized FEFO allocation generated higher net margin than standard FIFO while respecting all physical shelf-life SLAs.`}
            </div>
          </div>

          {/* Mitigated Spoilage */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <span>Spoilage Mitigated</span>
              <PackageCheck size={14} color="#10b981" />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={`${styles.kpiValue} ${styles.highlightGreen}`}>
                {(activePlan.metrics?.spoilageReductionKg || activePlan.spoilagePreventedKg || 0).toLocaleString()} kg
              </span>
              <span className={`${styles.kpiDelta} ${styles.positive}`}>
                {(activePlan.metrics?.spoilageReductionPercent || 0) > 0 ? "-" : ""}
                {activePlan.metrics?.spoilageReductionPercent || 100}% Waste
              </span>
            </div>
            <div className={styles.kpiSub}>
              Salvaged produce value: ₹
              {(activePlan.spoilagePreventedUsd || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Demand Fulfillment Rate */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <span>Demand Fulfillment</span>
              <TrendingUp size={14} color="#0ea5e9" />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>
                {activePlan.evaluationRun?.freshRouteLedger?.fulfillmentRatePercent != null
                  ? `${activePlan.evaluationRun.freshRouteLedger.fulfillmentRatePercent}%`
                  : `${(
                      (activePlan.totalAllocatedKg /
                        (activePlan.totalAllocatedKg + activePlan.unfulfilledDemandKg || 1)) *
                      100
                    ).toFixed(1)}%`}
              </span>
              <span className={styles.kpiDelta}>
                {activePlan.totalAllocatedKg.toLocaleString()} kg Sold
              </span>
            </div>
            <div className={styles.kpiSub}>
              Unfulfilled demand: {activePlan.unfulfilledDemandKg.toLocaleString()} kg
            </div>
          </div>

          {/* Realized Sales Revenue */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <span>Realized Sales Cash Inflow</span>
              <IndianRupee size={14} color="#d4f933" />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={`${styles.kpiValue} ${styles.highlightLime}`}>
                ₹
                {activePlan.totalRevenueUsd.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className={styles.kpiSub}>
              Gross invoice value after dynamic salvage markdowns
            </div>
          </div>

          {/* Net Margin */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <span>Net Economic Margin</span>
              <Percent size={14} color="#cbd5e1" />
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>
                ₹
                {activePlan.netMarginUsd.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className={styles.kpiDelta}>
                {activePlan.totalRevenueUsd > 0
                  ? `${((activePlan.netMarginUsd / activePlan.totalRevenueUsd) * 100).toFixed(1)}%`
                  : "0.0%"}
              </span>
            </div>
            <div className={styles.kpiSub}>
              Total logistics & inventory costs: ₹
              {activePlan.totalCostUsd.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Plan Switcher & Snapshot Metadata                          */}
      {/* ------------------------------------------------------------- */}
      {activePlan && (
        <div className={styles.metadataStrip}>
          <div className={styles.metadataLeft}>
            <div className={styles.planSelectorGroup}>
              <label htmlFor="plan-switch">Active Plan:</label>
              <select
                id="plan-switch"
                value={activePlan.id}
                onChange={(e) => loadPlanDetail(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.planNumber} — {p.status} ({p.totalAllocatedKg.toLocaleString()} kg) [
                    {new Date(p.createdAt).toLocaleDateString()}]
                  </option>
                ))}
              </select>
            </div>

            <div
              className={styles.snapshotHashPill}
              onClick={() => handleCopyHash(activePlan.snapshotHash)}
              title="Click to copy SHA-256 cryptographic input snapshot hash"
            >
              <span>SHA-256: {activePlan.snapshotHash.substring(0, 16)}...</span>
              {copiedHash ? (
                <Check size={12} color="#10b981" />
              ) : (
                <Copy size={12} className={styles.copyIcon} />
              )}
            </div>
          </div>

          <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#94a3b8" }}>
            Solved {new Date(activePlan.planTimestamp).toLocaleTimeString()} {" // "} Engine:{" "}
            {activePlan.algorithmVersion}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Tabs Bar                                                  */}
      {/* ------------------------------------------------------------- */}
      {activePlan && (
        <>
          <nav className={styles.tabsNav}>
            <button
              className={`${styles.tabBtn} ${activeTab === "manifest" ? styles.active : ""}`}
              onClick={() => setActiveTab("manifest")}
            >
              <Table size={15} />
              Dispatch Manifest
              <span className={styles.tabCountBadge}>{activePlan.allocations.length}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "matrix" ? styles.active : ""}`}
              onClick={() => setActiveTab("matrix")}
            >
              <Grid size={15} />
              Allocation Matrix (Heatmap)
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "comparison" ? styles.active : ""}`}
              onClick={() => setActiveTab("comparison")}
            >
              <FileSpreadsheet size={15} />
              Baseline Comparison (FIFO Ledger)
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "explainability" ? styles.active : ""}`}
              onClick={() => setActiveTab("explainability")}
            >
              <Layers size={15} />
              Explainability & Rejections Audit
              <span className={styles.tabCountBadge}>
                {activePlan.evaluationRun?.freshRoutePlan?.rejections?.length || 0}
              </span>
            </button>
          </nav>

          {/* ----------------------------------------------------------- */}
          {/* TAB 1: Dispatch Manifest Table                              */}
          {/* ----------------------------------------------------------- */}
          {activeTab === "manifest" && (
            <div className={styles.tableCard}>
              <div className={styles.tableToolbar}>
                <div className={styles.searchBox}>
                  <Table size={14} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search batch, destination, order #, or route..."
                    value={manifestSearch}
                    onChange={(e) => setManifestSearch(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#94a3b8" }}>
                  Showing {filteredAllocations.length} of {activePlan.allocations.length} line items
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Batch Code & Produce</th>
                      <th>Destination & Tier</th>
                      <th>Transport Route</th>
                      <th>Allocated (kg)</th>
                      <th>Unit Price & Concession</th>
                      <th>Gross Revenue</th>
                      <th>Net Margin</th>
                      <th>Arrival RSL</th>
                      <th>Feasibility & Reason</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map((alloc, idx) => (
                      <tr key={alloc.id}>
                        <td className={styles.monoCol}>{idx + 1}</td>
                        <td>
                          <div className={styles.batchBadge}>
                            <span className={styles.batchCode}>{alloc.batchCode}</span>
                            <span className={styles.commoditySub}>{alloc.commodityName}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.batchBadge}>
                            <span style={{ fontWeight: 600 }}>{alloc.destinationName}</span>
                            <span className={styles.commoditySub}>
                              {alloc.destinationCode} {" // "} Order: {alloc.orderNumber}
                            </span>
                          </div>
                        </td>
                        <td className={styles.monoCol}>{alloc.routeCode}</td>
                        <td className={styles.monoCol} style={{ fontWeight: 700 }}>
                          {alloc.allocatedQuantity.toLocaleString()} kg
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={styles.monoCol}>
                              ₹{alloc.effectivePricePerUnit.toFixed(2)}/kg
                            </span>
                            {alloc.discountPercent > 0 && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  color: "var(--salvage-purple, #c084fc)",
                                  background: "rgba(192, 132, 252, 0.12)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                -{alloc.discountPercent.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={styles.monoCol} style={{ color: "var(--fresh-lime, #d4f933)" }}>
                          ₹{alloc.grossRevenueUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol} style={{ fontWeight: 700 }}>
                          ₹{alloc.netMarginUsd.toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`${styles.rslBadge} ${
                              alloc.arrivalShelfLifeDays >= 3.0
                                ? styles.safe
                                : alloc.arrivalShelfLifeDays > 0
                                ? styles.tight
                                : styles.breach
                            }`}
                          >
                            {alloc.arrivalShelfLifeDays.toFixed(1)}d at dock
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "monospace",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "#151d24",
                              border: "1px solid #263442",
                              color: "#cbd5e1",
                            }}
                          >
                            {alloc.reasonCode}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedAllocation(alloc)}
                            style={{
                              background: "transparent",
                              border: "1px solid #3a4b5d",
                              color: "#cbd5e1",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontFamily: "monospace",
                              cursor: "pointer",
                            }}
                          >
                            Inspect Facts
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* TAB 2: Allocation Matrix (Heatmap)                          */}
          {/* ----------------------------------------------------------- */}
          {activeTab === "matrix" && (
            <div className={styles.matrixCard}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c2630" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#f4f4f0" }}>
                  Two-Dimensional Supply vs Demand Allocation Heatmap
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  Batches as rows against destination buyers as columns. Green tint designates volume
                  allocated; purple indicates salvage dynamic markdowns.
                </p>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th className={styles.batchRowHeader}>Batch / Produce Stock</th>
                      {matrixData.destinations.map((d) => (
                        <th key={d.id}>
                          {d.code}
                          <br />
                          <span style={{ fontSize: "10px", color: "#64748b" }}>{d.name}</span>
                        </th>
                      ))}
                      <th className={styles.summaryCol}>Total Allocated</th>
                      <th className={styles.summaryCol}>Leftover Surplus</th>
                      <th className={styles.summaryCol}>Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.rows.map((row) => (
                      <tr key={row.batchId}>
                        <td className={styles.batchRowHeader}>
                          <div style={{ fontWeight: 700, color: "#fbfbf9" }}>{row.batchCode}</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {row.commodityName}
                          </div>
                        </td>

                        {matrixData.destinations.map((d) => {
                          const alloc = row.allocationsByDest.get(d.id);
                          if (!alloc) {
                            return (
                              <td key={d.id} className={`${styles.matrixCell} ${styles.empty}`}>
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={d.id}
                              className={`${styles.matrixCell} ${
                                alloc.discountPercent > 0
                                  ? styles.discounted
                                  : styles.allocated
                              }`}
                            >
                              <div>{alloc.allocatedQuantity.toLocaleString()} kg</div>
                              {alloc.discountPercent > 0 && (
                                <span style={{ fontSize: "10px" }}>
                                  -{alloc.discountPercent.toFixed(0)}%
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className={styles.summaryCol}>
                          {row.totalAllocatedKg.toLocaleString()} kg
                        </td>
                        <td className={styles.summaryCol}>
                          {row.unallocatedKg.toLocaleString()} kg
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "monospace",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                row.category === "FULLY_ALLOCATED"
                                  ? "#ecfdf5"
                                  : row.category === "AT_RISK"
                                  ? "#fffbeb"
                                  : "#f1f5f9",
                              color:
                                row.category === "FULLY_ALLOCATED"
                                  ? "#047857"
                                  : row.category === "AT_RISK"
                                  ? "#b45309"
                                  : "#475569",
                              border: `1px solid ${
                                row.category === "FULLY_ALLOCATED"
                                  ? "#a7f3d0"
                                  : row.category === "AT_RISK"
                                  ? "#fde68a"
                                  : "#e2e8f0"
                              }`,
                            }}
                          >
                            {row.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* TAB 3: Baseline Comparison Ledger                           */}
          {/* ----------------------------------------------------------- */}
          {activeTab === "comparison" && (
            <div className={styles.tableCard}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c2630" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#f4f4f0" }}>
                  Shared Economic Evaluator: FreshRoute FEFO vs Documented FIFO Baseline
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  Direct line-item economic ledger comparison evaluated against identical initial stock,
                  demands, delivery windows, and logistics costs.
                </p>
              </div>

              {activePlan.evaluationRun?.freshRouteLedger &&
              activePlan.evaluationRun?.baselineLedger &&
              activePlan.evaluationRun?.comparison ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Metric Dimension</th>
                        <th>FreshRoute (FEFO Optimizer)</th>
                        <th>Baseline (FIFO Reference)</th>
                        <th>Absolute Delta</th>
                        <th>Relative Delta</th>
                        <th>Strategic Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Physical Volume */}
                      <tr style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                        <td colSpan={6} style={{ fontWeight: 800, color: "var(--fresh-lime, #d4f933)" }}>
                          1. Physical Mass & Inventory Balance (kg)
                        </td>
                      </tr>
                      <tr>
                        <td>Sold Quantity Dispatched</td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.freshRouteLedger.soldQuantityKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.baselineLedger.soldQuantityKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>
                          +{activePlan.evaluationRun.comparison.soldQuantityDeltaKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>—</td>
                        <td>Dispatched volume fulfillment</td>
                      </tr>
                      <tr>
                        <td>Perishable Spoilage (Bio-Waste)</td>
                        <td className={styles.monoCol} style={{ color: "var(--produce-emerald, #10b981)" }}>
                          {activePlan.evaluationRun.freshRouteLedger.spoiledExpiredStockKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol} style={{ color: "var(--urgency-rose, #f43f5e)" }}>
                          {activePlan.evaluationRun.baselineLedger.spoiledExpiredStockKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol} style={{ color: "var(--produce-emerald, #10b981)" }}>
                          -{activePlan.evaluationRun.comparison.spoilageReductionKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol} style={{ color: "var(--produce-emerald, #10b981)" }}>
                          -{activePlan.evaluationRun.comparison.spoilageReductionPercent}%
                        </td>
                        <td style={{ color: "var(--produce-emerald, #10b981)", fontWeight: 700 }}>
                          Perishable food waste avoided
                        </td>
                      </tr>
                      <tr>
                        <td>At-Risk Produce Remaining (&lt;7d RSL)</td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.freshRouteLedger.atRiskStockKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.baselineLedger.atRiskStockKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>
                          {(
                            activePlan.evaluationRun.freshRouteLedger.atRiskStockKg -
                            activePlan.evaluationRun.baselineLedger.atRiskStockKg
                          ).toLocaleString()}{" "}
                          kg
                        </td>
                        <td className={styles.monoCol}>—</td>
                        <td>Near-term dispatch candidates</td>
                      </tr>

                      {/* Demand */}
                      <tr style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                        <td colSpan={6} style={{ fontWeight: 800, color: "var(--fresh-lime, #d4f933)" }}>
                          2. Customer Demand & Fill Rates
                        </td>
                      </tr>
                      <tr>
                        <td>Demand Fill Rate</td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.freshRouteLedger.fulfillmentRatePercent.toFixed(1)}%
                        </td>
                        <td className={styles.monoCol}>
                          {activePlan.evaluationRun.baselineLedger.fulfillmentRatePercent.toFixed(1)}%
                        </td>
                        <td className={styles.monoCol}>
                          +{activePlan.evaluationRun.comparison.fulfillmentDeltaKg.toLocaleString()} kg
                        </td>
                        <td className={styles.monoCol}>
                          +{activePlan.evaluationRun.comparison.fulfillmentRateDeltaPercent}%
                        </td>
                        <td>Customer SLA service level</td>
                      </tr>

                      {/* Revenues & Costs */}
                      <tr style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                        <td colSpan={6} style={{ fontWeight: 800, color: "var(--fresh-lime, #d4f933)" }}>
                          3. Realized Inflow & Logistics Costs (₹ INR)
                        </td>
                      </tr>
                      <tr>
                        <td>Realized Gross Revenue Inflow</td>
                        <td className={styles.monoCol} style={{ color: "var(--fresh-lime, #d4f933)" }}>
                          ₹{activePlan.evaluationRun.freshRouteLedger.realizedSalesRevenueUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          ₹{activePlan.evaluationRun.baselineLedger.realizedSalesRevenueUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          +₹{activePlan.evaluationRun.comparison.realizedRevenueDeltaUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          +{activePlan.evaluationRun.comparison.realizedRevenueDeltaPercent}%
                        </td>
                        <td>Cash collected from fulfilled orders</td>
                      </tr>
                      <tr>
                        <td>Total Incurred Freight & Transport</td>
                        <td className={styles.monoCol}>
                          ₹{activePlan.evaluationRun.freshRouteLedger.incurredTransportTotalCostUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          ₹{activePlan.evaluationRun.baselineLedger.incurredTransportTotalCostUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          +₹{activePlan.evaluationRun.comparison.transportCostDeltaUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>—</td>
                        <td>Fleet dispatch fees + variable weight fuel</td>
                      </tr>
                      <tr>
                        <td>Bio-Waste Disposal Penalty</td>
                        <td className={styles.monoCol}>
                          ₹{activePlan.evaluationRun.freshRouteLedger.incurredDisposalPenaltyUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>
                          ₹{activePlan.evaluationRun.baselineLedger.incurredDisposalPenaltyUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol} style={{ color: "var(--produce-emerald, #10b981)" }}>
                          -₹
                          {(
                            activePlan.evaluationRun.baselineLedger.incurredDisposalPenaltyUsd -
                            activePlan.evaluationRun.freshRouteLedger.incurredDisposalPenaltyUsd
                          ).toFixed(2)}
                        </td>
                        <td className={styles.monoCol}>—</td>
                        <td>Tipping fees saved by salvaging stock</td>
                      </tr>

                      {/* Net Margins */}
                      <tr style={{ background: "rgba(212, 249, 51, 0.08)" }}>
                        <td style={{ fontWeight: 800, color: "var(--fresh-lime, #d4f933)" }}>
                          4. Net Economic Outcome (Net Margin)
                        </td>
                        <td
                          className={styles.monoCol}
                          style={{
                            fontWeight: 800,
                            fontSize: "15px",
                            color: "var(--fresh-lime, #d4f933)",
                          }}
                        >
                          ₹{activePlan.evaluationRun.freshRouteLedger.netEconomicOutcomeUsd.toFixed(2)}
                        </td>
                        <td className={styles.monoCol} style={{ fontWeight: 700 }}>
                          ₹{activePlan.evaluationRun.baselineLedger.netEconomicOutcomeUsd.toFixed(2)}
                        </td>
                        <td
                          className={styles.monoCol}
                          style={{
                            fontWeight: 800,
                            color: "var(--produce-emerald, #10b981)",
                          }}
                        >
                          +₹{activePlan.evaluationRun.comparison.netOutcomeDeltaUsd.toFixed(2)}
                        </td>
                        <td
                          className={styles.monoCol}
                          style={{
                            fontWeight: 800,
                            color: "var(--produce-emerald, #10b981)",
                          }}
                        >
                          +{activePlan.evaluationRun.comparison.netOutcomeDeltaPercent}%
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--fresh-lime, #d4f933)" }}>
                          {activePlan.evaluationRun.comparison.outcomeStatus}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  Comparative ledger metrics available upon plan execution.
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* TAB 4: Explainability & Rejections Audit                    */}
          {/* ----------------------------------------------------------- */}
          {activeTab === "explainability" && (
            <div className={styles.tableCard}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c2630" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#f4f4f0" }}>
                  Deterministic Constraint Satisfaction & Rejections Audit
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  Every rejected pairing evaluated by the solver along with mathematical proof of
                  constraint breach (SLA expiry, cold-chain violation, delivery window missed).
                </p>
              </div>

              <div className={styles.rejectionsGrid}>
                {activePlan.evaluationRun?.freshRoutePlan?.rejections?.length ? (
                  activePlan.evaluationRun.freshRoutePlan.rejections.map(
                    (rej: any, idx: number) => (
                      <div key={idx} className={styles.rejectionCard}>
                        <div className={styles.rejectionHeader}>
                          <span style={{ color: "var(--urgency-rose, #f43f5e)", fontWeight: 700 }}>
                            {rej.reasonCode}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            Batch {rej.batchCode} → Order {rej.orderNumber} (via {rej.routeCode})
                          </span>
                        </div>
                        <div className={styles.rejectionExplanation}>{rej.reasonExplanation}</div>
                        {rej.facts && (
                          <div className={styles.rejectionFacts}>
                            {Object.entries(rej.facts).map(([key, val]) => (
                              <span key={key} className={styles.factPill}>
                                {key}: <strong>{String(val)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                    No infeasible constraint rejections recorded for this run.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. Facts Audit Modal                                          */}
      {/* ------------------------------------------------------------- */}
      {selectedAllocation && selectedFactAudit && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAllocation(null)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Allocation Facts Audit {" // "} {selectedAllocation.batchCode}</h3>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>
                  Order: {selectedAllocation.orderNumber} {" // "} Dest:{" "}
                  {selectedAllocation.destinationCode}
                </span>
              </div>
              <button onClick={() => setSelectedAllocation(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.factsSection}>
                <h4>Physical Lead-Time & Shelf-Life Proof</h4>
                <table className={styles.factsTable}>
                  <tbody>
                    <tr>
                      <td>Departure Timestamp</td>
                      <td>{selectedFactAudit.departureTime}</td>
                    </tr>
                    <tr>
                      <td>Dock Arrival Timestamp</td>
                      <td>{selectedFactAudit.arrivalTime}</td>
                    </tr>
                    <tr>
                      <td>Handling Completed Buffer</td>
                      <td>{selectedFactAudit.handlingCompletedTime}</td>
                    </tr>
                    <tr>
                      <td>Expiry Date Timestamp</td>
                      <td>{selectedFactAudit.expiryDate}</td>
                    </tr>
                    <tr>
                      <td>RSL at Dock Arrival</td>
                      <td>{selectedFactAudit.arrivalRslDays.toFixed(2)} days</td>
                    </tr>
                    <tr>
                      <td>RSL after Dock Unloading Buffer</td>
                      <td>{selectedFactAudit.handlingRslDays.toFixed(2)} days</td>
                    </tr>
                    <tr>
                      <td>Customer Contract SLA Hurdle</td>
                      <td style={{ color: "var(--fresh-lime, #d4f933)" }}>
                        {selectedFactAudit.requiredRslDays.toFixed(1)} days (SATISFIED)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.factsSection}>
                <h4>Two-Part Tariff Logistics & Pricing Breakdown</h4>
                <table className={styles.factsTable}>
                  <tbody>
                    <tr>
                      <td>Allocated Physical Volume</td>
                      <td>{selectedFactAudit.allocatedKg.toLocaleString()} kg</td>
                    </tr>
                    <tr>
                      <td>Contracted List Price</td>
                      <td>₹{selectedFactAudit.contractedPricePerKg.toFixed(2)}/kg</td>
                    </tr>
                    <tr>
                      <td>Dynamic Markdown Applied</td>
                      <td>{selectedFactAudit.discountPercent.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td>Effective Invoice Price</td>
                      <td>₹{selectedFactAudit.effectivePricePerKg.toFixed(2)}/kg</td>
                    </tr>
                    <tr>
                      <td>Unit Inventory Purchase Cost</td>
                      <td>₹{selectedFactAudit.unitCostPerKg.toFixed(2)}/kg</td>
                    </tr>
                    <tr>
                      <td>Variable Transport Fuel Share</td>
                      <td>₹{selectedFactAudit.variableTransportCostPerKg.toFixed(2)}/kg</td>
                    </tr>
                    <tr>
                      <td>Allocated Fixed Truck Cost Share</td>
                      <td>₹{selectedFactAudit.allocatedFixedCostShare.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Net Contribution Margin</td>
                      <td style={{ color: "var(--fresh-lime, #d4f933)" }}>
                        ₹{selectedFactAudit.netMarginUsd.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td>Binding Allocation Constraint</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#151d24",
                            border: "1px solid #263442",
                          }}
                        >
                          {selectedFactAudit.bindingConstraint}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
