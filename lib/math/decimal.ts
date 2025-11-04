/**
 * Decimal Math Engine
 *
 * Provides fixed-point decimal arithmetic with 12 decimal places precision.
 * Uses decimal.js for accurate financial calculations without floating-point errors.
 *
 * Key Features:
 * - 12 decimal place internal precision
 * - Banker's rounding (ROUND_HALF_EVEN) by default
 * - Per-item quantization
 * - Vectorized operations for performance
 * - Type-safe wrapper around decimal.js
 */

import Decimal from 'decimal.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Internal precision: 12 decimal places
 * Matches database DECIMAL(20,12) precision
 */
export const INTERNAL_PRECISION = 12;

/**
 * Configure Decimal.js defaults
 */
Decimal.set({
  precision: 20, // Total significant digits
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding
  toExpNeg: -12, // Exponential notation threshold
  toExpPos: 20,
  minE: -9e15,
  maxE: 9e15,
});

// ============================================================================
// Type Definitions
// ============================================================================

export type DecimalValue = Decimal;
export type DecimalInput = Decimal.Value; // string | number | Decimal

/**
 * Rounding modes
 */
export enum RoundingMode {
  /** Round towards nearest neighbor, ties away from zero */
  ROUND_HALF_UP = Decimal.ROUND_HALF_UP,
  /** Round towards nearest neighbor, ties towards zero */
  ROUND_HALF_DOWN = Decimal.ROUND_HALF_DOWN,
  /** Round towards nearest neighbor, ties to even */
  ROUND_HALF_EVEN = Decimal.ROUND_HALF_EVEN, // Banker's rounding (default)
  /** Round away from zero */
  ROUND_UP = Decimal.ROUND_UP,
  /** Round towards zero (truncate) */
  ROUND_DOWN = Decimal.ROUND_DOWN,
  /** Round towards positive infinity */
  ROUND_CEIL = Decimal.ROUND_CEIL,
  /** Round towards negative infinity */
  ROUND_FLOOR = Decimal.ROUND_FLOOR,
}

// ============================================================================
// Core Decimal Wrapper
// ============================================================================

/**
 * Creates a Decimal instance with internal precision
 */
export function D(value: DecimalInput): Decimal {
  return new Decimal(value);
}

/**
 * Converts Decimal to number (use with caution - may lose precision)
 */
export function toNumber(value: Decimal): number {
  return value.toNumber();
}

/**
 * Converts Decimal to string with full precision
 */
export function toString(value: Decimal): string {
  return value.toString();
}

/**
 * Converts Decimal to fixed decimal places string
 */
export function toFixed(value: Decimal, decimals: number = INTERNAL_PRECISION): string {
  return value.toFixed(decimals);
}

// ============================================================================
// Quantization (Rounding to Precision)
// ============================================================================

/**
 * Quantizes a decimal value to specified precision
 *
 * @param value - The value to quantize
 * @param precision - Number of decimal places (default: 12)
 * @param rounding - Rounding mode (default: ROUND_HALF_EVEN)
 * @returns Quantized decimal value
 *
 * @example
 * quantize(D('123.456789012345'), 2) // '123.46'
 * quantize(D('123.455'), 2) // '123.46' (banker's rounding)
 * quantize(D('123.465'), 2) // '123.46' (banker's rounding to even)
 */
export function quantize(
  value: Decimal,
  precision: number = INTERNAL_PRECISION,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_EVEN
): Decimal {
  return value.toDecimalPlaces(precision, rounding);
}

/**
 * Quantizes to whole number (0 decimal places)
 */
export function quantizeWhole(
  value: Decimal,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_EVEN
): Decimal {
  return quantize(value, 0, rounding);
}

/**
 * Quantizes to currency precision (2 decimal places)
 */
export function quantizeCurrency(
  value: Decimal,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_EVEN
): Decimal {
  return quantize(value, 2, rounding);
}

// ============================================================================
// Basic Arithmetic Operations
// ============================================================================

/**
 * Addition: a + b
 */
export function add(a: Decimal, b: Decimal): Decimal {
  return a.plus(b);
}

/**
 * Subtraction: a - b
 */
export function subtract(a: Decimal, b: Decimal): Decimal {
  return a.minus(b);
}

/**
 * Multiplication: a * b
 */
export function multiply(a: Decimal, b: Decimal): Decimal {
  return a.times(b);
}

/**
 * Division: a / b
 */
export function divide(a: Decimal, b: Decimal): Decimal {
  if (b.isZero()) {
    throw new Error('Division by zero');
  }
  return a.dividedBy(b);
}

/**
 * Modulo: a % b
 */
export function modulo(a: Decimal, b: Decimal): Decimal {
  return a.modulo(b);
}

/**
 * Power: a ^ b
 */
export function power(a: Decimal, b: Decimal): Decimal {
  return a.pow(b);
}

/**
 * Square root
 */
export function sqrt(a: Decimal): Decimal {
  return a.sqrt();
}

/**
 * Absolute value
 */
export function abs(a: Decimal): Decimal {
  return a.abs();
}

/**
 * Negation: -a
 */
export function negate(a: Decimal): Decimal {
  return a.negated();
}

// ============================================================================
// Comparison Operations
// ============================================================================

/**
 * Equals: a === b
 */
export function equals(a: Decimal, b: Decimal): boolean {
  return a.equals(b);
}

/**
 * Greater than: a > b
 */
export function greaterThan(a: Decimal, b: Decimal): boolean {
  return a.greaterThan(b);
}

/**
 * Greater than or equal: a >= b
 */
export function greaterThanOrEqual(a: Decimal, b: Decimal): boolean {
  return a.greaterThanOrEqualTo(b);
}

/**
 * Less than: a < b
 */
export function lessThan(a: Decimal, b: Decimal): boolean {
  return a.lessThan(b);
}

/**
 * Less than or equal: a <= b
 */
export function lessThanOrEqual(a: Decimal, b: Decimal): boolean {
  return a.lessThanOrEqualTo(b);
}

/**
 * Is zero
 */
export function isZero(a: Decimal): boolean {
  return a.isZero();
}

/**
 * Is positive
 */
export function isPositive(a: Decimal): boolean {
  return a.isPositive();
}

/**
 * Is negative
 */
export function isNegative(a: Decimal): boolean {
  return a.isNegative();
}

// ============================================================================
// Aggregation Operations
// ============================================================================

/**
 * Sum of array of decimals
 */
export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, val) => add(acc, val), D(0));
}

/**
 * Average of array of decimals
 */
export function average(values: Decimal[]): Decimal {
  if (values.length === 0) {
    throw new Error('Cannot compute average of empty array');
  }
  return divide(sum(values), D(values.length));
}

/**
 * Weighted average
 * @param values - Array of values
 * @param weights - Array of weights (must sum to 1.0)
 */
export function weightedAverage(values: Decimal[], weights: Decimal[]): Decimal {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have same length');
  }
  if (values.length === 0) {
    throw new Error('Cannot compute weighted average of empty arrays');
  }

  // Verify weights sum to 1.0 (within tolerance)
  const weightSum = sum(weights);
  if (!equals(weightSum, D(1))) {
    throw new Error(`Weights must sum to 1.0, got ${weightSum.toString()}`);
  }

  let result = D(0);
  for (let i = 0; i < values.length; i++) {
    result = add(result, multiply(values[i], weights[i]));
  }
  return result;
}

/**
 * Minimum of array of decimals
 */
export function min(values: Decimal[]): Decimal {
  if (values.length === 0) {
    throw new Error('Cannot find minimum of empty array');
  }
  return values.reduce((acc, val) => (lessThan(val, acc) ? val : acc));
}

/**
 * Maximum of array of decimals
 */
export function max(values: Decimal[]): Decimal {
  if (values.length === 0) {
    throw new Error('Cannot find maximum of empty array');
  }
  return values.reduce((acc, val) => (greaterThan(val, acc) ? val : acc));
}

// ============================================================================
// Mathematical Functions
// ============================================================================

/**
 * Natural logarithm
 */
export function ln(a: Decimal): Decimal {
  return a.ln();
}

/**
 * Exponential (e^x)
 */
export function exp(a: Decimal): Decimal {
  return a.exp();
}

/**
 * Ceiling (round up to integer)
 */
export function ceil(a: Decimal): Decimal {
  return a.ceil();
}

/**
 * Floor (round down to integer)
 */
export function floor(a: Decimal): Decimal {
  return a.floor();
}

/**
 * Round to nearest integer
 */
export function round(a: Decimal): Decimal {
  return a.round();
}

// ============================================================================
// Vectorized Operations (Performance)
// ============================================================================

/**
 * Vectorized addition: adds scalar to all elements
 */
export function addScalar(values: Decimal[], scalar: Decimal): Decimal[] {
  return values.map((v) => add(v, scalar));
}

/**
 * Vectorized multiplication: multiplies all elements by scalar
 */
export function multiplyScalar(values: Decimal[], scalar: Decimal): Decimal[] {
  return values.map((v) => multiply(v, scalar));
}

/**
 * Element-wise addition of two arrays
 */
export function addArrays(a: Decimal[], b: Decimal[]): Decimal[] {
  if (a.length !== b.length) {
    throw new Error('Arrays must have same length');
  }
  return a.map((val, i) => add(val, b[i]));
}

/**
 * Element-wise multiplication of two arrays
 */
export function multiplyArrays(a: Decimal[], b: Decimal[]): Decimal[] {
  if (a.length !== b.length) {
    throw new Error('Arrays must have same length');
  }
  return a.map((val, i) => multiply(val, b[i]));
}

/**
 * Quantize all values in array
 */
export function quantizeArray(
  values: Decimal[],
  precision: number = INTERNAL_PRECISION,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_EVEN
): Decimal[] {
  return values.map((v) => quantize(v, precision, rounding));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp value between min and max
 */
export function clamp(value: Decimal, minValue: Decimal, maxValue: Decimal): Decimal {
  if (lessThan(value, minValue)) return minValue;
  if (greaterThan(value, maxValue)) return maxValue;
  return value;
}

/**
 * Apply cap (maximum value)
 */
export function cap(value: Decimal, capValue: Decimal): Decimal {
  return greaterThan(value, capValue) ? capValue : value;
}

/**
 * Apply floor (minimum value)
 */
export function applyFloor(value: Decimal, floorValue: Decimal): Decimal {
  return lessThan(value, floorValue) ? floorValue : value;
}

/**
 * Convert from one unit to another using conversion factor
 */
export function convertUnit(
  value: Decimal,
  conversionFactor: Decimal
): Decimal {
  return multiply(value, conversionFactor);
}

/**
 * Calculate percentage change
 * @param from - Original value
 * @param to - New value
 * @returns Percentage change (e.g., 0.15 for 15% increase)
 */
export function percentageChange(from: Decimal, to: Decimal): Decimal {
  if (isZero(from)) {
    throw new Error('Cannot calculate percentage change from zero');
  }
  return divide(subtract(to, from), from);
}

/**
 * Apply percentage (e.g., add 15% to value)
 * @param value - Base value
 * @param percentage - Percentage as decimal (e.g., 0.15 for 15%)
 */
export function applyPercentage(value: Decimal, percentage: Decimal): Decimal {
  return multiply(value, add(D(1), percentage));
}

/**
 * Parse string to Decimal safely
 * Returns null if parsing fails
 */
export function parseDecimal(value: string): Decimal | null {
  try {
    return new Decimal(value);
  } catch {
    return null;
  }
}

/**
 * Check if value is a valid Decimal
 */
export function isDecimal(value: any): value is Decimal {
  return value instanceof Decimal;
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format as currency (2 decimal places)
 */
export function formatCurrency(
  value: Decimal,
  currencySymbol: string = '$'
): string {
  return `${currencySymbol}${quantizeCurrency(value).toFixed(2)}`;
}

/**
 * Format with thousands separator
 */
export function formatWithCommas(value: Decimal, decimals: number = 2): string {
  const parts = quantize(value, decimals).toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// ============================================================================
// Constants
// ============================================================================

export const ZERO = D(0);
export const ONE = D(1);
export const TWO = D(2);
export const TEN = D(10);
export const HUNDRED = D(100);
export const THOUSAND = D(1000);
