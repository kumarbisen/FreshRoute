import React from "react";
import { AlertOctagon, CheckCircle2, TrendingDown, TrendingUp, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge/Badge";
import styles from "./ProblemSolutionStorytelling.module.scss";

export function ProblemSolutionStorytelling() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerBlock}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowText}>{"[ 02 // COLD-CHAIN DILEMMA ]"}</span>
            <Badge variant="warning" size="sm">
              THE 22% SPOILAGE TAX
            </Badge>
          </div>
          <h2 className={styles.title}>
            Why Traditional Logistics Destroy Perishable Produce Value
          </h2>
          <p className={styles.subtitle}>
            Wholesale food distributors operate on razor-thin 2% to 4% margins. Losing 15% to 25% of fresh
            inventory to expiry and retail rejection is the difference between thriving and insolvency.
          </p>
        </div>

        {/* Asymmetric Side-by-Side Storytelling Grid */}
        <div className={styles.comparisonGrid}>
          {/* Legacy Pain Column */}
          <div className={styles.painColumn}>
            <div className={styles.columnHeader}>
              <div className={styles.headerTitleGroup}>
                <AlertOctagon size={18} className={styles.painIcon} />
                <h3 className={styles.columnTitle}>THE LEGACY STATUS QUO</h3>
              </div>
              <span className={styles.columnTag}>Static ERP Rules</span>
            </div>

            <div className={styles.cardsStack}>
              <div className={styles.storyCard}>
                <div className={styles.cardHeader}>
                  <XCircle size={16} className={styles.crossIcon} />
                  <h4 className={styles.cardHeading}>1. The FIFO Delusion</h4>
                </div>
                <p className={styles.cardBody}>
                  Standard ERPs dispatch stock First-In, First-Out. But in fresh commodities, harvest maturity,
                  transport field heat, and temperature fluctuations mean a batch received yesterday might spoil
                  faster than one received three days ago. FIFO dispatches blindly and leaves urgent lots to rot.
                </p>
                <div className={styles.statCallout}>
                  <TrendingDown size={14} className={styles.trendDown} />
                  <span>Result: 18% of warehouse stock expires before assignment</span>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardHeader}>
                  <XCircle size={16} className={styles.crossIcon} />
                  <h4 className={styles.cardHeading}>2. The Retail Dock Rejection Shock</h4>
                </div>
                <p className={styles.cardBody}>
                  Tier-1 supermarket chains enforce strict SLAs (e.g. minimum 5.0 days remaining shelf-life on
                  dock arrival). Delivering a pallet with 4.8 days remaining results in a 100% rejection,
                  emergency return freight costs, and contract compliance penalties.
                </p>
                <div className={styles.statCallout}>
                  <TrendingDown size={14} className={styles.trendDown} />
                  <span>Result: ₹12k+ average monthly retail dock chargebacks</span>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardHeader}>
                  <XCircle size={16} className={styles.crossIcon} />
                  <h4 className={styles.cardHeading}>3. Binary Disposal Write-Offs</h4>
                </div>
                <p className={styles.cardBody}>
                  Because dispatchers lack dynamic pricing integration, inventory with 2 to 3 days remaining sits
                  at list price until it turns to compost. The distributor absorbs a 100% inventory write-off plus
                  commercial landfill tipping fees.
                </p>
                <div className={styles.statCallout}>
                  <TrendingDown size={14} className={styles.trendDown} />
                  <span>Result: ₹0 recovered value on near-expiry surplus</span>
                </div>
              </div>
            </div>
          </div>

          {/* FreshRoute Solution Column */}
          <div className={styles.solutionColumn}>
            <div className={styles.columnHeaderSolution}>
              <div className={styles.headerTitleGroup}>
                <CheckCircle2 size={18} className={styles.solutionIcon} />
                <h3 className={styles.columnTitle}>THE FRESHROUTE ALGORITHM</h3>
              </div>
              <Badge variant="lime" size="sm">
                MATHEMATICALLY PROVEN
              </Badge>
            </div>

            <div className={styles.cardsStack}>
              <div className={styles.storyCardSolution}>
                <div className={styles.cardHeader}>
                  <CheckCircle2 size={16} className={styles.checkIcon} />
                  <h4 className={styles.cardHeadingSolution}>1. Real-Time FEFO Urgency Routing</h4>
                </div>
                <p className={styles.cardBodySolution}>
                  FreshRoute models biological decay curves for each commodity category (strawberries vs. spinach
                  vs. avocados). The solver assigns lots based on First-Expired, First-Out urgency and transit
                  duration, clearing vulnerable inventory first.
                </p>
                <div className={styles.statCalloutSolution}>
                  <TrendingUp size={14} className={styles.trendUp} />
                  <span>Benefit: 34% reduction in warehouse spoilage volume</span>
                </div>
              </div>

              <div className={styles.storyCardSolution}>
                <div className={styles.cardHeader}>
                  <CheckCircle2 size={16} className={styles.checkIcon} />
                  <h4 className={styles.cardHeadingSolution}>2. Hard SLA Arrival Constraint Gates</h4>
                </div>
                <p className={styles.cardBodySolution}>
                  The solver guarantees that <i>Departure Time + Transit Hours + Retailer Minimum Shelf-Life ≤ Expiry
                  Timestamp</i>. Non-compliant batches are automatically blocked from premium orders and routed to
                  flexible commercial buyers.
                </p>
                <div className={styles.statCalloutSolution}>
                  <TrendingUp size={14} className={styles.trendUp} />
                  <span>Benefit: Zero customer shelf-life rejections and chargebacks</span>
                </div>
              </div>

              <div className={styles.storyCardSolution}>
                <div className={styles.cardHeader}>
                  <CheckCircle2 size={16} className={styles.checkIcon} />
                  <h4 className={styles.cardHeadingSolution}>3. Calibrated Dynamic Markdown Salvage</h4>
                </div>
                <p className={styles.cardBodySolution}>
                  When a batch enters the critical 48-72h window, the markdown engine calculates elasticity for
                  secondary processors (pre-cut salads, juicers, foodservice), discounting 10% to 25% to
                  liquidate the batch while preserving healthy gross margins over disposal cost.
                </p>
                <div className={styles.statCalloutSolution}>
                  <TrendingUp size={14} className={styles.trendUp} />
                  <span>Benefit: Recovers 40% to 70% of inventory value before zero</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
