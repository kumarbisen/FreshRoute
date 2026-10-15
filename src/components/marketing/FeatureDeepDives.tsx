import React from "react";
import { Cpu, Truck, Tag, BarChart2, Check, ArrowRight, ShieldCheck, Database, Layers } from "lucide-react";
import { Badge } from "../ui/badge/Badge";
import styles from "./FeatureDeepDives.module.scss";

const FEATURES = [
  {
    tag: "FEATURE 01 // CORE OPTIMIZATION",
    title: "Predictive FEFO Allocation Solver",
    description:
      "A pure TypeScript mathematical optimization module that models commodity-specific decay curves. The solver allocates batches according to First-Expired, First-Out urgency without framework lock-in or database blocking.",
    highlights: [
      "Zero-dependency pure TypeScript domain core",
      "Biological decay functions (exponential & linear models)",
      "Continuous remaining shelf-life estimation per lot",
      "100% deterministic reproducibility with SHA-256 snapshot hashing",
    ],
    codePreview: `// Pure Domain Solver Contract
export function solveFEFOAllocations(
  batches: DomainBatch[],
  demands: DomainDemandOrder[],
  routes: DomainTransportRoute[]
): DomainPlanResult {
  // Evaluates shelf-life urgency, payload constraints & SLA
}`,
  },
  {
    tag: "FEATURE 02 // MULTI-CONSTRAINT LOGISTICS",
    title: "Reefer Packing & Cold-Chain Compatibility",
    description:
      "Solves the multidimensional knapsack problem for refrigerated fleets. Enforces temperature zone compatibility, maximum payload weight, and cubic volume thresholds simultaneously.",
    highlights: [
      "Dual-zone reefer compatibility verification (e.g. 0°C berries vs 13°C bananas)",
      "Strict departure-to-delivery arrival window SLA matching",
      "Vehicle payload utilization maximized to reduce per-kg transport freight",
      "Automatic split-lot dispatching when demand exceeds individual batch size",
    ],
    codePreview: `// Hard Multi-Constraint Invariant
assert(batch.expiry - route.arrival >= demand.minShelfLife);
assert(route.tempMin <= batch.temp && batch.temp <= route.tempMax);
assert(sum(allocations.weight) <= route.maxPayloadKg);`,
  },
  {
    tag: "FEATURE 03 // DYNAMIC PRICING",
    title: "Algorithmic Markdown Salvage Engine",
    description:
      "Transforms unsellable surplus into immediate revenue. When batches breach premium grocery SLAs, the engine triggers price elasticity discounts to secondary food service and pre-cut partners.",
    highlights: [
      "Calibrated markdown discounts (10% to 35%) based on days to expiry",
      "Guaranteed gross margin floor: ensures discounted revenue exceeds disposal costs",
      "Automatic customer channel matching based on discount receptivity tiers",
      "Arbitrary-precision financial arithmetic with decimal.js",
    ],
    codePreview: `// Floor Margin Invariant
const floorMargin = unitPrice.times(1 - discount).minus(unitCost + transitCost);
if (floorMargin.greaterThan(disposalCostPenalty.negated())) {
  return authorizeDynamicMarkdown(batch, customer, discount);
}`,
  },
  {
    tag: "FEATURE 04 // AUDITABILITY & EXPLAINABILITY",
    title: "Documented Baseline Comparator & Reason Codes",
    description:
      "Never trust a black box. FreshRoute simulates a legacy FIFO benchmark alongside every proposed run and annotates every allocation with machine-readable reason codes and human-readable narratives.",
    highlights: [
      "Direct delta reporting on gross profit, spoilage kg, and SLA fulfillment",
      "Standardized AllocationReasonCode taxonomy",
      "Deterministic post-mortem audit trails for logistics directors",
      "Structured JSON snapshot exports for ERP ledger synchronization",
    ],
    codePreview: `export enum AllocationReasonCode {
  FEFO_URGENCY_PRIORITY = "FEFO_URGENCY_PRIORITY",
  SHELF_LIFE_SLA_SATISFIED = "SHELF_LIFE_SLA_SATISFIED",
  DYNAMIC_MARKDOWN_SALVAGE = "DYNAMIC_MARKDOWN_SALVAGE"
}`,
  },
];

export function FeatureDeepDives() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowText}>{"[ 03 // CAPABILITIES & ARCHITECTURE ]"}</span>
            <Badge variant="lime" size="sm">
              ENGINEERED FOR SCALE
            </Badge>
          </div>
          <h2 className={styles.title}>Four Algorithmic Pillars of FreshRoute</h2>
          <p className={styles.subtitle}>
            Built under strict separation of concerns. From the isolated pure solver engine to the high-density
            operational cockpit, every layer serves deterministic perishable fulfillment.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.cardTop}>
                <span className={styles.featureTag}>{feature.tag}</span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>

              <div className={styles.highlightsList}>
                {feature.highlights.map((h, hIdx) => (
                  <div key={hIdx} className={styles.highlightItem}>
                    <div className={styles.checkIconWrapper}>
                      <Check size={12} className={styles.checkIcon} />
                    </div>
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className={styles.codeContainer}>
                <div className={styles.codeHeader}>
                  <div className={styles.codeDots}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>

                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
