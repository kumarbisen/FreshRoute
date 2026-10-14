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

## Phase 1: Pure Domain Distribution Solver & Baseline Comparator Engine
- [ ] `[PENDING]` **TASK-101**: Implement shelf-life decay model and remaining shelf-life calculator (`src/domain/shelf-life/decay-model.ts`).
- [ ] `[PENDING]` **TASK-102**: Implement dynamic markdown and price elasticity calculator (`src/domain/pricing/markdown-engine.ts`) with decimal-safe calculations.
- [ ] `[PENDING]` **TASK-103**: Implement strict constraint validator (`src/domain/constraints/validator.ts` - inventory capacity, transport payload/volume, temperature compatibility, arrival window, retailer min SLA shelf life).
- [ ] `[PENDING]` **TASK-104**: Implement intelligent FEFO distribution solver (`src/domain/solver/fefo-solver.ts`) with structured reason codes and explanatory generation.
- [ ] `[PENDING]` **TASK-105**: Implement documented baseline FIFO solver (`src/domain/solver/baseline-fifo-solver.ts`) with static pricing and naive dispatching.
- [ ] `[PENDING]` **TASK-106**: Implement comparative evaluation engine (`src/domain/comparator/metrics-comparator.ts`) quantifying profit delta, spoilage reduction, fill rate, and customer SLA violations.
- [ ] `[PENDING]` **TASK-107**: Write exhaustive Vitest test suites for pure domain modules (FEFO allocation correctness, constraint enforcement, edge cases, zero-dependency purity).

---

## Phase 2: PostgreSQL Database & Prisma ORM Persistence Layer
- [ ] `[PENDING]` **TASK-201**: Define Prisma schema (`prisma/schema.prisma`) for Facility, Product, InventoryBatch, Customer, DemandOrder, TransportRoute, PlanningRun, PlanningSnapshot, and Allocation.
- [ ] `[PENDING]` **TASK-202**: Generate Prisma client and configure decimal-safe data mappers.
- [ ] `[PENDING]` **TASK-203**: Build realistic synthetic demo seed script (`prisma/seed.ts`) labeled clearly as demo data with varied perishables (berries, leafy greens, avocados, citrus) and retailer personas.
- [ ] `[PENDING]` **TASK-204**: Create data access repositories for batches, orders, routes, and runs (`src/server/db/...`).

---

## Phase 3: Planning Run API Handlers & Reproducibility Service
- [ ] `[PENDING]` **TASK-301**: Implement Zod request schemas for planning run execution and batch/order management (`src/server/schemas/...`).
- [ ] `[PENDING]` **TASK-302**: Build planning run orchestration service (`src/server/services/planning-run.service.ts`) with SHA-256 snapshot hashing.
- [ ] `[PENDING]` **TASK-303**: Implement Next.js App Router API Route handlers:
  - `POST /api/planning-runs` (Execute new plan vs baseline)
  - `GET /api/planning-runs` (List past planning runs)
  - `GET /api/planning-runs/[id]` (Retrieve run details, allocations, snapshots, comparisons)
  - `POST /api/planning-runs/[id]/commit` (Commit plan to active dispatch)
  - `GET /api/inventory/batches` (List and filter current batches)
  - `GET /api/demand/orders` (List pending demand orders)
- [ ] `[PENDING]` **TASK-304**: Implement Clerk authentication middleware and user session context injection.

---

## Phase 4: Production User Interface with SCSS Modules & Radix UI
- [ ] `[PENDING]` **TASK-401**: Build SCSS design system tokens (`colors`, `typography`, `spacing`, `elevation`, `layout-grid`) and base styles.
- [ ] `[PENDING]` **TASK-402**: Develop accessible Radix UI component library (Dialog, DropdownMenu, Select, Tabs, Tooltip, Badge, Button, Table) styled with SCSS Modules.
- [ ] `[PENDING]` **TASK-403**: Build application layout shell with sidebar navigation, top header, user profile button (Clerk), and active status bar (`src/components/layout/...`).
- [ ] `[PENDING]` **TASK-404**: Develop Batch Inventory Management view (`/inventory`) with shelf-life urgency tags and quality grade badges.
- [ ] `[PENDING]` **TASK-405**: Develop Demand Orders view (`/orders`) with retailer SLA constraints and delivery window trackers.
- [ ] `[PENDING]` **TASK-406**: Develop Interactive Planning Run Console (`/plan`) with run parameters, solver triggers, and live progress indicators.
- [ ] `[PENDING]` **TASK-407**: Develop Allocation Dispatch View with interactive line-item breakdown, reason code badges, and human-readable explanation callouts.

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
