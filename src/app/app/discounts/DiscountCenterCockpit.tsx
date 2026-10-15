"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Tag,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  RefreshCw,
  Sliders,
  Check,
  Percent,
  X,
  FileText,
  Truck,
} from "lucide-react";
import styles from "./discounts.module.scss";

// ============================================================================
// TYPES
// ============================================================================

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

export interface BatchDiscountRecommendation {
  id: string;
  batchId: string;
  batchCode: string;
  warehouseId: string;
  commodityId: string;
  commodityName: string;
  initialQuantityKg: number;
  allocatedQuantityKg: number;
  residualQuantityKg: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "STABLE" | "EXPIRED";
  remainingRslDays: number;
  sellByDeadline: string;
  unitCostUsd: number;
  referencePricePerKgUsd: number;
  isDiscountRecommended: boolean;
  reasonCode: string;
  reasonExplanation: string;
  targetDestinationId?: string;
  targetDestinationName?: string;
  proposedDiscountPercent: number;
  proposedSellingPricePerKgUsd: number;
  estimatedSalesKg: number;
  estimatedResidualStockKg: number;
  projectedSalesRevenueUsd: number;
  estimatedTransportCostUsd: number;
  estimatedDisposalLossAvoidedUsd: number;
  netEconomicImpactUsd: number;
  confidenceScore: number;
  assumptions: string[];
  confidenceLimitations: string[];
}

export interface PlanItem {
  id: string;
  planNumber: string;
  warehouseName: string;
  status: string;
  createdAt: string;
}

export interface SimulatedDiscountPlanResult {
  beforeLedger: {
    totalGrossRevenueUsd: number;
    totalTransportCostUsd: number;
    totalDisposalCostUsd: number;
    totalPurchaseCostUsd: number;
    netOperatingProfitUsd: number;
    totalSpoilageVolumeKg: number;
    totalAllocatedVolumeKg: number;
  };
  afterLedger: {
    totalGrossRevenueUsd: number;
    totalTransportCostUsd: number;
    totalDisposalCostUsd: number;
    totalPurchaseCostUsd: number;
    netOperatingProfitUsd: number;
    totalSpoilageVolumeKg: number;
    totalAllocatedVolumeKg: number;
  };
  comparison: {
    profitDeltaUsd: number;
    profitUpliftPercent: number;
    spoilageReductionKg: number;
    spoilageReductionPercent: number;
  };
  additionalAllocationsCount: number;
  additionalSoldKg: number;
  additionalNetMarginUsd: number;
}

export function DiscountCenterCockpit() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<PersistedDiscountRecord[]>([]);
  const [evaluatedRecs, setEvaluatedRecs] = useState<BatchDiscountRecommendation[]>([]);
  const [activeSeverityTab, setActiveSeverityTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState<string>("");
  const [simulationResult, setSimulationResult] = useState<SimulatedDiscountPlanResult | null>(null);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. Load Initial Plans and Persisted Recommendations
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, recsRes] = await Promise.all([
        fetch("/api/planning/plans").then((r) => r.json()).catch(() => ({ plans: [] })),
        fetch("/api/discounts/recommendations").then((r) => r.json()).catch(() => ({ recommendations: [] })),
      ]);

      if (plansRes.plans && plansRes.plans.length > 0) {
        setPlans(plansRes.plans);
        setSelectedPlanId((prev) => prev || plansRes.plans[0].id);
      }

      if (recsRes.recommendations) {
        setRecommendations(recsRes.recommendations);
      }
    } catch (err) {
      console.error("Failed to load discount cockpit data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Evaluate Markdown Opportunities on Current Plan
  const handleEvaluate = async () => {
    if (!selectedPlanId) return;
    setIsEvaluating(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch("/api/discounts/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const data = await res.json();
      if (data.evaluationResult) {
        setEvaluatedRecs(data.evaluationResult.recommendations);
        // Refresh persisted recommendations
        const recsRes = await fetch("/api/discounts/recommendations").then((r) => r.json());
        if (recsRes.recommendations) {
          setRecommendations(recsRes.recommendations);
        }
        setActionSuccessMsg("Discount opportunities successfully evaluated and updated.");
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 3. Handle Decision Status Update (Approve / Reject / Defer)
  const handleUpdateStatus = async (
    recId: string,
    action: "APPROVE" | "REJECT" | "DEFER",
    notes: string
  ) => {
    try {
      const res = await fetch(`/api/discounts/recommendations/${recId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reasonNotes: notes }),
      });
      const data = await res.json();
      if (data.recommendation) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? data.recommendation : r))
        );
        if (selectedItem && selectedItem.id === recId) {
          setSelectedItem(data.recommendation);
        }
        setActionSuccessMsg(`Recommendation updated to ${data.recommendation.status}.`);
      }
    } catch (err) {
      console.error("Status transition failed:", err);
    }
  };

  // 4. Simulate Approved Discounts
  const handleSimulate = async () => {
    if (!selectedPlanId) return;
    setIsSimulating(true);
    try {
      const approvedList = recommendations
        .filter((r) => r.status === "APPROVED")
        .map((r) => ({
          batchId: r.batchId,
          destinationId: r.destinationId,
          discountPercent: r.suggestedDiscountPercent,
        }));

      const res = await fetch("/api/discounts/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          approvedRecommendations: approvedList,
        }),
      });
      const data = await res.json();
      if (data.simulationResult) {
        setSimulationResult(data.simulationResult);
        setShowSimModal(true);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // 5. Unified items for display (combining persisted records and engine recommendations)
  const displayItems = useMemo(() => {
    const items: any[] = [];
    const seenBatchCodes = new Set<string>();

    for (const r of recommendations) {
      items.push({
        id: r.id,
        batchCode: r.batchCode,
        commodityName: r.commodityName,
        destinationName: r.destinationName,
        discountPercent: r.suggestedDiscountPercent,
        origPrice: r.originalPricePerUnit,
        discPrice: r.discountedPricePerUnit,
        quantityKg: r.quantityKg,
        disposalAvoided: r.estimatedDisposalLossAvoided,
        netImpact: r.projectedGrossMarginUsd,
        status: r.status,
        reasonExplanation: r.reasonExplanation,
        severity: "CRITICAL",
        isPersisted: true,
      });
      seenBatchCodes.add(r.batchCode);
    }

    for (const ev of evaluatedRecs) {
      if (!seenBatchCodes.has(ev.batchCode)) {
        items.push({
          id: ev.id,
          batchCode: ev.batchCode,
          commodityName: ev.commodityName,
          destinationName: ev.targetDestinationName || "None (No feasible buyer)",
          discountPercent: ev.proposedDiscountPercent,
          origPrice: ev.referencePricePerKgUsd,
          discPrice: ev.proposedSellingPricePerKgUsd,
          quantityKg: ev.residualQuantityKg,
          disposalAvoided: ev.estimatedDisposalLossAvoidedUsd,
          netImpact: ev.netEconomicImpactUsd,
          status: ev.isDiscountRecommended ? "PENDING" : "NO_DISCOUNT",
          reasonExplanation: ev.reasonExplanation,
          severity: ev.severity,
          isPersisted: false,
          assumptions: ev.assumptions,
          confidenceLimitations: ev.confidenceLimitations,
        });
        seenBatchCodes.add(ev.batchCode);
      }
    }

    // Filter by severity
    let filtered = items;
    if (activeSeverityTab !== "ALL") {
      if (activeSeverityTab === "NO_DISCOUNT") {
        filtered = filtered.filter((i) => i.status === "NO_DISCOUNT" || i.discountPercent === 0);
      } else {
        filtered = filtered.filter((i) => i.severity === activeSeverityTab);
      }
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.batchCode.toLowerCase().includes(q) ||
          i.commodityName.toLowerCase().includes(q) ||
          i.destinationName.toLowerCase().includes(q) ||
          i.reasonExplanation.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [recommendations, evaluatedRecs, activeSeverityTab, statusFilter, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let salvageRecouped = 0;
    let disposalAvoided = 0;
    let netMarginGain = 0;
    let totalKg = 0;
    let countDiscounts = 0;
    let sumDiscount = 0;

    for (const item of displayItems) {
      if (item.discountPercent > 0 && item.status !== "REJECTED") {
        salvageRecouped += item.discPrice * item.quantityKg;
        disposalAvoided += item.disposalAvoided;
        netMarginGain += item.netImpact;
        totalKg += item.quantityKg;
        countDiscounts++;
        sumDiscount += item.discountPercent;
      }
    }

    const avgDiscount = countDiscounts > 0 ? sumDiscount / countDiscounts : 20.0;

    return {
      salvageRecouped,
      disposalAvoided,
      netMarginGain,
      totalKg,
      avgDiscount,
      totalCount: displayItems.length,
      approvedCount: displayItems.filter((i) => i.status === "APPROVED").length,
    };
  }, [displayItems]);

  return (
    <div className={styles.discountCockpit}>
      {/* 1. TOP HEADER & WORKSPACE ACTIONS */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <div className={styles.engineBadge}>
              <Tag size={14} />
              <span>Discount Engine v1.0.0-Deterministic</span>
            </div>
            <div className={styles.statusPill}>
              <Sliders size={12} />
              <span>Floor Margin Preservation</span>
            </div>
          </div>
          <h1 className={styles.title}>Dynamic Markdown Salvage Console</h1>
          <p className={styles.subtitle}>
            Deterministic price reduction recommendations for perishable stock nearing expiry.
            Evaluates candidate markdowns against avoided bio-waste disposal fees and unfulfilled
            contract ceilings.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.planSelector}>
            <label htmlFor="plan-select">Distribution Plan</label>
            <select
              id="plan-select"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.planNumber} ({p.warehouseName})
                </option>
              ))}
              {plans.length === 0 && <option value="">No Plans Available</option>}
            </select>
          </div>

          <button
            className={styles.btnSecondary}
            onClick={loadData}
            disabled={isLoading}
            title="Refresh recommendations"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            className={styles.btnPrimary}
            onClick={handleEvaluate}
            disabled={isEvaluating || !selectedPlanId}
          >
            <Sparkles size={15} className={isEvaluating ? "animate-spin" : ""} />
            <span>{isEvaluating ? "Evaluating..." : "Evaluate Markdowns"}</span>
          </button>

          <button
            className={styles.btnSecondary}
            onClick={handleSimulate}
            disabled={isSimulating || !selectedPlanId}
          >
            <TrendingUp size={15} />
            <span>Simulate Plan Impact</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#047857",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{actionSuccessMsg}</span>
          <button
            onClick={() => setActionSuccessMsg(null)}
            style={{ background: "transparent", border: "none", color: "#4ade80", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. METHODOLOGY & DISCLAIMER BANNER */}
      <div className={styles.disclaimerBanner}>
        <div className={styles.bannerHeader}>
          <div className={styles.bannerTitle}>
            <ShieldAlert size={16} />
            <span>Deterministic Economic Model & Compliance Guardrails</span>
          </div>
          <span className={styles.bannerTag}>Simulated Decision Policy</span>
        </div>
        <p className={styles.bannerText}>
          <strong>Simulated Decision Model:</strong> Discount recommendations represent calculated
          opportunities within FreshRoute&apos;s mathematical optimization framework. Price execution is
          a simulated decision until confirmed by merchandisers or committed via commercial ERP
          integrations.
        </p>
        <div className={styles.bannerGrid}>
          <div className={styles.bannerItem}>
            <span className={styles.label}>Deterministic Demand Ceiling</span>
            <span className={styles.val}>
              Sales volume is capped strictly at buyer open unfulfilled orders. No speculative market
              expansion is assumed.
            </span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.label}>Tipping Penalty Avoidance</span>
            <span className={styles.val}>
              Modeled margin includes avoided bio-waste disposal fees (₹0.25/kg) over dumping.
            </span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.label}>Cold-Chain Integrity</span>
            <span className={styles.val}>
              Transport transit durations and reefer temperature bounds are strictly enforced.
            </span>
          </div>
        </div>
      </div>

      {/* 3. METRIC CARDS GRID */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.highlightPositive}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Salvage Recouped</span>
            <IndianRupee size={16} />
          </div>
          <div className={`${styles.cardValue} green`}>
            ₹{summaryMetrics.salvageRecouped.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className={styles.cardSub}>
            <span>Projected sales revenue from discounted clearance</span>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.highlightBlue}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Disposal Saved</span>
            <Package size={16} />
          </div>
          <div className={`${styles.cardValue} blue`}>
            ₹{summaryMetrics.disposalAvoided.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className={styles.cardSub}>
            <span>Bio-waste landfill tipping fees averted</span>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.highlightPositive}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Net Margin Uplift</span>
            <TrendingUp size={16} />
          </div>
          <div className={`${styles.cardValue} green`}>
            +₹{summaryMetrics.netMarginGain.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className={styles.cardSub}>
            <span>Net gain over status-quo write-off scenario</span>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.highlightAmber}`}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>At-Risk Produce Cleared</span>
            <Layers size={16} />
          </div>
          <div className={`${styles.cardValue} amber`}>
            {summaryMetrics.totalKg.toLocaleString("en-US")} kg
          </div>
          <div className={styles.cardSub}>
            <span>Average markdown: {summaryMetrics.avgDiscount.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 4. FILTERS & CONTROL BAR */}
      <div className={styles.controlBar}>
        <div className={styles.severityTabs}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "NO_DISCOUNT"].map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeSeverityTab === tab ? styles.active : ""}`}
              onClick={() => setActiveSeverityTab(tab)}
            >
              {tab === "NO_DISCOUNT" ? "No Discount (Infeasible)" : tab}
            </button>
          ))}
        </div>

        <div className={styles.searchAndStatus}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search batch, commodity, buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* 5. AT-RISK INVENTORY & DISCOUNT RECOMMENDATIONS TABLE */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Batch & Commodity</th>
              <th>Risk Severity</th>
              <th>Unallocated Qty</th>
              <th>Reference vs Proposed Price</th>
              <th>Target Salvage Channel</th>
              <th>Economic Uplift (Δ Margin)</th>
              <th>Decision Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <Info size={24} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <div>No inventory batches matching the selected filters.</div>
                  <div style={{ fontSize: "11px", marginTop: "4px" }}>
                    Click &quot;Evaluate Markdowns&quot; above to scan for candidate salvage opportunities.
                  </div>
                </td>
              </tr>
            ) : (
              displayItems.map((item) => (
                <tr
                  key={item.id}
                  className={styles.clickable}
                  onClick={() => {
                    setSelectedItem(item);
                    setAuditNotes("");
                  }}
                >
                  <td>
                    <div className={styles.batchCell}>
                      <span className={styles.batchCode}>{item.batchCode}</span>
                      <span className={styles.commodityName}>{item.commodityName}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.severityBadge} ${styles[item.severity.toLowerCase()] || styles.critical}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {item.quantityKg.toLocaleString("en-US")} kg
                    </span>
                  </td>
                  <td>
                    {item.discountPercent > 0 ? (
                      <div className={styles.pricingCell}>
                        <div className={styles.priceRow}>
                          <span className={styles.origPrice}>
                            ₹{item.origPrice.toFixed(2)}
                          </span>
                          <span className={styles.discPrice}>
                            ₹{item.discPrice.toFixed(2)}/kg
                          </span>
                          <span className={styles.discountPill}>
                            -{item.discountPercent}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                        ₹{item.origPrice.toFixed(2)}/kg (No Markdown)
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {item.destinationName}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.impactCell}>
                      <span className={styles.marginUplift}>
                        +₹{item.netImpact.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={styles.disposalSaved}>
                        Avoids ₹{item.disposalAvoided.toFixed(2)} fee
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        item.status === "APPROVED"
                          ? styles.approved
                          : item.status === "REJECTED"
                          ? styles.rejected
                          : item.status === "PENDING"
                          ? styles.pending
                          : styles.noDiscount
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.rowActions} style={{ justifyContent: "flex-end" }}>
                      <button
                        className={styles.btnAction}
                        onClick={() => {
                          setSelectedItem(item);
                          setAuditNotes("");
                        }}
                      >
                        Inspect
                      </button>
                      {item.isPersisted && item.status !== "APPROVED" && (
                        <button
                          className={`${styles.btnAction} ${styles.approve}`}
                          onClick={() => handleUpdateStatus(item.id, "APPROVE", "Approved directly from table")}
                          title="Approve dynamic markdown"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      {item.isPersisted && item.status !== "REJECTED" && (
                        <button
                          className={`${styles.btnAction} ${styles.reject}`}
                          onClick={() => handleUpdateStatus(item.id, "REJECT", "Rejected directly from table")}
                          title="Reject dynamic markdown"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. RECOMMENDATION DETAIL MODAL */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3>Recommendation Audit: {selectedItem.batchCode}</h3>
                  <span
                    className={`${styles.statusBadge} ${
                      selectedItem.status === "APPROVED"
                        ? styles.approved
                        : selectedItem.status === "REJECTED"
                        ? styles.rejected
                        : selectedItem.status === "PENDING"
                        ? styles.pending
                        : styles.noDiscount
                    }`}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <p>
                  {selectedItem.commodityName} &bull; Target Destination: {selectedItem.destinationName}
                </p>
              </div>
              <button className={styles.btnClose} onClick={() => setSelectedItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Waterfall & Economic Comparison */}
              <div className={styles.waterfallCard}>
                <span className={styles.waterfallTitle}>Price Waterfall & Economic Outcome</span>
                <div className={styles.waterfallGrid}>
                  {/* Status Quo */}
                  <div className={styles.scenarioCol}>
                    <div className={styles.scenarioName}>
                      <span>Status Quo (Dump & Write-Off)</span>
                      <XCircle size={14} color="#f87171" />
                    </div>
                    <div className={styles.scenarioRows}>
                      <div className="row">
                        <span>Sales Revenue</span>
                        <span>₹0.00</span>
                      </div>
                      <div className="row">
                        <span>Logistics Cost</span>
                        <span>₹0.00</span>
                      </div>
                      <div className="row">
                        <span>Disposal Penalty (₹0.25/kg)</span>
                        <span style={{ color: "#f87171" }}>
                          -₹{selectedItem.disposalAvoided.toFixed(2)}
                        </span>
                      </div>
                      <div className="row total">
                        <span>Net Economic Loss</span>
                        <span style={{ color: "#f87171" }}>
                          -₹{selectedItem.disposalAvoided.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discount Scenario */}
                  <div className={`${styles.scenarioCol} ${styles.positive}`}>
                    <div className={styles.scenarioName}>
                      <span>Dynamic Salvage Scenario</span>
                      <CheckCircle2 size={14} color="#4ade80" />
                    </div>
                    <div className={styles.scenarioRows}>
                      <div className="row">
                        <span>Salvage Revenue ({selectedItem.discountPercent}% off)</span>
                        <span style={{ color: "#4ade80" }}>
                          +₹{(selectedItem.discPrice * selectedItem.quantityKg).toFixed(2)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Disposal Penalty Avoided</span>
                        <span style={{ color: "#38bdf8" }}>
                          +₹{selectedItem.disposalAvoided.toFixed(2)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Handling & Freight Fees</span>
                        <span>-₹120.00</span>
                      </div>
                      <div className="row total">
                        <span>Net Economic Margin Uplift</span>
                        <span style={{ color: "#4ade80" }}>
                          +₹{selectedItem.netImpact.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explainable Narrative */}
              <div className={styles.sectionBox}>
                <span className={styles.sectionTitle}>Deterministic Decision Narrative</span>
                <p className={styles.narrative}>{selectedItem.reasonExplanation}</p>
              </div>

              {/* Model Assumptions */}
              <div className={styles.sectionBox}>
                <span className={styles.sectionTitle}>Governance & Model Constraints</span>
                <ul className={styles.assumptionsList}>
                  <li>
                    <strong>Demand Ceiling:</strong> Clearance quantity is bounded by unfulfilled
                    contract volume at {selectedItem.destinationName}.
                  </li>
                  <li>
                    <strong>Margin Floor Rule:</strong> Discounted price satisfies floor condition
                    (unit price &times; (1 - discount) &minus; freight &gt; &minus;disposal fee).
                  </li>
                  <li>
                    <strong>Cold-Chain Window:</strong> Transit ETA satisfies secondary clearance
                    service level agreement.
                  </li>
                </ul>
              </div>

              {/* Merchandiser Audit Notes */}
              {selectedItem.isPersisted && (
                <div className={styles.auditSection}>
                  <label htmlFor="audit-notes">Merchandiser Audit Note / Rationale</label>
                  <textarea
                    id="audit-notes"
                    placeholder="Enter commercial justification or counter-party notes for this decision..."
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                FreshRoute Audit Log &bull; Record ID: {selectedItem.id}
              </div>

              {selectedItem.isPersisted ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      handleUpdateStatus(
                        selectedItem.id,
                        "DEFER",
                        auditNotes || "Deferred for follow-up review"
                      );
                    }}
                  >
                    Defer Decision
                  </button>
                  <button
                    className={styles.btnAction}
                    style={{ background: "#fff1f2", color: "#be123c", borderColor: "#fecdd3" }}
                    onClick={() => {
                      handleUpdateStatus(
                        selectedItem.id,
                        "REJECT",
                        auditNotes || "Rejected by merchandiser"
                      );
                    }}
                  >
                    Reject Markdown
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => {
                      handleUpdateStatus(
                        selectedItem.id,
                        "APPROVE",
                        auditNotes || "Approved dynamic markdown salvage"
                      );
                    }}
                  >
                    Approve Markdown
                  </button>
                </div>
              ) : (
                <button className={styles.btnSecondary} onClick={() => setSelectedItem(null)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. PLAN SIMULATION MODAL */}
      {showSimModal && simulationResult && (
        <div className={styles.modalOverlay} onClick={() => setShowSimModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={20} color="#4ade80" />
                  <h3>Plan Recalculation Simulation</h3>
                </div>
                <p>
                  Before vs After comparison through FreshRoute&apos;s shared economic evaluator.
                </p>
              </div>
              <button className={styles.btnClose} onClick={() => setShowSimModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.waterfallCard}>
                <span className={styles.waterfallTitle}>Economic Ledger Reconciliation</span>
                <div className={styles.waterfallGrid}>
                  <div className={styles.scenarioCol}>
                    <div className={styles.scenarioName}>
                      <span>Original Plan (Before Discounts)</span>
                    </div>
                    <div className={styles.scenarioRows}>
                      <div className="row">
                        <span>Gross Revenue</span>
                        <span>₹{simulationResult.beforeLedger.totalGrossRevenueUsd.toFixed(2)}</span>
                      </div>
                      <div className="row">
                        <span>Transport Costs</span>
                        <span>₹{simulationResult.beforeLedger.totalTransportCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="row">
                        <span>Landfill Disposal Costs</span>
                        <span style={{ color: "#f87171" }}>
                          ₹{simulationResult.beforeLedger.totalDisposalCostUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Spoilage Volume</span>
                        <span style={{ color: "#f87171" }}>
                          {simulationResult.beforeLedger.totalSpoilageVolumeKg.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="row total">
                        <span>Net Operating Profit</span>
                        <span>₹{simulationResult.beforeLedger.netOperatingProfitUsd.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.scenarioCol} ${styles.positive}`}>
                    <div className={styles.scenarioName}>
                      <span>Simulated Plan (With Approved Discounts)</span>
                      <CheckCircle2 size={14} color="#4ade80" />
                    </div>
                    <div className={styles.scenarioRows}>
                      <div className="row">
                        <span>Gross Revenue</span>
                        <span style={{ color: "#4ade80" }}>
                          ₹{simulationResult.afterLedger.totalGrossRevenueUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Transport Costs</span>
                        <span>₹{simulationResult.afterLedger.totalTransportCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="row">
                        <span>Landfill Disposal Costs</span>
                        <span style={{ color: "#38bdf8" }}>
                          ₹{simulationResult.afterLedger.totalDisposalCostUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Spoilage Volume</span>
                        <span style={{ color: "#4ade80" }}>
                          {simulationResult.afterLedger.totalSpoilageVolumeKg.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="row total">
                        <span>Net Operating Profit</span>
                        <span style={{ color: "#4ade80" }}>
                          ₹{simulationResult.afterLedger.netOperatingProfitUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.sectionBox}>
                <span className={styles.sectionTitle}>Differential Economic Summary</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Profit Uplift</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ade80", fontFamily: "monospace" }}>
                      +₹{simulationResult.comparison.profitDeltaUsd.toFixed(2)} ({simulationResult.comparison.profitUpliftPercent.toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Spoilage Diverted</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
                      -{simulationResult.comparison.spoilageReductionKg.toLocaleString()} kg ({simulationResult.comparison.spoilageReductionPercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Recalculated with zero double-counting via shared economic ledger
              </span>
              <button className={styles.btnPrimary} onClick={() => setShowSimModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
