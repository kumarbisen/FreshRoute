import React from "react";
import Link from "next/link";
import { ArrowRight, Play, ArrowDown } from "lucide-react";
import { Button } from "../ui/button/Button";
import { Badge } from "../ui/badge/Badge";
import styles from "./HeroSection.module.scss";

export function HeroSection() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContainer}>
        {/* Top Technical Metadata Bar */}
        <div className={styles.metaRow}>
          <div className={styles.coordinateBadge}>
            <span className={styles.coordDot} />
            <span className={styles.coordText}>
              {"36.6777° N, 121.6555° W // SALINAS COLD-CHAIN HUB"}
            </span>
          </div>
          <Badge variant="fresh" size="sm" pulse>
            SOLVER RUNNING: FEFO-ELASTIC-v1.0
          </Badge>
        </div>

        {/* Editorial Headline with Italic Serif Accent (RaceZero reference) */}
        <div className={styles.headlineBlock}>
          <h1 className={styles.mainTitle}>
            PERISHABLE LOGISTICS
            <br />
            <span className={styles.editorialItalic}>Intelligently Dispatched</span>
          </h1>
          <p className={styles.subTitle}>
            Fresh produce degrades by the minute. Legacy ERPs rely on dumb FIFO rules that ship the wrong
            lots, trigger brutal retail SLA penalties, and dump expired inventory.
            FreshRoute solves the multi-constraint knapsack: routing by real-time shelf life,
            cold-chain compatibility, and dynamic salvage markdowns.
          </p>
        </div>

        {/* Primary Call to Action Buttons */}
        <div className={styles.ctaGroup}>
          <Button asChild variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
            <Link href="/app">Launch Operations Console</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" leftIcon={<Play size={16} />}>
            <a href="#network-flow">Explore Dispatch Simulation</a>
          </Button>
        </div>

        {/* Minimal Editorial Value Metric Cards */}
        <div className={styles.metricStrip}>
          <div className={styles.metricItem}>
            <div className={styles.metricValue}>-34%</div>
            <div className={styles.metricLabel}>
              <span className={styles.metricHighlight}>Spoilage Reduction</span>
              <span className={styles.metricSub}>vs documented FIFO baseline</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricItem}>
            <div className={styles.metricValue}>99.2%</div>
            <div className={styles.metricLabel}>
              <span className={styles.metricHighlight}>Retail SLA Compliance</span>
              <span className={styles.metricSub}>Guaranteed arrival shelf-life</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricItem}>
            <div className={styles.metricValue}>+17.3%</div>
            <div className={styles.metricLabel}>
              <span className={styles.metricHighlight}>Net Margin Uplift</span>
              <span className={styles.metricSub}>Dynamic discount salvage</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricItem}>
            <div className={styles.metricValue}>100%</div>
            <div className={styles.metricLabel}>
              <span className={styles.metricHighlight}>Deterministic Audits</span>
              <span className={styles.metricSub}>SHA-256 snapshot hashes</span>
            </div>
          </div>
        </div>

        {/* Vertical Scroll Discovery Cue */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollText}>SCROLL TO EXPLORE</span>
          <div className={styles.scrollLine}>
            <span className={styles.scrollDot} />
          </div>
        </div>
      </div>
    </section>
  );
}
