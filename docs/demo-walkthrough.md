# FreshRoute: Judged Competition Demonstration Walkthrough

## Executive Overview
FreshRoute is an intelligent, deterministic perishable produce distribution platform. It solves the multi-constraint cold-chain dispatch problem by routing inventory to destinations based on First-Expired, First-Out (**FEFO**) perishability curves, retailer shelf-life SLAs, vehicle payload limits, and dynamic markdown economics.

This walkthrough outlines the exact sequence to reproduce and evaluate the system during a judged competition demonstration.

---

## Quick Reset & Environment Preparation

FreshRoute features a 1-click deterministic environment reset. This ensures all test runs begin from identical canonical starting conditions:

1. In the top navigation bar, open the **Alex Rivera** user dropdown and click **"Restore Demo Dataset"** (or navigate to `/app/settings` and click **"Restore Canonical Demo Dataset"**).
2. Alternatively, invoke the API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/demo/reset
   ```
3. The database will wipe transient data, execute Prisma migrations, and re-seed the **5 canonical operational edge cases**.

---

## Step 1: Inspect the Initial Operating Situation

Navigate to **Inventory Batches** (`/app/inventory`):
- **Facility**: Salinas Coolport (`wh-salinas-01`) & Central Valley DC (`wh-fresno-02`).
- Inspect the 5 seeded lots demonstrating distinct cold-chain dynamics:
  1. `BATCH-STR-URGENT-01`: Albion Strawberries (3,000 kg) with only **2.5 days Remaining Shelf Life (RSL)**. Approaching critical threshold ($< 48\text{h}$).
  2. `BATCH-SPN-INFEASIBLE-02`: Tender Leaf Spinach (2,400 kg) with **4.0 days RSL**.
  3. `BATCH-ORG-SURPLUS-03`: Fresh Navel Oranges (20,000 kg) exceeding normal contract demand.
  4. `BATCH-AVO-SHORTAGE-04`: Hass Avocados (2,000 kg supply against 5,000 kg demand deficit).
  5. `BATCH-STR-SALVAGE-05`: Albion Strawberries (3,500 kg) eligible for dynamic markdown salvage.

Navigate to **Destinations & SLAs** (`/app/destinations`):
- Review destination dock hurdles:
  - `DEST-PACIFIC-02` (Pacific Regional Hypermarkets): Demands a strict **7.0-day minimum RSL** on receiving docks.
  - `DEST-METRO-01` (Metro Fresh Premium): Demands a **5.0-day minimum RSL**.
  - `DEST-VALLEY-03` (Valley Secondary Foods): Discount channel accepting short-dated produce down to **1.0-day RSL**.

---

## Step 2: Generate & Inspect the Distribution Plan

Navigate to **Dispatch Optimizer** (`/app/planning`):
1. **Operational Readiness**: The system validates that facility inventory, buyer demand orders, and transport routes are active and feasible.
2. Click **"Generate Distribution Plan"**:
   - The pure domain solver (`solveDistributionPlan`) executes without side-effects.
   - Evaluates arrival timestamps: $T_{\text{dock}} = T_{\text{departure}} + \Delta t_{\text{transit}} + \Delta t_{\text{handling}}$.
   - Checks feasibility across commodity cold-chain temperature intervals and minimum dock RSL hurdles.
   - Generates an immutable plan snapshot with a canonical **SHA-256 hash**.

3. **Inspect the Proposed Dispatch Manifest** (Tab 1):
   - `BATCH-STR-URGENT-01` is allocated immediately to Metro SF, satisfying the order before expiration.
   - Click the **Facts Drawer** icon on any row to inspect arrival timestamps, dock RSL margins, and two-part tariff logistics cost attributions.

4. **Inspect Infeasibility Rejections & Audit Facts** (Tab 4):
   - Notice that `BATCH-SPN-INFEASIBLE-02` is **rejected** for `DEST-PACIFIC-02` with reason code `REJECTED_INSUFFICIENT_SHELF_LIFE`.
   - **Explanation**: The lot has only 4.0d RSL, which breaches the retailer's 7.0d receiving SLA. FreshRoute stops this delivery *before* the truck departs, avoiding wasted freight and guaranteed dock write-off!

---

## Step 3: Compare FreshRoute against Baseline FIFO

Click on the **Baseline Comparison Ledger** (Tab 3 in `/app/planning`, or navigate to `/app/analytics`):
1. **Shared Economic Ledger**: Both strategies are evaluated against the same input snapshot, procurement costs, disposal fees (₹0.25/kg), and carrier tariffs.
2. **Key Metric Deltas**:
   - **Net Profit Uplift**: FreshRoute yields $+₹14,000+$ over baseline FIFO ($+15\%$ to $+25\%$).
   - **Produce Waste Prevented**: $2,400\text{ kg}$ of produce saved from landfill disposal.
   - **Dock SLA Rejections Avoided**: Legacy FIFO blindly dispatches the short-dated spinach to Pacific Hypermarkets based on intake date, causing an immediate dock rejection and disposal write-off. FreshRoute redirects or holds the inventory, preserving capital.
3. **Honest Objective Evaluation (The Freight Fee Trap)**:
   - FreshRoute's evaluator does not hardcode favorable outcomes.
   - If dispatching a discounted lot incurs ₹450 in fixed truck fees to recover ₹100 in margin, the evaluator penalizes the run and designates `BASELINE_SUPERIOR`.

---

## Step 4: Dynamic Markdown Salvage Console

Navigate to **Markdown Salvage** (`/app/discounts`):
1. The **Discount Center** identifies unallocated residual inventory approaching expiry (`BATCH-STR-SALVAGE-05`).
2. **Floor Margin Preservation**:
   - Evaluates candidate discounts ($5\%$ to $40\%$).
   - Calculates net margin: $\Delta \text{Margin} = Q_{\text{salvage}} \times [P_{\text{disc}} - V_R - H + K_{\text{disp}}]$.
   - Caps salvage quantities strictly to open buyer commitments; **no speculative demand elasticity is assumed**.
3. **Recommendation Inspection**:
   - Click **"Inspect Salvage Waterfall"** to compare **Status Quo (Dump & Write-Off)** vs **Dynamic Markdown**.
   - Review Cold-Chain Timeline and explainable merchandiser narrative.
4. **Approve Recommendation**:
   - Click **"Approve Salvage"** to transition the recommendation to `APPROVED`.
5. **Plan Simulation**:
   - Click **"Simulate Impact on Plan"** to recalculate the economic ledger without double-counting.

---

## Step 5: What-If Stress Simulation (Scenario Lab)

Navigate to **What-If Scenarios** (`/app/scenarios`):
1. **Base Plan Immutability**: The target distribution plan and its SHA-256 hash are 100% preserved. Overrides are applied only to deeply cloned inputs.
2. **Select a Quick Disruption Preset**:
   - Click **"Highway 101 Closure (+3.5h Delay)"** or **"Harvest Heatwave (-25% Shelf Life)"**.
3. Click **"Run Simulation"**:
   - Re-solves the network flow under stressed conditions.
4. **Inspect Detailed Differential Impacts**:
   - **Newly Infeasible Deliveries**: View deliveries that were feasible in the base plan but failed under the disruption with exact failure reason codes (`REJECTED_TRANSIT_EXCEEDS_SHELF_LIFE`).
   - **Allocation Diffs**: View `DROPPED`, `MODIFIED`, and `NEW` allocations with quantity and margin deltas.
   - **Batch Urgency Migrations**: Track lots that escalated from `STABLE` to `CRITICAL` or `EXPIRED`.
5. **Deterministic Sensitivity Analysis**:
   - Switch to the **Sensitivity Curve Analysis** tab.
   - Select parameter `transitDelayPercent` and click **"Sweep Range"**.
   - View the discrete margin degradation curve and slope banner showing the marginal cost per hour of carrier delay.

---

## Step 6: Export Manifests & Commit Dispatch

1. Return to **Dispatch Optimizer** (`/app/planning`).
2. Click **"Lock & Commit Dispatch Instructions"**:
   - Transitions the plan status from `OPTIMIZED` to `COMMITTED`.
   - Locks available stock and records transactional audit entries in `BatchQuantityAudit`.
3. Click **"Export Manifest (CSV)"**:
   - Downloads an RFC-4180 compliant CSV dispatch manifest with sequence numbers, carrier codes, temperatures, and reason codes.
4. Click **"Export Comparison KPI (CSV)"**:
   - Downloads the reconciled baseline comparison report.
