import React from "react";
import Link from "next/link";
import { ShieldCheck, Terminal, Heart } from "lucide-react";
import styles from "./MarketingFooter.module.scss";

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top Grid */}
        <div className={styles.topGrid}>
          {/* Brand Info */}
          <div className={styles.brandCol}>
            <div className={styles.brandRow}>
              <div className={styles.logoBadge}>FR</div>
              <span className={styles.brandTitle}>FreshRoute</span>
            </div>
            <p className={styles.brandDesc}>
              The intelligent perishable-produce distribution SaaS. Stopping cold-chain food waste
              through predictive FEFO dispatching, hard arrival SLA enforcement, and dynamic markdown salvage.
            </p>
            <div className={styles.systemStatus}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>{"ALL SYSTEMS NOMINAL // 36.6777° N, 121.6555° W"}</span>
            </div>
          </div>

          {/* Links Column 1: Platform */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>OPERATIONS</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/app" className={styles.link}>
                  Operations Cockpit
                </Link>
              </li>
              <li>
                <Link href="/app/inventory" className={styles.link}>
                  Lot Inventory & Clocks
                </Link>
              </li>
              <li>
                <Link href="/app/destinations" className={styles.link}>
                  Retail SLA Registry
                </Link>
              </li>
              <li>
                <Link href="/app/transport" className={styles.link}>
                  Reefer Fleet Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Solvers */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>SOLVERS</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/app/planning" className={styles.link}>
                  FEFO Knapsack Optimizer
                </Link>
              </li>
              <li>
                <Link href="/app/discounts" className={styles.link}>
                  Dynamic Markdown Engine
                </Link>
              </li>
              <li>
                <Link href="/app/analytics" className={styles.link}>
                  Documented FIFO Baseline
                </Link>
              </li>
              <li>
                <Link href="/app/scenarios" className={styles.link}>
                  What-If Simulation Sandbox
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Tech Stack */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>ARCHITECTURE</h4>
            <ul className={styles.linksList}>
              <li className={styles.specItem}>Next.js 15 App Router</li>
              <li className={styles.specItem}>Pure TypeScript Domain</li>
              <li className={styles.specItem}>PostgreSQL + Prisma ORM</li>
              <li className={styles.specItem}>Decimal.js Safe Math</li>
              <li className={styles.specItem}>Clerk Authentication</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} FreshRoute Inc. Built for wholesale perishable food networks.
          </div>
          <div className={styles.bottomMeta}>
            <span>Architected with zero floating-point financial error</span>
            <span>•</span>
            <span>100% Deterministic Reproducibility</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
