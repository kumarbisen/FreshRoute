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
