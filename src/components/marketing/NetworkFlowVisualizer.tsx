"use client";

import React, { useState } from "react";
import {
  Boxes,
  Truck,
  Store,
  Clock,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  Tag,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Badge } from "../ui/badge/Badge";
import clsx from "clsx";
import styles from "./NetworkFlowVisualizer.module.scss";

interface BatchItem {
  id: string;
  code: string;
  produce: string;
  category: string;
  weightKg: number;
  quality: string;
  temp: string;
  expiryHours: number;
  clockFormatted: string;
  status: "critical" | "fresh" | "warning";
  allocationTarget: string;
  routeAssigned: string;
  discountApplied: number;
  reasonCode: string;
  narrative: string;
  salvagedValue: string;
}

const BATCHES_DATA: BatchItem[] = [
  {
    id: "batch-1",
    code: "B-BERRY-802",
    produce: "Sweet Albion Strawberries",
    category: "BERRIES",
    weightKg: 350,
    quality: "Grade A",
    temp: "1.2°C",
    expiryHours: 62,
    clockFormatted: "02d : 14h : 18m",
    status: "critical",
    allocationTarget: "Valley Pre-Cut & Foodservice",
    routeAssigned: "Reefer Route R-04",
    discountApplied: 15,
    reasonCode: "DYNAMIC_MARKDOWN_SALVAGE",
    narrative:
      "Batch shelf-life of 2.6 days failed Premium Supermarket 5-day SLA constraint. Diverted to secondary discount partner at 15% markdown ($3.83/kg), recovering $1,338.75 in revenue versus $1,050.00 disposal loss under baseline FIFO.",
    salvagedValue: "$1,338.75",
  },
  {
    id: "batch-2",
    code: "B-SPIN-410",
    produce: "Organic Baby Spinach",
    category: "LEAFY GREENS",
    weightKg: 500,
    quality: "Grade A",
    temp: "2.0°C",
    expiryHours: 128,
    clockFormatted: "05d : 08h : 42m",
    status: "fresh",
    allocationTarget: "Metro Fresh Premium Grocers",
    routeAssigned: "Reefer Route R-04",
    discountApplied: 0,
    reasonCode: "FEFO_URGENCY_PRIORITY",
    narrative:
      "Earliest-expiring compliant batch matching Metro Fresh SLA (min 5.0 days). Delivered at full list price ($5.20/kg), capturing maximum retail contract margin without risk of dock rejection.",
    salvagedValue: "$2,600.00",
  },
  {
    id: "batch-3",
    code: "B-AVOC-105",
    produce: "Hass Avocados (Stage 3)",
    category: "AVOCADOS",
    weightKg: 850,
    quality: "Grade B",
    temp: "6.5°C",
    expiryHours: 187,
    clockFormatted: "07d : 19h : 05m",
    status: "fresh",
    allocationTarget: "Pacific Regional Distribution",
    routeAssigned: "Reefer Route R-02",
    discountApplied: 0,
    reasonCode: "TRANSPORT_CAPACITY_OPTIMIZED",
    narrative:
      "Longer shelf life permitted hold for Route R-02 to pack vehicle payload to 94.2% utilization, lowering transport unit freight cost to $0.28/kg.",
    salvagedValue: "$3,315.00",
  },
];

export function NetworkFlowVisualizer() {
  const [selectedBatch, setSelectedBatch] = useState<BatchItem>(BATCHES_DATA[0]);

  return (
    <section id="network-flow" className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBlock}>
          <div className={styles.headerEyebrow}>
            <span className={styles.eyebrowTag}>{"[ 01 // LIVE TOPOLOGY SIMULATION ]"}</span>
            <Badge variant="lime" size="sm">
              REAL-TIME FLOW
            </Badge>
          </div>
          <h2 className={styles.sectionTitle}>
            How FreshRoute Solves the Perishable Dispatch Conundrum
          </h2>
          <p className={styles.sectionSubtitle}>
            Trace inventory from the refrigerated dock through multi-constraint vehicle routing to customer
            acceptance. Click any batch below to inspect its mathematical allocation rationale.
          </p>
        </div>

        {/* Visual Pipeline Grid */}
        <div className={styles.flowPipeline}>
          {/* Step 1: Warehouse Lots with Countdown Clocks */}
          <div className={styles.pipelineCol}>
            <div className={styles.colHeader}>
              <div className={styles.colHeaderLeft}>
                <Boxes size={16} className={styles.colIcon} />
                <span className={styles.colTitle}>01. INVENTORY BATCHES</span>
              </div>
              <span className={styles.colMeta}>Salinas DC Cold Hub</span>
            </div>

            <div className={styles.batchCardsList}>
              {BATCHES_DATA.map((batch) => {
                const isSelected = selectedBatch.id === batch.id;
                return (
                  <div
                    key={batch.id}
                    className={clsx(
                      styles.batchCard,
                      isSelected && styles.selectedBatchCard,
                      styles[`batchCard_${batch.status}`]
                    )}
                    onClick={() => setSelectedBatch(batch)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.batchTopRow}>
                      <span className={styles.batchCode}>{batch.code}</span>
                      <Badge
                        variant={batch.status === "critical" ? "critical" : "fresh"}
                        size="sm"
                        pulse={batch.status === "critical"}
                      >
                        {batch.status === "critical" ? "AT RISK" : "NOMINAL"}
                      </Badge>
                    </div>

                    <div className={styles.batchProduce}>{batch.produce}</div>

                    <div className={styles.batchTelemetry}>
                      <div className={styles.telemetryItem}>
                        <Clock size={12} />
                        <span className={styles.clockValue}>{batch.clockFormatted}</span>
                      </div>
                      <div className={styles.telemetryItem}>
                        <Thermometer size={12} />
                        <span>{batch.temp}</span>
                      </div>
                    </div>

                    <div className={styles.batchFooter}>
                      <span className={styles.batchWeight}>{batch.weightKg} kg</span>
                      <span className={styles.batchQuality}>{batch.quality}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flow Connector Arrow 1 */}
          <div className={styles.flowArrowCol}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowNode}>
              <span>FEFO</span>
            </div>
            <div className={styles.arrowLine} />
          </div>

          {/* Step 2: Solver Vehicle Route Packing */}
          <div className={styles.pipelineCol}>
            <div className={styles.colHeader}>
              <div className={styles.colHeaderLeft}>
                <Truck size={16} className={styles.colIcon} />
                <span className={styles.colTitle}>02. REEFER CONDUIT</span>
              </div>
              <span className={styles.colMeta}>Dual-Zone Carrier</span>
            </div>

            <div className={styles.reeferContainer}>
              <div className={styles.reeferCard}>
                <div className={styles.reeferHeader}>
                  <div className={styles.reeferTitleGroup}>
                    <span className={styles.reeferCode}>REEFER UNIT #R-04</span>
                    <span className={styles.reeferTemp}>Zone: 0.5°C - 2.5°C</span>
                  </div>
                  <Badge variant="cold" size="sm">
                    COLD-CHAIN VERIFIED
                  </Badge>
                </div>

                {/* Vehicle Capacity Meter */}
                <div className={styles.capacityBlock}>
                  <div className={styles.capacityLabelRow}>
                    <span>Payload Capacity</span>
                    <span className={styles.capacityNumbers}>18,850 / 20,000 kg (94.2%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} style={{ width: "94.2%" }} />
                  </div>
                </div>

                {/* Constraint Checklist */}
                <div className={styles.constraintChecklist}>
                  <div className={styles.checkItem}>
                    <ShieldCheck size={14} className={styles.checkIconSuccess} />
                    <span>Departure: 06:00 UTC (Delivery Window: On-Time)</span>
                  </div>
                  <div className={styles.checkItem}>
                    <ShieldCheck size={14} className={styles.checkIconSuccess} />
                    <span>Temperature Zone: Berries & Greens Compatible</span>
                  </div>
                  <div className={styles.checkItem}>
                    <ShieldCheck size={14} className={styles.checkIconSuccess} />
                    <span>Max Weight Limit: 1,150 kg Headroom Remaining</span>
                  </div>
                </div>

                <div className={styles.reeferCallout}>
                  <Info size={14} className={styles.infoIcon} />
                  <span>
                    Batch <b>{selectedBatch.code}</b> assigned to this vehicle run based on arrival SLA
                    alignment.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Flow Connector Arrow 2 */}
          <div className={styles.flowArrowCol}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowNode}>
              <span>SLA</span>
            </div>
            <div className={styles.arrowLine} />
          </div>

          {/* Step 3: Destination Channels */}
          <div className={styles.pipelineCol}>
            <div className={styles.colHeader}>
              <div className={styles.colHeaderLeft}>
                <Store size={16} className={styles.colIcon} />
                <span className={styles.colTitle}>03. DESTINATIONS</span>
              </div>
              <span className={styles.colMeta}>SLA & Salvage Matching</span>
            </div>

            <div className={styles.destinationList}>
              {/* Destination 1: Premium Grocer */}
              <div
                className={clsx(
                  styles.destCard,
                  selectedBatch.allocationTarget.includes("Metro Fresh") && styles.highlightDestCard
                )}
              >
                <div className={styles.destHeader}>
                  <span className={styles.destName}>Metro Fresh Premium</span>
                  <Badge variant="fresh" size="sm">
                    SLA: ≥ 5.0 DAYS
                  </Badge>
                </div>
                <p className={styles.destDesc}>
                  Strict retail display guarantee. Rejects batches with &lt; 5 days shelf life on arrival.
                </p>
                <div className={styles.destOutcome}>
                  {selectedBatch.allocationTarget.includes("Metro Fresh") ? (
                    <span className={styles.outcomeSuccess}>
                      ✓ Matched Batch {selectedBatch.code} (Full Margin)
                    </span>
                  ) : (
                    <span className={styles.outcomeMuted}>
                      ✕ Rejected {selectedBatch.code} (SLA Violation: 2.6d &lt; 5.0d)
                    </span>
                  )}
                </div>
              </div>

              {/* Destination 2: Secondary Discount Buyer */}
              <div
                className={clsx(
                  styles.destCard,
                  selectedBatch.allocationTarget.includes("Valley Pre-Cut") && styles.highlightDestCard
                )}
              >
                <div className={styles.destHeader}>
                  <span className={styles.destName}>Valley Pre-Cut & Kitchens</span>
                  <Badge variant="salvage" size="sm">
                    SALVAGE: ≥ 2.0 DAYS
                  </Badge>
                </div>
                <p className={styles.destDesc}>
                  Commercial processor accepting near-expiry batches at 10%-20% dynamic markdown discount.
                </p>
                <div className={styles.destOutcome}>
                  {selectedBatch.allocationTarget.includes("Valley Pre-Cut") ? (
                    <span className={styles.outcomeSalvage}>
                      ⚡ Dynamic Salvage Match: {selectedBatch.discountApplied}% Discount ($1,338.75
                      Salvaged)
                    </span>
                  ) : (
                    <span className={styles.outcomeMuted}>Not needed for this batch.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Inspector Panel for Selected Batch */}
        <div className={styles.inspectorPanel}>
          <div className={styles.inspectorHeader}>
            <div className={styles.inspectorTitleGroup}>
              <span className={styles.inspectorLabel}>ACTIVE BATCH REASON CODE & FINANCIAL PROOF</span>
              <h3 className={styles.inspectorBatchTitle}>
                {selectedBatch.code}{" // "}{selectedBatch.produce} ({selectedBatch.weightKg} kg)
              </h3>
            </div>
            <div className={styles.reasonBadgeGroup}>
              <Badge variant="lime" size="md">
                REASON: {selectedBatch.reasonCode}
              </Badge>
              {selectedBatch.discountApplied > 0 && (
                <Badge variant="salvage" size="md">
                  MARKDOWN: {selectedBatch.discountApplied}% OFF
                </Badge>
              )}
            </div>
          </div>

          <p className={styles.inspectorNarrative}>{selectedBatch.narrative}</p>

          <div className={styles.inspectorStatsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statBoxLabel}>Clock to Expiry</span>
              <span className={styles.statBoxValue}>{selectedBatch.clockFormatted}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxLabel}>Allocated Destination</span>
              <span className={styles.statBoxValue}>{selectedBatch.allocationTarget}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxLabel}>Carrier Route</span>
              <span className={styles.statBoxValue}>{selectedBatch.routeAssigned}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBoxLabel}>Gross Salvaged Revenue</span>
              <span className={styles.statBoxValueHighlight}>{selectedBatch.salvagedValue}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
