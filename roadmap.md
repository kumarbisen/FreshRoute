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
│ Phase 06: Production User Interface with SCSS Modules & Radix UI       │
│  - Interactive planning cockpit, allocation breakdown, audit modals    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Accessible, responsive UI rendered
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 07: Recharts Comparative Analytics & Spoilage Heatmaps           │
│  - FreshRoute vs Baseline comparative analytics, decay curves          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Interactive visualizer with live data
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 08: Hardening, Security, E2E Verification & Release              │
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

### Phase 06: Production User Interface with SCSS Modules & Radix UI
- **Objective**: Build an enterprise-grade, accessible dispatch and inventory console.
- **Key Deliverables**:
  - SCSS Module design system (`src/styles/`): tokens, mixins, typography, and theme variables.
  - Radix UI wrappers: Dialog, Dropdown, Select, Tabs, Tooltip.
  - Server Component layouts: Navigation shell, Batch Inventory Explorer, Demand Order Viewer.
  - Interactive Planning Run Console with React Hook Form and allocation picklists.
- **Exit Criteria**:
  - Flawless responsive rendering with zero visual glitches.
  - Accessible keyboard navigation across all Radix UI interactive components.

---

### Phase 07: Recharts Comparative Analytics & Spoilage Heatmaps
- **Objective**: Provide high-impact visual proof of FreshRoute's ROI against the baseline.
- **Key Deliverables**:
  - Comparative KPI Delta Cards (Gross Margin, Waste Weight, Salvaged Value).
  - Recharts Spoilage Decay Curves, Revenue Bar Comparisons, and Route Capacity utilization charts.
  - Exportable run summary and dispatch manifest.
- **Exit Criteria**:
  - Responsive charts with interactive tooltips and accessible color contrasts.

---

### Phase 6: Hardening, Security, E2E Verification & Release
- **Objective**: Ensure production readiness, security compliance, and comprehensive verification.
- **Key Deliverables**:
  - Verification test suite: unit, integration, and build checks.
  - Security review: Zero exposed server secrets, strict CSP, environment variable audit.
  - Release documentation and production deployment guide.
- **Exit Criteria**:
  - Zero lint, type-check, or build warnings.
  - All automated checks pass consistently.
