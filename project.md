# FreshRoute: Project Overview & Strategy

## 1. Executive Summary
**FreshRoute** is an enterprise-grade Software-as-a-Service (SaaS) platform engineered for wholesale produce distributors, cold-chain logistics providers, and fresh food supply networks. Fresh produce distribution is plagued by rapid shelf-life degradation, volatile market demand, strict retail Service Level Agreements (SLAs), and severe financial loss due to spoilage. 

FreshRoute solves the perishable distribution optimization challenge by providing intelligent, constraint-aware batch allocation, predictive shelf-life routing, and dynamic markdown recommendations that preemptively liquidate at-risk inventory before expiration. Crucially, every automated plan is directly benchmarked against a documented **baseline model** (traditional First-In, First-Out [FIFO] with static pricing), quantifying exact metrics on spoilage reduction, gross margin retention, and SLA fulfillment.

---

## 2. The Perishable Produce Problem Space
Wholesale distributors handle highly perishable commodities (berries, leafy greens, stone fruits, avocados, citrus) where product quality degrades continuously from the moment of harvest. The core operational tensions include:

1. **FIFO Failure in Produce Logistics**: Traditional ERPs allocate stock using First-In, First-Out (FIFO). In fresh food, harvest date, transit conditions, temperature excursions, and batch-level quality variations mean the oldest stock is not necessarily the most urgent or optimal batch to ship. FreshRoute employs **First-Expired, First-Out (FEFO)** combined with real-time shelf-life decay modeling.
2. **Stringent Customer Acceptance Thresholds**: Major supermarket chains and food service clients require a minimum remaining shelf life upon arrival (e.g., at least 5 days remaining for retail display). Delivering a batch with 4 days remaining results in costly rejections, chargebacks, or disposal fees.
3. **Transport Capacity & Cold-Chain Constraints**: Refrigerated vehicles (reefers) possess finite cubic volume and weight capacities, fixed departure windows, and specific temperature zones. Allocations must be routed without violating vehicle availability or transit transit-time thresholds.
4. **Binary Disposal vs. Intelligent Markdown**: Conventional distributors let slow-moving batches expire in the warehouse and absorb a 100% write-off. FreshRoute evaluates customer discount receptivity and suggests calibrated price discounts early in the degradation curve, turning potential write-offs into revenue while respecting margins.
5. **Lack of Explainability & Trust**: Warehouse managers reject black-box optimization algorithms. FreshRoute generates **structured reason codes** and human-readable narratives for every batch allocation and discount recommendation.

---

## 3. Core Value Proposition
- **Spoilage Reduction**: Mitigate perishable waste by 18% to 35% through proactive FEFO dispatching and timely markdowns.
- **Revenue Protection**: Recoup 40% to 70% of inventory value on near-expiry batches via targeted discount allocations to secondary discount grocers and institutional buyers.
- **Guaranteed SLA Compliance**: Eliminate customer rejection penalties by enforcing hard shelf-life arrival constraints before dispatch.
- **Transparent Auditability**: Continuous comparative analytics showing the proposed plan vs. the documented FIFO baseline across revenue, waste weight, margin, and fulfillment rate.
- **100% Deterministic Reproducibility**: Cryptographically snapped planning runs enabling retrospective post-mortems and audit trails.

---

## 4. User Personas
| Persona | Title | Core Responsibilities & Needs | Key FreshRoute Touchpoints |
|---|---|---|---|
| **Alex Rivera** | Logistics & Dispatch Director | Oversees warehouse fulfillment, dock departures, reefer capacity, and on-time dispatches. Needs actionable pick-lists and vehicle routing constraints. | Dispatch Console, Capacity Planner, Route Allocation Details, Reason Codes |
| **Elena Chen** | Commercial Merchandiser / Pricing Analyst | Manages inventory margins, vendor billing, and customer pricing tiers. Needs clear visibility into margin erosion and automated discount thresholds. | Markdown Recommendation Engine, Elasticity Controls, Margin Analysis |
| **Marcus Vance** | VP of Supply Chain / COO | Focuses on macro KPIs, waste reduction quotas, distributor profitability, and supplier performance. | Baseline Comparison Dashboard, Spoilage & Financial Analytics, Run Audits |

---

## 5. Technology Stack & Architectural Rationale

| Layer / Concern | Chosen Technology | Architectural Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | High-performance React server components, hybrid static/dynamic caching, streaming UI, and unified type-safe API route handlers. |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety, strict null checks, zero unchecked `any`, explicit unit typing for domain quantities and currencies. |
| **Styling** | SCSS Modules | Pure CSS encapsulation with zero runtime overhead, modular design token architecture, and predictable responsive layout styling. |
| **Component Primitives** | Radix UI | Unstyled, accessible, WAI-ARIA compliant primitives (dialogs, dropdowns, selects, tabs, tooltips) ensuring rapid accessible UI development. |
| **Database & ORM** | PostgreSQL + Prisma ORM | Relational integrity for inventory ledgers, decimal column types for financial auditing, schema migrations, and strongly-typed Prisma queries. |
| **Validation** | Zod | Runtime schema validation for all API inputs, environment variables, form submissions, and domain input boundaries. |
| **Form Handling** | React Hook Form | Uncontrolled form performance, minimal re-renders, and seamless integration with `@hookform/resolvers/zod`. |
| **Analytics & Charts** | Recharts | React-native SVG charting library for baseline comparative visualizers, decay curves, and batch shelf-life histograms. |
| **Authentication** | Clerk | Enterprise-ready authentication, multi-tenant role support, secure session token handling, and streamlined server component auth guards. |
| **Unit & Integration Tests**| Vitest | Blazing fast ESM-native testing engine with Vite-compatible configuration and instantaneous unit test execution for the pure domain solver. |
| **Financial Math** | Decimal.js | Arbitrary-precision decimal arithmetic to completely prevent IEEE-754 floating-point rounding errors in pricing, taxes, and margins. |

---

## 6. High-Level System Scope & Phased Milestones
1. **Phase 0: Architecture & Foundation (Current)**: Architecture design, baseline documentation, project scaffolding, tech stack integration, and domain contract definitions.
2. **Phase 1: Pure Domain Optimizer & Baseline Engine**: Mathematical allocation solver, FEFO algorithm, shelf-life decay model, dynamic markdown calculator, and documented baseline comparator.
3. **Phase 2: Database Schema & Seed Engine**: Prisma models, migrations, PostgreSQL persistence, and realistic synthetic demo datasets.
4. **Phase 3: Planning Run API & Snapshot Engine**: Reproducible planning run orchestration, input snapshot hashing, run execution, and transactional persistence.
5. **Phase 4: Operational UI & Dispatch Consoles**: Server-component driven dashboards, interactive dispatch console, batch inventory browser, and order allocation views with SCSS modules and Radix UI.
6. **Phase 5: Comparative Analytics & Recharts Dashboards**: Visualizing FreshRoute vs. Baseline metrics, revenue deltas, waste curves, and exportable run summaries.
7. **Phase 6: Hardening, Security, E2E Verification & Release**: Strict linting, type-checking, test suites, Clerk auth boundaries, and production build readiness.
