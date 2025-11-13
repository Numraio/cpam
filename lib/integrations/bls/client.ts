/**
 * BLS (Bureau of Labor Statistics) API Client
 * API Documentation: https://www.bls.gov/developers/
 */

import type {
  BLSApiRequest,
  BLSApiResponse,
  BLSErrorResponse,
  BLSSeries,
  BLSRateLimitInfo,
} from './types';
import env from '@/lib/env';

const BLS_API_BASE_URL = 'https://api.bls.gov/publicAPI/v2';
const BLS_API_TIMEOUT = 30000; // 30 seconds

/**
 * BLS API Client
 */
export class BLSClient {
  private apiKey?: string;
  private requestCount: number = 0;
  private dailyLimit: number = 500; // Default for unregistered
  private lastResetDate: Date;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.blsApiKey;
    this.dailyLimit = this.apiKey ? 1000 : 500; // Registered users get 1000/day
    this.lastResetDate = new Date();
  }

  /**
   * Fetch time series data from BLS API
   */
  async fetchSeries(
    seriesIds: string[],
    startYear: string,
    endYear: string,
    options: {
      catalog?: boolean;
      calculations?: boolean;
      annualAverage?: boolean;
    } = {}
  ): Promise<BLSSeries[]> {
    this.checkRateLimit();

    const request: BLSApiRequest = {
      seriesid: seriesIds,
      startyear: startYear,
      endyear: endYear,
      ...(this.apiKey && { registrationkey: this.apiKey }),
      ...options,
    };

    try {
      const response = await this.makeRequest<BLSApiResponse>(
        '/timeseries/data/',
        request
      );

      if (response.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(
          `BLS API request failed: ${response.message?.join(', ') || 'Unknown error'}`
        );
      }

      this.incrementRequestCount();
      return response.Results.series;
    } catch (error) {
      console.error('BLS API error:', error);
      throw new Error(`Failed to fetch BLS data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch single series data
   */
  async fetchSingleSeries(
    seriesId: string,
    startYear: string,
    endYear: string,
    options?: {
      catalog?: boolean;
      calculations?: boolean;
      annualAverage?: boolean;
    }
  ): Promise<BLSSeries> {
    const series = await this.fetchSeries([seriesId], startYear, endYear, options);

    if (series.length === 0) {
      throw new Error(`No data found for BLS series: ${seriesId}`);
    }

    return series[0];
  }

  /**
   * Fetch latest available data for a series
   */
  async fetchLatestData(seriesId: string): Promise<BLSSeries> {
    const currentYear = new Date().getFullYear();
    const startYear = (currentYear - 1).toString(); // Last 2 years
    const endYear = currentYear.toString();

    return this.fetchSingleSeries(seriesId, startYear, endYear);
  }

  /**
   * Fetch historical data (up to 10 years)
   */
  async fetchHistoricalData(
    seriesId: string,
    yearsBack: number = 10
  ): Promise<BLSSeries> {
    const currentYear = new Date().getFullYear();
    const startYear = (currentYear - yearsBack).toString();
    const endYear = currentYear.toString();

    return this.fetchSingleSeries(seriesId, startYear, endYear, {
      catalog: true, // Include metadata
    });
  }

  /**
   * Validate series ID by attempting to fetch metadata
   */
  async validateSeriesId(seriesId: string): Promise<boolean> {
    try {
      const currentYear = new Date().getFullYear().toString();
      await this.fetchSingleSeries(seriesId, currentYear, currentYear, {
        catalog: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): BLSRateLimitInfo {
    const now = new Date();
    const resetTime = new Date(this.lastResetDate);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    // Reset counter if it's a new day
    if (now > resetTime) {
      this.requestCount = 0;
      this.lastResetDate = now;
    }

    return {
      dailyLimit: this.dailyLimit,
      requestsToday: this.requestCount,
      resetTime,
    };
  }

  /**
   * Make HTTP request to BLS API
   */
  private async makeRequest<T>(
    endpoint: string,
    body: BLSApiRequest
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BLS_API_TIMEOUT);

    try {
      const response = await fetch(`${BLS_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('BLS API request timed out');
      }

      throw error;
    }
  }

  /**
   * Check if rate limit would be exceeded
   */
  private checkRateLimit(): void {
    const info = this.getRateLimitInfo();

    if (info.requestsToday >= info.dailyLimit) {
      throw new Error(
        `BLS API daily rate limit exceeded (${info.dailyLimit} requests). Resets at ${info.resetTime.toLocaleString()}`
      );
    }
  }

  /**
   * Increment request counter
   */
  private incrementRequestCount(): void {
    this.requestCount++;
  }
}

/**
 * Create BLS client instance
 */
export function createBLSClient(apiKey?: string): BLSClient {
  return new BLSClient(apiKey);
}

/**
 * Default BLS client (uses env API key)
 */
export const blsClient = createBLSClient();
