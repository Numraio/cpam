/**
 * FX Rate Service
 *
 * Fetches FX rates according to policy (PERIOD_AVG, EOP, EFFECTIVE_DATE)
 */

import { fetchOANDARate, fetchOANDAPeriodAverage, type FXRate } from './oanda-client';
import {
  createCalendar,
  lastBusinessDayOfMonth,
  rollBackward,
  type BusinessCalendar,
} from '@/lib/calendar/business-calendar';
import Decimal from 'decimal.js';

// ============================================================================
// Types
// ============================================================================

export type FXPolicy = 'PERIOD_AVG' | 'EOP' | 'EFFECTIVE_DATE';

export interface FXRateRequest {
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  policy: FXPolicy;
  effectiveDate?: Date; // Required for EFFECTIVE_DATE policy
  periodStart?: Date; // Required for PERIOD_AVG policy
  periodEnd?: Date; // Required for PERIOD_AVG and EOP policies
  calendar?: BusinessCalendar; // Optional calendar for business day adjustments
}

export interface FXRateResult {
  rate: Decimal;
  rateDate: Date;
  policy: FXPolicy;
  fromCurrency: string;
  toCurrency: string;
}

// ============================================================================
// FX Rate Fetching
// ============================================================================

/**
 * Fetches FX rate according to policy
 *
 * @param request - FX rate request
 * @returns FX rate result
 */
export async function getFXRate(request: FXRateRequest): Promise<FXRateResult> {
  const { tenantId, fromCurrency, toCurrency, policy } = request;

  // No conversion needed if currencies match
  if (fromCurrency === toCurrency) {
    return {
      rate: new Decimal(1),
      rateDate: new Date(),
      policy,
      fromCurrency,
      toCurrency,
    };
  }

  switch (policy) {
    case 'PERIOD_AVG':
      return getPeriodAverageRate(request);
    case 'EOP':
      return getEndOfPeriodRate(request);
    case 'EFFECTIVE_DATE':
      return getEffectiveDateRate(request);
    default:
      throw new Error(`Unknown FX policy: ${policy}`);
  }
}

/**
 * Gets period average FX rate
 *
 * Calculates average rate over the period [periodStart, periodEnd]
 */
async function getPeriodAverageRate(request: FXRateRequest): Promise<FXRateResult> {
  const { tenantId, fromCurrency, toCurrency, periodStart, periodEnd } = request;

  if (!periodStart || !periodEnd) {
    throw new Error('PERIOD_AVG policy requires periodStart and periodEnd');
  }

  const fxRate = await fetchOANDAPeriodAverage(
    tenantId,
    fromCurrency,
    toCurrency,
    periodStart,
    periodEnd
  );

  if (!fxRate) {
    throw new Error(
      `FX rate not available for ${fromCurrency}/${toCurrency} (period ${periodStart.toISOString()} - ${periodEnd.toISOString()})`
    );
  }

  return {
    rate: fxRate.rate,
    rateDate: fxRate.date,
    policy: 'PERIOD_AVG',
    fromCurrency,
    toCurrency,
  };
}

/**
 * Gets end-of-period FX rate
 *
 * Uses rate on last business day of the period
 */
async function getEndOfPeriodRate(request: FXRateRequest): Promise<FXRateResult> {
  const { tenantId, fromCurrency, toCurrency, periodEnd, calendar } = request;

  if (!periodEnd) {
    throw new Error('EOP policy requires periodEnd');
  }

  // Determine calendar (default to US)
  const bizCalendar = calendar || createCalendar('US');

  // Roll back to last business day if periodEnd is holiday/weekend
  const businessDayEnd = rollBackward(periodEnd, bizCalendar);

  const fxRate = await fetchOANDARate(
    tenantId,
    fromCurrency,
    toCurrency,
    businessDayEnd
  );

  if (!fxRate) {
    throw new Error(
      `FX rate not available for ${fromCurrency}/${toCurrency} on ${businessDayEnd.toISOString()}`
    );
  }

  return {
    rate: fxRate.rate,
    rateDate: fxRate.date,
    policy: 'EOP',
    fromCurrency,
    toCurrency,
  };
}

/**
 * Gets FX rate on specific effective date
 *
 * Uses rate on the effective date (or nearest business day)
 */
async function getEffectiveDateRate(request: FXRateRequest): Promise<FXRateResult> {
  const { tenantId, fromCurrency, toCurrency, effectiveDate, calendar } = request;

  if (!effectiveDate) {
    throw new Error('EFFECTIVE_DATE policy requires effectiveDate');
  }

  // Determine calendar (default to US)
  const bizCalendar = calendar || createCalendar('US');

  // Roll back to business day if effectiveDate is holiday/weekend
  const businessDay = rollBackward(effectiveDate, bizCalendar);

  const fxRate = await fetchOANDARate(
    tenantId,
    fromCurrency,
    toCurrency,
    businessDay
  );

  if (!fxRate) {
    throw new Error(
      `FX rate not available for ${fromCurrency}/${toCurrency} on ${businessDay.toISOString()}`
    );
  }

  return {
    rate: fxRate.rate,
    rateDate: fxRate.date,
    policy: 'EFFECTIVE_DATE',
    fromCurrency,
    toCurrency,
  };
}

/**
 * Converts amount from one currency to another
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param fxRate - FX rate result
 * @returns Converted amount
 */
export function convertAmount(
  amount: Decimal,
  fromCurrency: string,
  toCurrency: string,
  fxRate: FXRateResult
): Decimal {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Verify currencies match the FX rate
  if (fxRate.fromCurrency !== fromCurrency || fxRate.toCurrency !== toCurrency) {
    throw new Error(
      `Currency mismatch: expected ${fromCurrency}/${toCurrency}, got ${fxRate.fromCurrency}/${fxRate.toCurrency}`
    );
  }

  return amount.times(fxRate.rate);
}

/**
 * Rounds FX rate to standard precision
 *
 * @param rate - FX rate
 * @param precision - Decimal places (default: 6)
 * @returns Rounded rate
 */
export function roundFXRate(rate: Decimal, precision: number = 6): Decimal {
  return rate.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP);
}

/**
 * Rounds monetary amount to currency precision
 *
 * @param amount - Amount
 * @param currency - Currency code
 * @returns Rounded amount
 */
export function roundAmount(amount: Decimal, currency: string): Decimal {
  // Most currencies use 2 decimal places
  // Special cases can be added here (e.g., JPY uses 0, BTC uses 8)
  const precision = getCurrencyPrecision(currency);
  return amount.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP);
}

/**
 * Gets standard precision for currency
 */
function getCurrencyPrecision(currency: string): number {
  // Currencies with no decimal places
  const zeroDecimals = ['JPY', 'KRW', 'VND', 'CLP'];
  if (zeroDecimals.includes(currency)) {
    return 0;
  }

  // Cryptocurrencies (if supported)
  const cryptoDecimals: Record<string, number> = {
    BTC: 8,
    ETH: 8,
  };
  if (cryptoDecimals[currency]) {
    return cryptoDecimals[currency];
  }

  // Default: 2 decimal places
  return 2;
}
