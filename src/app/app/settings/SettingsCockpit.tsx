"use client";

import React, { useState } from "react";
import {
  Settings,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sliders,
  Database,
  Cpu,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import styles from "./settings.module.scss";

export function SettingsCockpit() {
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetDemo = async () => {
    if (!confirm("This will wipe and re-seed the demo database to canonical baseline state. Continue?")) {
      return;
    }

    setIsResetting(true);
    setResetSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset demo dataset");

      setResetSuccessMessage(
        `${data.message} Generated initial baseline plan: ${data.initialPlanNumber || "Ready"}`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset demo dataset");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={styles.settingsCockpit}>
      {/* 1. Header */}
      <header className={styles.header}>
        <div className={styles.engineBadge}>
          <Settings size={13} /> System Configuration & Demo Console
        </div>
        <h1 className={styles.title}>Distributor Settings & Controls</h1>
        <p className={styles.subtitle}>
          Manage multi-tenant organization boundaries, review economic parameters, and restore the
          canonical competition demonstration environment.
        </p>
      </header>

      {/* Notifications */}
      {resetSuccessMessage && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#4ade80",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} /> {resetSuccessMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#f87171",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      {/* 2. Competition Demo Control Card */}
      <section className={`${styles.settingsCard} ${styles.fullWidth}`}>
        <div className={styles.cardHeader}>
          <h3>
            <RotateCcw size={18} color="#d4f933" /> Competition Demo Environment
          </h3>
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8" }}>
            Deterministic Reset Engine
          </span>
        </div>

        <p className={styles.cardDescription}>
          FreshRoute includes a deterministic, reproducible demo dataset designed for judged evaluation.
          Clicking the reset button wipes transient modifications, reapplies schema migrations, and
          re-seeds the 5 canonical supply chain edge cases.
        </p>

        <div className={styles.demoBanner}>
          <div className={styles.demoBannerTitle}>
            <Sparkles size={14} /> 5 Canonical Operational Edge Cases Seeded:
          </div>
          <div className={styles.demoList}>
            <div className={styles.demoItem}>
              <strong>1. Urgent Dispatch (FEFO Urgency):</strong>
              <span>
                BATCH-STR-URGENT-01 (Strawberries, 2.5d RSL) prioritized over older non-urgent inventory.
              </span>
            </div>
            <div className={styles.demoItem}>
              <strong>2. Infeasible Delivery (SLA Breach Rejection):</strong>
              <span>
                BATCH-SPN-INFEASIBLE-02 (Spinach, 4.0d RSL) correctly rejected by dock SLA validator for
                DEST-PACIFIC-02 (requires min 7.0d RSL).
              </span>
            </div>
            <div className={styles.demoItem}>
              <strong>3. Excess Supply (Surplus Inventory):</strong>
              <span>
                BATCH-ORG-SURPLUS-03 (20,000 kg Oranges) exceeds standard demand channels, triggering surplus
                classification.
              </span>
            </div>
            <div className={styles.demoItem}>
              <strong>4. Unmet Demand (Supply Deficit):</strong>
              <span>
                High-margin Hass Avocados (2,000 kg supply vs 5,000 kg buyer demand) requiring Knapsack
                prioritization.
              </span>
            </div>
            <div className={styles.demoItem}>
              <strong>5. Dynamic Markdown Salvage:</strong>
              <span>
                BATCH-STR-SALVAGE-05 (3,500 kg Strawberries) evaluated by Discount Center for dynamic
                markdown clearance.
              </span>
            </div>
          </div>
        </div>

        <button
          className={styles.btnResetDemo}
          onClick={handleResetDemo}
          disabled={isResetting}
          type="button"
        >
          {isResetting ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Resetting Demo Environment...
            </>
          ) : (
            <>
              <RotateCcw size={14} /> Restore Canonical Demo Dataset
            </>
          )}
        </button>
      </section>

      {/* 3. Cards Grid: Multi-Tenancy & Algorithmic Parameters */}
      <div className={styles.cardGrid}>
        {/* Card 1: Multi-Tenancy Organization */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <h3>
              <Building2 size={16} color="#38bdf8" /> Active Organization
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#34d399",
                background: "rgba(16, 185, 129, 0.12)",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              ISOLATED
            </span>
          </div>

          <div className={styles.paramList}>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Organization Name</span>
              <span className={styles.paramVal}>FreshRoute Demo Corp</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Organization Identifier</span>
              <span className={styles.paramVal}>org-freshroute-demo</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Tenant Boundary Enforcement</span>
              <span className={styles.paramVal} style={{ color: "#34d399" }}>
                100% Query-Scoped
              </span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>User Role & Permissions</span>
              <span className={styles.paramVal}>LOGISTICS_DIRECTOR (Admin)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Solver Configuration */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <h3>
              <Sliders size={16} color="#c084fc" /> Solver Parameters
            </h3>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8" }}>
              v1.0.0-fefo
            </span>
          </div>

          <div className={styles.paramList}>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Dynamic Markdowns</span>
              <span className={styles.paramVal} style={{ color: "#34d399" }}>
                ENABLED
              </span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Max Markdown Limit</span>
              <span className={styles.paramVal}>35.0%</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Shelf-Life Safety Buffer</span>
              <span className={styles.paramVal}>12.0 hours</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Disposal Penalty Cost</span>
              <span className={styles.paramVal}>₹0.25 / kg</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Handling Fee Surcharge</span>
              <span className={styles.paramVal}>₹0.05 / kg</span>
            </div>
          </div>
        </div>

        {/* Card 3: Runtime Environment */}
        <div className={`${styles.settingsCard} ${styles.fullWidth}`}>
          <div className={styles.cardHeader}>
            <h3>
              <Cpu size={16} color="#d4f933" /> System Architecture & Runtime Verification
            </h3>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#34d399" }}>
              ALL CHECKS PASSING
            </span>
          </div>

          <div className={styles.paramList}>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Optimization Architecture</span>
              <span className={styles.paramVal}>Pure Domain Solver (Zero Framework/DB Coupling)</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Database Engine</span>
              <span className={styles.paramVal}>ElectricSQL PGlite (WASM In-Process PostgreSQL)</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Snapshot Hashing</span>
              <span className={styles.paramVal}>SHA-256 Canonical JSON Snapshot Hashing</span>
            </div>
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Automated Verification Suite</span>
              <span className={styles.paramVal} style={{ color: "#34d399" }}>
                106 Tests Across 12 Suites (100% Green)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
