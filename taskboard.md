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

## Phase 06: Production User Interface with SCSS Modules & Radix UI (Interactive Planning Cockpit)
- [ ] `[PENDING]` **TASK-601**: Build SCSS design system tokens (`colors`, `typography`, `spacing`, `elevation`, `layout-grid`) and base styles.
- [ ] `[PENDING]` **TASK-602**: Develop accessible Radix UI component library (Dialog, DropdownMenu, Select, Tabs, Tooltip, Badge, Button, Table) styled with SCSS Modules.
- [ ] `[PENDING]` **TASK-603**: Build application layout shell with sidebar navigation, top header, user profile button (Clerk), and active status bar (`src/components/layout/...`).
- [ ] `[PENDING]` **TASK-604**: Develop Batch Inventory Management view (`/inventory`) with shelf-life urgency tags and quality grade badges.
- [ ] `[PENDING]` **TASK-605**: Develop Demand Orders view (`/orders`) with retailer SLA constraints and delivery window trackers.
- [ ] `[PENDING]` **TASK-606**: Develop Interactive Planning Run Console (`/plan`) with run parameters, solver triggers, and live progress indicators.
- [ ] `[PENDING]` **TASK-607**: Develop Allocation Dispatch View with interactive line-item breakdown, reason code badges, and human-readable explanation callouts.

---

## Phase 5: Recharts Comparative Analytics & Spoilage Heatmaps
- [ ] `[PENDING]` **TASK-501**: Build KPI delta summary cards (Revenue Uplift, Waste Prevented kg/$, SLA Fulfillment Delta).
- [ ] `[PENDING]` **TASK-502**: Build comparative bar & area charts with Recharts comparing FreshRoute vs. Baseline FIFO across all key operational metrics.
- [ ] `[PENDING]` **TASK-503**: Build Batch Shelf-Life Decay Curves and dynamic markdown elasticity visualizer.
- [ ] `[PENDING]` **TASK-504**: Build Transport Capacity Utilization gauge and reefer load charts.
- [ ] `[PENDING]` **TASK-505**: Exportable run audit report generator (JSON and printable dispatch manifest).

---

## Phase 6: End-to-End Verification, Security Audit & Production Build
- [ ] `[PENDING]` **TASK-601**: Verify zero TypeScript errors with `npm run type-check`.
- [ ] `[PENDING]` **TASK-602**: Execute all unit and integration test suites with `npm run test`.
- [ ] `[PENDING]` **TASK-603**: Verify ESLint compliance with `npm run lint`.
- [ ] `[PENDING]` **TASK-604**: Execute production Next.js build with `npm run build` and ensure clean bundle output.
- [ ] `[PENDING]` **TASK-605**: Conduct security audit ensuring zero exposed secrets and 100% Zod validation coverage.
