/**
 * IndexValue Query Helpers
 *
 * Provides optimized queries for versioned timeseries data with:
 * - Version preference (PRELIMINARY → FINAL → REVISED)
 * - Lag day support
 * - Range queries
 * - Time-based operations (avg_3m, avg_6m, etc.)
 */

import type { PrismaClient, VersionTag } from '@prisma/client';
import { D, average, min as decimalMin, max as decimalMax } from '@/lib/math/decimal';
import type { DecimalValue } from '@/lib/math/decimal';

// ============================================================================
// Types
// ============================================================================

export type TimeOperation = 'value' | 'avg_3m' | 'avg_6m' | 'avg_12m' | 'min' | 'max';

export interface IndexValueQuery {
  tenantId: string;
  seriesCode: string;
  asOfDate: Date;
  versionPreference?: VersionTag;
  lagDays?: number;
  operation?: TimeOperation;
}

export interface IndexValueResult {
  value: DecimalValue;
  effectiveDate: Date;
  versionTag: VersionTag;
  seriesCode: string;
}

export interface RangeQueryResult {
  asOfDate: Date;
  value: DecimalValue;
  versionTag: VersionTag;
}

// ============================================================================
// Core Query Functions
// ============================================================================

/**
 * Fetches a single index value with version preference
 *
 * Version preference order:
 * 1. FINAL (if available)
 * 2. REVISED (if available)
 * 3. PRELIMINARY (fallback)
 *
 * @param prisma - Prisma client instance
 * @param query - Query parameters
 * @returns Index value result or null if not found
 */
export async function fetchIndexValue(
  prisma: PrismaClient,
  query: IndexValueQuery
): Promise<IndexValueResult | null> {
  const {
    tenantId,
    seriesCode,
    asOfDate,
    versionPreference = 'FINAL',
    lagDays = 0,
    operation = 'value',
  } = query;

  // Apply lag to as-of date
  const effectiveDate = applyLagDays(asOfDate, lagDays);

  // For time-based operations, fetch range and compute
  if (operation !== 'value') {
    return fetchTimeBasedOperation(prisma, {
      tenantId,
      seriesCode,
      asOfDate: effectiveDate,
      versionPreference,
      operation,
    });
  }

  // Fetch series
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${seriesCode}`);
  }

  // Version preference order
  const preferenceOrder = getVersionPreferenceOrder(versionPreference);

  // Try each version in preference order
  for (const version of preferenceOrder) {
    const value = await prisma.indexValue.findUnique({
      where: {
        seriesId_asOfDate_versionTag: {
          seriesId: series.id,
          asOfDate: effectiveDate,
          versionTag: version,
        },
      },
    });

    if (value) {
      return {
        value: D(value.value.toString()),
        effectiveDate,
        versionTag: value.versionTag,
        seriesCode,
      };
    }
  }

  return null; // No value found for any version
}

/**
 * Fetches a range of index values
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID
 * @param seriesCode - Series code
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param versionPreference - Version preference
 * @returns Array of range query results
 */
export async function fetchIndexValueRange(
  prisma: PrismaClient,
  tenantId: string,
  seriesCode: string,
  startDate: Date,
  endDate: Date,
  versionPreference: VersionTag = 'FINAL'
): Promise<RangeQueryResult[]> {
  // Fetch series
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${seriesCode}`);
  }

  // Fetch all values in range, sorted by date and version
  const values = await prisma.indexValue.findMany({
    where: {
      seriesId: series.id,
      asOfDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [{ asOfDate: 'asc' }, { versionTag: 'desc' }],
  });

  // Group by date and select best version per date
  const preferenceOrder = getVersionPreferenceOrder(versionPreference);
  const valuesByDate = new Map<string, RangeQueryResult>();

  for (const value of values) {
    const dateKey = value.asOfDate.toISOString();
    const existing = valuesByDate.get(dateKey);

    if (!existing) {
      valuesByDate.set(dateKey, {
        asOfDate: value.asOfDate,
        value: D(value.value.toString()),
        versionTag: value.versionTag,
      });
    } else {
      // Compare versions and keep the preferred one
      const currentIndex = preferenceOrder.indexOf(existing.versionTag);
      const newIndex = preferenceOrder.indexOf(value.versionTag);
      if (newIndex < currentIndex) {
        valuesByDate.set(dateKey, {
          asOfDate: value.asOfDate,
          value: D(value.value.toString()),
          versionTag: value.versionTag,
        });
      }
    }
  }

  return Array.from(valuesByDate.values()).sort(
    (a, b) => a.asOfDate.getTime() - b.asOfDate.getTime()
  );
}

/**
 * Upserts an index value (insert or update if exists)
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID
 * @param seriesCode - Series code
 * @param asOfDate - As-of date
 * @param value - Value to store
 * @param versionTag - Version tag
 * @param providerTimestamp - Optional provider timestamp
 * @returns Created or updated index value
 */
export async function upsertIndexValue(
  prisma: PrismaClient,
  tenantId: string,
  seriesCode: string,
  asOfDate: Date,
  value: number | string,
  versionTag: VersionTag,
  providerTimestamp?: Date
) {
  // Fetch series
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${seriesCode}`);
  }

  // Upsert value
  return prisma.indexValue.upsert({
    where: {
      seriesId_asOfDate_versionTag: {
        seriesId: series.id,
        asOfDate,
        versionTag,
      },
    },
    update: {
      value,
      providerTimestamp,
      ingestedAt: new Date(),
    },
    create: {
      tenantId,
      seriesId: series.id,
      asOfDate,
      value,
      versionTag,
      providerTimestamp,
    },
  });
}

/**
 * Batch upsert index values for performance
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID
 * @param seriesCode - Series code
 * @param values - Array of values to upsert
 * @returns Number of values upserted
 */
export async function batchUpsertIndexValues(
  prisma: PrismaClient,
  tenantId: string,
  seriesCode: string,
  values: Array<{
    asOfDate: Date;
    value: number | string;
    versionTag: VersionTag;
    providerTimestamp?: Date;
  }>
): Promise<number> {
  // Fetch series
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${seriesCode}`);
  }

  let count = 0;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    for (const val of values) {
      await tx.indexValue.upsert({
        where: {
          seriesId_asOfDate_versionTag: {
            seriesId: series.id,
            asOfDate: val.asOfDate,
            versionTag: val.versionTag,
          },
        },
        update: {
          value: val.value,
          providerTimestamp: val.providerTimestamp,
          ingestedAt: new Date(),
        },
        create: {
          tenantId,
          seriesId: series.id,
          asOfDate: val.asOfDate,
          value: val.value,
          versionTag: val.versionTag,
          providerTimestamp: val.providerTimestamp,
        },
      });
      count++;
    }
  });

  return count;
}

// ============================================================================
// Time-Based Operations
// ============================================================================

/**
 * Fetches and computes time-based operations (avg, min, max)
 */
async function fetchTimeBasedOperation(
  prisma: PrismaClient,
  query: {
    tenantId: string;
    seriesCode: string;
    asOfDate: Date;
    versionPreference: VersionTag;
    operation: TimeOperation;
  }
): Promise<IndexValueResult | null> {
  const { tenantId, seriesCode, asOfDate, versionPreference, operation } = query;

  // Determine lookback period
  const months = getMonthsForOperation(operation);
  const startDate = subtractMonths(asOfDate, months);

  // Fetch range
  const values = await fetchIndexValueRange(
    prisma,
    tenantId,
    seriesCode,
    startDate,
    asOfDate,
    versionPreference
  );

  if (values.length === 0) {
    return null;
  }

  // Compute operation
  let result: DecimalValue;
  const decimalValues = values.map((v) => v.value);

  switch (operation) {
    case 'avg_3m':
    case 'avg_6m':
    case 'avg_12m':
      result = average(decimalValues);
      break;
    case 'min':
      result = decimalMin(decimalValues);
      break;
    case 'max':
      result = decimalMax(decimalValues);
      break;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }

  // Return with latest version tag from range
  const latestVersion = values[values.length - 1].versionTag;

  return {
    value: result,
    effectiveDate: asOfDate,
    versionTag: latestVersion,
    seriesCode,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets version preference order based on preferred version
 */
function getVersionPreferenceOrder(preference: VersionTag): VersionTag[] {
  switch (preference) {
    case 'FINAL':
      return ['FINAL', 'REVISED', 'PRELIMINARY'];
    case 'REVISED':
      return ['REVISED', 'FINAL', 'PRELIMINARY'];
    case 'PRELIMINARY':
      return ['PRELIMINARY', 'FINAL', 'REVISED'];
    default:
      return ['FINAL', 'REVISED', 'PRELIMINARY'];
  }
}

/**
 * Applies lag days to a date (subtracts days)
 */
function applyLagDays(date: Date, lagDays: number): Date {
  if (lagDays === 0) return date;

  const result = new Date(date);
  result.setDate(result.getDate() - lagDays);
  return result;
}

/**
 * Gets number of months for time-based operation
 */
function getMonthsForOperation(operation: TimeOperation): number {
  switch (operation) {
    case 'avg_3m':
      return 3;
    case 'avg_6m':
      return 6;
    case 'avg_12m':
      return 12;
    default:
      throw new Error(`Operation ${operation} does not have a month period`);
  }
}

/**
 * Subtracts months from a date
 */
function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * Validates that a series exists
 */
export async function validateSeriesExists(
  prisma: PrismaClient,
  tenantId: string,
  seriesCode: string
): Promise<boolean> {
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
  });
  return series !== null;
}

/**
 * Gets series metadata
 */
export async function getSeriesMetadata(
  prisma: PrismaClient,
  tenantId: string,
  seriesCode: string
) {
  const series = await prisma.indexSeries.findUnique({
    where: {
      tenantId_seriesCode: { tenantId, seriesCode },
    },
    include: {
      _count: {
        select: { values: true },
      },
    },
  });

  if (!series) {
    throw new Error(`Series not found: ${seriesCode}`);
  }

  // Get date range
  const firstValue = await prisma.indexValue.findFirst({
    where: { seriesId: series.id },
    orderBy: { asOfDate: 'asc' },
  });

  const lastValue = await prisma.indexValue.findFirst({
    where: { seriesId: series.id },
    orderBy: { asOfDate: 'desc' },
  });

  return {
    id: series.id,
    seriesCode: series.seriesCode,
    name: series.name,
    description: series.description,
    provider: series.provider,
    dataType: series.dataType,
    unit: series.unit,
    frequency: series.frequency,
    valueCount: series._count.values,
    firstDate: firstValue?.asOfDate,
    lastDate: lastValue?.asOfDate,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };
}
