# FreshRoute: Coding Style & Standards Guide

## 1. Core Architectural Tenets
1. **Purity in Domain Modeling**: Distribution calculations must exist in pure TypeScript functions. Never import React hooks, Next.js server utilities (`cookies`, `headers`), or Prisma ORM clients into `src/domain/`.
2. **Explicit Units & Types**: Every domain measurement must carry an explicit unit. Avoid raw `number` primitives without context.
3. **Decimal-Safe Financial Arithmetic**: Never use JavaScript floating-point arithmetic (`+`, `-`, `*`, `/`) for money, margins, discounts, or prices. Always use `Decimal` from `decimal.js`.

---

## 2. TypeScript Guidelines

### Strictness & Safety
- `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, and `noUnusedLocals: true` are non-negotiable.
- Explicit return types are required on all public domain functions and API route handlers.
- The use of `any` is strictly prohibited. Use `unknown` with type narrowing, type predicates, or Zod schemas.

### Branded / Nominal Unit Types
To prevent unit confusion (e.g., adding hours to days or kg to pallets), use branded types or strict type aliases:

```typescript
// Explicit unit brand types
export type Kilograms = number & { readonly __unit: "Kilograms" };
export type Days = number & { readonly __unit: "Days" };
export type Hours = number & { readonly __unit: "Hours" };
export type Percent = number & { readonly __unit: "Percent" }; // 0 to 100

export const asKilograms = (n: number): Kilograms => n as Kilograms;
export const asDays = (n: number): Days => n as Days;
export const asHours = (n: number): Hours => n as Hours;
export const asPercent = (n: number): Percent => n as Percent;
```

---

## 3. Decimal-Safe Financial Math with `decimal.js`
When calculating batch cost, selling price, markdown discounts, transit charges, and gross margin:

```typescript
import Decimal from "decimal.js";

// Set default precision for currency calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface FinancialCalculationInput {
  basePricePerKg: Decimal;
  discountPercent: Decimal; // e.g. 15 for 15%
  costPerKg: Decimal;
  quantityKg: Decimal;
  transportCostPerKg: Decimal;
}

export function calculateAllocationFinancials(input: FinancialCalculationInput) {
  const discountMultiplier = new Decimal(1).minus(input.discountPercent.dividedBy(100));
  const effectivePricePerKg = input.basePricePerKg.times(discountMultiplier);
  const grossRevenue = effectivePricePerKg.times(input.quantityKg);
  const totalCost = input.costPerKg.plus(input.transportCostPerKg).times(input.quantityKg);
  const netMargin = grossRevenue.minus(totalCost);
  const marginPercentage = grossRevenue.isZero() 
    ? new Decimal(0) 
    : netMargin.dividedBy(grossRevenue).times(100);

  return {
    effectivePricePerKg: effectivePricePerKg.toDecimalPlaces(2),
    grossRevenue: grossRevenue.toDecimalPlaces(2),
    totalCost: totalCost.toDecimalPlaces(2),
    netMargin: netMargin.toDecimalPlaces(2),
    marginPercentage: marginPercentage.toDecimalPlaces(2),
  };
}
```

---

## 4. Next.js App Router & React Architecture

### Server Components by Default
- Layouts, pages, and data-fetching views must be React Server Components (RSC).
- Fetch data directly from the server-side database repository or domain service.
- Never add `'use client'` unless the file uses:
  - React browser hooks (`useState`, `useEffect`, `useCallback`)
  - Browser-only event handlers (`onClick`, `onChange`)
  - Radix UI interactive primitives
  - React Hook Form
  - Recharts SVG chart rendering

### Client Component Best Practices
- Keep client components at the leaves of the render tree.
- Pass serializable server data down as props.
- Keep client bundles minimal.

---

## 5. SCSS Modules Guidelines
FreshRoute uses SCSS Modules for style encapsulation with zero runtime overhead.

### File Organization
- Every component has a co-located stylesheet: `ComponentName.module.scss`.
- Global styles and CSS variables reside in `src/styles/`:
  - `_variables.scss`: Color tokens, typography scales, spacing units.
  - `_mixins.scss`: Flexbox/grid shortcuts, responsive breakpoints, elevation shadows.
  - `globals.scss`: Root resets and CSS variable declarations.

### Class Naming & Structure
- Use camelCase for class names inside `.module.scss` for direct TypeScript dot notation:
  ```scss
  // BatchCard.module.scss
  .cardContainer {
    display: flex;
    padding: var(--spacing-md);
    background: var(--color-surface);
    border-radius: var(--radius-lg);

    &.urgent {
      border: 1px solid var(--color-warning);
    }
  }

  .title {
    font-size: var(--font-size-base);
    font-weight: 600;
  }
  ```
- Import with typed styles:
  ```typescript
  import styles from "./BatchCard.module.scss";
  import clsx from "clsx";

  export function BatchCard({ isUrgent, title }: Props) {
    return (
      <div className={clsx(styles.cardContainer, isUrgent && styles.urgent)}>
        <h3 className={styles.title}>{title}</h3>
      </div>
    );
  }
  ```

---

## 6. Runtime Validation with Zod
- All API route inputs (`req.json()`, `searchParams`) must be validated with Zod.
- Derive TypeScript types directly from Zod schemas:
  ```typescript
  import { z } from "zod";

  export const RunPlanningSchema = z.object({
    facilityId: z.string().min(1, "Facility ID is required"),
    targetDate: z.string().datetime(),
    allowMarkdowns: z.boolean().default(true),
    maxDiscountPercent: z.number().min(0).max(60).default(35),
    algorithmVersion: z.string().default("v1.0.0"),
  });

  export type RunPlanningInput = z.infer<typeof RunPlanningSchema>;
  ```
- Safe parsing is required in API routes:
  ```typescript
  const parseResult = RunPlanningSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Validation failed", issues: parseResult.error.issues }, { status: 400 });
  }
  ```

---

## 7. Testing Standards (Vitest)
- Pure domain logic must have thorough unit tests in `tests/domain/`.
- Use descriptive BDD test names: `it("should reject allocation if remaining shelf life violates retailer SLA")`.
- Assert exact decimal values with `.equals()` or `.toFixed(2)` string comparisons.
