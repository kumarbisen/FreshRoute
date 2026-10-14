import React from "react";
import { Database, Cpu, Tag, FileCheck, ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge/Badge";
import styles from "./HowItWorksSection.module.scss";

const STEPS = [
  {
    number: "01",
    title: "Ingest Batches & Expiry Clocks",
    description:
      "FreshRoute syncs lot-level inventory from your warehouse management system. Each batch records harvest date, intake timestamp, quality grade (Grade A/B/C), and real-time cold storage temperature.",
    icon: Database,
  },
  {
    number: "02",
    title: "Solve Multi-Constraint Routing",
    description:
      "Our pure TypeScript domain solver evaluates pending retailer demand against vehicle payload weight, cubic volume limits, temperature zones (berries vs. greens), and delivery window arrival deadlines.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Trigger Dynamic Markdown Salvage",
    description:
      "Batches that fail premium supermarket minimum shelf-life SLAs are immediately evaluated for secondary discount grocers and commercial pre-cut processors at calibrated price concessions.",
    icon: Tag,
  },
  {
    number: "04",
    title: "Commit Manifest & Audit Baseline",
    description:
      "Dispatchers review structured reason codes and human-readable narratives for each allocation. Committing the run hashes the snapshot with SHA-256 and records the exact profit uplift versus FIFO.",
    icon: FileCheck,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowText}>{"[ 05 // OPERATIONAL WORKFLOW ]"}</span>
            <Badge variant="lime" size="sm">
              SEAMLESS 4-STEP PIPELINE
            </Badge>
          </div>
          <h2 className={styles.title}>From Warehouse Dock to Retail Acceptance</h2>
          <p className={styles.subtitle}>
            FreshRoute eliminates guesswork on the dispatch dock. Here is how your distribution network
            transitions from reactive FIFO firefighting to automated algorithmic optimization.
          </p>
        </div>

        {/* Steps Grid */}
        <div className={styles.stepsGrid}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className={styles.stepCard}>
                <div className={styles.stepTopRow}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <div className={styles.iconCircle}>
                    <Icon size={18} className={styles.icon} />
                  </div>
                </div>

                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>

                <div className={styles.stepIndicatorLine} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
