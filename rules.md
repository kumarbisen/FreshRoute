# FreshRoute: Architecture Rules & System Invariants

This document establishes the binding ground rules and architectural invariants governing the FreshRoute platform. All development must adhere strictly to these principles.

---

## 1. Architectural Invariants

### Rule 1: Separation of Concerns
UI components, API route handlers, database persistence, core domain logic, and optimization solvers must reside in strictly decoupled directories:
- `src/domain/`: Pure domain logic, algorithms, pricing models, decay curves, and baseline comparators. Zero framework dependencies.
- `src/server/db/`: Prisma client, schema definitions, seed data, and data access repositories.
- `src/server/services/`: Application orchestration, snapshot hashing, and business workflows.
- `src/app/api/`: Next.js Route Handlers handling HTTP parsing, Zod validation, auth verification, and response formatting.
- `src/app/`: Next.js App Router Server Components for data fetching and layout composition.
- `src/components/`: Reusable UI components styled with SCSS Modules and Radix UI primitives.

### Rule 2: Pure TypeScript Optimization Engine
The distribution optimization solver (`src/domain/solver/`) must be 100% pure TypeScript.
- **Forbidden Imports in Domain Modules**: `@prisma/client`, `next/*`, `react`, `@clerk/*`, browser DOM globals, or filesystem APIs.
- Domain functions must accept plain JavaScript/TypeScript input objects and return plain output objects or pure deterministic promises.

### Rule 3: Server Components by Default
- All pages and layouts must be React Server Components.
- Client components (`'use client'`) are strictly restricted to leaves requiring browser events, React state, Radix UI popovers, React Hook Form, or Recharts rendering.

### Rule 4: Mandatory Zod Validation at External Boundaries
- Every incoming HTTP request (body, query params, path params) must be validated using a Zod schema before processing.
- Environment variables must be validated with Zod at application startup.

### Rule 5: Decimal-Safe Financial Calculations & Explicit Units
- Never use JavaScript floating-point numbers (`number`) for financial figures (prices, margins, discounts, transport charges, penalties). Always use `Decimal` from `decimal.js`.
- Always pair physical measurements with explicit unit types (`kg`, `hours`, `days`, `pallets`).

### Rule 6: No Hardcoded or Fake Responses
- Never hardcode calculated dashboard metrics, allocation outputs, or fake successful API responses.
- All numbers displayed on the UI must derive from authentic domain solver runs or database records.

### Rule 7: Synthetic Seed & Demo Data Policy
- Demo seed datasets and illustrative figures are permitted for initial testing and visualization, but must be explicitly tagged and labeled prominently as **"Illustrative Demo Data"**.
- Never invent real customer logos, testimonials, measured savings, or fake production metrics.

### Rule 8: Strict Secret Management
- Secrets (`DATABASE_URL`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`) must reside exclusively in environment variables and never be committed to git.
- Never prefix server-only environment variables with `NEXT_PUBLIC_`.

### Rule 9: Visual Metaphors & Art Direction
- Build a distinctive visual identity around physical produce distribution: crates, reefer temperature zones, time windows, and lot countdown clocks.
- Avoid generic AI gradients, excessive glassmorphism, or stock-dashboard aesthetics.
- Maintain bold editorial storytelling for the marketing surface, but preserve restrained, high-density, legible operational ergonomics for the internal operations dashboard (`/app`).

### Rule 10: Deterministic Reproducibility
- Every planning run must persist an exact JSON snapshot of all inputs (batches, orders, routes, parameters).
- The snapshot must be hashed using SHA-256 and stored alongside the algorithm version.
- Re-running a historical snapshot with the same algorithm version must produce an identical allocation plan.

### Rule 11: Absolute Constraint Integrity
Every generated allocation must strictly satisfy:
1. Batch inventory availability (no overselling).
2. Customer order demand cap.
3. Transport weight and cubic volume vehicle limits.
4. Departure time + travel duration within customer delivery window.
5. Arrival timestamp + customer minimum shelf-life $\le$ batch expiration timestamp.
6. Reefer temperature zone compatibility.

### Rule 12: Structured Reason Codes & Explainability
- Every batch allocation, discount recommendation, or rejected assignment must include a machine-readable `AllocationReasonCode` and a clear human-readable narrative explanation.

### Rule 13: Zero Premature Abstraction
- Avoid unnecessary external dependencies, redundant wrapper layers, and microservice decompositions. Keep the codebase cohesive, modular, and maintainable.

---

## 2. Engineering & Operational Protocols
- **Phase Discipline**: Implement only the designated phase tasks. Never jump ahead to unrequested phases before completing verification.
- **Verification Integrity**: Never claim a test or build command passed without having executed it in the terminal and reviewed the output.
- **Error Remediation**: Resolve all TypeScript, lint, or test failures immediately before concluding a phase.
