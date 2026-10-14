"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";
import { Badge } from "../ui/badge/Badge";
import clsx from "clsx";
import styles from "./BaselineComparisonVisualizer.module.scss";

type ComparisonMode = "freshroute" | "baseline";

export function BaselineComparisonVisualizer() {
  const [activeMode, setActiveMode] = useState<ComparisonMode>("freshroute");

  return (
    <section id="baseline-proof" className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowText}>{"[ 04 // EMPIRICAL BENCHMARK ]"}</span>
            <Badge variant="lime" size="sm">
              DOCUMENTED COMPARISON
            </Badge>
          </div>
          <h2 className={styles.title}>
            Documented Baseline Proof: Proposed Plan vs. FIFO Status Quo
          </h2>
          <p className={styles.subtitle}>
            Every FreshRoute dispatch run runs in parallel against a strict, documented FIFO baseline.
            Toggle between the proposed plan and the legacy benchmark below to inspect the quantifiable delta.
          </p>
          <div className={styles.demoNotice}>
            <Info size={14} className={styles.infoIcon} />
            <span>
              <b>Notice:</b> Figures below are illustrative demo data derived from our Phase 1 pure domain
              solver benchmark simulation across a 32-batch weekly distribution run.
            </span>
          </div>
        </div>

        {/* Interactive Mode Switcher Toggle */}
        <div className={styles.toggleContainer}>
          <button
            type="button"
            className={clsx(
              styles.toggleBtn,
              activeMode === "baseline" && styles.activeBaselineBtn
            )}
            onClick={() => setActiveMode("baseline")}
          >
            <span className={styles.toggleIndicator} />
            Documented Baseline (Traditional FIFO)
          </button>
          <button
            type="button"
            className={clsx(
              styles.toggleBtn,
              activeMode === "freshroute" && styles.activeFreshRouteBtn
            )}
            onClick={() => setActiveMode("freshroute")}
          >
            <span className={styles.toggleIndicator} />
            FreshRoute Proposed (FEFO + Dynamic Markdown)
          </button>
        </div>

        {/* Comparison Dashboard Grid */}
        <div className={styles.kpiGrid}>
          {/* KPI 1: Net Profit */}
          <div className={clsx(styles.kpiCard, activeMode === "freshroute" && styles.highlightCard)}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Net Distributor Profit</span>
              <DollarSign size={16} className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>
              {activeMode === "freshroute" ? "$166,950" : "$142,300"}
            </div>
            <div className={styles.kpiDelta}>
              {activeMode === "freshroute" ? (
                <span className={styles.deltaSuccess}>
                  <TrendingUp size={14} /> +$24,650 (+17.3% profit uplift)
                </span>
              ) : (
                <span className={styles.deltaMuted}>Baseline reference benchmark</span>
              )}
            </div>
          </div>

          {/* KPI 2: Spoilage Weight */}
          <div className={clsx(styles.kpiCard, activeMode === "freshroute" && styles.highlightCard)}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Produce Waste (Spoilage)</span>
              <Scale size={16} className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>
              {activeMode === "freshroute" ? "3,180 kg" : "4,820 kg"}
            </div>
            <div className={styles.kpiDelta}>
              {activeMode === "freshroute" ? (
                <span className={styles.deltaSuccess}>
                  <TrendingDown size={14} /> -1,640 kg (-34.0% waste prevented)
                </span>
              ) : (
                <span className={styles.deltaDanger}>18.2% of unallocated stock lost</span>
              )}
            </div>
          </div>

          {/* KPI 3: SLA Rejections */}
          <div className={clsx(styles.kpiCard, activeMode === "freshroute" && styles.highlightCard)}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Retail SLA Dock Rejections</span>
              <AlertTriangle size={16} className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>
              {activeMode === "freshroute" ? "1 incident" : "14 incidents"}
            </div>
            <div className={styles.kpiDelta}>
              {activeMode === "freshroute" ? (
                <span className={styles.deltaSuccess}>
                  <TrendingDown size={14} /> -92.8% rejection chargebacks
                </span>
              ) : (
                <span className={styles.deltaDanger}>$11,200 in return freight & fines</span>
              )}
            </div>
          </div>

          {/* KPI 4: Salvage Revenue */}
          <div className={clsx(styles.kpiCard, activeMode === "freshroute" && styles.highlightCard)}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Dynamic Markdown Salvage</span>
              <TrendingUp size={16} className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>
              {activeMode === "freshroute" ? "$18,450" : "$0"}
            </div>
            <div className={styles.kpiDelta}>
              {activeMode === "freshroute" ? (
                <span className={styles.deltaSuccess}>
                  <TrendingUp size={14} /> 4 batches liquidated at 15% markdown
                </span>
              ) : (
                <span className={styles.deltaMuted}>Zero dynamic discounts (100% loss)</span>
              )}
            </div>
          </div>
        </div>

        {/* Narrative Deep Dive Card */}
        <div className={styles.narrativeCard}>
          <div className={styles.narrativeHeader}>
            <span className={styles.narrativeTag}>
              {activeMode === "freshroute" ? "OPTIMIZATION RATIONALE" : "BASELINE VULNERABILITY ANALYSIS"}
            </span>
            <span className={styles.narrativeDate}>Simulation Run: Pacific Salinas Hub</span>
          </div>

          <div className={styles.narrativeBody}>
            {activeMode === "freshroute" ? (
              <p>
                <b>FreshRoute Solution:</b> Under the proposed FEFO plan, 350 kg of Sweet Strawberries (Lot
                #B-BERRY-802) had 2.6 days remaining shelf-life, which breached Metro Fresh’s 5.0-day minimum SLA.
                Instead of dispatching to Metro Fresh (which would trigger an immediate dock rejection), the solver
                diverted the lot to Valley Pre-Cut at a 15% dynamic discount, generating $1,338.75 in salvage
                revenue. Simultaneously, Route R-04’s reefer capacity was optimized to 94.2% payload by packaging
                compliant Spinach and Avocados, capturing maximum retail contract margin.
              </p>
            ) : (
              <p>
                <b>Traditional FIFO Failure:</b> Under legacy FIFO ordering, Lot #B-BERRY-802 was dispatched to
                Metro Fresh solely because it arrived in the warehouse before newer lots. Upon arrival at Metro
                Fresh’s distribution center 4 hours later, the remaining shelf life was 2.4 days—violating the
                strict 5-day acceptance contract. The entire 350 kg load was rejected on the dock, incurring $450 in
                return freight and $1,050 in total spoilage disposal write-offs.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
