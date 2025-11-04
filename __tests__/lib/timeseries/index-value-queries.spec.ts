/**
 * Tests for IndexValue Query Helpers
 *
 * Validates:
 * - Version preference logic (FINAL → REVISED → PRELIMINARY)
 * - Lag day support
 * - Range queries
 * - Time-based operations (avg_3m, avg_6m, avg_12m, min, max)
 * - Upsert logic
 * - Batch operations
 */

import { PrismaClient } from '@prisma/client';
import {
  fetchIndexValue,
  fetchIndexValueRange,
  upsertIndexValue,
  batchUpsertIndexValues,
  validateSeriesExists,
  getSeriesMetadata,
} from '@/lib/timeseries/index-value-queries';
import { D } from '@/lib/math/decimal';

const prisma = new PrismaClient();

// Test tenant and series
const TEST_TENANT_ID = 'test-tenant-timeseries';
const TEST_SERIES_CODE = 'TEST_BRENT';
let testSeriesId: string;
let testTeamId: string;

// ============================================================================
// Setup and Teardown
// ============================================================================

beforeAll(async () => {
  // Create test team
  const team = await prisma.team.create({
    data: {
      id: TEST_TENANT_ID,
      name: 'Test Tenant Timeseries',
      slug: 'test-tenant-timeseries',
    },
  });
  testTeamId = team.id;

  // Create test series
  const series = await prisma.indexSeries.create({
    data: {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      name: 'Test Brent Crude',
      provider: 'TEST',
      dataType: 'INDEX',
      unit: 'USD/bbl',
      frequency: 'DAILY',
    },
  });
  testSeriesId = series.id;
});

afterAll(async () => {
  // Clean up test data
  await prisma.indexValue.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.indexSeries.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.team.delete({ where: { id: testTeamId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clear index values before each test
  await prisma.indexValue.deleteMany({ where: { seriesId: testSeriesId } });
});

// ============================================================================
// Version Preference Tests
// ============================================================================

describe('fetchIndexValue - Version Preference', () => {
  it('should prefer FINAL when versionPreference is FINAL', async () => {
    const asOfDate = new Date('2024-01-15');

    // Create PRELIMINARY, FINAL, and REVISED versions
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '100.00',
          versionTag: 'PRELIMINARY',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '105.50',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '106.00',
          versionTag: 'REVISED',
        },
      ],
    });

    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate,
      versionPreference: 'FINAL',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(105.5);
    expect(result!.versionTag).toBe('FINAL');
  });

  it('should fall back to REVISED if FINAL not available', async () => {
    const asOfDate = new Date('2024-01-15');

    // Create only PRELIMINARY and REVISED
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '100.00',
          versionTag: 'PRELIMINARY',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '106.00',
          versionTag: 'REVISED',
        },
      ],
    });

    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate,
      versionPreference: 'FINAL',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(106);
    expect(result!.versionTag).toBe('REVISED');
  });

  it('should fall back to PRELIMINARY if neither FINAL nor REVISED available', async () => {
    const asOfDate = new Date('2024-01-15');

    // Create only PRELIMINARY
    await prisma.indexValue.create({
      data: {
        tenantId: testTeamId,
        seriesId: testSeriesId,
        asOfDate,
        value: '100.00',
        versionTag: 'PRELIMINARY',
      },
    });

    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate,
      versionPreference: 'FINAL',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(100);
    expect(result!.versionTag).toBe('PRELIMINARY');
  });

  it('should return null if no version available', async () => {
    const asOfDate = new Date('2024-01-15');

    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate,
      versionPreference: 'FINAL',
    });

    expect(result).toBeNull();
  });

  it('should prefer REVISED when versionPreference is REVISED', async () => {
    const asOfDate = new Date('2024-01-15');

    // Create all versions
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '100.00',
          versionTag: 'PRELIMINARY',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '105.50',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate,
          value: '106.00',
          versionTag: 'REVISED',
        },
      ],
    });

    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate,
      versionPreference: 'REVISED',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(106);
    expect(result!.versionTag).toBe('REVISED');
  });
});

// ============================================================================
// Lag Day Tests
// ============================================================================

describe('fetchIndexValue - Lag Days', () => {
  it('should apply lag days correctly', async () => {
    // Create values for multiple dates
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-10'),
          value: '95.00',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-15'),
          value: '100.00',
          versionTag: 'FINAL',
        },
      ],
    });

    // Query for 2024-01-15 with 5 day lag (should get 2024-01-10 value)
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      lagDays: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(95);
    expect(result!.effectiveDate).toEqual(new Date('2024-01-10'));
  });

  it('should return null if lagged date has no value', async () => {
    await prisma.indexValue.create({
      data: {
        tenantId: testTeamId,
        seriesId: testSeriesId,
        asOfDate: new Date('2024-01-15'),
        value: '100.00',
        versionTag: 'FINAL',
      },
    });

    // Query with 10 day lag (no value exists)
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      lagDays: 10,
    });

    expect(result).toBeNull();
  });
});

// ============================================================================
// Range Query Tests
// ============================================================================

describe('fetchIndexValueRange', () => {
  it('should fetch all values in range with correct version preference', async () => {
    // Create multiple values across range
    await prisma.indexValue.createMany({
      data: [
        // 2024-01-10: only PRELIMINARY
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-10'),
          value: '95.00',
          versionTag: 'PRELIMINARY',
        },
        // 2024-01-11: PRELIMINARY and FINAL
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-11'),
          value: '96.00',
          versionTag: 'PRELIMINARY',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-11'),
          value: '96.50',
          versionTag: 'FINAL',
        },
        // 2024-01-12: all three versions
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-12'),
          value: '97.00',
          versionTag: 'PRELIMINARY',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-12'),
          value: '97.50',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-12'),
          value: '98.00',
          versionTag: 'REVISED',
        },
      ],
    });

    const results = await fetchIndexValueRange(
      prisma,
      testTeamId,
      TEST_SERIES_CODE,
      new Date('2024-01-10'),
      new Date('2024-01-12'),
      'FINAL'
    );

    expect(results).toHaveLength(3);
    expect(results[0].value.toNumber()).toBe(95); // PRELIMINARY (fallback)
    expect(results[1].value.toNumber()).toBe(96.5); // FINAL
    expect(results[2].value.toNumber()).toBe(97.5); // FINAL (REVISED available but FINAL preferred)
  });

  it('should return empty array if no values in range', async () => {
    const results = await fetchIndexValueRange(
      prisma,
      testTeamId,
      TEST_SERIES_CODE,
      new Date('2024-01-10'),
      new Date('2024-01-15'),
      'FINAL'
    );

    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// Time-Based Operation Tests
// ============================================================================

describe('fetchIndexValue - Time Operations', () => {
  beforeEach(async () => {
    // Create daily values for 12 months
    const values = [];
    const startDate = new Date('2023-01-15');

    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      values.push({
        tenantId: testTeamId,
        seriesId: testSeriesId,
        asOfDate: date,
        value: (100 + i * 0.1).toFixed(2),
        versionTag: 'FINAL' as const,
      });
    }

    await prisma.indexValue.createMany({ data: values });
  });

  it('should compute 3-month average', async () => {
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      operation: 'avg_3m',
    });

    expect(result).not.toBeNull();
    // Should average values from 2023-10-15 to 2024-01-15 (3 months)
    expect(result!.value.toNumber()).toBeGreaterThan(130);
    expect(result!.value.toNumber()).toBeLessThan(140);
  });

  it('should compute 6-month average', async () => {
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      operation: 'avg_6m',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBeGreaterThan(120);
    expect(result!.value.toNumber()).toBeLessThan(140);
  });

  it('should compute 12-month average', async () => {
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      operation: 'avg_12m',
    });

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBeGreaterThan(110);
    expect(result!.value.toNumber()).toBeLessThan(140);
  });

  it('should compute min over period', async () => {
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      operation: 'min',
    });

    expect(result).not.toBeNull();
    // Min should be first value in range
    expect(result!.value.toNumber()).toBeCloseTo(100, 1);
  });

  it('should compute max over period', async () => {
    const result = await fetchIndexValue(prisma, {
      tenantId: testTeamId,
      seriesCode: TEST_SERIES_CODE,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
      operation: 'max',
    });

    expect(result).not.toBeNull();
    // Max should be last value (day 365)
    expect(result!.value.toNumber()).toBeCloseTo(136.4, 1);
  });
});

// ============================================================================
// Upsert Tests
// ============================================================================

describe('upsertIndexValue', () => {
  it('should insert new value', async () => {
    const asOfDate = new Date('2024-01-15');

    await upsertIndexValue(
      prisma,
      testTeamId,
      TEST_SERIES_CODE,
      asOfDate,
      '100.50',
      'FINAL'
    );

    const value = await prisma.indexValue.findUnique({
      where: {
        seriesId_asOfDate_versionTag: {
          seriesId: testSeriesId,
          asOfDate,
          versionTag: 'FINAL',
        },
      },
    });

    expect(value).not.toBeNull();
    expect(value!.value.toString()).toBe('100.5');
  });

  it('should update existing value', async () => {
    const asOfDate = new Date('2024-01-15');

    // Insert initial value
    await prisma.indexValue.create({
      data: {
        tenantId: testTeamId,
        seriesId: testSeriesId,
        asOfDate,
        value: '100.00',
        versionTag: 'PRELIMINARY',
      },
    });

    // Upsert with new value
    await upsertIndexValue(
      prisma,
      testTeamId,
      TEST_SERIES_CODE,
      asOfDate,
      '105.50',
      'PRELIMINARY'
    );

    const value = await prisma.indexValue.findUnique({
      where: {
        seriesId_asOfDate_versionTag: {
          seriesId: testSeriesId,
          asOfDate,
          versionTag: 'PRELIMINARY',
        },
      },
    });

    expect(value).not.toBeNull();
    expect(value!.value.toString()).toBe('105.5');
  });

  it('should throw error for non-existent series', async () => {
    await expect(
      upsertIndexValue(
        prisma,
        testTeamId,
        'NON_EXISTENT',
        new Date('2024-01-15'),
        '100.00',
        'FINAL'
      )
    ).rejects.toThrow('Series not found');
  });
});

// ============================================================================
// Batch Upsert Tests
// ============================================================================

describe('batchUpsertIndexValues', () => {
  it('should insert multiple values in batch', async () => {
    const count = await batchUpsertIndexValues(prisma, testTeamId, TEST_SERIES_CODE, [
      { asOfDate: new Date('2024-01-10'), value: '95.00', versionTag: 'FINAL' },
      { asOfDate: new Date('2024-01-11'), value: '96.00', versionTag: 'FINAL' },
      { asOfDate: new Date('2024-01-12'), value: '97.00', versionTag: 'FINAL' },
    ]);

    expect(count).toBe(3);

    const values = await prisma.indexValue.findMany({
      where: { seriesId: testSeriesId },
      orderBy: { asOfDate: 'asc' },
    });

    expect(values).toHaveLength(3);
    expect(values[0].value.toString()).toBe('95');
    expect(values[1].value.toString()).toBe('96');
    expect(values[2].value.toString()).toBe('97');
  });

  it('should update existing values in batch', async () => {
    // Insert initial values
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-10'),
          value: '90.00',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-11'),
          value: '91.00',
          versionTag: 'FINAL',
        },
      ],
    });

    // Batch upsert with new values
    const count = await batchUpsertIndexValues(prisma, testTeamId, TEST_SERIES_CODE, [
      { asOfDate: new Date('2024-01-10'), value: '95.00', versionTag: 'FINAL' },
      { asOfDate: new Date('2024-01-11'), value: '96.00', versionTag: 'FINAL' },
    ]);

    expect(count).toBe(2);

    const values = await prisma.indexValue.findMany({
      where: { seriesId: testSeriesId },
      orderBy: { asOfDate: 'asc' },
    });

    expect(values).toHaveLength(2);
    expect(values[0].value.toString()).toBe('95');
    expect(values[1].value.toString()).toBe('96');
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateSeriesExists', () => {
  it('should return true for existing series', async () => {
    const exists = await validateSeriesExists(prisma, testTeamId, TEST_SERIES_CODE);
    expect(exists).toBe(true);
  });

  it('should return false for non-existent series', async () => {
    const exists = await validateSeriesExists(prisma, testTeamId, 'NON_EXISTENT');
    expect(exists).toBe(false);
  });
});

// ============================================================================
// Metadata Tests
// ============================================================================

describe('getSeriesMetadata', () => {
  it('should return series metadata with date range', async () => {
    // Add some values
    await prisma.indexValue.createMany({
      data: [
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-10'),
          value: '95.00',
          versionTag: 'FINAL',
        },
        {
          tenantId: testTeamId,
          seriesId: testSeriesId,
          asOfDate: new Date('2024-01-15'),
          value: '100.00',
          versionTag: 'FINAL',
        },
      ],
    });

    const metadata = await getSeriesMetadata(prisma, testTeamId, TEST_SERIES_CODE);

    expect(metadata.seriesCode).toBe(TEST_SERIES_CODE);
    expect(metadata.name).toBe('Test Brent Crude');
    expect(metadata.provider).toBe('TEST');
    expect(metadata.dataType).toBe('INDEX');
    expect(metadata.unit).toBe('USD/bbl');
    expect(metadata.valueCount).toBe(2);
    expect(metadata.firstDate).toEqual(new Date('2024-01-10'));
    expect(metadata.lastDate).toEqual(new Date('2024-01-15'));
  });

  it('should throw error for non-existent series', async () => {
    await expect(
      getSeriesMetadata(prisma, testTeamId, 'NON_EXISTENT')
    ).rejects.toThrow('Series not found');
  });
});
