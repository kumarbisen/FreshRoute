import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { kg, percent, days } from "@/domain/types/units";
import { AllocationReasonCode } from "@/domain/types/models";

describe("FreshRoute Pure Domain Foundation", () => {
  it("enforces branded unit invariants and guards against invalid input", () => {
    const validWeight = kg(1500.5);
    expect(validWeight).toBe(1500.5);

    expect(() => kg(-10)).toThrow("Kilograms cannot be negative");

    const validDiscount = percent(15);
    expect(validDiscount).toBe(15);

    expect(() => percent(105)).toThrow("Percent must be between 0 and 100");
    expect(() => percent(-5)).toThrow("Percent must be between 0 and 100");

    const validShelfLife = days(7);
    expect(validShelfLife).toBe(7);
  });

  it("performs decimal-safe financial calculations without IEEE-754 floating point errors", () => {
    // In standard JS floats: 0.1 + 0.2 = 0.30000000000000004
    // In Decimal.js: exactly 0.3
    const unitPrice = new Decimal("0.10");
    const discount = new Decimal("0.20");
    const total = unitPrice.plus(discount);
    expect(total.toString()).toBe("0.3");

    // Produce calculation scenario:
    // 350 kg strawberries at base price $4.50/kg with 15% dynamic markdown
    // Unit purchase cost = $2.80/kg, transport cost = $0.40/kg
    const quantity = new Decimal("350.00");
    const basePrice = new Decimal("4.50");
    const discountRate = new Decimal("0.15");
    const unitCost = new Decimal("2.80");
    const transportCost = new Decimal("0.40");

    const effectivePrice = basePrice.times(new Decimal(1).minus(discountRate));
    expect(effectivePrice.toFixed(2)).toBe("3.83"); // 4.50 * 0.85 = 3.825 rounds to 3.83

    const grossRevenue = effectivePrice.times(quantity);
    const totalCost = unitCost.plus(transportCost).times(quantity);
    const netProfit = grossRevenue.minus(totalCost);

    expect(grossRevenue.toFixed(2)).toBe("1338.75");
    expect(totalCost.toFixed(2)).toBe("1120.00");
    expect(netProfit.toFixed(2)).toBe("218.75");
  });

  it("verifies AllocationReasonCode taxonomy encompasses key operational decisions", () => {
    expect(AllocationReasonCode.FEFO_URGENCY_PRIORITY).toBe("FEFO_URGENCY_PRIORITY");
    expect(AllocationReasonCode.DYNAMIC_MARKDOWN_SALVAGE).toBe("DYNAMIC_MARKDOWN_SALVAGE");
    expect(AllocationReasonCode.SHELF_LIFE_SLA_SATISFIED).toBe("SHELF_LIFE_SLA_SATISFIED");
    expect(AllocationReasonCode.REJECTED_INSUFFICIENT_SHELF_LIFE).toBe("REJECTED_INSUFFICIENT_SHELF_LIFE");
  });
});
