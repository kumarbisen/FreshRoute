"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sliders,
  Play,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Package,
  Truck,
  ShieldAlert,
  Info,
  RefreshCw,
  FileText,
  Layers,
  Activity,
  Trash2,
  History,
  BarChart3,
  Sparkles,
  Flame,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import styles from "./scenarios.module.scss";
import {
  ScenarioEvaluationResult,
  ScenarioOverrides,
  AllocationDiffItem,
  NewlyInfeasibleDelivery,
  BatchUrgencyMigration,
  SensitivityParameter,
  SensitivityResult,
  SCENARIO_ENGINE_VERSION,
} from "@/engine/scenario-engine";

// ============================================================================
// HELPER TYPES & FORMATTERS
// ============================================================================

export interface PlanItem {
  id: string;
  planNumber: string;
  warehouseName?: string;
  status: string;
  createdAt: string;
}

export interface PersistedScenarioItem {
  id: string;
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

function formatSignedPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function formatSignedCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0.00";
  const sign = val > 0 ? "+" : "";
  return `${sign}${formatCurrency(val)}`;
}

// Preset definitions
interface PresetDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  overrides: ScenarioOverrides;
}

const PRESETS: PresetDef[] = [
  {
    id: "HIGHWAY_101",
    label: "Highway 101 Closure (+3.5h Delay)",
    icon: Truck,
    description: "+3.5 hours carrier transit delay on coastal freight corridors",
    overrides: {
      transitDelayHours: 3.5,
      transitDelayPercent: 50,
      demandMultiplierPercent: 100,
      priceMultiplierPercent: 100,
      capacityMultiplierPercent: 100,
      shelfLifeReductionPercent: 0,
    },
  },
  {
    id: "HEATWAVE",
    label: "Harvest Heatwave (-25% Shelf Life)",
    icon: Flame,
    description: "-25% remaining shelf life from pre-cooling failure & ambient heat",
    overrides: {
      shelfLifeReductionPercent: 25,
      shelfLifeReductionHours: 12,
      transitDelayHours: 0,
      transitDelayPercent: 0,
      demandMultiplierPercent: 100,
      priceMultiplierPercent: 100,
      capacityMultiplierPercent: 100,
    },
  },
  {
    id: "REEFER_DOWN",
    label: "Fleet Breakdown (-50% Capacity)",
    icon: ShieldAlert,
    description: "-50% transport payload capacity due to mechanical reefer outage",
    overrides: {
      capacityMultiplierPercent: 50,
      transitDelayHours: 0,
      transitDelayPercent: 0,
      demandMultiplierPercent: 100,
      priceMultiplierPercent: 100,
      shelfLifeReductionPercent: 0,
    },
  },
  {
    id: "DEMAND_CONTRACTION",
    label: "Demand Shock (-30% Orders)",
    icon: TrendingDown,
    description: "-30% destination order volume from wholesale buyer cancellation",
    overrides: {
      demandMultiplierPercent: 70,
      transitDelayHours: 0,
      transitDelayPercent: 0,
      priceMultiplierPercent: 100,
      capacityMultiplierPercent: 100,
      shelfLifeReductionPercent: 0,
    },
  },
  {
    id: "PRICE_SLUMP",
    label: "Market Price Slump (-20%)",
    icon: IndianRupee,
    description: "-20% wholesale market price drop across destination demand",
    overrides: {
      priceMultiplierPercent: 80,
      demandMultiplierPercent: 100,
      transitDelayHours: 0,
      transitDelayPercent: 0,
      capacityMultiplierPercent: 100,
      shelfLifeReductionPercent: 0,
    },
  },
  {
    id: "COMPOUND_STORM",
    label: "Compound Logistics Storm",
    icon: Zap,
    description: "+3h transit delay, -20% shelf life, -25% demand, -30% fleet capacity",
    overrides: {
      transitDelayHours: 3.0,
      transitDelayPercent: 35,
      shelfLifeReductionPercent: 20,
      demandMultiplierPercent: 75,
      capacityMultiplierPercent: 70,
      priceMultiplierPercent: 90,
    },
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScenarioLabCockpit() {
  // 1. Data Source State
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [savedScenarios, setSavedScenarios] = useState<PersistedScenarioItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [isGeneratingBasePlan, setIsGeneratingBasePlan] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 2. Active Scenario Evaluation Result
  const [activeResult, setActiveResult] = useState<ScenarioEvaluationResult | null>(null);

  // 3. Scenario Parameter Sliders
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [transitDelayHours, setTransitDelayHours] = useState<number>(0);
  const [transitDelayPercent, setTransitDelayPercent] = useState<number>(0);
  const [demandMultiplierPercent, setDemandMultiplierPercent] = useState<number>(100);
  const [priceMultiplierPercent, setPriceMultiplierPercent] = useState<number>(100);
  const [capacityMultiplierPercent, setCapacityMultiplierPercent] = useState<number>(100);
  const [shelfLifeReductionPercent, setShelfLifeReductionPercent] = useState<number>(0);

  // Custom scenario details
  const [scenarioName, setScenarioName] = useState<string>("What-If Operational Stress Test");
  const [scenarioDesc, setScenarioDesc] = useState<string>("Simulation of carrier transit delays and shelf-life decay");

  // 4. Tab Navigation & Table Filters
  const [activeTab, setActiveTab] = useState<"infeasible" | "diffs" | "urgency" | "sensitivity" | "history">("infeasible");
  const [diffFilter, setDiffFilter] = useState<string>("ALL");

  // 5. Sensitivity Sweep Configuration
  const [sweepParam, setSweepParam] = useState<SensitivityParameter>("transitDelayPercent");
  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null);

  // ============================================================================
  // DATA FETCHING & INITIALIZATION
  // ============================================================================

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [plansRes, scenariosRes] = await Promise.all([
        fetch("/api/planning/plans").then((r) => r.json()).catch(() => ({ plans: [] })),
        fetch("/api/scenarios").then((r) => r.json()).catch(() => ({ scenarios: [] })),
      ]);

      if (plansRes.plans && plansRes.plans.length > 0) {
        setPlans(plansRes.plans);
        setSelectedPlanId((prev) => prev || plansRes.plans[0].id);
      }

      if (scenariosRes.scenarios) {
        setSavedScenarios(scenariosRes.scenarios);
      }
    } catch (err: any) {
      console.error("Failed to load scenario laboratory data:", err);
      setErrorMessage("Could not connect to planning database. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Flash action success alert
  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // ============================================================================
  // PRESET & RESET ACTIONS
  // ============================================================================

  const handleApplyPreset = (preset: PresetDef) => {
    setActivePreset(preset.id);
    setScenarioName(preset.label);
    setScenarioDesc(preset.description);

    setTransitDelayHours(preset.overrides.transitDelayHours ?? 0);
    setTransitDelayPercent(preset.overrides.transitDelayPercent ?? 0);
    setDemandMultiplierPercent(preset.overrides.demandMultiplierPercent ?? 100);
    setPriceMultiplierPercent(preset.overrides.priceMultiplierPercent ?? 100);
    setCapacityMultiplierPercent(preset.overrides.capacityMultiplierPercent ?? 100);
    setShelfLifeReductionPercent(preset.overrides.shelfLifeReductionPercent ?? 0);
  };

  const handleResetSliders = () => {
    setActivePreset(null);
    setTransitDelayHours(0);
    setTransitDelayPercent(0);
    setDemandMultiplierPercent(100);
    setPriceMultiplierPercent(100);
    setCapacityMultiplierPercent(100);
    setShelfLifeReductionPercent(0);
    setScenarioName("Custom Disruption Simulation");
    setScenarioDesc("Custom parameter stress test");
  };

  // Generate a base plan on the fly if none exists
  const handleGenerateBasePlan = async () => {
    setIsGeneratingBasePlan(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate initial plan");

      showSuccess(`Base distribution plan generated successfully: ${data.plan?.planNumber || "Plan created"}`);
      await loadInitialData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate base plan");
    } finally {
      setIsGeneratingBasePlan(false);
    }
  };

  // ============================================================================
  // EXECUTE SCENARIO RUN
  // ============================================================================

  const handleRunScenario = async () => {
    setIsRunning(true);
    setErrorMessage(null);

    const overrides: ScenarioOverrides = {};
    if (transitDelayHours > 0) overrides.transitDelayHours = transitDelayHours;
    if (transitDelayPercent > 0) overrides.transitDelayPercent = transitDelayPercent;
    if (demandMultiplierPercent !== 100) overrides.demandMultiplierPercent = demandMultiplierPercent;
    if (priceMultiplierPercent !== 100) overrides.priceMultiplierPercent = priceMultiplierPercent;
    if (capacityMultiplierPercent !== 100) overrides.capacityMultiplierPercent = capacityMultiplierPercent;
    if (shelfLifeReductionPercent > 0) overrides.shelfLifeReductionPercent = shelfLifeReductionPercent;

    try {
      const res = await fetch("/api/scenarios/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePlanId: selectedPlanId || undefined,
          name: scenarioName,
          description: scenarioDesc,
          overrides,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scenario evaluation failed");

      setActiveResult(data.scenario);
      showSuccess(`Scenario simulation completed: "${scenarioName}" evaluated without mutating base plan.`);

      // Refresh list of saved scenarios
      const listRes = await fetch("/api/scenarios").then((r) => r.json());
      if (listRes.scenarios) {
        setSavedScenarios(listRes.scenarios);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute scenario");
    } finally {
      setIsRunning(false);
    }
  };

  // ============================================================================
  // SENSITIVITY SWEEP ACTION
  // ============================================================================

  const handleRunSensitivity = async () => {
    setIsSweeping(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/scenarios/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePlanId: selectedPlanId || undefined,
          parameter: sweepParam,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sensitivity sweep failed");

      setSensitivityResult(data.sensitivityResult);
      setActiveTab("sensitivity");
      showSuccess(`Sensitivity analysis sweep completed for ${data.sensitivityResult.parameterName}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to run sensitivity sweep");
    } finally {
      setIsSweeping(false);
    }
  };

  // ============================================================================
  // SCENARIO HISTORY ACTIONS
  // ============================================================================

  const handleLoadSavedScenario = async (id: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/scenarios/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load scenario details");

      const scen: ScenarioEvaluationResult = data.scenario;
      setActiveResult(scen);
      setScenarioName(scen.name);
      setScenarioDesc(scen.description);
      setSelectedPlanId(scen.basePlanId);

      // Populate slider values from overrides
      if (scen.overrides) {
        setTransitDelayHours(scen.overrides.transitDelayHours ?? 0);
        setTransitDelayPercent(scen.overrides.transitDelayPercent ?? 0);
        setDemandMultiplierPercent(scen.overrides.demandMultiplierPercent ?? 100);
        setPriceMultiplierPercent(scen.overrides.priceMultiplierPercent ?? 100);
        setCapacityMultiplierPercent(scen.overrides.capacityMultiplierPercent ?? 100);
        setShelfLifeReductionPercent(scen.overrides.shelfLifeReductionPercent ?? 0);
      }
      showSuccess(`Loaded scenario: "${scen.name}"`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load scenario");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved scenario?")) return;

    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete scenario");

      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      if (activeResult?.scenarioId === id) {
        setActiveResult(null);
      }
      showSuccess("Scenario deleted.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete scenario");
    }
  };

  // ============================================================================
  // FILTERED ALLOCATION DIFFS
  // ============================================================================

  const filteredDiffs = useMemo(() => {
    if (!activeResult?.allocationDiffs) return [];
    if (diffFilter === "ALL") return activeResult.allocationDiffs;
    return activeResult.allocationDiffs.filter((d) => d.type === diffFilter);
  }, [activeResult?.allocationDiffs, diffFilter]);

  // Max profit in sweep for scaling progress bars
  const maxSweepProfit = useMemo(() => {
    if (!sensitivityResult?.points || sensitivityResult.points.length === 0) return 1;
    const max = Math.max(...sensitivityResult.points.map((p) => Math.max(0, p.profitUsd)));
    return max > 0 ? max : 1;
  }, [sensitivityResult?.points]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.scenarioCockpit}>
      {/* 1. Header Section */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.engineBadge}>
              <Sliders size={13} /> Phase 08 Scenario Lab
            </span>
            <span className={styles.statusPill}>
              <ShieldCheck size={13} color="#38bdf8" /> Base Plan Immutability Guaranteed
            </span>
            <span className={styles.statusPill}>
              <Activity size={13} color="#c084fc" /> {SCENARIO_ENGINE_VERSION}
            </span>
          </div>

          <h1 className={styles.title}>What-If Operational Stress Simulator</h1>
          <p className={styles.subtitle}>
            Model the exact financial and physical consequences of carrier delays, temperature excursions,
            fleet capacity reductions, and buyer demand contractions without mutating saved plans or base snapshots.
          </p>
        </div>

        <div className={styles.headerActions}>
          {plans.length > 0 ? (
            <div className={styles.planSelector}>
              <label htmlFor="planSelect">Base Plan:</label>
              <select
                id="planSelect"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                disabled={isRunning || isLoading}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.planNumber} ({p.warehouseName || "Salinas Coolport"}) — {new Date(p.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              className={styles.btnSecondary}
              onClick={handleGenerateBasePlan}
              disabled={isGeneratingBasePlan}
            >
              <Sparkles size={14} />
              {isGeneratingBasePlan ? "Generating Base Plan..." : "Generate Sample Base Plan"}
            </button>
          )}

          <button
            className={styles.btnSecondary}
            onClick={handleResetSliders}
            disabled={isRunning || isLoading}
            title="Reset parameters to 100% baseline"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            className={styles.btnPrimary}
            onClick={handleRunScenario}
            disabled={isRunning || isLoading || plans.length === 0}
          >
            {isRunning ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Simulating...
              </>
            ) : (
              <>
                <Play size={14} /> Run Simulation
              </>
            )}
          </button>
        </div>
      </header>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 16px", color: "#047857", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "12px 16px", color: "#be123c", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      {/* 2. Quick Disruption Presets Bar */}
      <section className={styles.presetBar}>
        <div className={styles.presetTitle}>Quick Stress-Test Presets</div>
        <div className={styles.presetList}>
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                className={`${styles.presetBtn} ${isActive ? styles.active : ""}`}
                onClick={() => handleApplyPreset(p)}
                type="button"
                title={p.description}
              >
                <Icon size={13} /> {p.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Parameter Controls Panel */}
      <section className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <Sliders size={16} color="#c084fc" /> Operational Disruption Sliders
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Scenario Name"
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f8fafc",
                fontSize: "12px",
                padding: "6px 10px",
                fontFamily: "monospace",
                width: "280px",
              }}
            />
          </div>
        </div>

        <div className={styles.slidersGrid}>
          {/* Slider 1: Transit Delay Hours */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTop}>
              <span className={styles.sliderLabel}>Transit Delay Hours</span>
              <span className={styles.sliderValue}>+{transitDelayHours.toFixed(1)} hrs</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={transitDelayHours}
              onChange={(e) => {
                setActivePreset(null);
                setTransitDelayHours(parseFloat(e.target.value));
              }}
            />
            <div className={styles.sliderFooter}>
              <span>0h (On-Time)</span>
              <span>6h</span>
              <span>+12h (Severe Delay)</span>
            </div>
          </div>

          {/* Slider 2: Shelf-Life Reduction */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTop}>
              <span className={styles.sliderLabel}>Shelf-Life Decay</span>
              <span className={styles.sliderValue}>
                {shelfLifeReductionPercent > 0 ? `-${shelfLifeReductionPercent}%` : "0% (Nominal)"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={shelfLifeReductionPercent}
              onChange={(e) => {
                setActivePreset(null);
                setShelfLifeReductionPercent(parseInt(e.target.value, 10));
              }}
            />
            <div className={styles.sliderFooter}>
              <span>0% Decay</span>
              <span>-30%</span>
              <span>-60% (Heat Spike)</span>
            </div>
          </div>

          {/* Slider 3: Demand Multiplier */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTop}>
              <span className={styles.sliderLabel}>Buyer Demand Volume</span>
              <span className={styles.sliderValue}>{demandMultiplierPercent}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={demandMultiplierPercent}
              onChange={(e) => {
                setActivePreset(null);
                setDemandMultiplierPercent(parseInt(e.target.value, 10));
              }}
            />
            <div className={styles.sliderFooter}>
              <span>20% (Crash)</span>
              <span>100% (Baseline)</span>
              <span>150% (Surge)</span>
            </div>
          </div>

          {/* Slider 4: Fleet Capacity Multiplier */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTop}>
              <span className={styles.sliderLabel}>Transport Fleet Capacity</span>
              <span className={styles.sliderValue}>{capacityMultiplierPercent}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={capacityMultiplierPercent}
              onChange={(e) => {
                setActivePreset(null);
                setCapacityMultiplierPercent(parseInt(e.target.value, 10));
              }}
            />
            <div className={styles.sliderFooter}>
              <span>20% (Major Outage)</span>
              <span>60%</span>
              <span>100% (Full Fleet)</span>
            </div>
          </div>

          {/* Slider 5: Wholesale Price Multiplier */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTop}>
              <span className={styles.sliderLabel}>Wholesale Contract Price</span>
              <span className={styles.sliderValue}>{priceMultiplierPercent}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={priceMultiplierPercent}
              onChange={(e) => {
                setActivePreset(null);
                setPriceMultiplierPercent(parseInt(e.target.value, 10));
              }}
            />
            <div className={styles.sliderFooter}>
              <span>50% (Slump)</span>
              <span>100% (Market)</span>
              <span>150% (Premium)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Macro Metrics Comparison Cards */}
      {activeResult ? (
        <>
          <div className={styles.metricsGrid}>
            {/* Metric 1: Net Margin Delta */}
            <div
              className={`${styles.metricCard} ${
                activeResult.deltas.netProfitDeltaUsd < 0 ? styles.highlightLoss : styles.highlightPositive
              }`}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>Net Economic Impact</span>
                <IndianRupee size={15} />
              </div>
              <div
                className={`${styles.cardValue} ${
                  activeResult.deltas.netProfitDeltaUsd < 0 ? styles.red : styles.green
                }`}
              >
                {formatSignedCurrency(activeResult.deltas.netProfitDeltaUsd)}
              </div>
              <div className={styles.cardSub}>
                <span>
                  {formatSignedPercent(activeResult.deltas.netProfitDeltaPercent)} vs base plan (
                  {formatCurrency(activeResult.deltas.scenarioNetProfitUsd)})
                </span>
              </div>
            </div>

            {/* Metric 2: Spoilage Mass Delta */}
            <div
              className={`${styles.metricCard} ${
                activeResult.deltas.spoilageKgDelta > 0 ? styles.highlightLoss : styles.highlightPositive
              }`}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>Simulated Spoilage</span>
                <AlertTriangle size={15} />
              </div>
              <div
                className={`${styles.cardValue} ${
                  activeResult.deltas.spoilageKgDelta > 0 ? styles.red : styles.green
                }`}
              >
                {formatWeight(activeResult.deltas.scenarioSpoilageKg)}
              </div>
              <div className={styles.cardSub}>
                <span>
                  {activeResult.deltas.spoilageKgDelta >= 0 ? "+" : ""}
                  {formatWeight(activeResult.deltas.spoilageKgDelta)} ({formatSignedPercent(
                    activeResult.deltas.spoilageKgDeltaPercent
                  )})
                </span>
              </div>
            </div>

            {/* Metric 3: Demand Fulfillment */}
            <div className={`${styles.metricCard} ${styles.highlightPurple}`}>
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>Fulfillment Mass</span>
                <Package size={15} />
              </div>
              <div className={`${styles.cardValue} ${styles.purple}`}>
                {formatWeight(activeResult.deltas.scenarioFulfillmentKg)}
              </div>
              <div className={styles.cardSub}>
                <span>
                  {formatWeight(activeResult.deltas.fulfillmentKgDelta)} (
                  {formatSignedPercent(activeResult.deltas.fulfillmentRateDeltaPercent)})
                </span>
              </div>
            </div>

            {/* Metric 4: Newly Infeasible Deliveries */}
            <div
              className={`${styles.metricCard} ${
                activeResult.deltas.newlyInfeasibleCount > 0 ? styles.highlightAmber : styles.highlightPositive
              }`}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>Newly Infeasible Deliveries</span>
                <ShieldAlert size={15} />
              </div>
              <div
                className={`${styles.cardValue} ${
                  activeResult.deltas.newlyInfeasibleCount > 0 ? styles.amber : styles.green
                }`}
              >
                {activeResult.deltas.newlyInfeasibleCount}
              </div>
              <div className={styles.cardSub}>
                <span>
                  {activeResult.deltas.droppedAllocationsCount} dropped / {activeResult.deltas.urgentBatchesEscalatedCount} urgent escalations
                </span>
              </div>
            </div>
          </div>

          {/* 5. Side-by-Side Comparative Ledgers */}
          <div className={styles.comparisonGrid}>
            {/* Base Plan Card */}
            <div className={`${styles.planComparisonCard} ${styles.base}`}>
              <div className={styles.cardHeader}>
                <h3>Base Distribution Plan</h3>
                <span className={styles.planPill}>Immutable Target</span>
              </div>
              <div className={styles.ledgerRows}>
                <div className={styles.ledgerRow}>
                  <span>Allocated Volume</span>
                  <span className={styles.rowVal}>{formatWeight(activeResult.deltas.baseAllocatedKg)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Demand Fulfillment</span>
                  <span className={styles.rowVal}>{formatWeight(activeResult.deltas.baseFulfillmentKg)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Gross Sales Revenue</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.baseRevenueUsd)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Transport & Logistics Cost</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.baseTransportCostUsd)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Disposal & Spoilage Penalty</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.baseDisposalCostUsd)}</span>
                </div>
                <div className={`${styles.ledgerRow} ${styles.highlight}`}>
                  <span>Net Operating Outcome</span>
                  <span className={styles.rowVal} style={{ color: "#38bdf8" }}>
                    {formatCurrency(activeResult.deltas.baseNetProfitUsd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario Stressed Plan Card */}
            <div className={`${styles.planComparisonCard} ${styles.scenario}`}>
              <div className={styles.cardHeader}>
                <h3>Stressed Scenario Outcome</h3>
                <span className={styles.planPill} style={{ borderColor: "#c084fc", color: "#d8b4fe" }}>
                  Simulated Re-Solve
                </span>
              </div>
              <div className={styles.ledgerRows}>
                <div className={styles.ledgerRow}>
                  <span>Allocated Volume</span>
                  <span className={styles.rowVal}>{formatWeight(activeResult.deltas.scenarioAllocatedKg)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Demand Fulfillment</span>
                  <span className={styles.rowVal}>{formatWeight(activeResult.deltas.scenarioFulfillmentKg)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Gross Sales Revenue</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.scenarioRevenueUsd)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Transport & Logistics Cost</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.scenarioTransportCostUsd)}</span>
                </div>
                <div className={styles.ledgerRow}>
                  <span>Disposal & Spoilage Penalty</span>
                  <span className={styles.rowVal}>{formatCurrency(activeResult.deltas.scenarioDisposalCostUsd)}</span>
                </div>
                <div className={`${styles.ledgerRow} ${styles.highlight}`}>
                  <span>Net Operating Outcome</span>
                  <span
                    className={styles.rowVal}
                    style={{
                      color: activeResult.deltas.netProfitDeltaUsd < 0 ? "#f87171" : "#4ade80",
                    }}
                  >
                    {formatCurrency(activeResult.deltas.scenarioNetProfitUsd)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <Sliders className={styles.emptyIcon} />
          <h4>Ready for What-If Operational Simulation</h4>
          <p>
            Choose a preset disruption or adjust the parameter sliders above, then click &quot;Run Simulation&quot;
            to stress-test inventory allocations and economic outcomes deterministically.
          </p>
          <button
            className={styles.btnPrimary}
            onClick={handleRunScenario}
            disabled={isRunning || plans.length === 0}
          >
            <Play size={14} /> Run Initial Stress Test
          </button>
        </div>
      )}

      {/* 6. Tabs Navigation */}
      <nav className={styles.tabsNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === "infeasible" ? styles.active : ""}`}
          onClick={() => setActiveTab("infeasible")}
        >
          <AlertTriangle size={13} />
          Newly Infeasible Deliveries ({activeResult?.newlyInfeasibleDeliveries.length ?? 0})
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === "diffs" ? styles.active : ""}`}
          onClick={() => setActiveTab("diffs")}
        >
          <Layers size={13} />
          Allocation Line-Item Diffs ({activeResult?.allocationDiffs.length ?? 0})
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === "urgency" ? styles.active : ""}`}
          onClick={() => setActiveTab("urgency")}
        >
          <Clock size={13} />
          Batch Urgency Migrations ({activeResult?.urgencyMigrations.length ?? 0})
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === "sensitivity" ? styles.active : ""}`}
          onClick={() => setActiveTab("sensitivity")}
        >
          <BarChart3 size={13} />
          Sensitivity Curve Analysis
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={13} />
          Scenario History ({savedScenarios.length})
        </button>
      </nav>

      {/* 7. Tab Contents */}

      {/* Tab 1: Newly Infeasible Deliveries */}
      {activeTab === "infeasible" && (
        <div className={styles.tableContainer}>
          {activeResult && activeResult.newlyInfeasibleDeliveries.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Commodity</th>
                  <th>Destination</th>
                  <th>Base Quantity</th>
                  <th>Failure Reason Code</th>
                  <th>Diagnostic Explanation</th>
                </tr>
              </thead>
              <tbody>
                {activeResult.newlyInfeasibleDeliveries.map((item, idx) => (
                  <tr key={`${item.batchId}-${item.destinationId}-${idx}`}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#f8fafc" }}>
                      {item.batchCode}
                    </td>
                    <td>{item.commodityName}</td>
                    <td>{item.destinationName}</td>
                    <td style={{ fontFamily: "monospace" }}>{formatWeight(item.baseAllocatedKg)}</td>
                    <td>
                      <span className={`${styles.severityBadge} ${styles.critical}`}>
                        {item.reasonCode}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: "11px" }}>{item.reasonExplanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <CheckCircle2 size={36} color="#4ade80" />
              <h4>No Deliveries Dropped Under Current Parameters</h4>
              <p>
                All deliveries in the base plan remain feasible under this disruption scenario, or simulation
                has not yet been run.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Allocation Line-Item Diffs */}
      {activeTab === "diffs" && (
        <div className={styles.tableContainer}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8", textTransform: "uppercase" }}>
              Filter By Diff Type:
            </span>
            {["ALL", "DROPPED", "MODIFIED", "NEW", "UNCHANGED"].map((t) => (
              <button
                key={t}
                onClick={() => setDiffFilter(t)}
                className={`${styles.presetBtn} ${diffFilter === t ? styles.active : ""}`}
                style={{ padding: "2px 8px", fontSize: "11px" }}
              >
                {t}
              </button>
            ))}
          </div>

          {filteredDiffs.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Batch</th>
                  <th>Commodity</th>
                  <th>Destination</th>
                  <th>Base Qty</th>
                  <th>Scenario Qty</th>
                  <th>Δ Quantity</th>
                  <th>Unit Price</th>
                  <th>Margin Delta</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiffs.map((d, idx) => (
                  <tr key={`${d.batchId}-${d.destinationId}-${idx}`}>
                    <td>
                      <span className={`${styles.diffTypeBadge} ${styles[d.type.toLowerCase()]}`}>
                        {d.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{d.batchCode}</td>
                    <td>{d.commodityName}</td>
                    <td>{d.destinationName}</td>
                    <td style={{ fontFamily: "monospace" }}>{formatWeight(d.baseQuantityKg)}</td>
                    <td style={{ fontFamily: "monospace" }}>{formatWeight(d.scenarioQuantityKg)}</td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: d.quantityDeltaKg < 0 ? "#f87171" : d.quantityDeltaKg > 0 ? "#4ade80" : "#94a3b8",
                      }}
                    >
                      {d.quantityDeltaKg > 0 ? "+" : ""}
                      {formatWeight(d.quantityDeltaKg)}
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{formatCurrency(d.scenarioEffectivePrice)}/kg</td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: d.marginDeltaUsd < 0 ? "#f87171" : d.marginDeltaUsd > 0 ? "#4ade80" : "#94a3b8",
                      }}
                    >
                      {formatSignedCurrency(d.marginDeltaUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <Layers size={36} color="#64748b" />
              <h4>No Allocation Diffs Matching Filter &quot;{diffFilter}&quot;</h4>
              <p>Run a simulation or adjust the filter above to view line-item allocation adjustments.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Batch Urgency Migrations */}
      {activeTab === "urgency" && (
        <div className={styles.tableContainer}>
          {activeResult && activeResult.urgencyMigrations.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Commodity</th>
                  <th>Total Batch Mass</th>
                  <th>Base RSL & Tier</th>
                  <th>Scenario RSL & Tier</th>
                  <th>Urgency Status</th>
                </tr>
              </thead>
              <tbody>
                {activeResult.urgencyMigrations.map((m, idx) => (
                  <tr key={`${m.batchId}-${idx}`}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{m.batchCode}</td>
                    <td>{m.commodityName}</td>
                    <td style={{ fontFamily: "monospace" }}>{formatWeight(m.initialQuantityKg)}</td>
                    <td>
                      <span className={`${styles.severityBadge} ${styles[m.baseSeverity.toLowerCase()]}`}>
                        {m.baseRslDays.toFixed(1)}d ({m.baseSeverity})
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.severityBadge} ${styles[m.scenarioSeverity.toLowerCase()]}`}>
                        {m.scenarioRslDays.toFixed(1)}d ({m.scenarioSeverity})
                      </span>
                    </td>
                    <td>
                      {m.isUrgencyEscalated ? (
                        <span className={styles.urgencyAlert}>
                          <AlertTriangle size={12} /> RISK ESCALATED
                        </span>
                      ) : (
                        <span style={{ color: "#4ade80", fontSize: "11px", fontWeight: 600 }}>
                          UNALTERED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <Clock size={36} color="#64748b" />
              <h4>No Urgency Escalations Detected</h4>
              <p>Execute a simulation with accelerated shelf-life decay to monitor risk escalations.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Sensitivity Curve Analysis */}
      {activeTab === "sensitivity" && (
        <div className={styles.sensitivityCard}>
          <div className={styles.sensitivityHeader}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
                Deterministic Parameter Sweep
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                Calculate economic response curves across a discrete range of stress values.
              </p>
            </div>

            <div className={styles.sweepControls}>
              <select
                value={sweepParam}
                onChange={(e) => setSweepParam(e.target.value as SensitivityParameter)}
                disabled={isSweeping}
              >
                <option value="transitDelayPercent">Transit Delay (+0% to +100%)</option>
                <option value="shelfLifeReductionPercent">Shelf-Life Decay (0% to 50%)</option>
                <option value="demandMultiplierPercent">Demand Volume (50% to 150%)</option>
                <option value="capacityMultiplierPercent">Fleet Capacity (20% to 100%)</option>
                <option value="priceMultiplierPercent">Wholesale Price (50% to 150%)</option>
              </select>

              <button
                className={styles.btnPrimary}
                onClick={handleRunSensitivity}
                disabled={isSweeping || plans.length === 0}
              >
                {isSweeping ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Sweeping...
                  </>
                ) : (
                  <>
                    <BarChart3 size={13} /> Sweep Range
                  </>
                )}
              </button>
            </div>
          </div>

          {sensitivityResult && (
            <>
              {/* Slope Banner */}
              <div className={styles.slopeBanner}>
                <span>
                  <strong>Parameter:</strong> {sensitivityResult.parameterName} (
                  {sensitivityResult.points.length} discrete test points)
                </span>
                <span className={styles.slopeVal}>
                  Rate of Margin Response: {formatSignedCurrency(sensitivityResult.profitSensitivitySlopeUsdPerUnit)} /{" "}
                  {sensitivityResult.parameterUnit}
                </span>
              </div>

              {/* Visual Bars Progression */}
              <div className={styles.sweepVisualGrid}>
                {sensitivityResult.points.map((pt, idx) => {
                  const widthPct = Math.max(5, Math.min(100, (Math.max(0, pt.profitUsd) / maxSweepProfit) * 100));
                  return (
                    <div key={idx} className={styles.sweepVisualRow}>
                      <span style={{ fontWeight: 600, color: "#f8fafc" }}>{pt.label}</span>
                      <div className={styles.sweepBarContainer}>
                        <div
                          className={styles.sweepBarFill}
                          style={{
                            width: `${widthPct}%`,
                            background: pt.profitDeltaUsd < 0 ? "linear-gradient(90deg, #f87171, #fb923c)" : "linear-gradient(90deg, #38bdf8, #c084fc)",
                          }}
                        />
                      </div>
                      <span style={{ textAlign: "right" }}>{formatCurrency(pt.profitUsd)}</span>
                      <span
                        style={{
                          textAlign: "right",
                          color: pt.profitDeltaUsd < 0 ? "#f87171" : "#4ade80",
                        }}
                      >
                        {formatSignedCurrency(pt.profitDeltaUsd)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Table Breakdown */}
              <table className={styles.table} style={{ marginTop: "16px" }}>
                <thead>
                  <tr>
                    <th>Stress Interval</th>
                    <th>Simulated Profit</th>
                    <th>Margin Delta</th>
                    <th>Spoilage Mass</th>
                    <th>Fulfillment Rate</th>
                    <th>Infeasible Deliveries</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityResult.points.map((pt, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{pt.label}</td>
                      <td style={{ fontFamily: "monospace" }}>{formatCurrency(pt.profitUsd)}</td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          color: pt.profitDeltaUsd < 0 ? "#f87171" : "#4ade80",
                        }}
                      >
                        {formatSignedCurrency(pt.profitDeltaUsd)}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{formatWeight(pt.spoilageKg)}</td>
                      <td style={{ fontFamily: "monospace" }}>{pt.fulfillmentPercent.toFixed(1)}%</td>
                      <td>
                        {pt.newlyInfeasibleCount > 0 ? (
                          <span className={`${styles.severityBadge} ${styles.high}`}>
                            {pt.newlyInfeasibleCount} dropped
                          </span>
                        ) : (
                          <span style={{ color: "#4ade80", fontSize: "11px", fontWeight: 600 }}>0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!sensitivityResult && (
            <div className={styles.emptyState}>
              <BarChart3 size={36} color="#64748b" />
              <h4>Deterministic Sensitivity Analysis</h4>
              <p>
                Select a parameter above and click &quot;Sweep Range&quot; to compute multi-point response curves
                evaluating margin degradation across operating stress levels.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Saved Scenarios History */}
      {activeTab === "history" && (
        <div className={styles.tableContainer}>
          {savedScenarios.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Scenario Name</th>
                  <th>Target Base Plan</th>
                  <th>Disruption Parameters</th>
                  <th>Net Profit Delta</th>
                  <th>Spoilage Delta</th>
                  <th>Simulated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedScenarios.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#f8fafc" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.description}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>
                      {s.basePlanNumber || s.basePlanId.slice(0, 10)}
                    </td>
                    <td style={{ fontSize: "11px", color: "#cbd5e1" }}>
                      {s.transitDelayHours > 0 && `+${s.transitDelayHours}h Delay; `}
                      {s.demandMultiplierPercent !== 100 && `${s.demandMultiplierPercent}% Demand; `}
                      {s.temperatureDeltaCelsius > 0 && `+${s.temperatureDeltaCelsius}°C Temp; `}
                      {s.transitDelayHours === 0 && s.demandMultiplierPercent === 100 && s.temperatureDeltaCelsius === 0 && "Custom Shock"}
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: s.simulatedProfitDeltaUsd < 0 ? "#f87171" : "#4ade80",
                      }}
                    >
                      {formatSignedCurrency(s.simulatedProfitDeltaUsd)}
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: s.simulatedSpoilageDeltaKg > 0 ? "#f87171" : "#4ade80",
                      }}
                    >
                      {s.simulatedSpoilageDeltaKg > 0 ? "+" : ""}
                      {formatWeight(s.simulatedSpoilageDeltaKg)}
                    </td>
                    <td style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className={styles.historyBtnGroup}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleLoadSavedScenario(s.id)}
                          title="Load this scenario result"
                        >
                          <Play size={11} /> Load
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.delete}`}
                          onClick={(e) => handleDeleteScenario(s.id, e)}
                          title="Delete scenario"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <History size={36} color="#64748b" />
              <h4>No Saved Scenarios Yet</h4>
              <p>Simulations you run are automatically saved and will appear here for comparison and review.</p>
            </div>
          )}
        </div>
      )}

      {/* 8. Governance & Audit Verification Bar */}
      <footer className={styles.governanceBanner}>
        <div className={styles.governanceHeader}>
          <div className={styles.governanceTitle}>
            <ShieldCheck size={14} /> Governance & Audit Verification
          </div>
          <div className={styles.hashBadges}>
            {activeResult && (
              <>
                <span className={styles.hashPill}>Base Hash: {activeResult.baseSnapshotHash.slice(0, 12)}...</span>
                <span className={styles.hashPill}>Scenario Hash: {activeResult.scenarioSnapshotHash.slice(0, 12)}...</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.governanceText}>
          {activeResult?.governance.disclaimer ||
            "Deterministic multi-point parameter simulation across discrete operating conditions. Evaluated against immutable base input snapshot without database mutations. FreshRoute does not claim unvalidated empirical forecasting."}
        </div>
      </footer>
    </div>
  );
}
