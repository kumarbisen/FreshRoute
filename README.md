# FreshRoute: Perishability-Aware Cold-Chain Distribution Planning & Dynamic Salvage Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15.2.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3%20Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PGlite PostgreSQL](https://img.shields.io/badge/Database-PGlite%20(WASM%20Postgres)-336791?logo=postgresql)](https://electric-sql.com/docs/reference/pglite)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma%206.4.1-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Tests-119%20Passed%20(13%20suites)-green?logo=vitest)](https://vitest.dev/)
[![Decimal.js](https://img.shields.io/badge/Financial%20Math-Decimal.js-orange)](https://mikemcl.github.io/decimal.js/)
[![MoFPI Benchmarked](https://img.shields.io/badge/Benchmark-MoFPI%20Post--Harvest%20Study-brightgreen)](https://www.mofpi.gov.in/)

> **FreshRoute** is an enterprise-grade Software-as-a-Service (SaaS) platform engineered for wholesale produce distributors, cold-chain logistics networks, and agricultural hubs. It optimizes perishable produce allocation using **First-Expired, First-Out (FEFO)** decay curves, enforces strict buyer dock Remaining Shelf Life (RSL) Service Level Agreements (SLAs), and recommends explainable dynamic markdowns to liquidate at-risk inventory before expiration.
>
> Every distribution plan is mathematically benchmarked against a documented **FIFO baseline model**, delivering transparent, auditable proof of spoilage reduction, gross margin retention, and fulfillment gains.

---

## Table of Contents

1. [Executive Summary & Problem Statement](#executive-summary--problem-statement)
2. [Key Innovations & Architecture](#key-innovations--architecture)
3. [MoFPI Benchmark Integration](#mofpi-benchmark-integration)
4. [Application Modules](#application-modules)
5. [Tech Stack](#tech-stack)
6. [Quick Start & Installation](#quick-start--installation)
7. [Step-by-Step User Walkthrough](#step-by-step-user-walkthrough)
8. [Available Scripts & Testing](#available-scripts--testing)
9. [Project Directory Layout](#project-directory-layout)
10. [Auditability & Deterministic Reproducibility](#auditability--deterministic-reproducibility)

---

## Executive Summary & Problem Statement

### The 22% Perishability Spoilage Tax
In fresh produce supply chains (berries, leafy greens, stone fruits, avocados, tomatoes), inventory quality degrades continuously every hour from harvest. Traditional Enterprise Resource Planning (ERP) and Warehouse Management Systems (WMS) cause severe operational breakdowns:

1. **FIFO Inefficiency in Fresh Food**: Standard FIFO dispatches batches based on warehouse intake date. A lot received 3 days ago with pristine pre-cooling might have 8 days of shelf life remaining, while a lot received yesterday with higher field temperatures may have only 3 days left. FIFO dispatches the wrong lot, causing premature spoilage.
2. **Customer Dock SLA Penalties**: Supermarkets and food service buyers require strict minimum Remaining Shelf Life upon arrival (e.g. $\ge 5.0$ days for retail display). Delivering produce with even 4.9 days remaining triggers full dock rejections, return transport costs, and disposal penalties.
3. **Binary Disposal vs. Dynamic Salvage**: Legacy distributors let near-expiry inventory sit in cold storage until it rots, absorbing a 100% financial write-off. FreshRoute evaluates customer discount receptivity early in the decay curve and generates targeted markdowns, salvaging revenue while respecting margin floors.
4. **Rejection of Black-Box Algorithms**: Warehouse operators distrust opaque AI allocations. FreshRoute produces structured **Reason Codes** and mathematical explanations for every shipment and rejection.

---

## Key Innovations & Architecture

### 1. Pure Deterministic FEFO Solver
- Calculates exact arrival timestamps:
  $$T_{\text{dock}} = T_{\text{departure}} + \Delta t_{\text{transit}} + \Delta t_{\text{handling}}$$
- Evaluates arrival Remaining Shelf Life against destination dock thresholds:
  $$\text{RSL}_{\text{dock}} = \text{RSL}_{\text{origin}} - (T_{\text{dock}} - T_{\text{plan}}) \ge \text{SLA}_{\text{min}}$$
- Multi-constraint knapsack prioritization maximizing net operating margin across inventory batches, vehicle payload limits, route transit times, and temperature compatibility.

### 2. Shared Economic Ledger & FIFO Benchmark
- Both FreshRoute and the legacy FIFO baseline are evaluated under **identical starting conditions**, inventory batches, carrier freight tariffs, handling costs, and landfill disposal penalties (₹0.25/kg).
- Every run designates an auditable winner: `FRESHROUTE_SUPERIOR`, `BASELINE_SUPERIOR`, or `EQUIVALENT`.
- **The Freight Fee Trap Protection**: If dispatching discounted produce incurs high carrier tariffs that exceed recovered margin, the engine penalizes the run rather than forcing an unprofitable dispatch.

### 3. Preemptive Markdown Salvage Engine
- Evaluates residual, unallocated inventory approaching critical shelf life ($< 48\text{h}$).
- Enforces strict margin floors:
  $$\Delta \text{Margin} = Q_{\text{salvage}} \times \left[ P_{\text{disc}} - V_R - H + K_{\text{disp}} \right] > 0$$
- Caps markdowns strictly to confirmed buyer demand; **zero speculative demand elasticity** is assumed.

### 4. Zero-Install In-Process PostgreSQL (PGlite)
- Powered by `@electric-sql/pglite` (Postgres compiled to WebAssembly/in-process Node.js).
- **No external PostgreSQL service or Docker container needed** for local development, demoing, or testing.
- Includes automatic re-entrancy protection, thread safety, and transparent schema synchronization with Prisma.

---

## MoFPI Benchmark Integration

FreshRoute integrates official post-harvest loss data from the **Ministry of Food Processing Industries (MoFPI), Government of India**, covering:
- **15 Agro-Climatic Zones**: From Western Himalayan to Islands and Trans-Gangetic Plains.
- **54 Produce Commodities**: Fruits, vegetables, pulses, and plantation crops with empirical harvest loss rates, cold storage humidity/temperature tolerances, and transit vulnerability coefficients.
- **Embedded In-Memory Datasets**: All 8 MoFPI CSV datasets are embedded as raw constants in `src/data/mofpi-raw-csv.ts`. Users can seed the full operational network or import sample CSVs in milliseconds with **zero disk I/O bottlenecks**.

---

## Application Modules

| Route | Module | Purpose |
|---|---|---|
| `/` | **Marketing Website** | Interactive network flow simulator, problem storytelling, benchmark proof, and 4-step workflow pipeline. |
| `/app` | **Operations Cockpit** | High-level operations center with active plan metrics, inventory expiration horizon, route capacity gauges, and quick actions. |
| `/app/inventory` | **Inventory Batches** | Active perishable lots, remaining shelf-life countdown clocks, quality grades, warehouse allocations, and batch balance tracking. |
| `/app/destinations` | **Destinations & SLAs** | Buyer delivery locations, minimum dock arrival shelf life requirements, demand orders, and discount willingness tiers. |
| `/app/transport` | **Carrier Routes** | Multi-temperature cold-chain fleet routes, transit durations, payload capacities, and two-part freight tariffs (fixed base + variable per-kg). |
| `/app/planning` | **Dispatch Optimizer** | One-click distribution plan generator, dispatch manifest table, allocation heatmap, rejection audits, and RFC-4180 CSV export. |
| `/app/discounts` | **Markdown Salvage** | Preemptive discount recommendations for near-expiry produce, margin waterfall breakdown, and simulated plan recalculation. |
| `/app/scenarios` | **What-If Scenario Lab** | Non-destructive stress simulation testing traffic bottlenecks, heatwaves, and fuel surcharges while keeping base plans immutable. |
| `/app/analytics` | **Comparative Analytics** | Recharts visualizers for Gross Revenue vs Logistics Spend, physical spoilage balances (kg), commodity margin contribution, and SHA-256 audit hashes. |
| `/app/settings` | **System & Tenant Admin** | Organization profile, facility configuration, solver tolerances, and 1-click canonical dataset reset. |

---

## Tech Stack

- **Framework**: Next.js 15.2 (App Router with React Server Components & Server Actions)
- **Language**: TypeScript 5.7 (Strict Mode, zero unchecked `any`)
- **Database**: PGlite (WASM in-process PostgreSQL) + Prisma ORM 6.4
- **Financial Math**: `decimal.js` for arbitrary-precision currency calculation (preventing IEEE-754 floating-point errors)
- **Styling**: Vanilla SCSS Modules with modular design token architecture (deep charcoal `#07090b`, acid lime `#d4f933`, emerald `#10b981`)
- **Data Visualization**: Recharts (responsive SVG charts with custom tooltips)
- **Component Primitives**: Radix UI (accessible, WAI-ARIA compliant dialogs, dropdowns, selects, tabs)
- **Form & Validation**: React Hook Form + Zod runtime schemas
- **Icons**: Lucide React
- **Testing**: Vitest 3.0 (13 test suites, 119 unit & integration tests)

---

## Quick Start & Installation

### Prerequisites
- **Node.js**: v18.18.0 or newer (v20+ recommended)
- **npm**: v9+ (packaged with Node.js)
- *No Docker or external database installation required.*

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/kumarbisen/FreshRoute.git
cd FreshRoute
npm install
```

### 2. Environment Configuration
Copy the provided environment example file:
```bash
cp .env.example .env.local
```
*(The default `.env.example` comes pre-configured for local PGlite execution with zero additional setup.)*

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Seed the Database
Run the deterministic seed script to populate the complete MoFPI produce network:
```bash
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to explore the platform.

---

## Step-by-Step User Walkthrough

Follow this 5-minute tour to evaluate FreshRoute's complete workflow:

### Step 1: 1-Click Environment Reset
To start from a clean, canonical baseline at any time:
- In the top header bar, click the user profile dropdown (**Alex Rivera**) and select **"Restore Demo Dataset"**.
- Or execute:
  ```bash
  curl -X POST http://localhost:3000/api/demo/reset
  ```

### Step 2: Inspect Perishable Inventory (`/app/inventory`)
1. Review the seeded batches in **Salinas Coolport** and **Central Valley DC**:
   - `BATCH-STR-URGENT-01`: Albion Strawberries with only **2.5 days RSL** (high urgency).
   - `BATCH-SPN-INFEASIBLE-02`: Tender Leaf Spinach with **4.0 days RSL**.
   - `BATCH-STR-SALVAGE-05`: Albion Strawberries eligible for salvage markdown.
2. Filter by status (`ACTIVE`, `EXPIRING_SOON`) or search by commodity.
3. Click **"Import CSV"** and choose **"Use /data CSV directly"** to experience instant, zero-latency in-memory data intake.

### Step 3: Generate an Optimized Dispatch Plan (`/app/planning`)
1. Verify system readiness (green status across warehouse stock, buyer orders, and carrier routes).
2. Click **"Generate Distribution Plan"**:
   - The engine computes arrival timestamps, checks temperature zones, and solves multi-commodity knapsack allocations.
   - An immutable snapshot is saved with a cryptographic **SHA-256 hash**.
3. **Dispatch Manifest Table** (Tab 1): Inspect allocated quantities, gross revenues, and carrier freight shares. Click the **Facts Drawer** icon on any row to verify dock arrival RSL margins.
4. **Infeasibility Rejection Audits** (Tab 4): Notice that `BATCH-SPN-INFEASIBLE-02` was **rejected** for *Pacific Regional Hypermarkets* (`DEST-PACIFIC-02`).
   - *Why?* The lot has only 4.0 days RSL, which breaches the retailer's 7.0-day receiving dock SLA. FreshRoute prevented an imminent dock rejection and return freight charge before the truck departed!
5. **Baseline Comparison Ledger** (Tab 3): Compare FreshRoute against legacy FIFO side-by-side. Observe net profit uplift ($+15\%$ to $+25\%$) and waste prevented ($2,400\text{ kg}$).
6. Click **"Approve & Commit Plan"** to lock inventory in `COMMITTED` status.
7. Click **"Export Dispatch CSV"** to download an RFC-4180 compliant driver manifest.

### Step 4: Liquidate Residual Stock in Markdown Salvage (`/app/discounts`)
1. Navigate to **Markdown Salvage** (`/app/discounts`).
2. Identify residual stock approaching expiration (`BATCH-STR-SALVAGE-05`).
3. Click **"Inspect Salvage Waterfall"**:
   - Compares **Status Quo (Dump & Landfill Write-Off)** vs **Dynamic Markdown**.
   - Review the Cold-Chain Timeline and explainable merchandiser reasoning.
4. Click **"Approve Salvage"** to record merchandiser approval.
5. Click **"Simulate Impact on Plan"** to project the margin recovery without double-counting.

### Step 5: Run Cold-Chain What-If Scenarios (`/app/scenarios`)
1. Navigate to **What-If Scenarios** (`/app/scenarios`).
2. Choose a preset:
   - **"Highway 101 Closure (+3.5h Delay)"**
   - **"Harvest Heatwave (-25% Shelf Life)"**
3. Click **"Run Simulation"**:
   - The base plan remains 100% immutable and unmutated.
   - FreshRoute re-runs the solver against cloned parameters and highlights newly infeasible orders in red.
4. Review the sensitivity sweep showing how increasing transit delay degrades fulfillment rates.

### Step 6: Review ROI in Comparative Analytics (`/app/analytics`)
1. Navigate to **Comparative Analytics** (`/app/analytics`).
2. Select any generated plan from the target plan selector.
3. Inspect the executive KPI cards:
   - **Net Profit Uplift** ($+₹\text{INR}$ and $\%$ gain over FIFO).
   - **Produce Waste Prevented** (physical kg diverted from landfill disposal).
   - **FreshRoute Margin vs Baseline**.
   - **Demand Fulfillment Delta**.
4. Examine the Recharts visualizers:
   - **Economic Breakdown**: Gross Revenue, Logistics Spend, Disposal Penalty, and Net Margin.
   - **Physical Mass Balances**: Spoilage Mass vs Fulfilled Volume.
   - **Net Margin Contribution by Commodity**: Bar chart breakdown per commodity.
5. Click **"Export Comparison KPI CSV"** for corporate stakeholder reporting.

---

## Available Scripts & Testing

| Command | Action |
|---|---|
| `npm run dev` | Starts Next.js development server on `http://localhost:3000` |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Starts Next.js production server |
| `npm run type-check` | Runs TypeScript compiler checks without emitting files (`tsc --noEmit`) |
| `npm test` | Executes all 13 test suites using Vitest |
| `npm run test:watch` | Launches Vitest in interactive watch mode |
| `npm run lint` | Runs ESLint analysis |
| `npm run db:seed` | Seeds the complete MoFPI produce network into PGlite |
| `npm run prisma:generate` | Regenerates Prisma Client types |

### Running the Test Suite
FreshRoute maintains 100% passing test coverage across 13 test suites (119 tests):
```bash
npm test
```
Test suites include:
- `tests/planning/planner-workflow.test.ts` (Readiness, generation, approval state machine, RFC-4180 export)
- `tests/engine/planning-engine.test.ts` (FEFO solver, shelf life decay, knapsack constraints)
- `tests/engine/baseline-evaluator.test.ts` (FIFO benchmark, shared economic ledger, freight fee trap)
- `tests/discounts/discount-workflow.test.ts` (Salvage recommendations, approval transitions, simulation)
- `tests/scenarios/scenario-workflow.test.ts` (Immutability guarantee, sensitivity sweeps)
- `tests/security/multi-tenancy-authorization.test.ts` (Cross-organization isolation security audit)
- `tests/data/mofpi-dataset.test.ts` (MoFPI 54 commodities, 15 agro zones, raw CSV parsing)

---

## Project Directory Layout

```
FreshRoute/
├── data/
│   └── mofpi-post-harvest/          # Official MoFPI raw CSV datasets
├── docs/
│   ├── demo-walkthrough.md          # Judge walkthrough guide
│   ├── economic-model.md            # Mathematical ledger reconciliation
│   └── mofpi-post-harvest-study.md  # MoFPI agro-climatic zone analysis
├── prisma/
│   ├── schema.prisma                # Relational schema (Decimals, Relations, Enums)
│   └── seed.ts                      # Deterministic seed script
├── src/
│   ├── app/                         # Next.js 15 App Router
│   │   ├── api/                     # REST API route handlers
│   │   │   ├── demo/reset/          # 1-click database reset API
│   │   │   ├── discounts/           # Discount recommendations & approvals
│   │   │   ├── operations/          # Inventory, destinations, routes CRUD & CSV import
│   │   │   ├── planning/            # Plan generation, approval, and CSV export
│   │   │   └── scenarios/           # What-If simulations & sweeps
│   │   ├── app/                     # Authenticated SaaS portal
│   │   │   ├── analytics/           # Comparative Performance Analytics Cockpit
│   │   │   ├── destinations/        # Buyer SLAs & Demand Orders
│   │   │   ├── discounts/           # Markdown Salvage Console
│   │   │   ├── inventory/           # Batch countdown clocks & lots
│   │   │   ├── planning/            # Dispatch Optimizer Cockpit
│   │   │   ├── scenarios/           # Scenario Lab simulation sandbox
│   │   │   ├── settings/            # Organization & demo reset
│   │   │   └── transport/           # Fleet routes & tariffs
│   │   └── page.tsx                 # Public marketing landing page
│   ├── components/                  # UI components & shared widgets
│   ├── data/
│   │   └── mofpi-raw-csv.ts         # Embedded raw CSV constants (zero-I/O loading)
│   ├── engine/                      # Pure domain solvers & economic evaluator
│   │   ├── contracts.ts             # Strongly typed domain contracts
│   │   ├── evaluator.ts             # Shared economic ledger & FIFO benchmark
│   │   ├── markdown-engine.ts       # Dynamic discount salvage solver
│   │   ├── scenario-engine.ts       # What-If simulation engine
│   │   └── solver.ts                # Perishability-aware FEFO knapsack solver
│   └── server/
│       ├── db/                      # PGlite connection & schema bootstrap
│       └── services/                # Business logic & repository layer
├── tests/                           # Vitest test suites (119 tests)
├── package.json
└── README.md
```

---

## Auditability & Deterministic Reproducibility

1. **Cryptographic Run Snapshots**: Every generated distribution plan captures a full serialized JSON input snapshot hashed with **SHA-256**. Any subsequent audit can verify that input data has not been modified after the plan was created.
2. **Reconciled Economic Balances**:
   - Revenue reconciliation: $\text{Reference Revenue} = \text{Realized Sales} + \text{Discount Foregone}$
   - Inventory reconciliation: $\text{Procurement Cost} = \text{COGS Sold} + \text{Healthy Asset Value} + \text{Spoiled Write-Off}$
   - Financial ledger reconciliation: $\text{Net Outcome} = \text{Realized Sales} - \text{COGS} - \text{Transport} - \text{Handling} - \text{Disposal Penalty}$
3. **Multi-Tenancy Isolation**: Strictly enforced organization boundary checks preventing cross-tenant data leakage across plans, inventory lots, and discount approvals.

---

## License

This project is licensed under the MIT License. Developed for enterprise cold-chain produce distribution networks and agricultural supply chain resilience.
