/**
 * Shared Indian Rupee (INR / ₹) Currency Formatting Utilities
 * FreshRoute Perishable-Produce Distribution Platform
 */

export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_CODE = "INR";
export const CURRENCY_LOCALE = "en-IN";

/**
 * Standard currency formatter: formats numbers into ₹X,XX,XXX.XX
 */
export function formatCurrency(
  val: number | null | undefined,
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `₹${(0).toFixed(decimals)}`;
  }
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/**
 * Signed currency formatter: +₹X,XX,XXX.XX or -₹X,XX,XXX.XX
 */
export function formatSignedCurrency(
  val: number | null | undefined,
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `₹${(0).toFixed(decimals)}`;
  }
  const formatted = formatCurrency(Math.abs(val), decimals);
  if (val < 0) {
    return `-${formatted}`;
  }
  if (val > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Compact currency formatter for charts and condensed KPI badges (e.g. ₹12k, ₹1.5L)
 */
export function formatCompactCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${Math.round(abs / 1000)}k`;
  }
  return `${sign}₹${Math.round(abs)}`;
}
