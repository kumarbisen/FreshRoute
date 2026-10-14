import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <div className={styles.mainContainer}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBadge}>FR</div>
          <h1 className={styles.brandTitle}>FreshRoute</h1>
        </div>
        <div className={styles.statusPill}>
          <span className={styles.pulseDot} />
          Phase 0: Foundation Active
        </div>
      </header>

      <main className={styles.contentWrapper}>
        <section className={styles.heroSection}>
          <span className={styles.heroEyebrow}>Intelligent Perishable Distribution SaaS</span>
          <h2 className={styles.heroHeading}>
            Algorithmic FEFO Dispatch & Spoilage Mitigation
          </h2>
          <p className={styles.heroSubtitle}>
            FreshRoute enables fresh food distributors to optimize multi-constraint inventory allocations,
            enforce strict retailer shelf-life SLAs, trigger dynamic salvage markdowns, and benchmark every
            dispatch decision against a documented FIFO baseline.
          </p>
        </section>

        <section className={styles.gridSection}>
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>⚡</div>
            <h3 className={styles.cardTitle}>FEFO Optimization Solver</h3>
            <p className={styles.cardDescription}>
              Pure TypeScript mathematical optimization engine enforcing batch inventory availability,
              transport weight/cube limits, arrival windows, and cold-chain temperature zone invariants.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>🏷️</div>
            <h3 className={styles.cardTitle}>Dynamic Markdown Engine</h3>
            <p className={styles.cardDescription}>
              Calculates calibrated price elasticities for near-expiry batches to liquidate stock through
              secondary retail channels, salvaging gross margin before complete product spoilage occurs.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>📊</div>
            <h3 className={styles.cardTitle}>Documented Baseline Audit</h3>
            <p className={styles.cardDescription}>
              Executes parallel FIFO benchmark simulations for every run, generating empirical comparison
              metrics on profit uplift, spoilage reduction (kg & $), and SLA compliance.
            </p>
          </div>
        </section>

        <section className={styles.architectureBanner}>
          <h3 className={styles.bannerTitle}>Architectural Blueprint & Technical Invariants</h3>
          <p className={styles.bannerText}>
            FreshRoute enforces strict separation between presentation, API handlers, database access,
            and pure domain optimization. The solver has zero external framework dependencies and executes
            with 100% deterministic reproducibility.
          </p>

          <div className={styles.specList}>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Architecture</span>
              <span className={styles.specValue}>Next.js 15 App Router</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Financial Math</span>
              <span className={styles.specValue}>Decimal.js (Safe Precision)</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Styling Layer</span>
              <span className={styles.specValue}>SCSS Modules & Tokens</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Reproducibility</span>
              <span className={styles.specValue}>SHA-256 Snapshot Hashing</span>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        FreshRoute Production SaaS &copy; 2026. Architected for High-Velocity Perishable Logistics.
      </footer>
    </div>
  );
}
