# FreshRoute: Implementation Roadmap & Strategic Milestones

## Strategic Overview
FreshRoute is developed in strictly phased increments. Each phase delivers a verifiable, tested, and self-contained subsystem before progressing to higher layers of abstraction.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Architecture, Documentation & Scaffolding [COMPLETED]         │
│  - System design documents, strict coding standards, rules, bug log   │
│  - Scaffolding Next.js 15, TypeScript, SCSS, Vitest, Prisma, Clerk     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Clean build, typecheck, lint pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 01: Visual Foundation & Marketing Website [COMPLETED]            │
│  - Editorial art direction, acid-lime & charcoal palette, design tokens│
│  - Responsive marketing website (Hero, Topology Flow, Baseline Proof)  │
│  - Reusable UI primitives (Radix Dialog, Button, Badge, Card, Table)   │
│  - Application shell & scaffolded operational routes (/app/*)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 100% tests, typecheck, lint pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 04: Pure Domain Planning Engine & Baseline Comparator [COMPLETED]│
│  - Pure TS FEFO solver, dynamic markdown calculator, constraint engine │
│  - Documented FIFO baseline comparator & reason code generator         │
│  - Multi-tier leftover stock breakdown & deterministic snapshot hashing│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 11/11 fixture tests, 100% pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2: PostgreSQL Database & Persistence Layer [COMPLETED]           │
│  - Relational schema, PGlite WASM provider, Prisma client, Zod schemas │
│  - Economic model, 5-case deterministic seed dataset, health endpoint  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 23/23 tests, typecheck, lint pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 03: Operational Data Management (Inventory/Routes/CSV) [COMPLETED]│
│  - Multi-tenant CRUD services, batch balances, CSV import/preview engine│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 21/21 integration tests, clean build
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 05: Baseline Comparison & Economic Evaluation [COMPLETED]        │
│  - Reconciled economic ledger: sunk vs incurred vs avoidable costs     │
│  - Documented FIFO benchmark, safe zero-denominator percentage math    │
│  - Objective scenario runner & 3 canonical outcomes verification       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 11/11 tests, 66/66 full suite pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 06: Production Planning Cockpit UI [COMPLETED]                   │
│  - Interactive planning cockpit, allocation breakdown, audit modals    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 9/9 integration tests, clean build
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 07: FreshRoute Discount Center [COMPLETED]                       │
│  - Pure TS discount engine, deterministic ceilings, salvage UI         │
│  - Status Quo vs Discount price waterfall, plan recalculation ledger   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 13/13 tests, clean build, 88 total
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 08: FreshRoute Scenario Lab [COMPLETED]                          │
│  - What-If simulation engine, transit & capacity shocks, decay tests   │
│  - Deterministic parameter sensitivity sweeps, diffs, immutable base   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 12/12 tests, 100/100 full suite pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 09: Recharts Comparative Analytics & Spoilage Heatmaps           │
│  - FreshRoute vs Baseline comparative analytics, decay curves          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Interactive visualizer with live data
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 10: Hardening, Security, E2E Verification & Release              │
│  - Performance audit, secret security check, final CI test suite pass  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Breakdown & Exit Criteria

### Phase 0: Architecture, Documentation & Foundation Scaffolding (Completed)
- **Objective**: Establish rock-solid architectural blueprints, governance rules, and reproducible development tooling.
- **Key Deliverables**:
  - `project.md`, `architecture.md`, `taskboard.md`, `roadmap.md`, `coding-style.md`, `rules.md`, `bugs.md`.
  - Initialized `package.json` with locked dependencies.
  - Type-safe configurations: `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`.
  - Minimal compiling Next.js App Router root layout and test runner verification.
- **Exit Criteria (Achieved)**:
  - `npm run type-check` exits with 0 errors.
  - `npm run test` executes and passes.
  - `npm run lint` passes without warnings.
  - `npm run build` succeeds.

---

### Phase 04: FreshRoute Distribution Planning Engine (Completed)
- **Objective**: Implement a deterministic, testable TypeScript planning engine that allocates perishable produce inventory across destinations while respecting stock, demand, transport capacity, delivery windows, and shelf-life constraints.
- **Key Deliverables**:
  - `src/engine/contracts.ts`: Typed domain inputs/outputs, reason codes, binding constraint types, leftover stock categories, facts audit contracts. Pure domain isolation with zero external/database dependencies.
  - `src/engine/feasibility.ts`: Absolute timeline shelf-life evaluator ($T_{\text{handled}} = T_{\text{departure}} + \Delta t_{\text{transit}} + \Delta t_{\text{handling}}$ and $RSL_{\text{handled}} = T_{\text{expiry}} - T_{\text{handled}}$), origin-destination route connectivity, cold-chain bounds, arrival windows, margin floor checks, dynamic markdown eligibility.
  - `src/engine/prioritizer.ts`: Multi-factor deterministic candidate scoring (FEFO perishability urgency, margin contribution, customer tier bonus, discount penalty) and strict 5-tier stable tie-breakers.
  - `src/engine/allocator.ts`: Multi-pass allocation loop with shared vehicle payload capacity tracking, batch stock availability, demand fulfillment caps, proportional fixed fee attribution ($F_r \times \frac{q_a}{W_r}$), binding constraint identification, and multi-tier leftover stock breakdown (`FULLY_ALLOCATED`, `UNALLOCATED_FEASIBLE`, `AT_RISK`, `INFEASIBLE_CONSTRAINTS`, `SPOILED_EXPIRED`).
  - `src/engine/baseline-fifo.ts`: Documented Baseline FIFO comparator solver (intake date ordering, static pricing $\delta = 0$, dock SLA rejection simulation) and comparative delta metrics calculation.
  - `src/engine/planner.ts`: Deterministic engine orchestrator, input validator, canonical SHA-256 snapshot hashing, and `solveDistributionPlan()` entry point.
  - `tests/engine/planning-engine.test.ts`: Systematic coverage for all 10 required operational scenarios plus dynamic markdown salvage.
- **Exit Criteria (Achieved)**:
  - 11/11 planning engine tests passing.
  - All 55/55 test suite cases passing across the entire repository.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Production build (`npm run build`) succeeds.

---

### Phase 2: PostgreSQL Database & Prisma ORM Persistence
- **Objective**: Design durable relational storage for batches, orders, vehicles, and planning runs.
- **Key Deliverables**:
  - `prisma/schema.prisma`: Normalized schemas with foreign keys, indexes, and decimal precision.
  - `prisma/seed.ts`: Realistic synthetic produce seed data (Strawberries, Spinach, Hass Avocados, Citrus) with clear "Demo Data" labeling.
  - `src/server/db/client.ts`: Singleton Prisma client with connection pooling and logging.
- **Exit Criteria**:
  - Prisma client generated without errors.
  - Seed script successfully populates demo records.

---

### Phase 03: Operational Data Management (Completed)
- **Objective**: Implement core operational modules for inventory, destinations, transport fleet, and CSV workflows consuming the persistent data foundation.
- **Key Deliverables**:
  - `prisma/schema.prisma`: Distinct balance tracking (`reservedQuantity`, `dispatchedQuantity`, `spoiledQuantity`), fulfillment shortage tracking (`fulfilledQuantity`), and audit ledger (`BatchQuantityAudit`).
  - `src/server/db/schema.zod.ts`: Zod validation schemas for all CRUD operations and CSV batch imports.
  - `src/server/services/`: Multi-tenant services for Inventory (shelf-life risk tiers, balance invariants), Destinations & Demand (SLA rules, dock windows, shortage tracking), Transport (two-part tariffs, vehicle constraints), and CSV Import (template generator, parser, preview validator, transactional commit).
  - Next.js App Router API Routes: `/api/inventory`, `/api/destinations`, `/api/demands`, `/api/routes`, `/api/import/*`.
  - Operations Cockpit UI: `/app/inventory`, `/app/destinations`, `/app/transport`, and reusable `CsvImportDialog`.
- **Exit Criteria (Achieved)**:
  - 21 integration tests in `tests/operations/operational-data.test.ts` passing (44/44 total Vitest tests passing).
  - `npm run type-check` exits with 0 errors.
  - `npm run lint` exits with 0 warnings and 0 errors.
  - `npm run build` succeeds with all 23 static and dynamic routes.

---

### Phase 05: Baseline Comparison & Economic Evaluation (Completed)
- **Objective**: Implement a fair, reproducible evaluation pipeline that measures operational and financial outcomes against a documented baseline using unified starting conditions and cost definitions.
- **Key Deliverables**:
  - `src/engine/evaluator.ts`: Reconciled economic ledger (`EconomicLedger`) tracking mass balances, demand balances, reference vs realized revenue, foregone discount revenue, COGS, unsold healthy inventory asset value, unrecoverable spoiled write-offs, incurred transport, handling, and waste disposal fees.
  - Baseline FIFO Specification: Fully documented reference policy using chronological intake sorting (`receivedDate` asc, `harvestDate` asc, `batchCode` asc), demand deadline matching, identical hard constraint parity, and static list pricing ($\delta = 0$).
  - Safe Math Utilities: `safePercentageChange` guaranteeing zero-denominator and negative-baseline safety without `NaN` or `Infinity`.
  - Headless Scenario Runner: `evaluateScenario(input, options)` executing FreshRoute FEFO and Baseline FIFO on identical canonical snapshots.
  - Three Canonical Outcome Fixtures:
    1. `FRESHROUTE_SUPERIOR`: Dynamic markdown salvage avoids 2,000 kg expiration and delivers higher net margin.
    2. `EQUIVALENT`: Homogeneous fresh produce produces identical sequence and $0 margin delta.
    3. `BASELINE_SUPERIOR`: Evaluator objectively identifies freight fee trap where rolling an expensive truck to salvage a small lot loses more money than write-off.
- **Exit Criteria (Achieved)**:
  - 11/11 tests passing in `tests/engine/baseline-evaluator.test.ts`.
  - All 66/66 test suite cases passing across the entire repository.
  - Zero TypeScript compiler errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) succeeds.

---

### Phase 06: Distribution Planner Workflow & UI (Completed)
- **Objective**: Build the primary FreshRoute workflow that connects persisted operational data to the planning engine and economic evaluator.
- **Key Deliverables**:
  - `src/server/services/planning.service.ts`: Readiness checker (`checkPlanningReadiness`), plan generator executing `evaluateScenario()`, relational persistence (`DistributionPlan`, `PlanSnapshot`, `Allocation`, `PlanMetrics`, `DiscountRecommendation`), plan retrieval, approval state machine (`approveDistributionPlan`), and RFC-4180 CSV export generators.
  - App Router API Handlers:
    - `GET /api/planning/readiness`
    - `POST /api/planning/generate`
    - `GET /api/planning/plans`
    - `GET /api/planning/plans/[id]`
    - `POST /api/planning/plans/[id]/approve`
    - `GET /api/planning/plans/[id]/export`
  - Interactive Planning Cockpit UI (`/app/planning`):
    - Facility selector and real-time operational readiness diagnostics card.
    - Solver assumptions accordion (dynamic markdowns toggle, max markdown limit, shelf-life safety buffer, handling fee, disposal penalty).
    - Executive KPI results dashboard with safe percentages and strategy winner designation badge (`FRESHROUTE_SUPERIOR` / `EQUIVALENT` / `BASELINE_SUPERIOR`).
    - 4 Interactive Tabs:
      1. **Dispatch Manifest Table**: Sequence, Batch Code, Destination, Carrier Route, Allocated kg, Pricing, Arrival RSL at dock, Reason Code, and Facts Drawer action.
      2. **Allocation Matrix Heatmap**: 2D grid of Batches $\times$ Destinations with allocated kg cells, salvage discount badges, and unallocated surplus stock risk breakdown.
      3. **Baseline Comparison Ledger**: Line-by-line comparative table between FreshRoute FEFO and Baseline FIFO across physical mass, demand fulfillment, revenue, logistics spend, and net margin.
      4. **Explainability & Rejections Audit**: Infeasibility log with mathematical proof for rejected candidate pairs.
    - Facts Audit Modal: Detailed breakdown of arrival timestamps, handling buffers, delivered vs required RSL, and two-part tariff cost attribution.
    - Manual review & approval lock transition to `COMMITTED` status.
    - RFC-4180 CSV manifest and comparison KPI report export downloads.
- **Exit Criteria (Achieved)**:
  - 9/9 integration tests passing in `tests/planning/planner-workflow.test.ts`.
  - All 75/75 Vitest tests passing across all 7 test suites.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) succeeds across all 26 static and dynamic routes.

---

### Phase 07: FreshRoute Discount Center (Completed)
- **Objective**: Implement explainable, deterministic dynamic discount recommendations for perishable inventory likely to remain unsold or become unusable before it can be sold, preserving floor margins over landfill disposal fees.
- **Key Deliverables**:
  - `src/engine/discount-engine.ts`: Isolated pure domain discount module with zero framework/DB dependencies. Calculates residual unallocated stock, feasible selling windows, candidate markdown steps (5% to 40%), net economic impact $\Delta \text{Margin} = Q_{\text{salvage}} \times [P_{\text{disc}} - V_R - H + K_{\text{disp}}]$, and plan simulation with mass balance preservation.
  - Deterministic Demand Ceilings: Sales volume is strictly capped at buyer unfulfilled order commitments; no speculative market expansion or unvalidated elasticity is claimed.
  - Persistence & Backend Service (`src/server/services/discount.service.ts`): Evaluation persistence to `DiscountRecommendation` table, joined queries, approval state machine (`APPROVE`, `REJECT`, `DEFER`), and before-vs-after simulation.
  - Next.js App Router Endpoints: `POST /api/discounts/evaluate`, `GET /api/discounts/recommendations`, `PATCH /api/discounts/recommendations/[id]`, `POST /api/discounts/simulate`.
  - Discount Center Cockpit UI (`/app/discounts`):
    - Dark slate & acid-lime high-contrast interface (`DiscountCenterCockpit.tsx`, `discounts.module.scss`).
    - Prominent Governance & Methodology Banner: clarifies deterministic demand ceiling, tipping penalty avoidance ($0.25/kg), and simulated decision model status.
    - KPI metric cards: Salvage Recouped, Disposal Saved, Net Margin Uplift, At-Risk Produce Cleared, Average Discount.
    - At-risk inventory table with severity filters (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `NO_DISCOUNT`), search query, and status selector.
    - Recommendation Detail Modal: Price waterfall comparing Status Quo (Dump & Write-Off) vs Dynamic Salvage Scenario, cold-chain timeline, explainable merchandiser narrative, and audit notes input.
    - Plan Simulation Modal: Side-by-side Before vs After economic ledgers verifying net profit uplift and spoilage volume reduction without double-counting.
- **Exit Criteria (Achieved)**:
  - 8/8 unit tests passing in `tests/engine/discount-engine.test.ts`.
  - 5/5 integration tests passing in `tests/discounts/discount-workflow.test.ts`.
  - All 88/88 Vitest tests passing across all 9 test suites.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) succeeds across all 29 static and dynamic routes.

---

### Phase 08: FreshRoute Scenario Lab (What-If Simulation Sandbox) (Completed)
- **Objective**: Implement a deterministic What-If scenario simulator that measures how changes in operating conditions affect proposed distribution plans without mutating base plans or input snapshots.
- **Key Deliverables**:
  - `src/engine/scenario-engine.ts`: Pure domain TypeScript engine for input overrides, differential comparisons (`UNCHANGED`, `MODIFIED`, `DROPPED`, `NEW`), `NewlyInfeasibleDelivery` identification, `BatchUrgencyMigration` escalations, and deterministic sensitivity parameter sweeps across discrete intervals.
  - Multi-disruption support: Transit delays & route closures, demand shocks & order cancellations, wholesale market price shifts, fleet capacity reductions, accelerated shelf-life decay & temperature excursions, and compound disruption tests.
  - Base plan immutability guarantee: Base plans, snapshots, and SHA-256 snapshot hashes remain 100% unmutated; scenario runner clones inputs deeply before applying overrides.
  - Backend Service (`src/server/services/scenario.service.ts`): Scenario execution, database persistence with auto-migrated schema, diff retrieval, sensitivity sweeps, and record deletion.
  - App Router Endpoints: `GET /api/scenarios`, `POST /api/scenarios/run`, `GET /api/scenarios/[id]`, `DELETE /api/scenarios/[id]`, `POST /api/scenarios/sensitivity`.
  - Scenario Lab Cockpit UI (`/app/scenarios`):
    - Dark-slate palette with violet/cyan accents (`ScenarioLabCockpit.tsx`, `scenarios.module.scss`).
    - Base plan selector dropdown with auto-generation fallback.
    - 6 Quick stress-test preset pills (Highway 101 Closure, Harvest Heatwave, Fleet Breakdown, Demand Contraction, Price Slump, Compound Storm).
    - Real-time parameter sliders (transit delay hours, shelf-life decay %, demand multiplier %, fleet capacity %, wholesale price %).
    - Macro KPI delta cards and side-by-side comparative economic ledger cards.
    - 5 Deep-dive analysis tabs: Newly Infeasible Deliveries, Allocation Line-Item Diffs, Batch Urgency Migrations, Sensitivity Curve Analysis, and Scenario History.
    - Governance & Audit Verification Bar with SHA-256 hashes and explicit deterministic simulation disclaimer.
- **Exit Criteria (Achieved)**:
  - 7/7 unit tests passing in `tests/engine/scenario-engine.test.ts`.
  - 5/5 integration tests passing in `tests/scenarios/scenario-workflow.test.ts`.
  - All 100/100 tests passing across all 11 test suites.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) succeeds across all 32 static and dynamic routes.

---

### Phase 09: FreshRoute Production Readiness & Competition Demo [COMPLETED]
- **Objective**: Ensure FreshRoute is reliable, secure, multi-tenant hardened, reproducible, and ready for judged competition demonstration.
- **Key Deliverables**:
  - `tests/security/multi-tenancy-authorization.test.ts`: 6 passing automated tests proving Organization B cannot access, read, update, approve, or export Organization A's inventory batches, customer demands, transport routes, distribution plans, discount recommendations, or scenarios.
  - CSV Upload Security: Added 5MB file payload limit and 5,000 row maximum limit per batch.
  - `src/app/app/analytics/AnalyticsCockpit.tsx`: Interactive Recharts dashboard visualizing gross revenue, freight spend, landfill disposal costs, net operating profits, physical spoilage mass, and per-commodity margin contributions against Baseline FIFO.
  - `src/app/api/demo/reset/route.ts`: 1-click deterministic database reset and re-seed endpoint restoring the 5 canonical operational edge cases and generating a baseline plan.
  - `src/app/app/settings/SettingsCockpit.tsx`: Settings & Demo Control console with 1-click Demo Reset button, multi-tenancy status, solver parameters, and runtime environment verification.
  - `src/components/shell/AppHeader.tsx`: Replaced raw alerts with functional search navigation, operational notifications popover, and top navigation Demo Reset button.
  - `docs/demo-walkthrough.md`: Comprehensive step-by-step competition demonstration walkthrough covering all 5 edge cases, baseline comparison, discount salvage, and scenario stress testing.
- **Exit Criteria (Achieved)**:
  - 106/106 tests passing across all 12 test files (`npm test`).
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) successfully compiles all 33 static and dynamic routes.
