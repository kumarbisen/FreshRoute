import React from "react";
import Link from "next/link";
import { ArrowRight, Play, Clock, Sparkles, TrendingUp, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "../ui/button/Button";
import { Badge } from "../ui/badge/Badge";
import styles from "./HeroSection.module.scss";

export function HeroSection() {
  return (
    <section className={styles.heroSection}>
      {/* Background Ambience Lines */}
      <div className={styles.gridOverlay} aria-hidden="true" />

      <div className={styles.heroContainer}>
        {/* Top Technical Metadata Bar */}
        <div className={styles.metaRow}>
          <div className={styles.coordinateBadge}>
            <span className={styles.coordDot} />
            <span className={styles.coordText}>{"36.6777° N, 121.6555° W // SALINAS COLD-CHAIN HUB"}</span>
          </div>
          <Badge variant="lime" size="sm" pulse>
            SOLVER RUNNING: FEFO-ELASTIC-v1.0
          </Badge>
        </div>

        {/* Confident Oversized Editorial Headline */}
        <div className={styles.headlineBlock}>
          <h1 className={styles.mainTitle}>
            EVERY BATCH HAS A CLOCK.
            <br />
            <span className={styles.accentText}>MAKE EVERY DISPATCH</span> COUNT.
          </h1>
          <p className={styles.subTitle}>
            Fresh produce degrades by the minute. Legacy ERPs rely on dumb FIFO rules that ship the wrong
            lots, trigger brutal retail SLA rejection penalties, and dump expired inventory.
            FreshRoute solves the multi-constraint cold-chain knapsack: routing by real-time shelf life,
            cold-chain compatibility, and dynamic salvage markdowns.
          </p>
        </div>

        {/* Primary Call to Action Buttons */}
        <div className={styles.ctaGroup}>
          <Button asChild variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
            <Link href="/app">Launch Operations Console</Link>
          </Button>
          <Button asChild variant="outline-lime" size="lg" leftIcon={<Play size={16} />}>
            <a href="#network-flow">Explore Live Dispatch Simulation</a>
          </Button>
        </div>

        {/* Editorial Value Metric Strip */}
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
              <span className={styles.metricSub}>SHA-256 snapshot reproducibility</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
