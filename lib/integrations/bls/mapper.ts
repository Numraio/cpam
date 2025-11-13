/**
 * BLS Data Mapper
 * Maps BLS API responses to our internal IndexValue format
 */

import type { BLSSeries, BLSDataPoint, ParsedBLSDataPoint } from './types';

/**
 * Parse BLS period to Date
 * Period formats:
 * - M01-M12: Monthly (January-December)
 * - Q01-Q04: Quarterly
 * - A01: Annual
 */
export function parseBLSPeriod(year: string, period: string): Date {
  const yearNum = parseInt(year, 10);

  if (period.startsWith('M')) {
    // Monthly data: M01 = January, M02 = February, etc.
    const month = parseInt(period.substring(1), 10) - 1; // 0-indexed
    return new Date(yearNum, month, 1);
  } else if (period.startsWith('Q')) {
    // Quarterly data: Q01 = Q1, Q02 = Q2, etc.
    const quarter = parseInt(period.substring(1), 10);
    const month = (quarter - 1) * 3; // Q1 = Jan (0), Q2 = Apr (3), Q3 = Jul (6), Q4 = Oct (9)
    return new Date(yearNum, month, 1);
  } else if (period === 'A01') {
    // Annual data: January 1st of the year
    return new Date(yearNum, 0, 1);
  } else {
    // Fallback: January 1st
    console.warn(`Unknown BLS period format: ${period}`);
    return new Date(yearNum, 0, 1);
  }
}

/**
 * Determine frequency from BLS period
 */
export function determineBLSFrequency(period: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' {
  if (period.startsWith('M')) return 'MONTHLY';
  if (period.startsWith('Q')) return 'QUARTERLY';
  if (period === 'A01') return 'ANNUAL';
  return 'MONTHLY'; // Default
}

/**
 * Parse BLS data point
 */
export function parseBLSDataPoint(dataPoint: BLSDataPoint): ParsedBLSDataPoint {
  const date = parseBLSPeriod(dataPoint.year, dataPoint.period);
  const value = parseFloat(dataPoint.value);

  if (isNaN(value)) {
    throw new Error(`Invalid BLS value: ${dataPoint.value}`);
  }

  return {
    date,
    value,
    period: dataPoint.period,
    year: dataPoint.year,
    footnotes: dataPoint.footnotes
      ?.map((f) => f.text)
      .filter(Boolean)
      .join('; '),
  };
}

/**
 * Parse all data points from BLS series
 */
export function parseBLSSeries(series: BLSSeries): ParsedBLSDataPoint[] {
  return series.data
    .map((dataPoint) => {
      try {
        return parseBLSDataPoint(dataPoint);
      } catch (error) {
        console.error(`Failed to parse BLS data point:`, dataPoint, error);
        return null;
      }
    })
    .filter((dp): dp is ParsedBLSDataPoint => dp !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort chronologically
}

/**
 * Map BLS series to IndexValue records (for database insertion)
 */
export interface IndexValueRecord {
  effectiveDate: Date;
  value: number;
  metadata?: Record<string, any>;
}

export function mapBLSSeriesToIndexValues(
  series: BLSSeries,
  indexSeriesId: string
): IndexValueRecord[] {
  const parsedData = parseBLSSeries(series);

  return parsedData.map((dataPoint) => ({
    effectiveDate: dataPoint.date,
    value: dataPoint.value,
    metadata: {
      source: 'BLS',
      seriesId: series.seriesID,
      period: dataPoint.period,
      year: dataPoint.year,
      ...(dataPoint.footnotes && { footnotes: dataPoint.footnotes }),
      ...(series.catalog && {
        seriesTitle: series.catalog.series_title,
        surveyName: series.catalog.survey_name,
        seasonallyAdjusted: series.catalog.seasonally_adjusted,
      }),
    },
  }));
}

/**
 * Get latest value from BLS series
 */
export function getLatestBLSValue(series: BLSSeries): ParsedBLSDataPoint | null {
  const parsedData = parseBLSSeries(series);
  if (parsedData.length === 0) return null;

  // Data is sorted chronologically, so last item is latest
  return parsedData[parsedData.length - 1];
}

/**
 * Get value for specific date (or closest earlier date)
 */
export function getBLSValueForDate(
  series: BLSSeries,
  targetDate: Date
): ParsedBLSDataPoint | null {
  const parsedData = parseBLSSeries(series);
  if (parsedData.length === 0) return null;

  // Find the latest value on or before the target date
  let closestValue: ParsedBLSDataPoint | null = null;

  for (const dataPoint of parsedData) {
    if (dataPoint.date <= targetDate) {
      closestValue = dataPoint;
    } else {
      break; // Data is sorted, so we can stop
    }
  }

  return closestValue;
}

/**
 * Extract metadata from BLS series catalog
 */
export interface BLSSeriesMetadata {
  title: string;
  surveyName: string;
  surveyAbbreviation: string;
  seasonallyAdjusted: boolean;
  area?: string;
  itemName?: string;
  measureDataType?: string;
}

export function extractBLSMetadata(series: BLSSeries): BLSSeriesMetadata | null {
  if (!series.catalog) return null;

  return {
    title: series.catalog.series_title,
    surveyName: series.catalog.survey_name,
    surveyAbbreviation: series.catalog.survey_abbreviation,
    seasonallyAdjusted: series.catalog.seasonally_adjusted === 'true' || series.catalog.seasonally_adjusted === 'True',
    area: series.catalog.area,
    itemName: series.catalog.item_name,
    measureDataType: series.catalog.measure_data_type,
  };
}

/**
 * Calculate period-over-period change
 */
export function calculateBLSChange(
  currentValue: number,
  previousValue: number
): {
  absoluteChange: number;
  percentChange: number;
} {
  const absoluteChange = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? (absoluteChange / previousValue) * 100 : 0;

  return {
    absoluteChange,
    percentChange,
  };
}

/**
 * Calculate year-over-year change
 */
export function calculateYoYChange(series: BLSSeries, currentDate: Date): {
  absoluteChange: number;
  percentChange: number;
} | null {
  const currentValue = getBLSValueForDate(series, currentDate);
  if (!currentValue) return null;

  // Get value from one year earlier
  const yearAgoDate = new Date(currentDate);
  yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
  const yearAgoValue = getBLSValueForDate(series, yearAgoDate);

  if (!yearAgoValue) return null;

  return calculateBLSChange(currentValue.value, yearAgoValue.value);
}
