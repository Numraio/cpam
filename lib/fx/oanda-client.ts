/**
 * OANDA FX Rate Client
 *
 * Fetches foreign exchange rates from OANDA API with caching and error handling.
 */

import { getProviderCredential } from '@/lib/provider-credentials';
import Decimal from 'decimal.js';

// ============================================================================
// Types
// ============================================================================

export interface OANDACredentials {
  accountId: string;
  apiToken: string;
}

export interface FXRate {
  base: string; // Base currency (e.g., "USD")
  quote: string; // Quote currency (e.g., "EUR")
  rate: Decimal; // Exchange rate
  date: Date; // Rate date
  timestamp: Date; // When rate was fetched
}

export interface OANDARateResponse {
  instrument: string; // e.g., "EUR_USD"
  time: string; // ISO timestamp
  bid: string; // Bid price
  ask: string; // Ask price
  midpoint: string; // Midpoint (avg of bid/ask)
}

// ============================================================================
// Configuration
// ============================================================================

const OANDA_BASE_URL = 'https://api-fxpractice.oanda.com'; // Use practice for dev/test
const OANDA_PRODUCTION_URL = 'https://api-fxtrade.oanda.com';

// Cache FX rates to reduce API calls
const FX_CACHE = new Map<string, { rate: FXRate; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// OANDA Client
// ============================================================================

/**
 * Fetches FX rate from OANDA
 *
 * @param tenantId - Tenant ID
 * @param base - Base currency (e.g., "USD")
 * @param quote - Quote currency (e.g., "EUR")
 * @param date - Date for historical rate (defaults to today)
 * @param useProduction - Use production API (default: false)
 * @returns FX rate
 */
export async function fetchOANDARate(
  tenantId: string,
  base: string,
  quote: string,
  date?: Date,
  useProduction: boolean = false
): Promise<FXRate | null> {
  // Check cache first
  const cacheKey = getCacheKey(tenantId, base, quote, date);
  const cached = FX_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rate;
  }

  try {
    // Get credentials
    const credentials = await getProviderCredential(tenantId, 'OANDA', 'default');

    if (!credentials) {
      throw new Error('OANDA credentials not configured for tenant');
    }

    const { accountId, apiToken } = credentials as OANDACredentials;

    // Build instrument (OANDA uses underscore notation: BASE_QUOTE)
    const instrument = `${base}_${quote}`;

    // Build URL
    const baseUrl = useProduction ? OANDA_PRODUCTION_URL : OANDA_BASE_URL;
    const endpoint = date
      ? `/v3/instruments/${instrument}/candles`
      : `/v3/accounts/${accountId}/pricing`;

    const url = new URL(endpoint, baseUrl);

    if (date) {
      // Historical rate
      const dateStr = date.toISOString().split('T')[0];
      url.searchParams.set('from', `${dateStr}T00:00:00Z`);
      url.searchParams.set('to', `${dateStr}T23:59:59Z`);
      url.searchParams.set('granularity', 'D'); // Daily candles
      url.searchParams.set('price', 'M'); // Midpoint prices
    } else {
      // Current rate
      url.searchParams.set('instruments', instrument);
    }

    // Fetch from OANDA
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OANDA API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Parse response
    let rate: FXRate;

    if (date) {
      // Historical rate from candles
      if (!data.candles || data.candles.length === 0) {
        return null; // No data available for this date
      }

      const candle = data.candles[0];
      rate = {
        base,
        quote,
        rate: new Decimal(candle.mid.c), // Close price
        date: new Date(candle.time),
        timestamp: new Date(),
      };
    } else {
      // Current rate from pricing
      if (!data.prices || data.prices.length === 0) {
        return null;
      }

      const pricing = data.prices[0];
      const midpoint = new Decimal(pricing.bids[0].price)
        .plus(new Decimal(pricing.asks[0].price))
        .dividedBy(2);

      rate = {
        base,
        quote,
        rate: midpoint,
        date: new Date(pricing.time),
        timestamp: new Date(),
      };
    }

    // Cache the result
    FX_CACHE.set(cacheKey, {
      rate,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return rate;
  } catch (error: any) {
    console.error('Error fetching OANDA rate:', error);
    throw new Error(`Failed to fetch FX rate from OANDA: ${error.message}`);
  }
}

/**
 * Fetches average FX rate over a period
 *
 * @param tenantId - Tenant ID
 * @param base - Base currency
 * @param quote - Quote currency
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @param useProduction - Use production API
 * @returns Average FX rate
 */
export async function fetchOANDAPeriodAverage(
  tenantId: string,
  base: string,
  quote: string,
  startDate: Date,
  endDate: Date,
  useProduction: boolean = false
): Promise<FXRate | null> {
  try {
    // Get credentials
    const credentials = await getProviderCredential(tenantId, 'OANDA', 'default');

    if (!credentials) {
      throw new Error('OANDA credentials not configured for tenant');
    }

    const { accountId, apiToken } = credentials as OANDACredentials;

    // Build instrument
    const instrument = `${base}_${quote}`;

    // Build URL for historical candles
    const baseUrl = useProduction ? OANDA_PRODUCTION_URL : OANDA_BASE_URL;
    const url = new URL(`/v3/instruments/${instrument}/candles`, baseUrl);

    url.searchParams.set('from', startDate.toISOString());
    url.searchParams.set('to', endDate.toISOString());
    url.searchParams.set('granularity', 'D'); // Daily candles
    url.searchParams.set('price', 'M'); // Midpoint prices

    // Fetch from OANDA
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OANDA API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.candles || data.candles.length === 0) {
      return null;
    }

    // Calculate average of close prices
    const sum = data.candles.reduce(
      (acc: Decimal, candle: any) => acc.plus(new Decimal(candle.mid.c)),
      new Decimal(0)
    );

    const average = sum.dividedBy(data.candles.length);

    return {
      base,
      quote,
      rate: average,
      date: endDate, // Use end date as reference
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Error fetching OANDA period average:', error);
    throw new Error(`Failed to fetch FX period average from OANDA: ${error.message}`);
  }
}

/**
 * Clears the FX rate cache
 */
export function clearFXCache(): void {
  FX_CACHE.clear();
}

/**
 * Generates cache key for FX rate
 */
function getCacheKey(
  tenantId: string,
  base: string,
  quote: string,
  date?: Date
): string {
  const dateStr = date ? date.toISOString().split('T')[0] : 'current';
  return `${tenantId}:${base}_${quote}:${dateStr}`;
}

/**
 * Converts amount from one currency to another
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param rate - FX rate (fromCurrency per toCurrency)
 * @returns Converted amount
 */
export function convertCurrency(
  amount: Decimal,
  fromCurrency: string,
  toCurrency: string,
  rate: Decimal
): Decimal {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // rate is "fromCurrency per toCurrency"
  // e.g., if rate is 1.10 USD per EUR, and we're converting EUR to USD:
  // 100 EUR * 1.10 = 110 USD

  return amount.times(rate);
}
