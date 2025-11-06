/**
 * CSV Ingestion Adapter
 *
 * Parses CSV files and normalizes to DataPoint[]
 */

import type {
  IngestionAdapter,
  IngestionRequest,
  DataPoint,
} from '../adapter-interface';
import { createDataPoint } from '../adapter-interface';
import type { VersionTag } from '@prisma/client';
import Decimal from 'decimal.js';

// ============================================================================
// CSV Format
// ============================================================================

/**
 * Expected CSV format:
 *
 * seriesCode,asOfDate,value,versionTag
 * WTI,2024-01-15,75.50,FINAL
 * BRENT,2024-01-15,80.25,FINAL
 * USD_EUR,2024-01-15,1.10,FINAL
 */

export interface CSVRow {
  seriesCode: string;
  asOfDate: string; // ISO date string
  value: string; // Numeric string
  versionTag: string; // PRELIMINARY | FINAL | REVISED
}

// ============================================================================
// CSV Adapter
// ============================================================================

export class CSVAdapter implements IngestionAdapter {
  readonly name = 'CSV';

  private csvData: string;

  constructor(csvData: string) {
    this.csvData = csvData;
  }

  /**
   * Parses CSV and returns data points
   */
  async fetch(request: IngestionRequest): Promise<DataPoint[]> {
    const lines = this.csvData.trim().split('\n');

    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }

    // Parse header
    const header = lines[0].trim().split(',');
    const expectedHeaders = ['seriesCode', 'asOfDate', 'value', 'versionTag'];

    if (!this.validateHeader(header, expectedHeaders)) {
      throw new Error(
        `Invalid CSV header. Expected: ${expectedHeaders.join(',')}. Got: ${header.join(',')}`
      );
    }

    // Parse rows
    const dataPoints: DataPoint[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        continue; // Skip empty lines
      }

      try {
        const row = this.parseRow(line, header);
        const dataPoint = this.rowToDataPoint(row);

        // Filter by request parameters
        if (this.shouldInclude(dataPoint, request)) {
          dataPoints.push(dataPoint);
        }
      } catch (error: any) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn('CSV parsing errors:', errors);
    }

    return dataPoints;
  }

  /**
   * Validates CSV header
   */
  private validateHeader(header: string[], expected: string[]): boolean {
    if (header.length !== expected.length) {
      return false;
    }

    for (let i = 0; i < expected.length; i++) {
      if (header[i].trim() !== expected[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parses a CSV row
   */
  private parseRow(line: string, header: string[]): CSVRow {
    const values = line.split(',').map((v) => v.trim());

    if (values.length !== header.length) {
      throw new Error(`Expected ${header.length} columns, got ${values.length}`);
    }

    return {
      seriesCode: values[0],
      asOfDate: values[1],
      value: values[2],
      versionTag: values[3],
    };
  }

  /**
   * Converts CSV row to DataPoint
   */
  private rowToDataPoint(row: CSVRow): DataPoint {
    // Validate series code
    if (!row.seriesCode) {
      throw new Error('seriesCode is required');
    }

    // Parse date
    const asOfDate = new Date(row.asOfDate);
    if (isNaN(asOfDate.getTime())) {
      throw new Error(`Invalid date: ${row.asOfDate}`);
    }

    // Parse value
    let value: Decimal;
    try {
      value = new Decimal(row.value);
    } catch (error) {
      throw new Error(`Invalid value: ${row.value}`);
    }

    // Validate version tag
    const versionTag = row.versionTag.toUpperCase();
    if (!['PRELIMINARY', 'FINAL', 'REVISED'].includes(versionTag)) {
      throw new Error(
        `Invalid versionTag: ${row.versionTag}. Must be PRELIMINARY, FINAL, or REVISED`
      );
    }

    return createDataPoint(
      row.seriesCode,
      asOfDate,
      value,
      versionTag as VersionTag
    );
  }

  /**
   * Checks if data point should be included based on request filters
   */
  private shouldInclude(dataPoint: DataPoint, request: IngestionRequest): boolean {
    // Filter by series codes
    if (
      request.seriesCodes.length > 0 &&
      !request.seriesCodes.includes(dataPoint.seriesCode)
    ) {
      return false;
    }

    // Filter by date range
    const asOfTime = dataPoint.asOfDate.getTime();
    const startTime = request.startDate.getTime();
    const endTime = request.endDate.getTime();

    if (asOfTime < startTime || asOfTime > endTime) {
      return false;
    }

    return true;
  }

  /**
   * Validates CSV format
   */
  async validate(tenantId: string): Promise<boolean> {
    // CSV adapter doesn't need credentials
    return true;
  }

  /**
   * Tests CSV parsing
   */
  async testConnection(tenantId: string): Promise<boolean> {
    try {
      const lines = this.csvData.trim().split('\n');

      if (lines.length === 0) {
        return false;
      }

      const header = lines[0].trim().split(',');
      const expectedHeaders = ['seriesCode', 'asOfDate', 'value', 'versionTag'];

      return this.validateHeader(header, expectedHeaders);
    } catch (error) {
      return false;
    }
  }
}
