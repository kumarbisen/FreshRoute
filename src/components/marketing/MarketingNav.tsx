"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Activity, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button/Button";
import clsx from "clsx";
import styles from "./MarketingNav.module.scss";

export function MarketingNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Brand */}
        <Link href="/" className={styles.brand}>
          <div className={styles.logoBadge}>
            <span>FR</span>
            <span className={styles.pulseDot} />
          </div>
          <div className={styles.brandTitleGroup}>
            <span className={styles.brandTitle}>FreshRoute</span>
            <span className={styles.brandTag}>ALGORITHMIC LOGISTICS</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className={styles.desktopMenu} aria-label="Main Navigation">
          <a href="#network-flow" className={styles.navLink}>
            Live Flow
          </a>
          <a href="#features" className={styles.navLink}>
            Intelligent Solver
          </a>
          <a href="#baseline-proof" className={styles.navLink}>
            Baseline Benchmark
          </a>
          <a href="#how-it-works" className={styles.navLink}>
            How It Works
          </a>
        </nav>

        {/* Right Actions */}
        <div className={styles.actionsGroup}>
          <div className={styles.networkStatus}>
            <Activity size={12} className={styles.statusPulse} />
            <span className={styles.statusLabel}>FEFO v1.0 Nominal</span>
          </div>
          <Button asChild variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
            <Link href="/app">Launch Console</Link>
          </Button>
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className={styles.mobileDrawer}>
          <nav className={styles.mobileMenu}>
            <a
              href="#network-flow"
              className={styles.mobileLink}
              onClick={() => setMobileNavOpen(false)}
            >
              Live Flow
            </a>
            <a
              href="#features"
              className={styles.mobileLink}
              onClick={() => setMobileNavOpen(false)}
            >
              Intelligent Solver
            </a>
            <a
              href="#baseline-proof"
              className={styles.mobileLink}
              onClick={() => setMobileNavOpen(false)}
            >
              Baseline Benchmark
            </a>
            <a
              href="#how-it-works"
              className={styles.mobileLink}
              onClick={() => setMobileNavOpen(false)}
            >
              How It Works
            </a>
            <div className={styles.mobileActions}>
              <Button asChild variant="primary" size="md" className={styles.mobileCta}>
                <Link href="/app" onClick={() => setMobileNavOpen(false)}>
                  Launch Operations Console →
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
