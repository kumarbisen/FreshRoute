# FreshRoute: Implementation Roadmap & Strategic Milestones

## Strategic Overview
FreshRoute is developed in strictly phased increments. Each phase delivers a verifiable, tested, and self-contained subsystem before progressing to higher layers of abstraction.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Architecture, Documentation & Foundation Scaffolding [ACTIVE] │
│  - System design documents, strict coding standards, rules, bug log   │
│  - Scaffolding Next.js 15, TypeScript, SCSS, Vitest, Prisma, Clerk     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Clean build, typecheck, lint pass
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 1: Pure Domain Distribution Solver & Baseline Comparator Engine  │
│  - Pure TS FEFO solver, dynamic markdown calculator, constraint engine │
│  - Documented FIFO baseline comparator & reason code generator         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: 100% pure domain test coverage
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2: PostgreSQL Database & Prisma ORM Persistence Layer            │
│  - Relational schema, decimal financial mappings, demo seed dataset    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Database migrations & seed execution
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 3: Planning Run API Handlers & Reproducibility Service           │
│  - Zod validation, SHA-256 snapshot hashing, Clerk session auth        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Verified API route integration tests
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 4: Production User Interface with SCSS Modules & Radix UI        │
│  - Server component dashboard, batch manager, dispatch console, forms  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Accessible, responsive UI rendered
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 5: Recharts Comparative Analytics & Spoilage Heatmaps            │
│  - FreshRoute vs Baseline comparative analytics, decay curves          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exit: Interactive visualizer with live data
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 6: End-to-End Verification, Security Hardening & Release         │
│  - Performance audit, secret security check, final CI test suite pass  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Breakdown & Exit Criteria

### Phase 0: Architecture, Documentation & Foundation Scaffolding *(Current Target)*
- **Objective**: Establish rock-solid architectural blueprints, governance rules, and reproducible development tooling.
- **Key Deliverables**:
  - `project.md`, `architecture.md`, `taskboard.md`, `roadmap.md`, `coding-style.md`, `rules.md`, `bugs.md`.
  - Initialized `package.json` with locked dependencies.
  - Type-safe configurations: `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`.
  - Minimal compiling Next.js App Router root layout and test runner verification.
- **Exit Criteria**:
  - `npm run type-check` exits with 0 errors.
  - `npm run test` executes and passes.
  - `npm run lint` passes without warnings.
  - `npm run build` succeeds.

---

### Phase 1: Pure Domain Distribution Solver & Baseline Comparator
- **Objective**: Implement the mathematical core of FreshRoute with zero external framework dependencies.
- **Key Deliverables**:
  - `src/domain/types/`: Immutable domain interfaces with explicit units of measure (kg, days, cents).
  - `src/domain/shelf-life/decay-model.ts`: Produce-specific decay curves and shelf-life prediction.
  - `src/domain/pricing/markdown-engine.ts`: Dynamic markdown calculation using `decimal.js`.
  - `src/domain/constraints/validator.ts`: Multi-constraint validation (capacity, temperature, SLA).
  - `src/domain/solver/fefo-solver.ts`: Greedy-heuristic FEFO allocation solver.
  - `src/domain/solver/baseline-fifo-solver.ts`: Documented legacy FIFO benchmark solver.
  - `src/domain/comparator/metrics-comparator.ts`: Direct delta quantification (profit, spoilage kg/$, SLA).
- **Exit Criteria**:
  - 100% test coverage on pure domain solver logic.
  - Verifiable mathematical superiority of proposed FEFO plan over documented FIFO baseline.

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

### Phase 3: Planning Run API Handlers & Reproducibility Service
- **Objective**: Expose authenticated, validated endpoints for triggering planning runs and persisting snapshots.
- **Key Deliverables**:
  - `src/server/schemas/`: Zod schemas for all request payloads and response contracts.
  - `src/server/services/planning-run.service.ts`: Snapshot serialization and SHA-256 hash generation.
  - Next.js API Routes: `/api/planning-runs`, `/api/inventory/batches`, `/api/demand/orders`.
  - Clerk authentication middleware protecting API boundaries.
- **Exit Criteria**:
  - Deterministic reproducibility: running the same snapshot hash yields identical allocation outputs.
  - API validation errors return structured 400 Bad Request responses with Zod issues.

---

### Phase 4: Production User Interface with SCSS Modules & Radix UI
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

### Phase 5: Recharts Comparative Analytics & Spoilage Heatmaps
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
