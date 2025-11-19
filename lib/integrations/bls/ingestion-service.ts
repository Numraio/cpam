/**
 * BLS Ingestion Service
 * Handles automated data ingestion from BLS API to database
 */

import { prisma } from '@/lib/prisma';
import { blsClient } from './client';
import { mapBLSSeriesToIndexValues, parseBLSSeries } from './mapper';
import type { BLSSeries } from './types';

export interface BLSIngestionOptions {
  /**
   * Number of years to backfill (default: 2)
   */
  yearsBack?: number;

  /**
   * Force re-ingest even if data exists (default: false)
   */
  force?: boolean;

  /**
   * Include catalog metadata (default: true)
   */
  includeCatalog?: boolean;
}

export interface BLSIngestionResult {
  seriesId: string;
  indexSeriesId: string;
  success: boolean;
  valuesIngested: number;
  valuesSkipped: number;
  error?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Ingest BLS data for a single IndexSeries
 */
export async function ingestBLSData(
  indexSeriesId: string,
  blsSeriesId: string,
  tenantId: string,
  options: BLSIngestionOptions = {}
): Promise<BLSIngestionResult> {
  const { yearsBack = 2, force = false, includeCatalog = true } = options;

  try {
    // Validate IndexSeries exists
    const indexSeries = await prisma.indexSeries.findUnique({
      where: { id: indexSeriesId },
      include: { values: { orderBy: { asOfDate: 'desc' }, take: 1 } },
    });

    if (!indexSeries) {
      return {
        seriesId: blsSeriesId,
        indexSeriesId,
        success: false,
        valuesIngested: 0,
        valuesSkipped: 0,
        error: 'IndexSeries not found',
      };
    }

    if (indexSeries.tenantId !== tenantId) {
      return {
        seriesId: blsSeriesId,
        indexSeriesId,
        success: false,
        valuesIngested: 0,
        valuesSkipped: 0,
        error: 'IndexSeries does not belong to tenant',
      };
    }

    // Fetch data from BLS
    const currentYear = new Date().getFullYear();
    const startYear = (currentYear - yearsBack).toString();
    const endYear = currentYear.toString();

    const series = await blsClient.fetchSingleSeries(
      blsSeriesId,
      startYear,
      endYear,
      { catalog: includeCatalog }
    );

    // Map to IndexValue records
    const indexValueRecords = mapBLSSeriesToIndexValues(series, indexSeriesId);

    if (indexValueRecords.length === 0) {
      return {
        seriesId: blsSeriesId,
        indexSeriesId,
        success: true,
        valuesIngested: 0,
        valuesSkipped: 0,
      };
    }

    // Determine which values to insert
    let valuesIngested = 0;
    let valuesSkipped = 0;

    for (const record of indexValueRecords) {
      const exists = await prisma.indexValue.findFirst({
        where: {
          seriesId: indexSeriesId,
          asOfDate: record.effectiveDate,
        },
      });

      if (exists && !force) {
        valuesSkipped++;
        continue;
      }

      if (exists && force) {
        // Update existing value
        await prisma.indexValue.update({
          where: { id: exists.id },
          data: {
            value: record.value,
            versionTag: 'FINAL', // BLS data is final
            providerTimestamp: new Date(),
          },
        });
        valuesIngested++;
      } else {
        // Insert new value
        await prisma.indexValue.create({
          data: {
            tenantId,
            seriesId: indexSeriesId,
            asOfDate: record.effectiveDate,
            value: record.value,
            versionTag: 'FINAL',
            providerTimestamp: new Date(),
          },
        });
        valuesIngested++;
      }
    }

    const sortedDates = indexValueRecords
      .map((r) => r.effectiveDate)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      seriesId: blsSeriesId,
      indexSeriesId,
      success: true,
      valuesIngested,
      valuesSkipped,
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
    };
  } catch (error) {
    console.error(`BLS ingestion failed for ${blsSeriesId}:`, error);
    return {
      seriesId: blsSeriesId,
      indexSeriesId,
      success: false,
      valuesIngested: 0,
      valuesSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ingest latest BLS data (incremental update)
 */
export async function ingestLatestBLSData(
  indexSeriesId: string,
  blsSeriesId: string,
  tenantId: string
): Promise<BLSIngestionResult> {
  return ingestBLSData(indexSeriesId, blsSeriesId, tenantId, {
    yearsBack: 1, // Only fetch last year
    force: false, // Don't overwrite existing
  });
}

/**
 * Backfill historical BLS data
 */
export async function backfillBLSData(
  indexSeriesId: string,
  blsSeriesId: string,
  tenantId: string,
  yearsBack: number = 10
): Promise<BLSIngestionResult> {
  return ingestBLSData(indexSeriesId, blsSeriesId, tenantId, {
    yearsBack,
    force: false, // Don't overwrite existing
  });
}

/**
 * Ingest BLS data for all IndexSeries with BLS provider for a tenant
 */
export async function ingestAllBLSSeriesForTenant(
  tenantId: string,
  options: BLSIngestionOptions = {}
): Promise<BLSIngestionResult[]> {
  // Find all IndexSeries with BLS provider
  const blsSeries = await prisma.indexSeries.findMany({
    where: {
      tenantId,
      provider: 'BLS',
    },
  });

  const results: BLSIngestionResult[] = [];

  for (const series of blsSeries) {
    // Extract BLS series ID from seriesCode (format: "BLS_CUUR0000SA0" or just "CUUR0000SA0")
    const blsSeriesId = series.seriesCode.startsWith('BLS_')
      ? series.seriesCode.substring(4)
      : series.seriesCode;

    const result = await ingestBLSData(series.id, blsSeriesId, tenantId, options);
    results.push(result);

    // Add delay to respect rate limits (1 second between requests)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Get ingestion status for an IndexSeries
 */
export async function getBLSIngestionStatus(
  indexSeriesId: string
): Promise<{
  totalValues: number;
  latestValue?: {
    date: Date;
    value: number;
  };
  oldestValue?: {
    date: Date;
    value: number;
  };
  lastIngested?: Date;
}> {
  const values = await prisma.indexValue.findMany({
    where: { seriesId: indexSeriesId },
    orderBy: { asOfDate: 'asc' },
  });

  if (values.length === 0) {
    return { totalValues: 0 };
  }

  const latestValue = values[values.length - 1];
  const oldestValue = values[0];

  return {
    totalValues: values.length,
    latestValue: {
      date: latestValue.asOfDate,
      value: parseFloat(latestValue.value.toString()),
    },
    oldestValue: {
      date: oldestValue.asOfDate,
      value: parseFloat(oldestValue.value.toString()),
    },
    lastIngested: latestValue.ingestedAt,
  };
}
