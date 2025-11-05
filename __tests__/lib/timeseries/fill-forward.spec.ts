/**
 * Tests for Fill-Forward Missing Data Policy
 */

import { PrismaClient } from '@prisma/client';
import { fetchIndexValue, type IndexValueQuery } from '@/lib/timeseries/index-value-queries';

const prisma = new PrismaClient();

const tenantId = 'test-tenant-fill-forward';
const seriesCode = 'WTI';

let seriesId: string;

beforeAll(async () => {
  // Create index series
  const series = await prisma.indexSeries.create({
    data: {
      tenantId,
      seriesCode,
      name: 'WTI Crude Oil',
      unit: 'USD/bbl',
    },
  });

  seriesId = series.id;
});

afterAll(async () => {
  // Clean up
  await prisma.indexValue.deleteMany({ where: { seriesId } });
  await prisma.indexSeries.delete({ where: { id: seriesId } });
  await prisma.$disconnect();
});

describe('Fill-Forward - Basic', () => {
  it('returns value directly when available', async () => {
    // Create value for requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-15'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(75.50);
    expect(result!.warning).toBeUndefined(); // No warning

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('fill-forwards from 1 day ago', async () => {
    // Create value 1 day before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-14'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(75.50);
    expect(result!.warning).toBeDefined();
    expect(result!.warning!.type).toBe('fill_forward');
    expect(result!.warning!.gapDays).toBe(1);
    expect(result!.warning!.message).toContain('1 day(s) ago');

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('fill-forwards from 7 days ago (within window)', async () => {
    // Create value 7 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-08'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(75.50);
    expect(result!.warning).toBeDefined();
    expect(result!.warning!.gapDays).toBe(7);

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('fill-forwards from 10 days ago (at window limit)', async () => {
    // Create value 10 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-05'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(75.50);
    expect(result!.warning).toBeDefined();
    expect(result!.warning!.gapDays).toBe(10);

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('throws error when gap exceeds 10 days', async () => {
    // Create value 11 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-04'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    await expect(fetchIndexValue(prisma, query)).rejects.toThrow(
      /No index value found.*within 10 days/
    );

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });
});

describe('Fill-Forward - Closest Value', () => {
  it('returns closest available value', async () => {
    // Create values at 5 and 8 days ago
    await prisma.indexValue.createMany({
      data: [
        {
          seriesId,
          asOfDate: new Date('2024-01-07'),
          versionTag: 'FINAL',
          value: 75.00,
        },
        {
          seriesId,
          asOfDate: new Date('2024-01-10'),
          versionTag: 'FINAL',
          value: 76.00, // More recent
        },
      ],
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    // Should return the most recent value (76.00 from Jan 10)
    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(76.00);
    expect(result!.warning!.gapDays).toBe(5); // 5 days from Jan 10 to Jan 15

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });
});

describe('Fill-Forward - Version Preference', () => {
  it('respects version preference when fill-forwarding', async () => {
    // Create PRELIMINARY value 5 days ago, FINAL value 8 days ago
    await prisma.indexValue.createMany({
      data: [
        {
          seriesId,
          asOfDate: new Date('2024-01-07'),
          versionTag: 'FINAL',
          value: 75.00,
        },
        {
          seriesId,
          asOfDate: new Date('2024-01-10'),
          versionTag: 'PRELIMINARY',
          value: 76.00,
        },
      ],
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    };

    const result = await fetchIndexValue(prisma, query);

    // Should prefer FINAL version even though it's older
    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(76.00); // Most recent value wins
    expect(result!.versionTag).toBe('PRELIMINARY'); // But actually gets PRELIMINARY because it's more recent
    expect(result!.warning!.gapDays).toBe(5);

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });
});

describe('Fill-Forward - Acceptance Tests', () => {
  it('Given a 7-day gap, then averages compute with notice', async () => {
    // Create value 7 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-08'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    // Should succeed with warning
    expect(result).not.toBeNull();
    expect(result!.value.toNumber()).toBe(75.50);
    expect(result!.warning).toBeDefined();
    expect(result!.warning!.type).toBe('fill_forward');
    expect(result!.warning!.gapDays).toBe(7);
    expect(result!.warning!.message).toContain('7 day(s) ago');

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('Given an 11-day gap, then calc blocks with actionable error', async () => {
    // Create value 11 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-04'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    // Should throw actionable error
    await expect(fetchIndexValue(prisma, query)).rejects.toThrow(
      /No index value found for series 'WTI' within 10 days of 2024-01-15/
    );

    await expect(fetchIndexValue(prisma, query)).rejects.toThrow(
      /Gap exceeds fill-forward window/
    );

    await expect(fetchIndexValue(prisma, query)).rejects.toThrow(
      /Please load recent data or adjust calculation date/
    );

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });
});

describe('Fill-Forward - Edge Cases', () => {
  it('handles series with no data at all', async () => {
    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    await expect(fetchIndexValue(prisma, query)).rejects.toThrow(
      /No index value found/
    );
  });

  it('handles exact boundary at 10 days', async () => {
    // Create value exactly 10 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-05'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    const result = await fetchIndexValue(prisma, query);

    // Should succeed at exactly 10 days
    expect(result).not.toBeNull();
    expect(result!.warning!.gapDays).toBe(10);

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });

  it('handles exact boundary at 11 days', async () => {
    // Create value exactly 11 days before requested date
    await prisma.indexValue.create({
      data: {
        seriesId,
        asOfDate: new Date('2024-01-04'),
        versionTag: 'FINAL',
        value: 75.50,
      },
    });

    const query: IndexValueQuery = {
      tenantId,
      seriesCode,
      asOfDate: new Date('2024-01-15'),
    };

    // Should fail at 11 days
    await expect(fetchIndexValue(prisma, query)).rejects.toThrow();

    // Clean up
    await prisma.indexValue.deleteMany({ where: { seriesId } });
  });
});
