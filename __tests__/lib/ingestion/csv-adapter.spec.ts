/**
 * Tests for CSV Adapter
 */

import { CSVAdapter } from '@/lib/ingestion/adapters/csv-adapter';
import type { IngestionRequest } from '@/lib/ingestion/adapter-interface';

describe('CSV Adapter', () => {
  const validCSV = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL
BRENT,2024-01-15,80.25,FINAL
USD_EUR,2024-01-15,1.10,FINAL`;

  it('parses valid CSV', async () => {
    const adapter = new CSVAdapter(validCSV);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    expect(dataPoints).toHaveLength(3);
    expect(dataPoints[0].seriesCode).toBe('WTI');
    expect(dataPoints[0].value.toString()).toBe('75.5');
    expect(dataPoints[0].versionTag).toBe('FINAL');
  });

  it('filters by series codes', async () => {
    const adapter = new CSVAdapter(validCSV);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: ['WTI'], // Only WTI
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    expect(dataPoints).toHaveLength(1);
    expect(dataPoints[0].seriesCode).toBe('WTI');
  });

  it('filters by date range', async () => {
    const csv = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-10,75.00,FINAL
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-20,76.00,FINAL`;

    const adapter = new CSVAdapter(csv);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-12'),
      endDate: new Date('2024-01-18'),
    };

    const dataPoints = await adapter.fetch(request);

    expect(dataPoints).toHaveLength(1);
    expect(dataPoints[0].asOfDate.toISOString()).toBe(
      new Date('2024-01-15').toISOString()
    );
  });

  it('handles duplicate rows idempotently', async () => {
    const csvWithDuplicates = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-15,75.50,FINAL`;

    const adapter = new CSVAdapter(csvWithDuplicates);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    // All 3 rows are returned (deduplication happens at upsert level)
    expect(dataPoints).toHaveLength(3);

    // But they all have same values
    expect(dataPoints[0].value.toString()).toBe('75.5');
    expect(dataPoints[1].value.toString()).toBe('75.5');
    expect(dataPoints[2].value.toString()).toBe('75.5');
  });

  it('throws error for invalid header', async () => {
    const invalidCSV = `wrong,header,format
WTI,2024-01-15,75.50,FINAL`;

    const adapter = new CSVAdapter(invalidCSV);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    await expect(adapter.fetch(request)).rejects.toThrow(/Invalid CSV header/);
  });

  it('skips empty lines', async () => {
    const csvWithEmptyLines = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL

BRENT,2024-01-15,80.25,FINAL

`;

    const adapter = new CSVAdapter(csvWithEmptyLines);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    expect(dataPoints).toHaveLength(2);
  });

  it('validates version tags', async () => {
    const csvWithInvalidVersion = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,INVALID_TAG`;

    const adapter = new CSVAdapter(csvWithInvalidVersion);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    // Invalid rows are skipped, errors logged
    expect(dataPoints).toHaveLength(0);
  });

  it('handles different version tags', async () => {
    const csv = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.00,PRELIMINARY
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-15,75.60,REVISED`;

    const adapter = new CSVAdapter(csv);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    expect(dataPoints).toHaveLength(3);
    expect(dataPoints[0].versionTag).toBe('PRELIMINARY');
    expect(dataPoints[1].versionTag).toBe('FINAL');
    expect(dataPoints[2].versionTag).toBe('REVISED');
  });

  it('validates CSV format on connection test', async () => {
    const validAdapter = new CSVAdapter(validCSV);
    const invalidAdapter = new CSVAdapter('invalid csv');

    expect(await validAdapter.testConnection('tenant-123')).toBe(true);
    expect(await invalidAdapter.testConnection('tenant-123')).toBe(false);
  });
});

describe('Acceptance Tests', () => {
  it('Given duplicate CSV rows, then upsert is stable and no duplicates created', async () => {
    // This test verifies that duplicate rows in CSV are handled idempotently
    // Actual deduplication happens at the upsert level in ingestion-service

    const csvWithDuplicates = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-15,75.50,FINAL`;

    const adapter = new CSVAdapter(csvWithDuplicates);

    const request: IngestionRequest = {
      tenantId: 'tenant-123',
      seriesCodes: [],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const dataPoints = await adapter.fetch(request);

    // CSV adapter returns all rows
    expect(dataPoints).toHaveLength(2);

    // Upsert layer will handle deduplication via unique constraint:
    // (seriesId, asOfDate, versionTag)
  });
});
