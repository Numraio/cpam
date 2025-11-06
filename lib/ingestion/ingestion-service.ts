/**
 * Data Ingestion Service
 *
 * Orchestrates data ingestion with idempotent upserts, rate limiting, and error handling
 */

import type {
  IngestionAdapter,
  IngestionRequest,
  IngestionResult,
  DataPoint,
} from './adapter-interface';
import { createIngestionError } from './adapter-interface';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

// ============================================================================
// Configuration
// ============================================================================

const RATE_LIMIT_DELAY_MS = 100; // Delay between upserts to avoid overwhelming DB
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Initial retry delay
const BACKOFF_MULTIPLIER = 2; // Exponential backoff

// ============================================================================
// Ingestion Service
// ============================================================================

/**
 * Runs ingestion using an adapter
 *
 * @param adapter - Ingestion adapter
 * @param request - Ingestion request
 * @returns Ingestion result
 */
export async function runIngestion(
  adapter: IngestionAdapter,
  request: IngestionRequest
): Promise<IngestionResult> {
  const startedAt = new Date();

  const result: IngestionResult = {
    provider: adapter.name,
    fetchedCount: 0,
    upsertedCount: 0,
    skippedCount: 0,
    errors: [],
    startedAt,
    completedAt: new Date(),
    durationMs: 0,
  };

  try {
    // Validate adapter
    await adapter.validate(request.tenantId);

    // Fetch data from provider
    const dataPoints = await adapter.fetch(request);
    result.fetchedCount = dataPoints.length;

    // Upsert data points
    for (const dataPoint of dataPoints) {
      try {
        const upserted = await upsertDataPoint(request.tenantId, dataPoint, request.force);

        if (upserted) {
          result.upsertedCount++;
        } else {
          result.skippedCount++;
        }

        // Rate limiting: small delay between upserts
        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (error: any) {
        console.error('Error upserting data point:', error);
        result.errors.push(
          createIngestionError(
            `Failed to upsert: ${error.message}`,
            dataPoint.seriesCode,
            dataPoint.asOfDate,
            error
          )
        );
      }
    }
  } catch (error: any) {
    console.error('Ingestion failed:', error);
    result.errors.push(
      createIngestionError(`Ingestion failed: ${error.message}`, undefined, undefined, error)
    );
  }

  result.completedAt = new Date();
  result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();

  return result;
}

/**
 * Upserts a data point with idempotency
 *
 * @param tenantId - Tenant ID
 * @param dataPoint - Data point to upsert
 * @param force - Force upsert even if exists
 * @returns True if upserted, false if skipped
 */
async function upsertDataPoint(
  tenantId: string,
  dataPoint: DataPoint,
  force: boolean = false
): Promise<boolean> {
  // Resolve series ID
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: {
        tenantId,
        seriesCode: dataPoint.seriesCode,
      },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${dataPoint.seriesCode}`);
  }

  // Check if data point already exists
  const existing = await prisma.indexValue.findUnique({
    where: {
      seriesId_asOfDate_versionTag: {
        seriesId: series.id,
        asOfDate: dataPoint.asOfDate,
        versionTag: dataPoint.versionTag,
      },
    },
  });

  // Skip if exists and not forcing
  if (existing && !force) {
    // Check if value is different (might be a revision)
    const existingValue = new Decimal(existing.value.toString());
    if (existingValue.equals(dataPoint.value)) {
      return false; // Skip duplicate
    }
  }

  // Upsert with retry logic
  await retryWithBackoff(async () => {
    await prisma.indexValue.upsert({
      where: {
        seriesId_asOfDate_versionTag: {
          seriesId: series.id,
          asOfDate: dataPoint.asOfDate,
          versionTag: dataPoint.versionTag,
        },
      },
      update: {
        value: dataPoint.value,
        providerTimestamp: dataPoint.providerTimestamp,
        ingestedAt: new Date(),
      },
      create: {
        tenantId,
        seriesId: series.id,
        asOfDate: dataPoint.asOfDate,
        value: dataPoint.value,
        versionTag: dataPoint.versionTag,
        providerTimestamp: dataPoint.providerTimestamp,
        ingestedAt: new Date(),
      },
    });
  });

  return true;
}

/**
 * Retries an operation with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
        console.warn(
          `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
          error.message
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Runs ingestion for multiple series
 *
 * @param adapter - Ingestion adapter
 * @param tenantId - Tenant ID
 * @param seriesCodes - Series codes to fetch
 * @param startDate - Start date
 * @param endDate - End date
 * @param force - Force refetch
 * @returns Ingestion result
 */
export async function runBulkIngestion(
  adapter: IngestionAdapter,
  tenantId: string,
  seriesCodes: string[],
  startDate: Date,
  endDate: Date,
  force: boolean = false
): Promise<IngestionResult> {
  const request: IngestionRequest = {
    tenantId,
    seriesCodes,
    startDate,
    endDate,
    force,
  };

  return runIngestion(adapter, request);
}

/**
 * Checks if series exists, creates if not
 *
 * @param tenantId - Tenant ID
 * @param seriesCode - Series code
 * @param provider - Provider name
 * @param dataType - Data type (INDEX, FX, CUSTOM)
 * @returns Series ID
 */
export async function ensureSeriesExists(
  tenantId: string,
  seriesCode: string,
  provider: string,
  dataType: string = 'FX'
): Promise<string> {
  const series = await prisma.indexSeries.upsert({
    where: {
      tenantId_seriesCode: {
        tenantId,
        seriesCode,
      },
    },
    update: {},
    create: {
      tenantId,
      seriesCode,
      name: seriesCode,
      provider,
      dataType,
      unit: dataType === 'FX' ? 'RATE' : 'USD',
      frequency: 'DAILY',
    },
  });

  return series.id;
}
