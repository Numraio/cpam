/**
 * Data Ingestion Adapter Interface
 *
 * Defines the contract for ingestion adapters (OANDA, Platts, CSV, etc.)
 */

import Decimal from 'decimal.js';
import type { VersionTag } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Standard data point from any provider
 */
export interface DataPoint {
  /** Series code (e.g., "WTI", "BRENT", "USD_EUR") */
  seriesCode: string;

  /** Date the data is for */
  asOfDate: Date;

  /** Data value */
  value: Decimal;

  /** Version tag (PRELIMINARY, FINAL, REVISED) */
  versionTag: VersionTag;

  /** When the provider published this data */
  providerTimestamp?: Date;

  /** Additional metadata from provider */
  metadata?: Record<string, any>;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  /** Provider name */
  provider: string;

  /** Number of data points fetched */
  fetchedCount: number;

  /** Number of data points upserted */
  upsertedCount: number;

  /** Number of data points skipped (duplicates) */
  skippedCount: number;

  /** Errors encountered */
  errors: IngestionError[];

  /** Start time */
  startedAt: Date;

  /** Completion time */
  completedAt: Date;

  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Ingestion error
 */
export interface IngestionError {
  /** Error message */
  message: string;

  /** Series code that failed */
  seriesCode?: string;

  /** Date that failed */
  asOfDate?: Date;

  /** Error stack trace */
  stack?: string;
}

/**
 * Ingestion request parameters
 */
export interface IngestionRequest {
  /** Tenant ID */
  tenantId: string;

  /** Series codes to fetch */
  seriesCodes: string[];

  /** Start date (inclusive) */
  startDate: Date;

  /** End date (inclusive) */
  endDate: Date;

  /** Force refetch even if data exists */
  force?: boolean;
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * Data ingestion adapter
 *
 * Implementations fetch data from external providers and normalize to DataPoint[]
 */
export interface IngestionAdapter {
  /** Provider name (e.g., "OANDA", "PLATTS", "CSV") */
  readonly name: string;

  /**
   * Fetches data from provider
   *
   * @param request - Ingestion request
   * @returns Normalized data points
   */
  fetch(request: IngestionRequest): Promise<DataPoint[]>;

  /**
   * Validates adapter configuration
   *
   * @param tenantId - Tenant ID
   * @returns True if valid, throws error otherwise
   */
  validate(tenantId: string): Promise<boolean>;

  /**
   * Tests connection to provider
   *
   * @param tenantId - Tenant ID
   * @returns True if connection successful
   */
  testConnection(tenantId: string): Promise<boolean>;
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Registry of ingestion adapters
 */
export class AdapterRegistry {
  private adapters = new Map<string, IngestionAdapter>();

  /**
   * Registers an adapter
   */
  register(adapter: IngestionAdapter): void {
    this.adapters.set(adapter.name.toUpperCase(), adapter);
  }

  /**
   * Gets an adapter by name
   */
  get(name: string): IngestionAdapter | undefined {
    return this.adapters.get(name.toUpperCase());
  }

  /**
   * Lists all registered adapters
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Checks if adapter exists
   */
  has(name: string): boolean {
    return this.adapters.has(name.toUpperCase());
  }
}

// Global adapter registry
export const adapterRegistry = new AdapterRegistry();

// ============================================================================
// Utilities
// ============================================================================

/**
 * Creates a data point
 */
export function createDataPoint(
  seriesCode: string,
  asOfDate: Date,
  value: number | string | Decimal,
  versionTag: VersionTag,
  providerTimestamp?: Date,
  metadata?: Record<string, any>
): DataPoint {
  return {
    seriesCode,
    asOfDate,
    value: new Decimal(value),
    versionTag,
    providerTimestamp,
    metadata,
  };
}

/**
 * Creates an ingestion error
 */
export function createIngestionError(
  message: string,
  seriesCode?: string,
  asOfDate?: Date,
  error?: Error
): IngestionError {
  return {
    message,
    seriesCode,
    asOfDate,
    stack: error?.stack,
  };
}
