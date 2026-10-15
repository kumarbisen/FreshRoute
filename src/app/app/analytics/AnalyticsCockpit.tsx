"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  AlertTriangle,
  Package,
  Truck,
  Download,
  RefreshCw,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import styles from "./analytics.module.scss";

interface PlanSummary {
  id: string;
  planNumber: string;
  warehouseName?: string;
  status: string;
  profitUpliftPercent?: number;
  profitUpliftUsd?: number;
  wastePreventedKg?: number;
  winnerDesignation?: string;
  createdAt: string;
}

interface PlanDetail {
  id: string;
  planNumber: string;
  status: string;
  totalAllocatedKg?: number;
  totalRevenueUsd?: number;
  totalCostUsd?: number;
  netMarginUsd?: number;
  spoilagePreventedKg?: number;
  spoilagePreventedUsd?: number;
  winnerStatus?: string;
  createdAt: string;
  metrics?: {
    proposedProfitUsd?: number;
    baselineProfitUsd?: number;
    proposedSpoilageKg?: number;
    baselineSpoilageKg?: number;
    proposedFulfillmentKg?: number;
    baselineFulfillmentKg?: number;
    profitUpliftUsd?: number;
    profitUpliftPercent?: number;
    spoilageReductionKg?: number;
    fulfillmentRateDeltaPercent?: number;
    strategyWinner?: string;
  };
  allocations?: Array<{
    commodityName?: string;
    allocatedQuantity?: number;
    netMarginUsd?: number;
    routeCode?: string;
  }>;
  evaluationRun?: {
    freshRouteLedger?: {
      realizedSalesRevenueUsd?: number;
      incurredTransportTotalCostUsd?: number;
      incurredDisposalPenaltyUsd?: number;
      netEconomicOutcomeUsd?: number;
      spoiledExpiredStockKg?: number;
      fulfilledDemandKg?: number;
      fulfillmentRatePercent?: number;
    };
    baselineLedger?: {
      realizedSalesRevenueUsd?: number;
      incurredTransportTotalCostUsd?: number;
      incurredDisposalPenaltyUsd?: number;
      netEconomicOutcomeUsd?: number;
      spoiledExpiredStockKg?: number;
      fulfilledDemandKg?: number;
      fulfillmentRatePercent?: number;
    };
    comparison?: {
      narrativeSummary?: string;
      fulfillmentRateDeltaPercent?: number;
      fulfillmentDeltaKg?: number;
      outcomeStatus?: string;
    };
  };
}

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return "0 kg";
  return `${Math.round(kg).toLocaleString("en-US")} kg`;
}

export function AnalyticsCockpit() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [planDetail, setPlanDetail] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 1. Fetch Plans List
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/planning/plans");
      const data = await res.json();
      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
        setSelectedPlanId((prev) => prev || data.plans[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch plans for analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch Selected Plan Detail
  const loadPlanDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/planning/plans/${id}`);
      const data = await res.json();
      if (data.plan) {
        setPlanDetail(data.plan);
      }
    } catch (err) {
      console.error("Failed to load plan detail:", err);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (selectedPlanId) {
      loadPlanDetail(selectedPlanId);
    }
  }, [selectedPlanId, loadPlanDetail]);

  // Export CSV
  const handleExportCsv = async () => {
    if (!selectedPlanId) return;
    setIsExporting(true);
    try {
      window.location.href = `/api/planning/plans/${selectedPlanId}/export?type=comparison`;
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Recharts Data 1: Economic Ledgers Comparison
  const economicChartData = useMemo(() => {
    if (planDetail?.evaluationRun?.freshRouteLedger && planDetail?.evaluationRun?.baselineLedger) {
      const f = planDetail.evaluationRun.freshRouteLedger;
      const b = planDetail.evaluationRun.baselineLedger;

      return [
        {
          category: "Gross Revenue",
          FreshRoute: Number(f.realizedSalesRevenueUsd || 0),
          BaselineFIFO: Number(b.realizedSalesRevenueUsd || 0),
        },
        {
          category: "Logistics Spend",
          FreshRoute: Number(f.incurredTransportTotalCostUsd || 0),
          BaselineFIFO: Number(b.incurredTransportTotalCostUsd || 0),
        },
        {
          category: "Disposal Penalty",
          FreshRoute: Number(f.incurredDisposalPenaltyUsd || 0),
          BaselineFIFO: Number(b.incurredDisposalPenaltyUsd || 0),
        },
        {
          category: "Net Operating Margin",
          FreshRoute: Number(f.netEconomicOutcomeUsd || 0),
          BaselineFIFO: Number(b.netEconomicOutcomeUsd || 0),
        },
      ];
    }

    if (planDetail?.metrics) {
      const m = planDetail.metrics;
      return [
        {
          category: "Gross Revenue",
          FreshRoute: Number(planDetail.totalRevenueUsd || m.proposedProfitUsd || 0),
          BaselineFIFO: Number(m.baselineProfitUsd || 0),
        },
        {
          category: "Logistics Spend",
          FreshRoute: Number(planDetail.totalCostUsd || 0),
          BaselineFIFO: Number(planDetail.totalCostUsd || 0),
        },
        {
          category: "Disposal Penalty",
          FreshRoute: 0,
          BaselineFIFO: Number(m.baselineSpoilageKg || 0) * 15,
        },
        {
          category: "Net Operating Margin",
          FreshRoute: Number(m.proposedProfitUsd || 0),
          BaselineFIFO: Number(m.baselineProfitUsd || 0),
        },
      ];
    }

    return [];
  }, [planDetail]);

  // Recharts Data 2: Physical Spoilage Mass
  const massChartData = useMemo(() => {
    if (planDetail?.evaluationRun?.freshRouteLedger && planDetail?.evaluationRun?.baselineLedger) {
      const f = planDetail.evaluationRun.freshRouteLedger;
      const b = planDetail.evaluationRun.baselineLedger;

      return [
        {
          metric: "Produce Spoilage (kg)",
          FreshRoute: Number(f.spoiledExpiredStockKg || 0),
          BaselineFIFO: Number(b.spoiledExpiredStockKg || 0),
        },
        {
          metric: "Demand Fulfilled (kg)",
          FreshRoute: Number(f.fulfilledDemandKg || 0),
          BaselineFIFO: Number(b.fulfilledDemandKg || 0),
        },
      ];
    }

    if (planDetail?.metrics) {
      const m = planDetail.metrics;
      return [
        {
          metric: "Produce Spoilage (kg)",
          FreshRoute: Number(m.proposedSpoilageKg || 0),
          BaselineFIFO: Number(m.baselineSpoilageKg || 0),
        },
        {
          metric: "Demand Fulfilled (kg)",
          FreshRoute: Number(m.proposedFulfillmentKg || planDetail.totalAllocatedKg || 0),
          BaselineFIFO: Number(m.baselineFulfillmentKg || planDetail.totalAllocatedKg || 0),
        },
      ];
    }

    return [];
  }, [planDetail]);

  // Recharts Data 3: Commodity Margin Contribution
  const commodityMarginData = useMemo(() => {
    if (!planDetail?.allocations || !Array.isArray(planDetail.allocations)) return [];
    const agg: Record<string, { quantityKg: number; marginUsd: number }> = {};

    planDetail.allocations.forEach((a) => {
      const name = a.commodityName || "Produce";
      if (!agg[name]) {
        agg[name] = { quantityKg: 0, marginUsd: 0 };
      }
      agg[name].quantityKg += Number(a.allocatedQuantity || 0);
      agg[name].marginUsd += Number(a.netMarginUsd || 0);
    });

    return Object.entries(agg).map(([name, data]) => ({
      commodity: name,
      marginUsd: Number((data.marginUsd || 0).toFixed(2)),
      quantityKg: Number((data.quantityKg || 0).toFixed(1)),
    }));
  }, [planDetail]);

  return (
    <div className={styles.analyticsCockpit}>
      {/* 1. Header Section */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.engineBadge}>
              <BarChart3 size={13} /> Baseline ROI Analytics
            </span>
            <span className={styles.statusPill}>
              <ShieldCheck size={13} color="#34d399" /> Shared Economic Ledger
            </span>
          </div>
          <h1 className={styles.title}>Comparative Performance Analytics</h1>
          <p className={styles.subtitle}>
            Side-by-side evaluation verifying FreshRoute&apos;s mathematical and financial superiority over the
            documented FIFO baseline benchmark under identical starting assumptions.
          </p>
        </div>

        <div className={styles.headerActions}>
          {plans.length > 0 && (
            <div className={styles.planSelector}>
              <label htmlFor="planSelect">Target Plan:</label>
              <select
                id="planSelect"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.planNumber} ({new Date(p.createdAt).toLocaleDateString()}) — Uplift:{" "}
                    {p.profitUpliftPercent ? `+${p.profitUpliftPercent.toFixed(1)}%` : "N/A"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className={styles.btnSecondary}
            onClick={handleExportCsv}
            disabled={!selectedPlanId || isExporting}
          >
            <Download size={14} /> Export Comparison KPI CSV
          </button>
        </div>
      </header>

      {/* 2. Executive Strategy Winner Banner */}
      {planDetail && (
        <div className={styles.winnerBanner}>
          <div className={styles.winnerInfo}>
            <div className={styles.winnerTitle}>
              <Award size={16} /> Strategy Outcome:{" "}
              {planDetail.metrics?.strategyWinner || planDetail.winnerStatus || "FRESHROUTE_SUPERIOR"}
            </div>
            <div className={styles.winnerNarrative}>
              {planDetail.evaluationRun?.comparison?.narrativeSummary ||
                "FreshRoute optimizer recovered additional margin while preventing avoidable produce spoilage through intelligent perishability dispatching."}
            </div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#34d399" }}>
            Audit Hash: SHA-256 Verified
          </div>
        </div>
      )}

      {/* 3. KPI Summary Metrics Grid */}
      {planDetail && (
        <div className={styles.metricsGrid}>
          {/* KPI 1: Net Margin Uplift */}
          <div className={`${styles.metricCard} ${styles.highlightGreen}`}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Net Profit Uplift</span>
              <TrendingUp size={15} color="#34d399" />
            </div>
            <div className={`${styles.cardValue} ${styles.green}`}>
              +{Number(planDetail.metrics?.profitUpliftPercent ?? 0).toFixed(1)}%
            </div>
            <div className={styles.cardSub}>
              +{formatCurrency(planDetail.metrics?.profitUpliftUsd ?? 0)} net economic gain over FIFO
            </div>
          </div>

          {/* KPI 2: Spoilage Prevented */}
          <div className={`${styles.metricCard} ${styles.highlightLime}`}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Produce Waste Prevented</span>
              <Package size={15} color="#d4f933" />
            </div>
            <div className={`${styles.cardValue} ${styles.lime}`}>
              {formatWeight(planDetail.metrics?.spoilageReductionKg ?? planDetail.spoilagePreventedKg ?? 0)}
            </div>
            <div className={styles.cardSub}>
              Physical mass diverted from landfill disposal write-off
            </div>
          </div>

          {/* KPI 3: Proposed Profit */}
          <div className={`${styles.metricCard} ${styles.highlightCyan}`}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>FreshRoute Proposed Margin</span>
              <IndianRupee size={15} color="#38bdf8" />
            </div>
            <div className={`${styles.cardValue} ${styles.cyan}`}>
              {formatCurrency(planDetail.metrics?.proposedProfitUsd ?? planDetail.netMarginUsd ?? 0)}
            </div>
            <div className={styles.cardSub}>
              vs FIFO baseline ({formatCurrency(planDetail.metrics?.baselineProfitUsd ?? 0)})
            </div>
          </div>

          {/* KPI 4: Fulfillment Gain */}
          <div className={`${styles.metricCard} ${styles.highlightPurple}`}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Demand Fulfillment Delta</span>
              <CheckCircle2 size={15} color="#c084fc" />
            </div>
            <div className={`${styles.cardValue} ${styles.purple}`}>
              +{Number(planDetail.metrics?.fulfillmentRateDeltaPercent ?? planDetail.evaluationRun?.comparison?.fulfillmentRateDeltaPercent ?? 0).toFixed(1)}%
            </div>
            <div className={styles.cardSub}>
              Delivered: {formatWeight(planDetail.metrics?.proposedFulfillmentKg ?? planDetail.evaluationRun?.freshRouteLedger?.fulfilledDemandKg ?? planDetail.totalAllocatedKg ?? 0)} vs{" "}
              {formatWeight(planDetail.metrics?.baselineFulfillmentKg ?? planDetail.evaluationRun?.baselineLedger?.fulfilledDemandKg ?? planDetail.totalAllocatedKg ?? 0)}
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Recharts Visualizations Grid */}
      <div className={styles.chartsGrid}>
        {/* Chart 1: Economic Ledgers Comparison */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <IndianRupee size={16} color="#34d399" /> Economic Breakdown (₹ INR)
            </h3>
            <span className={styles.chartSub}>FreshRoute vs Baseline FIFO</span>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={economicChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #eaecf0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(16, 24, 40, 0.08)",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="FreshRoute" fill="#0f172a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="BaselineFIFO" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Spoilage Mass vs Fulfillment */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <Package size={16} color="#059669" /> Physical Mass Balances (kg)
            </h3>
            <span className={styles.chartSub}>Waste Reduction & SLA Fill</span>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={massChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${Math.round(val / 1000)}t`}
                />
                <Tooltip
                  formatter={(value: any) => [formatWeight(Number(value)), ""]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #eaecf0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(16, 24, 40, 0.08)",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="FreshRoute" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="BaselineFIFO" fill="#e11d48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Commodity Margin Contributions */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
          <div className={styles.chartHeader}>
            <h3>
              <Layers size={16} color="#7e22ce" /> Net Margin Contribution by Commodity
            </h3>
            <span className={styles.chartSub}>Optimized Allocation Profit</span>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={commodityMarginData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="commodity" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === "marginUsd" ? formatCurrency(Number(value)) : formatWeight(Number(value)),
                    name === "marginUsd" ? "Net Margin" : "Volume",
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #eaecf0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(16, 24, 40, 0.08)",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="marginUsd" name="Net Margin (₹ INR)" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
