import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import { Button } from "../ui/button/Button";
import { Badge } from "../ui/badge/Badge";
import styles from "./ClosingCtaSection.module.scss";

export function ClosingCtaSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.ctaBox}>
          <div className={styles.glowBg} aria-hidden="true" />

          <div className={styles.content}>
            <div className={styles.badgeRow}>
              <Badge variant="lime" size="sm" pulse>
                PRODUCTION SAAS READINESS
              </Badge>
              <span className={styles.tagText}>[ ZERO DISPATCH WASTE ]</span>
            </div>

            <h2 className={styles.heading}>
              Ready to Halt Produce Waste in Your Cold-Chain Network?
            </h2>

            <p className={styles.subtext}>
              Stop accepting 20% spoilage as an inevitable cost of doing business. Explore the live
              operations console, test our pure domain FEFO solver, and benchmark your inventory against
              legacy FIFO.
            </p>

            <div className={styles.actionGroup}>
              <Button asChild variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                <Link href="/app">Launch Operations Console</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#network-flow">Review Dispatch Topology</a>
              </Button>
            </div>

            <div className={styles.bottomMeta}>
              <span className={styles.metaItem}>✓ PostgreSQL & Prisma ORM Persistence</span>
              <span className={styles.metaItem}>✓ Pure TypeScript Domain Optimization</span>
              <span className={styles.metaItem}>✓ Decimal-Safe Financial Precision</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
