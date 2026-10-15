# FreshRoute: Engineering Taskboard

## Status Legend
- `[COMPLETED]` - Verified and committed with passing tests/checks
- `[IN PROGRESS]` - Currently active in the current implementation phase
- `[PENDING]` - Planned for upcoming phases
- `[BLOCKED]` - Awaiting upstream prerequisites

---

## Phase 0: Architecture, Documentation & Foundation Scaffolding
- [x] `[COMPLETED]` **TASK-001**: Inspect repository workspace, environment tooling (Node 22, npm 10, git) and baseline state.
- [x] `[COMPLETED]` **TASK-002**: Draft comprehensive project charter & vision document (`project.md`).
- [x] `[COMPLETED]` **TASK-003**: Formulate system architecture, mathematical optimization model, and pure domain solver isolation boundaries (`architecture.md`).
- [x] `[COMPLETED]` **TASK-004**: Establish engineering guidelines, coding style, decimal-math standards, and SCSS module patterns (`coding-style.md`).
- [x] `[COMPLETED]` **TASK-005**: Author system rules, architectural invariants, and security mandates (`rules.md`).
- [x] `[COMPLETED]` **TASK-006**: Set up defect and issue tracking log (`bugs.md`).
- [x] `[COMPLETED]` **TASK-007**: Create multi-phase engineering roadmap and release milestones (`roadmap.md`).
- [x] `[COMPLETED]` **TASK-008**: Initialize npm dependencies with Next.js 15, React 19, TypeScript, Sass, Radix UI, Prisma, Vitest, Zod, React Hook Form, Recharts, and Clerk.
- [x] `[COMPLETED]` **TASK-009**: Configure `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, and `.gitignore`.
- [x] `[COMPLETED]` **TASK-010**: Scaffold pure TypeScript domain types (`src/domain/types/...`) with explicit units of measure.
- [x] `[COMPLETED]` **TASK-011**: Create foundational App Router shell (`src/app/...`) and global SCSS styling variables to verify build and test pipeline.

---

## Phase 01: FreshRoute Visual Foundation & Marketing Website
- [x] `[COMPLETED]` **TASK-01-01**: Design and implement core design tokens (`src/styles/_tokens.scss`) featuring deep charcoal, acid-lime (`#d4f933`), produce emerald (`#10b981`), monospace tags, and reduced motion resets.
- [x] `[COMPLETED]` **TASK-01-02**: Develop accessible reusable UI primitives (`Button`, `Card`, `Badge`, `Dialog` [Radix UI], `Table`, `EmptyState`, `Skeleton`, `Breadcrumbs`, `PageHeader`) in `src/components/ui/`.
- [x] `[COMPLETED]` **TASK-01-03**: Build responsive marketing navbar with animated freshness indicator, sticky blur backdrop, and primary CTAs (`MarketingNav`).
- [x] `[COMPLETED]` **TASK-01-04**: Build oversized editorial hero section with technical coordinates and key value metrics (`HeroSection`).
- [x] `[COMPLETED]` **TASK-01-05**: Develop interactive Network Flow topology simulator with countdown clocks, reefer capacity meters, and destination SLA matching (`NetworkFlowVisualizer`).
- [x] `[COMPLETED]` **TASK-01-06**: Author asymmetric problem/solution storytelling comparing legacy FIFO with FreshRoute algorithms (`ProblemSolutionStorytelling`).
- [x] `[COMPLETED]` **TASK-01-07**: Build 4 feature pillar deep dives with TypeScript code previews (`FeatureDeepDives`).
- [x] `[COMPLETED]` **TASK-01-08**: Develop interactive before-and-after performance benchmark toggle comparing FIFO vs. FEFO (`BaselineComparisonVisualizer`).
- [x] `[COMPLETED]` **TASK-01-09**: Create 4-step chronological workflow pipeline (`HowItWorksSection`).
- [x] `[COMPLETED]` **TASK-01-10**: Build closing high-contrast CTA banner and professional engineering footer (`ClosingCtaSection`, `MarketingFooter`).
- [x] `[COMPLETED]` **TASK-01-11**: Implement responsive authenticated application shell (`AppShellLayout`, `AppSidebar` with workspace switcher, `AppHeader` with live clock and telemetry).
- [x] `[COMPLETED]` **TASK-01-12**: Build operational overview cockpit (`/app`) with live dispatch table, urgency alert banners, and solver configuration dialog.
- [x] `[COMPLETED]` **TASK-01-13**: Scaffold future application pages (`/app/inventory`, `/app/destinations`, `/app/transport`, `/app/planning`, `/app/discounts`, `/app/analytics`, `/app/scenarios`, `/app/settings`) with roadmap milestones and mock telemetry.
- [x] `[COMPLETED]` **TASK-01-14**: Write Vitest unit tests for UI primitives and verify clean passes with ESLint and TypeScript.

---

## Phase 04: FreshRoute Distribution Planning Engine (Pure Domain Optimization Solver & Baseline Comparator)
- [x] `[COMPLETED]` **TASK-401**: Pure Domain Engine Architecture & Contracts (`src/engine/contracts.ts`): Typed input/output contracts, enums (`AllocationReasonCode`, `BindingConstraintType`, `LeftoverStockCategory`), structured facts audit, zero dependencies on React/Next.js/Prisma/browser APIs.
- [x] `[COMPLETED]` **TASK-402**: Absolute Timeline Shelf-Life & Multi-Constraint Feasibility (`src/engine/feasibility.ts`): Handling completion time calculation $T_{\text{handled}} = T_{\text{dep}} + \Delta t_{\text{trans}} + \Delta t_{\text{hand}}$, $RSL_{\text{handled}} = T_{\text{exp}} - T_{\text{handled}}$, commodity matching, origin-destination route connectivity, cold-chain temperature intervals $[T_{\min}, T_{\max}]$, arrival window enforcement, and margin floor checks against waste write-off.
- [x] `[COMPLETED]` **TASK-403**: Multi-Factor Deterministic Candidate Prioritizer (`src/engine/prioritizer.ts`): FEFO perishability urgency ($10000 / (RSL + 0.1)$), net margin contribution ($100 \times \text{unitMargin}$), retailer tier bonus, discount penalty, and strict 5-tier stable tie-breakers (`expiryDate`, `batchCode`, `deliveryWindowEnd`, `orderNumber`, `routeCode`).
- [x] `[COMPLETED]` **TASK-404**: Iterative Multi-Pass Allocator & Two-Part Transport Attribution (`src/engine/allocator.ts`): Vehicle payload capacity tracking, batch stock availability, demand order fulfillment caps, proportional fixed fee attribution ($F_r \times \frac{q_a}{W_r}$), binding constraint identification, and multi-tier leftover stock breakdown (`FULLY_ALLOCATED`, `UNALLOCATED_FEASIBLE`, `AT_RISK`, `INFEASIBLE_CONSTRAINTS`, `SPOILED_EXPIRED`).
- [x] `[COMPLETED]` **TASK-405**: Dynamic Markdown Salvage Subroutine: Non-linear decay discount curve $\delta = \min(\delta_d^{\max}, \delta^{\text{cap}}, (1 - RSL / S_c)^\beta \cdot \delta^{\text{cap}})$, margin floor validation, and secondary channel discount allocation.
- [x] `[COMPLETED]` **TASK-406**: Documented Baseline FIFO Solver & Comparator (`src/engine/baseline-fifo.ts`): Legacy FIFO intake-date dispatcher, static pricing ($\delta = 0$), customer SLA dock rejection simulation, and comparative delta metrics calculation (profit uplift, waste prevented kg/$, SLA fulfillment delta).
- [x] `[COMPLETED]` **TASK-407**: Canonical SHA-256 Snapshot Hashing & Orchestrator (`src/engine/planner.ts`): Strict input validation (`validatePlannerInput`), canonical deterministic JSON serialization, SHA-256 input snapshot hashing, and `solveDistributionPlan()` entry point.
- [x] `[COMPLETED]` **TASK-408**: Systematic Test Suite for 10 Canonical Operational Fixtures (`tests/engine/planning-engine.test.ts`): Complete test coverage across 11 test cases (10 required fixtures + markdown salvage), verifying mathematical superiority over baseline FIFO, binding constraints, and 100% reproducible bit-for-bit runs. All 55 tests passing across the project.

---

## Phase 2: PostgreSQL Database & Prisma ORM Persistence Layer (PHASE 02 - FreshRoute Data Foundation)
- [x] `[COMPLETED]` **TASK-201**: Define comprehensive Prisma schema (`prisma/schema.prisma`) for Organization, OrganizationMembership, Warehouse, Commodity, InventoryBatch, Destination, DestinationDemand, Route, DistributionPlan, PlanSnapshot, Allocation, DiscountRecommendation, PlanMetrics, and Scenario with explicit Decimal precision, enums, foreign keys, and indexes.
- [x] `[COMPLETED]` **TASK-202**: Generate Prisma Client (`v6.4.1`) and initial PostgreSQL migration DDL (`prisma/migrations/20261014000000_init/migration.sql`).
- [x] `[COMPLETED]` **TASK-203**: Author and publish single consistent economic model documentation (`docs/economic-model.md`) detailing the arrival shelf-life formulation without double subtraction and the two-part transport cost structure.
- [x] `[COMPLETED]` **TASK-204**: Create runtime Zod validation schemas (`src/server/db/schema.zod.ts`) for all relational models and enums.
- [x] `[COMPLETED]` **TASK-205**: Implement in-process PostgreSQL WASM provider (`src/server/db/pglite.ts`) and Prisma singleton (`src/server/db/client.ts`).
- [x] `[COMPLETED]` **TASK-206**: Implement domain data foundation service (`src/server/services/data-foundation.service.ts`) with shelf-life invariant calculation, two-part logistics cost, margin breakdown, SHA-256 snapshot hashing, and deterministic seed runner.
- [x] `[COMPLETED]` **TASK-207**: Build deterministic synthetic demo seed script (`prisma/seed.ts` / `npm run db:seed`) representing 5 canonical edge cases: Urgent Dispatch (FEFO Urgency), Infeasible Delivery (SLA Breach Rejection), Excess Supply (Surplus Inventory), Unmet Demand (Supply Shortage), and Potential Discount Salvage (Dynamic Markdown).
- [x] `[COMPLETED]` **TASK-208**: Implement system health and database readiness check API endpoint (`src/app/api/health/route.ts`).
- [x] `[COMPLETED]` **TASK-209**: Build and verify comprehensive test suite (`tests/data/seed-consistency.test.ts`) validating schema execution, seed idempotency, all 5 edge cases, shelf-life invariant, and transport cost math (23/23 tests passing).

---

## Phase 03: Operational Data Management (Inventory, Destinations, Transport Fleet & CSV Workflows)
- [x] `[COMPLETED]` **TASK-301**: Schema & Migration Extensions (`prisma/schema.prisma`): Added `reservedQuantity`, `dispatchedQuantity`, and `spoiledQuantity` to `InventoryBatch`; added `fulfilledQuantity` to `DestinationDemand`; created `BatchQuantityAudit` model tracking delta changes, event triggers, and timestamps.
- [x] `[COMPLETED]` **TASK-302**: Zod Runtime Validation Schemas (`src/server/db/schema.zod.ts`): Created strict schemas for batch adjustment, destination creation/updates, demand orders, route constraints, and CSV row schemas for all three operational entities.
- [x] `[COMPLETED]` **TASK-303**: Backend Service Layer with Organization-Level Tenancy:
  - Inventory Service (`src/server/services/inventory.service.ts`): Configurable shelf-life decay risk tiers (`CRITICAL` $\le 48\text{h}$, `HIGH` $2\text{--}4\text{d}$, `MEDIUM` $4\text{--}7\text{d}$, `LOW` $> 7\text{d}$, `EXPIRED`), balance invariant enforcement ($allocated \le available$, $initial = available + reserved + dispatched + spoiled$), lifecycle state machines, and audit logging.
  - Destinations & Demand Service (`src/server/services/destinations.service.ts`): Buyer receiving SLA constraints, dock delivery windows, receiving hours, and real-time fulfillment shortage calculation.
  - Transport Fleet Service (`src/server/services/transport.service.ts`): Two-part tariff economics ($Fixed + Variable \times kg$), reefer specifications, route lead times, and capacity utilization.
  - CSV Import Service (`src/server/services/csv-import.service.ts`): Template generation, CSV text parsing, preview validation, duplicate key detection, and transactional commit reporting.
- [x] `[COMPLETED]` **TASK-304**: Next.js App Router API Handlers:
  - `GET`, `POST` `/api/inventory` & `GET`, `PATCH` `/api/inventory/[id]`
  - `GET`, `POST` `/api/destinations` & `GET`, `PATCH` `/api/destinations/[id]`
  - `GET`, `POST` `/api/demands` & `GET`, `PATCH` `/api/demands/[id]`
  - `GET`, `POST` `/api/routes` & `GET`, `PATCH` `/api/routes/[id]`
  - `GET` `/api/warehouses`, `GET` `/api/commodities`
  - `GET` `/api/import/template`, `POST` `/api/import/preview`, `POST` `/api/import/commit`
- [x] `[COMPLETED]` **TASK-305**: Production Operations Cockpit & UI Dialogs:
  - Inventory Table (`/app/inventory`): Search, multi-facet filtering, sorting, pagination, risk countdown badges, batch detail drawer with audit history, and batch creation/edit dialog.
  - Destinations & Demand (`/app/destinations`): Dual-tab interface, fulfillment shortage indicators, delivery window display, and destination/demand modals.
  - Transport Fleet Scheduling (`/app/transport`): Route economics table, payload capacity utilization gauges, and route configuration dialog.
  - Reusable CSV Import Dialog (`CsvImportDialog.tsx`): Template download, drag-and-drop file upload, row-level schema validation errors, preview table, and transactional commit.
- [x] `[COMPLETED]` **TASK-306**: Automated Verification & Integrity Checks:
  - 21 operational integration tests (`tests/operations/operational-data.test.ts`) covering all lifecycle rules, invariants, two-part tariffs, CSV error handling, and multi-tenant isolation.
  - All 44 Vitest tests passing across all 4 test suites.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) passing with all 23 static and dynamic routes.

---

## Phase 05: Baseline Comparison & Economic Evaluation
- [x] `[COMPLETED]` **TASK-501**: Unified Economic Ledger Pipeline (`src/engine/evaluator.ts`): Mass balance, demand balance, revenue reconciliation (reference vs realized vs foregone markdown revenue), cost classification (sunk procurement vs realized COGS vs unsold healthy asset vs spoiled write-off, incurred transport, incurred handling, incurred disposal penalty), and net economic margin calculations using `Decimal.js`.
- [x] `[COMPLETED]` **TASK-502**: Documented Baseline FIFO Reference Strategy: Chronological intake sorting (`receivedDate` asc, `harvestDate` asc, `batchCode` asc), demand deadline matching (`deliveryWindowEnd` asc, `orderNumber` asc), identical hard constraint enforcement, and explicit static list pricing policy ($\delta = 0$).
- [x] `[COMPLETED]` **TASK-503**: Safe Zero-Denominator & Negative Baseline Math (`safePercentageChange`): Robust percentage calculation for zero baselines, positive baselines, and negative loss baselines using absolute denominator $|\text{Baseline}|$ without `NaN` or `Infinity`.
- [x] `[COMPLETED]` **TASK-504**: Programmatic Scenario Evaluation Interface (`evaluateScenario`): Headless runner executing FreshRoute FEFO and Baseline FIFO on identical canonical input snapshots (`inputSnapshotHash`), outputting reconciled ledgers and delta metrics.
- [x] `[COMPLETED]` **TASK-505**: Exhaustive Verification & 3 Canonical Outcomes (`tests/engine/baseline-evaluator.test.ts`):
  - Verified zero-spoilage baseline, zero demand, excess stock, constrained capacity, temperature-infeasible routes, and discount non-double-counting.
  - Verified **`FRESHROUTE_SUPERIOR`**: FEFO dynamic markdown salvage recovers at-risk produce while Baseline FIFO suffers expiration.
  - Verified **`EQUIVALENT`**: Homogeneous fresh inventory yields identical dispatches and zero margin delta.
  - Verified **`BASELINE_SUPERIOR`**: Freight fee trap where rolling an expensive dedicated truck to salvage a small discounted lot loses more money than the spoilage write-off itself, proving the evaluator is objective and non-biased.
  - All 66 tests passing across all 6 test suites.

---

## Phase 06: Distribution Planner Workflow & UI (Interactive Planning Cockpit)
- [x] `[COMPLETED]` **TASK-601**: Planning Domain Service & Persistence (`src/server/services/planning.service.ts`): Built readiness checker (`checkPlanningReadiness`), plan generator with full `evaluateScenario()` execution, relational persistence (`DistributionPlan`, `PlanSnapshot`, `Allocation`, `PlanMetrics`, `DiscountRecommendation`), plan retriever (`getDistributionPlanById`), and approval state machine (`approveDistributionPlan`).
- [x] `[COMPLETED]` **TASK-602**: App Router REST Endpoints (`src/app/api/planning/...`):
  - `GET /api/planning/readiness`: Facility stock, demand orders, and carrier readiness evaluation.
  - `POST /api/planning/generate`: Deterministic planning run execution and DB snapshot commit.
  - `GET /api/planning/plans`: Recent plans listing with summary uplift KPIs.
  - `GET /api/planning/plans/[id]`: Full plan inspection with joined allocations and snapshot details.
  - `POST /api/planning/plans/[id]/approve`: Status transition to `COMMITTED` with batch quantity reservation and audit logging.
  - `GET /api/planning/plans/[id]/export`: RFC-4180 CSV generation for dispatch manifest and comparative KPI report.
- [x] `[COMPLETED]` **TASK-603**: Interactive Distribution Planner Cockpit UI (`/app/planning`):
  - Facility selector and operational readiness alert banner with missing prerequisites diagnostics.
  - Solver assumptions accordion (dynamic markdowns toggle, max markdown limit %, shelf-life safety buffer, handling fee, disposal penalty).
  - Executive KPI results dashboard with safe percentages and strategy winner designation badge (`FRESHROUTE_SUPERIOR` / `EQUIVALENT` / `BASELINE_SUPERIOR`).
  - 4 High-density tabs:
    1. **Dispatch Manifest Table**: Sequence, Batch Code, Destination, Carrier Route, Allocated kg, Pricing, Arrival RSL at dock, Reason Code, and Facts Drawer action.
    2. **Allocation Matrix Heatmap**: 2D grid of Batches $\times$ Destinations with allocated kg cells, salvage discount badges, and unallocated surplus stock risk breakdown.
    3. **Baseline Comparison Ledger**: Line-by-line comparative table between FreshRoute FEFO and Baseline FIFO across physical mass, demand fulfillment, revenue, logistics spend, and net margin.
    4. **Explainability & Rejections Audit**: Infeasibility log with mathematical proof for rejected candidate pairs.
  - Facts Audit Modal: Detailed breakdown of arrival timestamps, handling buffers, delivered vs required RSL, and two-part tariff cost attribution.
- [x] `[COMPLETED]` **TASK-604**: RFC-4180 CSV Export Capabilities: Dedicated export endpoints for dispatch manifests and comparative economic reports with proper MIME headers.
- [x] `[COMPLETED]` **TASK-605**: Automated Verification Suite (`tests/planning/planner-workflow.test.ts`): 9 comprehensive integration tests verifying readiness evaluation, deterministic plan generation, metrics persistence, approval lock transitions, and RFC-4180 CSV exports. All 75 tests passing across 7 test suites. Zero TypeScript errors, zero ESLint warnings, and successful Next.js production build across all 26 routes.

---

## Phase 07: FreshRoute Discount Center (Dynamic Markdown Salvage & Floor Margin Preservation)
- [x] `[COMPLETED]` **TASK-701**: Pure TypeScript Discount Decision Engine (`src/engine/discount-engine.ts`): Isolated pure domain module with zero React/Next.js/DB dependencies. Calculates residual unallocated stock, feasible selling windows, connecting cold-chain routes, customer SLA eligibility, and candidate markdown steps (5% to 40%). Mathematical net margin formulation $\Delta \text{Margin} = Q_{\text{salvage}} \times [P_{\text{disc}} - V_R - H + K_{\text{disp}}]$ ensures profit-maximizing recommendations over landfill dumping while preventing loss-making discounts.
- [x] `[COMPLETED]` **TASK-702**: Deterministic Demand Ceilings & Explicit Governance: Explicitly guards against unvalidated consumer elasticity assumptions; caps clearance volumes strictly to customer open unfulfilled orders; outputs explicit confidence limitations and structured audit reason codes (`DISCOUNT_RECOMMENDED`, `NO_DISCOUNT_FULLY_ALLOCATED`, `NO_DISCOUNT_EXPIRED_INVENTORY`, `NO_DISCOUNT_LOSS_MAKING`, `NO_DISCOUNT_INSUFFICIENT_DEMAND`).
- [x] `[COMPLETED]` **TASK-703**: Plan Recalculation & Economic Ledger Reconciliation (`simulatePlanWithApprovedDiscounts`): Modifies allocations, updates batch leftover breakdowns to maintain mass balance, and re-evaluates through `evaluatePlanEconomicLedger()` with zero double-counting.
- [x] `[COMPLETED]` **TASK-704**: Database Persistence & App Router API Endpoints:
  - Backend Service (`src/server/services/discount.service.ts`): `evaluatePlanDiscounts`, `listDiscountRecommendations`, `updateDiscountRecommendationStatus` (state machine for `APPROVE`, `REJECT`, `DEFER`), and `simulatePlanWithDiscounts`.
  - App Router REST Endpoints: `POST /api/discounts/evaluate`, `GET /api/discounts/recommendations`, `PATCH /api/discounts/recommendations/[id]`, `POST /api/discounts/simulate`.
- [x] `[COMPLETED]` **TASK-705**: Interactive Discount Center Cockpit UI (`/app/discounts`):
  - Dynamic Markdown Salvage Console (`DiscountCenterCockpit.tsx`, `discounts.module.scss`) styled with high-density dark slate palette and acid-lime accents.
  - Prominent Methodology & Disclaimer Banner: clearly explains deterministic demand ceiling, tipping penalty avoidance ($0.25/kg), and simulated decision model status.
  - KPI metric cards: Salvage Recouped ($), Disposal Saved ($), Net Margin Uplift ($), At-Risk Produce Cleared (kg), Average Markdown (%).
  - At-risk inventory table with severity filters (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `NO_DISCOUNT`), search query, status selector, and quick row actions.
  - Recommendation Detail Modal: Price waterfall comparing Status Quo (Dump & Write-Off) vs Dynamic Salvage Scenario, cold-chain timeline, explainable merchandiser narrative, and audit notes input.
  - Plan Recalculation Simulation Modal: Side-by-side Before vs After economic ledgers verifying net profit uplift and spoilage volume reduction without double-counting.
- [x] `[COMPLETED]` **TASK-706**: Automated Verification Suite:
  - 8 unit tests in `tests/engine/discount-engine.test.ts` verifying severity tiers, expired produce, loss-making thresholds, step-wise candidate optimization, and simulated ledger reconciliation.
  - 5 integration tests in `tests/discounts/discount-workflow.test.ts` verifying evaluation, database persistence, approval/rejection/deferral audit transitions, and plan simulation.
  - All 88 tests passing across all 9 test suites. Zero TypeScript errors, zero ESLint warnings, and Next.js production build passing with all 29 routes.

---

## Phase 08: FreshRoute Scenario Lab (What-If Simulation & Deterministic Sensitivity Sandbox)
- [x] `[COMPLETED]` **TASK-801**: Pure TypeScript Scenario Engine (`src/engine/scenario-engine.ts`):
  - Isolated domain engine with zero database/React/browser dependencies.
  - Contracts for `ScenarioOverrides` (transit delay %, transit delay hours, disabled routes, route transit overrides, demand multiplier %, demand overrides, disabled demands, price multiplier %, price overrides, capacity multiplier %, capacity overrides, shelf-life reduction %, shelf-life reduction hours, storage temp increase).
  - Deep-cloning override pipeline (`applyScenarioOverrides`) strictly preserving base input immutability and recalculating canonical SHA-256 snapshot hashes.
  - Differential comparison calculator (`calculateScenarioDiffs`): Classifies allocations into `UNCHANGED`, `MODIFIED`, `DROPPED`, `NEW`; detects `NewlyInfeasibleDelivery` instances with explicit failure reason codes (`REJECTED_TRANSIT_EXCEEDS_SHELF_LIFE`, `REJECTED_ROUTE_CAPACITY_EXCEEDED`, `REJECTED_DELIVERY_WINDOW_CLOSED`, etc.); tracks `BatchUrgencyMigration` escalations (`STABLE`/`MEDIUM` $\rightarrow$ `CRITICAL`/`EXPIRED`); and computes reconciled economic and mass deltas.
  - High-level orchestrator (`executeScenarioRun`) reusing `evaluateScenario()` without duplicating solver logic.
  - Deterministic parameter sensitivity sweep (`runSensitivityAnalysis`) across discrete intervals.
- [x] `[COMPLETED]` **TASK-802**: Database Persistence & App Router API Handlers:
  - Backend Service (`src/server/services/scenario.service.ts`): Auto-migrates `Scenario` schema with `overridesJson`, `snapshotHash`, `metricsJson`, `diffJson`; runs scenarios against immutable base plans; lists scenarios with joined base plan information; gets full scenario diff details; runs sensitivity parameter sweeps; deletes saved scenarios.
  - REST Endpoints:
    - `GET /api/scenarios`: Lists all persisted scenarios for current organization.
    - `POST /api/scenarios/run`: Executes What-If scenario against immutable base plan snapshot and persists result.
    - `GET /api/scenarios/[id]`: Retrieves complete scenario run with diff items, newly infeasible deliveries, and urgency migrations.
    - `DELETE /api/scenarios/[id]`: Removes scenario record from database.
    - `POST /api/scenarios/sensitivity`: Runs multi-point parameter sensitivity sweep across discrete range.
- [x] `[COMPLETED]` **TASK-803**: Interactive Scenario Lab Cockpit UI (`/app/scenarios`):
  - `ScenarioLabCockpit.tsx` & `scenarios.module.scss` styled with dark-slate palette and violet/cyan accents.
  - Base plan selector dropdown populated from `/api/planning/plans` with on-the-fly sample base plan generation.
  - 6 Quick stress-test preset pills: Highway 101 Road Closure (+3.5h delay), Harvest Heatwave Excursion (-25% shelf life), Fleet Breakdown (-50% capacity), Demand Contraction (-30% demand), Price Slump (-20% price), Compound Logistics Storm.
  - Interactive parameter sliders with real-time value readouts (transit delay hours, shelf-life decay %, demand multiplier %, fleet capacity %, wholesale price %).
  - Macro KPI cards displaying Net Economic Impact ($\Delta$), Simulated Spoilage ($\Delta$), Fulfillment Mass ($\Delta$), and Newly Infeasible Deliveries.
  - Side-by-side comparative ledger cards (Base Plan vs Simulated Stressed Plan).
  - 5 High-density analysis tabs:
    1. **Newly Infeasible Deliveries**: Table of dropped allocations with exact failure reason code pills and diagnostic explanations.
    2. **Allocation Line-Item Diffs**: `UNCHANGED`, `MODIFIED`, `DROPPED`, `NEW` badges, quantity deltas, unit prices, and net margin deltas with type filter.
    3. **Batch Urgency Migrations**: Risk tier escalation badges (e.g. `STABLE` $\rightarrow$ `CRITICAL`) and urgency status alerts.
    4. **Sensitivity Curve Analysis**: Multi-point deterministic sweep with margin degradation rate slope banner, proportional visual progress bars, and tabular breakdown.
    5. **Scenario History**: Persisted scenario log with parameter summaries, profit/spoilage deltas, load action, and deletion.
  - Governance & Audit Verification Bar displaying SHA-256 snapshot hashes and explicit disclaimer confirming deterministic parameter testing without unvalidated probabilistic forecasts.
- [x] `[COMPLETED]` **TASK-804**: Automated Verification Suite:
  - 7 unit tests in `tests/engine/scenario-engine.test.ts` covering transit delays, demand shocks, price crashes, shelf-life decay, capacity caps, compound shocks, and sensitivity sweeps.
  - 5 integration tests in `tests/scenarios/scenario-workflow.test.ts` covering persistence, base plan snapshot immutability verification, detail retrieval, sensitivity sweeps, and record deletion.
  - Full project test suite passing: 100/100 tests passing across all 11 test suites.
  - Zero TypeScript errors (`npm run type-check`).
  - Zero ESLint warnings or errors (`npm run lint`).
  - Next.js production build (`npm run build`) passing with all 32 static and dynamic routes.

---

## Phase 09: FreshRoute Production Readiness & Competition Demo
- [x] `[COMPLETED]` **TASK-901**: End-to-End Workflow Verification: Verified complete operational journey from input validation, automated plan generation, feasibility audit, baseline comparison, discount approval, disruption simulation, to dispatch manifest CSV export.
- [x] `[COMPLETED]` **TASK-902**: Security & Multi-Tenancy Hardening:
  - Authored dedicated security test suite (`tests/security/multi-tenancy-authorization.test.ts`) with 6 passing tests proving strict cross-organization isolation across Batches, Demands, Routes, Plans, Exports, Discounts, and Scenarios.
  - Enforced organization-scoped authorization across every read and write database query.
  - Added strict CSV upload safety limits (5MB file size limit, 5,000 maximum row batch limit).
- [x] `[COMPLETED]` **TASK-903**: Interactive Recharts Comparative Analytics Cockpit (`/app/analytics`):
  - Built `AnalyticsCockpit.tsx` and `analytics.module.scss`.
  - Recharts visualizations: Economic Breakdown ($ Gross Sales, Logistics Spend, Waste Penalty, Net Operating Profit), Physical Mass Balances (Spoiled kg vs Fulfilled kg), and Net Margin Contribution by Commodity.
  - Connected dynamically to saved distribution plans with CSV report export.
- [x] `[COMPLETED]` **TASK-904**: Competition Demo Environment & Reset Controller:
  - Built `POST /api/demo/reset` for instant 1-click restoration of canonical 5-edge-case demo dataset.
  - Built `SettingsCockpit.tsx` and `settings.module.scss` (`/app/settings`) with interactive Demo Reset button, multi-tenancy diagnostics, and algorithmic parameter inspection.
  - Upgraded `AppHeader.tsx` removing raw `alert()` calls, adding functional global search navigation, interactive operational notifications popover, and top-bar Demo Reset button.
- [x] `[COMPLETED]` **TASK-905**: Documented Competition Demo Walkthrough:
  - Published comprehensive step-by-step judge demonstration guide in `docs/demo-walkthrough.md`.
- [x] `[COMPLETED]` **TASK-906**: Automated Verification & Production Build:
  - Full test suite: 106 tests passing across 12 test files (100% green).
  - TypeScript type-check: 0 errors (`npm run type-check`).
  - ESLint linter: 0 warnings, 0 errors (`npm run lint`).
  - Next.js production build: Successfully compiled all 33 static and dynamic routes (`npm run build`).
