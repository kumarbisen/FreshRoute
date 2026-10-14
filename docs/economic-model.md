# FreshRoute Unified Economic & Shelf-Life Model

This document specifies the exact mathematical formulations, operational constraints, and unit semantics implemented across FreshRoute's data model, domain services, and optimization pipelines.

---

## 1. System of Units & Decimal Precision Standards

All operational quantities and monetary values must be stored with explicit units and evaluated using decimal-safe arithmetic (`Decimal.js` in TypeScript / `DECIMAL(p, s)` in PostgreSQL). Floating-point IEEE-754 approximations are strictly forbidden in financial, shelf-life, and mass balances.

| Measurement Domain | Canonical Unit | Database Representation | TypeScript Type | Display Precision |
| :--- | :--- | :--- | :--- | :--- |
| **Mass / Quantity** | Kilograms (kg) | `DECIMAL(12, 2)` | `Kilograms` (Branded) | 2 decimal places (`1,250.00 kg`) |
| **Currency** | United States Dollars (USD) | `DECIMAL(12, 2)` or `(14, 2)` | `Usd` (Branded) | 2 decimal places (`$4,850.50`) |
| **Unit Price / Cost** | USD per Kilogram ($/kg) | `DECIMAL(10, 4)` | `UsdPerKg` (Branded) | 2–4 decimal places (`$3.4500 / kg`) |
| **Discounts / Margins** | Percentage (%) | `DECIMAL(5, 2)` | `Percent` (Branded) | 2 decimal places (`15.00%`) |
| **Temperature** | Degrees Celsius (°C) | `DECIMAL(4, 2)` | `Celsius` (Branded) | 1–2 decimal places (`3.50 °C`) |
| **Duration / Lead Time** | Hours (h) or Days (d) | `DECIMAL(6, 2)` | `Hours` / `Days` (Branded) | 2 decimal places (`4.50 h` / `7.00 d`) |
| **Timestamps** | UTC ISO-8601 | `TIMESTAMP(3) WITH TIME ZONE` | `Date` (UTC) | Second/Millisecond precision |

---

## 2. Absolute Shelf-Life Calculation at Dock Arrival

Perishable produce decay is monotonic with respect to ambient time and temperature. A common anti-pattern in dispatch scheduling is **elapsed time double-subtraction** (e.g., subtracting harvest age from current time, and then subtracting transit time again from an already decayed duration, or mixing relative delta offsets).

FreshRoute enforces an **absolute timestamp milestone model**:

### 2.1 Timeline Milestones

Let:
- $T_{\text{harvest}}$: Timestamp when produce was harvested/packed.
- $T_{\text{expiry}}$: Absolute UTC timestamp beyond which produce falls below merchantable quality ($T_{\text{expiry}} = T_{\text{harvest}} + \text{Commodity.baseShelfLifeDays}$).
- $T_{\text{dispatch\_planned}}$: Planned timestamp when carrier departs warehouse loading bay.
- $\Delta t_{\text{handling}}$: Bay loading and pre-cooling duration (hours).
- $\Delta t_{\text{transit}}$: Physical line-haul transit duration from origin warehouse to destination dock (hours).
- $\Delta t_{\text{buffer}}$: Traffic variance, border/customs check, and dock unloading buffer duration (hours).

The planned dock arrival timestamp $T_{\text{arrival}}$ is strictly:
$$T_{\text{arrival}} = T_{\text{dispatch\_planned}} + \Delta t_{\text{handling}} + \Delta t_{\text{transit}} + \Delta t_{\text{buffer}}$$

### 2.2 Remaining Shelf Life (RSL) at Arrival

The remaining shelf life available to the receiving buyer upon dock check-in is:
$$\text{RSL}_{\text{arrival}} = T_{\text{expiry}} - T_{\text{arrival}}$$

Expressed in fractional days:
$$\text{RSL}_{\text{days}} = \frac{T_{\text{expiry}} - T_{\text{arrival}}}{24 \times 3600 \text{ seconds}}$$

### 2.3 Acceptance SLA Constraint

Every destination $d$ specifies a contractual minimum remaining shelf life SLA ($\text{minShelfLifeDays}_d$). An allocation of batch $b$ along route $r$ to destination $d$ is **shelf-life feasible** if and only if:

$$\text{RSL}_{\text{days}}(b, r, d) \ge \text{Destination.minShelfLifeDays}_d$$

If $\text{RSL}_{\text{days}}(b, r, d) < \text{Destination.minShelfLifeDays}_d$, the allocation is strictly rejected with reason code:
$$\texttt{REJECTED\_INSUFFICIENT\_SHELF\_LIFE}$$

---

## 3. Two-Part Transport Cost Formulation

Carrier logistics cannot be accurately modeled with a purely linear per-kilogram rate because putting a refrigerated reefer on the road incurs fixed vehicle dispatch and driver costs regardless of load factor.

FreshRoute mandates a **two-part tariff** for every active transit leg:

### 3.1 Route Cost Structure

For route $r$ operated by carrier $c$:
- $F_r$: Fixed vehicle trip fee in USD (`fixedCostUsd`), representing truck roll, driver day rate, and toll allocation.
- $V_r$: Variable transport rate in USD per kg (`costPerKgUsd`), reflecting refrigeration fuel consumption, weight penalty, and drayage handling.
- $W_r$: Total mass dispatched on route $r$ in kilograms:
  $$W_r = \sum_{a \in \text{Allocations}(r)} \text{AllocatedKg}_a$$

### 3.2 Total Route Cost Equation

$$\text{TransportCost}(r) = \begin{cases} 
0 & \text{if } W_r = 0 \text{ (no dispatch)} \\
F_r + (W_r \times V_r) & \text{if } W_r > 0 \text{ (active dispatch)}
\end{cases}$$

### 3.3 Vehicle Capacity Constraint

Every route vehicle has a strict gross physical payload ceiling $C_r$ (`capacityKg`):
$$W_r = \sum_{a \in \text{Allocations}(r)} \text{AllocatedKg}_a \le C_r$$

Any proposed allocation exceeding $C_r$ violates capacity constraints and is flagged with `REJECTED_VEHICLE_OVERFLOW`.

---

## 4. Comprehensive Economic & Profit Margin Framework

Every proposed distribution plan is evaluated across five financial pillars.

### 4.1 Gross Realized Revenue ($R$)

Revenue earned from fulfilled destination demand orders:
$$R = \sum_{a \in \text{Allocations}} \left( \text{AllocatedKg}_a \times P_{\text{effective}}(a) \right)$$

where the effective realized price per kilogram is:
$$P_{\text{effective}}(a) = P_{\text{agreed}}(a) \times \left(1 - \frac{\text{DiscountPct}_a}{100}\right)$$

### 4.2 Cost of Goods Sold / Inventory Procurement ($C_{\text{inventory}}$)

Acquisition cost of the produce dispatched:
$$C_{\text{inventory}} = \sum_{a \in \text{Allocations}} \left( \text{AllocatedKg}_a \times \text{Batch.unitCostUsd}_a \right)$$

### 4.3 Total Logistics & Transport Costs ($C_{\text{transport}}$)

Sum of all active route fixed fees and variable haulage costs:
$$C_{\text{transport}} = \sum_{r \in \text{Routes with } W_r > 0} F_r + \sum_{a \in \text{Allocations}} \left( \text{AllocatedKg}_a \times V_{r(a)} \right)$$

### 4.4 Unallocated Spoilage & Disposal Penalty ($C_{\text{spoilage}}$)

Batches that expire in the warehouse without being dispatched incur both 100% inventory write-off and mandatory bio-waste tipping/composting disposal fees:
$$C_{\text{spoilage}} = \sum_{b \in \text{ExpiredBatches}} \left( \text{RemainingKg}_b \times (\text{UnitCostUsd}_b + \text{DisposalFeePerKg}_b) \right)$$

### 4.5 Net Realized Margin ($\Pi$) & Margin Percentage

$$\Pi = R - C_{\text{inventory}} - C_{\text{transport}} - C_{\text{spoilage}}$$

$$\text{MarginPct} = \begin{cases} 
0.00\% & \text{if } R = 0 \\
\left( \frac{\Pi}{R} \right) \times 100\% & \text{if } R > 0 
\end{cases}$$

---

## 5. Dynamic Markdown & Salvage Valuation

When a high-grade batch nears its shelf-life horizon and cannot satisfy Tier-1 premium supermarket SLAs (typically requiring $\ge 7$ days RSL), FreshRoute evaluates a **secondary channel salvage discount**:

1. **Salvage Opportunity Condition**:
   $$\text{minShelfLifeDays}_{\text{Tier-1}} > \text{RSL}_{\text{arrival}} \ge \text{minShelfLifeDays}_{\text{Secondary}}$$
2. **Discounted Net Return vs. Spoilage Write-Off**:
   $$\text{NetSalvageRecovery} = \text{AllocatedKg} \times \left[ P_{\text{secondary}} \times (1 - \text{DiscountPct}) - V_r \right]$$
   If $\text{NetSalvageRecovery} > -(\text{UnitCost} + \text{DisposalFee})$, the discount recommendation is generated with reason code:
   $$\texttt{DYNAMIC\_MARKDOWN\_SALVAGE}$$

---

## 6. Audit Trail & Deterministic Plan Snapshots

Every `DistributionPlan` references an immutable `PlanSnapshot`. 
- Before optimization or commit, the exact JSON payload of all warehouse inventory batches, destination demands, and route capacities is serialized with canonical key sorting.
- A cryptographic SHA-256 digest (`snapshotHash`) is computed and indexed.
- Plans can be re-simulated months later under counterfactual scenarios (e.g. $+3.0^\circ\text{C}$ temperature abuse or $+4\text{h}$ highway delay) while proving the original inputs have not drifted.

---

## 7. Unified Economic Ledger & Reconciled Cost Classification

To eliminate accounting ambiguities and prevent double-counting of unsold inventory and price markdowns, FreshRoute implements a unified, reconciled economic ledger with strict financial categorizations.

### 7.1 Cost Timing & Action Incurrence

| Cost Category | Financial Nature | Trigger Mechanism | Treatment in Profit Calculation |
| :--- | :--- | :--- | :--- |
| **Procurement / Initial Stock** | Sunk / Working Capital | Incurred prior to planning run upon warehouse receiving | Base inventory acquisition cost. Partitioned into COGS (sold), Asset (healthy remaining), and Write-off (spoiled). |
| **Cost of Goods Sold (COGS)** | Realized Expense | Triggered when batch is allocated and dispatched ($q_a \times c_u$) | Deducted from Realized Revenue to compute Gross Margin. |
| **Remaining Healthy Stock** | Retained Asset | Produce unallocated with positive merchantable shelf life ($q_{\text{healthy}} \times c_u$) | Carried as balance sheet inventory asset. **NOT** deducted as an operating loss. |
| **Spoiled Product Write-Off** | Unrecoverable Loss | Produce expiring in warehouse ($q_{\text{spoiled}} \times c_u$) | Written off as an unrecoverable inventory loss. |
| **Carrier Fixed Freight ($F_r$)** | Incurred on Action | Triggered solely when a truck is dispatched ($W_r > 0$) | Deducted as direct logistics operating expense. |
| **Carrier Variable Freight ($V_r$)** | Incurred on Action | Haulage weight rate ($q_a \times V_r$) | Deducted as direct logistics operating expense. |
| **Dock Bay Handling ($H_r$)** | Incurred on Action | Staging, cross-dock, and bay loading ($q_a \times h_{\text{rate}}$) | Deducted as direct logistics operating expense. |
| **Bio-waste Disposal Penalty** | Incurred on Expiration | Municipal tipping/composting fee for rotted produce ($q_{\text{spoiled}} \times w_c$) | Deducted as waste disposal expense. |
| **Dynamic Markdown Concession** | Foregone Reference Revenue | Price reduction $(P_0 - P_{\text{effective}}) \times q_a$ | Categorized as **foregone reference revenue**. **NEVER** double-counted as an operational cash expense! |

### 7.2 Ledger Balance Invariants

Every planning run enforces four mathematical reconciliations:

1. **Mass Balance**:
   $$\text{InitialStockKg} = \text{SoldQuantityKg} + \text{RemainingQuantityKg}$$
   $$\text{RemainingQuantityKg} = \text{UnsoldHealthyStockKg} + \text{SpoiledExpiredStockKg}$$

2. **Demand Balance**:
   $$\text{TotalDemandKg} = \text{FulfilledDemandKg} + \text{UnmetDemandKg}$$

3. **Revenue Reconciliation**:
   $$\text{ReferenceRevenueUSD} = \text{RealizedSalesRevenueUSD} + \text{DiscountForegoneRevenueUSD}$$

4. **Procurement Cost Reconciliation**:
   $$\text{TotalProcurementUSD} = \text{COGS}_{\text{sold}} + \text{CarryingValue}_{\text{healthy}} + \text{WriteOff}_{\text{spoiled}}$$

5. **Net Economic Outcome Equation**:
   $$\text{Net Economic Outcome} = R_{\text{realized}} - \text{COGS}_{\text{sold}} - C_{\text{transport}} - C_{\text{handling}} - C_{\text{disposal}}$$

---

## 8. Documented Baseline FIFO Reference Strategy

To establish an objective, reproducible benchmark, FreshRoute benchmarks every optimization plan against a documented **First-In, First-Out (FIFO)** reference strategy.

### 8.1 Batch Age Ordering Rules
Batches are sorted strictly by chronological intake:
1. Primary: `receivedDate` ascending (earliest received batch first)
2. Secondary: `harvestDate` ascending (if received dates match)
3. Stable tie-breaker: `batchCode` alphabetical ascending

### 8.2 Demand & Route Ordering Rules
Candidate pairings are evaluated in naive order:
1. FIFO Score: $10^{12} - T_{\text{received}}$ (earliest received has highest priority)
2. Delivery deadline: `deliveryWindowEnd` ascending
3. Order Number: `orderNumber` alphabetical ascending
4. Route Code: `routeCode` alphabetical ascending

### 8.3 Hard Constraint Parity
The baseline strategy is **never** artificially weakened. It is evaluated against the exact same hard constraints as FreshRoute:
- Carrier vehicle payload capacity ceilings
- Cold-chain temperature interval compliance $[T_{\min}, T_{\max}]$
- Carrier arrival window deadlines ($T_{\text{arr}} \le \text{WindowEnd}$)
- Dock gate shelf-life acceptance SLAs ($RSL_{\text{handled}} \ge \text{SLA}_{\text{min}}$)
- Margin floor checks ($P_{\text{eff}} - c_u - V_r > -w_c$)

### 8.4 Static List Pricing Policy
By default, Baseline FIFO operates under **static list pricing**:
$$\delta_{\text{baseline}} = 0\%, \quad P_{\text{effective}} = P_{\text{contracted}}$$
It does not generate dynamic markdown salvage recommendations. Near-expiry batches that breach Tier-1 retailer SLAs are rejected at the dock gate, sitting in inventory until complete expiration.

---

## 9. Strategy Comparison & Safe Percentage Formulations

When comparing FreshRoute against the baseline, metrics are computed with guaranteed zero-denominator and negative-baseline safety:

$$\text{SafePctChange}(\text{Current}, \text{Baseline}) = \begin{cases}
0.0\% & \text{if } \text{Baseline} = 0 \text{ and } \text{Current} = 0 \\
+100.0\% & \text{if } \text{Baseline} = 0 \text{ and } \text{Current} > 0 \\
-100.0\% & \text{if } \text{Baseline} = 0 \text{ and } \text{Current} < 0 \\
\left( \frac{\text{Current} - \text{Baseline}}{|\text{Baseline}|} \right) \times 100\% & \text{if } \text{Baseline} \ne 0
\end{cases}$$

Using $|\text{Baseline}|$ guarantees that positive improvements (e.g. converting a $-\$100$ loss into a $+\$50$ profit) always yield a positive percentage ($+150\%$) rather than an inverted negative sign.

### 9.1 Three Canonical Operational Outcomes

1. **`FRESHROUTE_SUPERIOR`** ($\Delta \text{Net} > +\$0.05$): FreshRoute FEFO prioritizes near-expiry produce and salvages at-risk stock via secondary channel markdowns, avoiding full write-offs and outperforming the baseline.
2. **`EQUIVALENT`** ($|\Delta \text{Net}| \le \$0.05$): In homogeneous, fresh inventory with ample shelf life, both FIFO and FEFO choose identical sequences and generate identical financial outcomes.
3. **`BASELINE_SUPERIOR`** ($\Delta \text{Net} < -\$0.05$): In specific freight fee traps (e.g. rolling a dedicated truck with a $\$1,800$ fixed charge to salvage a small $\$1,100$ discounted lot), FreshRoute's aggressive salvage heuristic incurs higher logistics costs than the product write-off itself, allowing conservative FIFO to achieve higher total net profit. The evaluator objectively reports this outcome without algorithmic bias.

