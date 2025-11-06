/**
 * OANDA Ingestion Adapter
 *
 * Fetches FX rates from OANDA and normalizes to DataPoint[]
 */

import type {
  IngestionAdapter,
  IngestionRequest,
  DataPoint,
} from '../adapter-interface';
import { createDataPoint, createIngestionError } from '../adapter-interface';
import { getProviderCredential } from '@/lib/provider-credentials';
import Decimal from 'decimal.js';

// ============================================================================
// OANDA Adapter
// ============================================================================

export class OANDAAdapter implements IngestionAdapter {
  readonly name = 'OANDA';

  private readonly baseUrl: string;

  constructor(useProduction: boolean = false) {
    this.baseUrl = useProduction
      ? 'https://api-fxtrade.oanda.com'
      : 'https://api-fxpractice.oanda.com';
  }

  /**
   * Fetches FX data from OANDA
   */
  async fetch(request: IngestionRequest): Promise<DataPoint[]> {
    const { tenantId, seriesCodes, startDate, endDate } = request;

    // Get credentials
    const credentials = await getProviderCredential(tenantId, 'OANDA', 'default');

    if (!credentials) {
      throw new Error('OANDA credentials not configured for tenant');
    }

    const { apiToken } = credentials as { apiToken: string };

    const dataPoints: DataPoint[] = [];

    // Fetch each series
    for (const seriesCode of seriesCodes) {
      try {
        const points = await this.fetchSeries(
          seriesCode,
          startDate,
          endDate,
          apiToken
        );
        dataPoints.push(...points);
      } catch (error: any) {
        console.error(`Error fetching ${seriesCode}:`, error);
        // Continue with other series even if one fails
      }
    }

    return dataPoints;
  }

  /**
   * Fetches a single FX series
   */
  private async fetchSeries(
    seriesCode: string,
    startDate: Date,
    endDate: Date,
    apiToken: string
  ): Promise<DataPoint[]> {
    // OANDA uses underscore notation: EUR_USD
    const instrument = seriesCode.replace('/', '_').replace('-', '_');

    // Build URL for historical candles
    const url = new URL(`/v3/instruments/${instrument}/candles`, this.baseUrl);
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
      return [];
    }

    // Convert to DataPoints
    const dataPoints: DataPoint[] = data.candles.map((candle: any) => {
      return createDataPoint(
        seriesCode,
        new Date(candle.time),
        candle.mid.c, // Close price
        'FINAL', // OANDA data is considered final
        new Date(candle.time),
        {
          open: candle.mid.o,
          high: candle.mid.h,
          low: candle.mid.l,
          close: candle.mid.c,
          volume: candle.volume,
        }
      );
    });

    return dataPoints;
  }

  /**
   * Validates OANDA credentials
   */
  async validate(tenantId: string): Promise<boolean> {
    const credentials = await getProviderCredential(tenantId, 'OANDA', 'default');

    if (!credentials) {
      throw new Error('OANDA credentials not configured for tenant');
    }

    const { apiToken } = credentials as { apiToken: string };

    if (!apiToken) {
      throw new Error('OANDA apiToken missing');
    }

    return true;
  }

  /**
   * Tests connection to OANDA
   */
  async testConnection(tenantId: string): Promise<boolean> {
    try {
      const credentials = await getProviderCredential(tenantId, 'OANDA', 'default');

      if (!credentials) {
        return false;
      }

      const { accountId, apiToken } = credentials as {
        accountId: string;
        apiToken: string;
      };

      // Test with a simple account request
      const url = new URL(`/v3/accounts/${accountId}`, this.baseUrl);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('OANDA connection test failed:', error);
      return false;
    }
  }
}
