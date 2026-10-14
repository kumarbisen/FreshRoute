/**
 * FreshRoute Domain Units
 * Strict branded types preventing unit mixing (e.g. adding hours to days or kg to volume)
 */

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type Kilograms = Brand<number, "Kilograms">;
export type CubicMeters = Brand<number, "CubicMeters">;
export type Days = Brand<number, "Days">;
export type Hours = Brand<number, "Hours">;
export type Celsius = Brand<number, "Celsius">;
export type Percent = Brand<number, "Percent">; // 0 to 100

// Safe type-constructors
export const kg = (val: number): Kilograms => {
  if (val < 0) throw new Error(`Kilograms cannot be negative: ${val}`);
  return val as Kilograms;
};

export const m3 = (val: number): CubicMeters => {
  if (val < 0) throw new Error(`CubicMeters cannot be negative: ${val}`);
  return val as CubicMeters;
};

export const days = (val: number): Days => val as Days;

export const hours = (val: number): Hours => val as Hours;

export const celsius = (val: number): Celsius => val as Celsius;

export const percent = (val: number): Percent => {
  if (val < 0 || val > 100) throw new Error(`Percent must be between 0 and 100: ${val}`);
  return val as Percent;
};
