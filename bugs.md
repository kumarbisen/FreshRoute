# FreshRoute: Defect & Issue Tracking Log

## Issue Lifecycle
1. **Reported / Triaged**: Issue documented with reproduction steps and assigned severity.
2. **In Progress**: Root cause identified and remediation under development.
3. **Resolved**: Fix applied with corresponding regression test.
4. **Verified**: Verified through automated test execution and build check.

---

## Severity Classification
- **P0 - Critical**: Solver mathematical violation, data corruption, security vulnerability, broken build.
- **P1 - High**: Constraint enforcement failure, incorrect financial calculation, API failure.
- **P2 - Medium**: UI layout anomaly, non-blocking edge case, sub-optimal allocation heuristic.
- **P3 - Low**: Minor cosmetic discrepancy, documentation typo.

---

## Defect Log

| Issue ID | Severity | Component | Summary | Status | Resolution |
|---|---|---|---|---|---|
| **BUG-001** | P2 | Test Runner | React forwardRef Button component tested with function call syntax instead of React.createElement | RESOLVED | Updated `primitives.test.ts` to instantiate forwardRef components with React.createElement. All 9 tests passing. |
| **BUG-002** | P1 | UI / Types | Missing `clsx` import in `OperationsOverview.tsx` causing TS2304 compile failure | RESOLVED | Added `import clsx from "clsx"` alongside restored dialog imports. Verified with `npm run type-check`. |
| **BUG-003** | P3 | Linter | JSX children containing literal `//` in marketing components flagged by ESLint `react/jsx-no-comment-textnodes` | RESOLVED | Escaped technical slashes inside string literals `{" // "}`. Verified with `npm run lint`. |
| **BUG-004** | P1 | Database / DDL | Windows PowerShell `Out-File -Encoding utf8` prepends Byte Order Mark (BOM `\uFEFF`), causing PostgreSQL syntax error on migration execution | RESOLVED | Stripped UTF-8 BOM in `pglite.ts` loader and rewrote migration file without BOM. DDL execution passes cleanly in PGlite. |
| **BUG-005** | P2 | TypeScript | Calculation input types rejected string representations of decimals in `calculateRouteTransportCost` | RESOLVED | Updated interfaces in `data-foundation.service.ts` to accept `number | Decimal | string`. Zero compiler errors in `tsc --noEmit`. |
| **BUG-006** | P2 | Test Runner | Parallel test execution with in-process PGlite WASM caused memory contention and hook timeout | RESOLVED | Configured `fileParallelism: false` and extended `hookTimeout`/`testTimeout` to 30000ms in `vitest.config.ts`. All 44 tests pass sequentially in ~26s. |
| **BUG-007** | P2 | UI / Types | Deep import paths `@/components/ui/Button` and incorrect button/badge props (`icon` instead of `leftIcon`, missing `loading`, unmapped variants) | RESOLVED | Consolidated imports to `@/components/ui`, updated `leftIcon`/`loading` props, and aligned badge variants (`fresh`, `lime`, `warning`, `neutral`). Zero TypeScript errors. |
| **BUG-008** | P1 | SCSS / Styles | Undefined `$color-slate-...` variables in SCSS design tokens causing Next.js webpack production build failures | RESOLVED | Added standard slate neutral palette scale ($color-slate-50 through $color-slate-950) to `src/styles/_tokens.scss`. |
| **BUG-009** | P1 | UI Primitives | Radix UI `<Slot>` in `Button` threw "Slot failed to slot onto its children" when `asChild` was enabled alongside icons | RESOLVED | Wrapped `children` in `<Slottable>` from `@radix-ui/react-slot` in `Button.tsx`. Prerendering now correctly injects slotted element. |
| **BUG-010** | P1 | Next.js RSC | `PlaceholderPage` had unnecessary `"use client"` directive, causing Next.js to fail serialization when passing Lucide icon components from Server Component pages | RESOLVED | Removed `"use client"` from `PlaceholderPage.tsx` making it a pure React Server Component. Prerendering succeeds across all 23 routes. |
| **BUG-011** | P2 | Planning Engine | Dynamic markdown was not activated when batch RSL satisfied secondary channel SLA without primary breach; reasonCodes only contained single primary code | RESOLVED | Updated `feasibility.ts` to evaluate decay-based markdowns for secondary discount channels and populated composite `reasonCodes` array including `FEFO_EXPIRATION_PRIORITY`. 55/55 tests passing. |
| **BUG-012** | P2 | Economic Evaluator | Evaluator accessed `leftover.remainingKg` instead of `leftover.unallocatedKg`, causing Decimal instantiation error; test destinations specified extra `warehouseId` | RESOLVED | Corrected field access to `leftover.unallocatedKg` with batch lookup for unit costs, and removed unmapped `warehouseId` from test destinations. All 66 tests passing. |
| **BUG-013** | P2 | App Router / Types | Import identifier mismatch in `/api/discounts/simulate/route.ts` importing `simulatePlanDiscounts` instead of `simulatePlanWithDiscounts` | RESOLVED | Corrected import and function call to `simulatePlanWithDiscounts`. Verified with `npm run type-check` (0 errors) and full Next.js production build. |
| **BUG-014** | P2 | UI / TypeScript | Property `profitSlopePerUnit` referenced instead of `profitSensitivitySlopeUsdPerUnit` on `SensitivityResult` in `ScenarioLabCockpit.tsx` | RESOLVED | Corrected property access to `profitSensitivitySlopeUsdPerUnit`. Verified with `tsc --noEmit`. |
| **BUG-015** | P2 | Engine / Contracts | Redundant top-level `planningTime` passed to `evaluateScenario` options in `scenario-engine.ts` | RESOLVED | Passed solver config object with embedded `planningTime` satisfying `ScenarioEvaluationOptions`. Verified with `tsc --noEmit`. |
| **BUG-016** | P2 | Test Runner | `tests/engine/scenario-engine.test.ts` accessed `.id` on pure `EnginePlanOutput` object in tests 3, 4, and 5 | RESOLVED | Passed explicit plan ID string (`"plan-test-01"`) into `executeScenarioRun`. All 12/12 scenario tests and 100/100 full test suite pass. |
| **BUG-017** | P1 | Multi-Tenancy / SQL | `updateDemand` in `destinations.service.ts` fetched `orderNumber` without `organizationId` scope check | RESOLVED | Added `AND "organizationId" = $2` and 404 validation. Verified with 6/6 tests in `multi-tenancy-authorization.test.ts`. |
| **BUG-018** | P2 | UI / Shell | `AppHeader.tsx` used blocking browser `alert()` dialogs on search click and notifications click | RESOLVED | Implemented functional global search navigation to `/app/inventory` and interactive notifications popover with direct links. |
| **BUG-019** | P1 | Security / CSV | CSV file upload lacked explicit payload file size limits and maximum row boundaries | RESOLVED | Added 5MB file payload limit (`MAX_CSV_FILE_SIZE_BYTES`) and 5,000 row batch limit (`MAX_CSV_ROWS`) with schema validation. |
| **BUG-020** | P0 | Next.js / PGlite | Webpack bundling of `@electric-sql/pglite` caused cross-realm `instanceof URL` failure in Node.js `fs.readFile`, crashing all DB API routes with status 500 / 422 | RESOLVED | Added `serverExternalPackages: ["@electric-sql/pglite"]` in `next.config.ts`. Enables native Node.js runtime resolution of WASM and data bundles. All routes return 200 OK. |

---

## Log Template for Future Issues
```markdown
### [BUG-XXX] Short Title
- **Severity**: P0 | P1 | P2 | P3
- **Component**: Solver | API | UI | Database | Auth
- **Reported Date**: YYYY-MM-DD
- **Description**: Detailed description of incorrect behavior.
- **Reproduction Steps**:
  1. Step one
  2. Step two
- **Expected Behavior**: What should happen.
- **Actual Behavior**: What actually happened.
- **Root Cause Analysis**: Why the bug occurred.
- **Remediation Plan**: Code changes required.
- **Verification Evidence**: Test run or build log confirming the fix.
```
