# Timeseries API Documentation

This document describes the IndexValue query API for versioned timeseries data storage and retrieval.

## Table of Contents

- [Overview](#overview)
- [Version Preference](#version-preference)
- [Query Functions](#query-functions)
- [Upsert Operations](#upsert-operations)
- [Time-Based Operations](#time-based-operations)
- [Examples](#examples)
- [Performance Considerations](#performance-considerations)

## Overview

The timeseries API provides:

- **Versioned data storage**: PRELIMINARY → FINAL → REVISED
- **Lag day support**: Query historical data with N-day lag
- **Time-based operations**: avg_3m, avg_6m, avg_12m, min, max
- **Optimized range queries**: Fetch multiple values efficiently
- **Batch upsert**: Bulk insert/update for performance

## Version Preference

IndexValue data supports three version tags:

1. **PRELIMINARY**: Initial/preliminary data from provider
2. **FINAL**: Finalized/official data
3. **REVISED**: Corrected/revised data (after final)

### Version Preference Order

When querying with `versionPreference`, the API uses this fallback order:

| Preference | Order |
|-----------|-------|
| `FINAL` | FINAL → REVISED → PRELIMINARY |
| `REVISED` | REVISED → FINAL → PRELIMINARY |
| `PRELIMINARY` | PRELIMINARY → FINAL → REVISED |

**Example**: If you request `FINAL` but only `PRELIMINARY` exists, it returns `PRELIMINARY`.

## Query Functions

### fetchIndexValue

Fetches a single index value with version preference and optional lag.

```typescript
import { fetchIndexValue } from '@/lib/timeseries/index-value-queries';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const result = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  lagDays: 0,
  operation: 'value',
});

if (result) {
  console.log(result.value.toNumber()); // Decimal value
  console.log(result.versionTag);        // FINAL, REVISED, or PRELIMINARY
  console.log(result.effectiveDate);     // Date with lag applied
}
```

**Parameters:**
- `prisma`: PrismaClient instance
- `query.tenantId`: Tenant ID
- `query.seriesCode`: Series code (e.g., 'PLATTS_BRENT')
- `query.asOfDate`: Reference date
- `query.versionPreference`: Version preference (default: 'FINAL')
- `query.lagDays`: Lag in days (default: 0)
- `query.operation`: Time operation (default: 'value')

**Returns:**
- `IndexValueResult | null`: Result with decimal value, version tag, effective date

### fetchIndexValueRange

Fetches multiple values in a date range.

```typescript
const results = await fetchIndexValueRange(
  prisma,
  'tenant-123',
  'PLATTS_BRENT',
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  'FINAL'
);

results.forEach((result) => {
  console.log(result.asOfDate, result.value.toNumber(), result.versionTag);
});
```

**Parameters:**
- `prisma`: PrismaClient instance
- `tenantId`: Tenant ID
- `seriesCode`: Series code
- `startDate`: Start date (inclusive)
- `endDate`: End date (inclusive)
- `versionPreference`: Version preference (default: 'FINAL')

**Returns:**
- `RangeQueryResult[]`: Array of results sorted by date

### validate SeriesExists

Checks if a series exists.

```typescript
const exists = await validateSeriesExists(prisma, 'tenant-123', 'PLATTS_BRENT');

if (!exists) {
  throw new Error('Series not found');
}
```

### getSeriesMetadata

Gets series metadata including value count and date range.

```typescript
const metadata = await getSeriesMetadata(prisma, 'tenant-123', 'PLATTS_BRENT');

console.log(metadata);
// {
//   id: 'series-uuid',
//   seriesCode: 'PLATTS_BRENT',
//   name: 'Platts Brent Crude',
//   provider: 'PLATTS',
//   dataType: 'INDEX',
//   unit: 'USD/bbl',
//   frequency: 'DAILY',
//   valueCount: 1250,
//   firstDate: Date('2020-01-01'),
//   lastDate: Date('2024-01-15'),
//   createdAt: Date,
//   updatedAt: Date
// }
```

## Upsert Operations

### upsertIndexValue

Inserts or updates a single value.

```typescript
await upsertIndexValue(
  prisma,
  'tenant-123',
  'PLATTS_BRENT',
  new Date('2024-01-15'),
  '85.50',
  'FINAL',
  new Date('2024-01-15T08:00:00Z') // Optional provider timestamp
);
```

**Parameters:**
- `prisma`: PrismaClient instance
- `tenantId`: Tenant ID
- `seriesCode`: Series code
- `asOfDate`: As-of date
- `value`: Value (number or string)
- `versionTag`: Version tag
- `providerTimestamp`: Optional provider timestamp

### batchUpsertIndexValues

Bulk insert/update for performance.

```typescript
const count = await batchUpsertIndexValues(
  prisma,
  'tenant-123',
  'PLATTS_BRENT',
  [
    { asOfDate: new Date('2024-01-10'), value: '84.00', versionTag: 'FINAL' },
    { asOfDate: new Date('2024-01-11'), value: '84.50', versionTag: 'FINAL' },
    { asOfDate: new Date('2024-01-12'), value: '85.00', versionTag: 'FINAL' },
  ]
);

console.log(`Upserted ${count} values`);
```

**Best Practice**: Use batch upsert for ingesting data from providers (hundreds to thousands of values at once).

## Time-Based Operations

Compute operations over time periods:

| Operation | Description | Lookback Period |
|-----------|-------------|----------------|
| `value` | Single value at as-of date | None |
| `avg_3m` | 3-month average | 3 months |
| `avg_6m` | 6-month average | 6 months |
| `avg_12m` | 12-month average | 12 months |
| `min` | Minimum over 12 months | 12 months |
| `max` | Maximum over 12 months | 12 months |

### Example: 3-Month Average

```typescript
const result = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  operation: 'avg_3m',
});

// Returns average of all values from 2023-10-15 to 2024-01-15
console.log(result!.value.toNumber());
```

### Example: 6-Month Min/Max

```typescript
// Minimum over 6 months
const minResult = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  operation: 'min',
});

// Maximum over 12 months
const maxResult = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  operation: 'max',
});

console.log(`Range: ${minResult!.value.toNumber()} - ${maxResult!.value.toNumber()}`);
```

## Examples

### Example 1: Basic Value Lookup

```typescript
import { PrismaClient } from '@prisma/client';
import { fetchIndexValue } from '@/lib/timeseries/index-value-queries';

const prisma = new PrismaClient();

// Fetch Brent crude price for 2024-01-15
const result = await fetchIndexValue(prisma, {
  tenantId: 'acme-corp',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
});

if (result) {
  console.log(`Brent: $${result.value.toNumber()}/bbl on ${result.effectiveDate}`);
  console.log(`Version: ${result.versionTag}`);
} else {
  console.log('No value found');
}

await prisma.$disconnect();
```

### Example 2: Lagged Value

```typescript
// Get Brent price from 30 days ago
const laggedResult = await fetchIndexValue(prisma, {
  tenantId: 'acme-corp',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  lagDays: 30, // 30 days lag
});

if (laggedResult) {
  console.log(`Brent 30 days ago: $${laggedResult.value.toNumber()}/bbl`);
  console.log(`Effective date: ${laggedResult.effectiveDate}`); // 2023-12-16
}
```

### Example 3: 3-Month Average

```typescript
// Get 3-month average Brent price
const avgResult = await fetchIndexValue(prisma, {
  tenantId: 'acme-corp',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  operation: 'avg_3m',
});

if (avgResult) {
  console.log(`3-month avg: $${avgResult.value.toNumber()}/bbl`);
}
```

### Example 4: Range Query for Chart

```typescript
import { fetchIndexValueRange } from '@/lib/timeseries/index-value-queries';

// Fetch last 90 days for chart
const endDate = new Date('2024-01-15');
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 90);

const chartData = await fetchIndexValueRange(
  prisma,
  'acme-corp',
  'PLATTS_BRENT',
  startDate,
  endDate,
  'FINAL'
);

// Format for chart library
const series = chartData.map((point) => ({
  x: point.asOfDate,
  y: point.value.toNumber(),
}));

console.log(`Chart has ${series.length} data points`);
```

### Example 5: Daily Ingestion

```typescript
import { batchUpsertIndexValues } from '@/lib/timeseries/index-value-queries';

// Simulate daily data ingestion from provider
async function ingestDailyData(tenantId: string, seriesCode: string, data: any[]) {
  const values = data.map((item) => ({
    asOfDate: new Date(item.date),
    value: item.price.toString(),
    versionTag: item.version as 'PRELIMINARY' | 'FINAL' | 'REVISED',
    providerTimestamp: new Date(item.timestamp),
  }));

  const count = await batchUpsertIndexValues(
    prisma,
    tenantId,
    seriesCode,
    values
  );

  console.log(`Ingested ${count} values for ${seriesCode}`);
}

// Example usage
await ingestDailyData('acme-corp', 'PLATTS_BRENT', [
  { date: '2024-01-10', price: 84.50, version: 'FINAL', timestamp: '2024-01-10T08:00:00Z' },
  { date: '2024-01-11', price: 85.00, version: 'FINAL', timestamp: '2024-01-11T08:00:00Z' },
  { date: '2024-01-12', price: 85.50, version: 'FINAL', timestamp: '2024-01-12T08:00:00Z' },
]);
```

### Example 6: Version Revision Workflow

```typescript
// Day 1: Ingest preliminary data
await upsertIndexValue(
  prisma,
  'acme-corp',
  'PLATTS_BRENT',
  new Date('2024-01-15'),
  '85.00',
  'PRELIMINARY'
);

// Day 2: Provider publishes final data
await upsertIndexValue(
  prisma,
  'acme-corp',
  'PLATTS_BRENT',
  new Date('2024-01-15'),
  '85.25',
  'FINAL'
);

// Day 10: Provider corrects data
await upsertIndexValue(
  prisma,
  'acme-corp',
  'PLATTS_BRENT',
  new Date('2024-01-15'),
  '85.30',
  'REVISED'
);

// Query always gets best available version
const result = await fetchIndexValue(prisma, {
  tenantId: 'acme-corp',
  seriesCode: 'PLATTS_BRENT',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL', // Will get FINAL (85.25), not REVISED
});
```

### Example 7: FX Rate Lookup

```typescript
// Query FX rate for currency conversion
const fxRate = await fetchIndexValue(prisma, {
  tenantId: 'acme-corp',
  seriesCode: 'USD_EUR',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
});

if (fxRate) {
  const usdAmount = 100;
  const eurAmount = usdAmount * fxRate.value.toNumber();
  console.log(`$${usdAmount} = €${eurAmount.toFixed(2)}`);
}
```

## Performance Considerations

### Indexes

The schema includes optimized indexes for:

```sql
-- Composite PK for version lookup
@@unique([seriesId, asOfDate, versionTag])

-- Tenant isolation
@@index([tenantId])

-- Range queries
@@index([seriesId, asOfDate])
@@index([asOfDate])
```

### Query Performance

| Operation | Expected Performance | Notes |
|-----------|---------------------|-------|
| Single value lookup | <5ms | Uses composite PK |
| Range query (90 days) | <50ms | Uses seriesId+asOfDate index |
| Range query (1 year) | <200ms | Efficient with indexes |
| Batch upsert (100 values) | <500ms | Uses transaction |
| Batch upsert (1000 values) | <3s | Consider chunking |

### Best Practices

1. **Use batch upsert for ingestion**: 10-100x faster than individual upserts
2. **Limit range queries**: Query only dates you need (avoid full table scans)
3. **Reuse Prisma client**: Create once, reuse across requests
4. **Cache metadata**: Series metadata changes rarely, cache it
5. **Partition large tables**: Consider TimescaleDB for >10M rows

### Example: Optimized Ingestion

```typescript
// BAD: Individual upserts (slow)
for (const item of data) {
  await upsertIndexValue(prisma, tenantId, seriesCode, item.date, item.value, 'FINAL');
}

// GOOD: Batch upsert (fast)
await batchUpsertIndexValues(prisma, tenantId, seriesCode, data);

// BEST: Chunked batch upsert for very large datasets
const CHUNK_SIZE = 500;
for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  await batchUpsertIndexValues(prisma, tenantId, seriesCode, chunk);
}
```

## Integration with PAM Graphs

Factor nodes in PAM graphs can reference timeseries:

```typescript
import { executeGraph } from '@/lib/pam';

const graph = {
  nodes: [
    {
      id: 'brent',
      type: 'Factor',
      config: {
        series: 'PLATTS_BRENT',
        operation: 'avg_3m', // 3-month average
        lagDays: 30, // 30 days lag
      },
    },
    {
      id: 'premium',
      type: 'Factor',
      config: { value: 10 },
    },
    {
      id: 'add',
      type: 'Combine',
      config: { operation: 'add' },
    },
  ],
  edges: [
    { from: 'brent', to: 'add' },
    { from: 'premium', to: 'add' },
  ],
  output: 'add',
};

const result = await executeGraph(graph, {
  tenantId: 'acme-corp',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  baseCurrency: 'USD',
});

// Result includes Brent 3-month avg (30 days lagged) + $10 premium
console.log(result.value);
```

## Error Handling

```typescript
import { fetchIndexValue } from '@/lib/timeseries/index-value-queries';

try {
  const result = await fetchIndexValue(prisma, {
    tenantId: 'acme-corp',
    seriesCode: 'PLATTS_BRENT',
    asOfDate: new Date('2024-01-15'),
    versionPreference: 'FINAL',
  });

  if (!result) {
    // No value found for this date
    console.error('No value found for 2024-01-15');
    // Handle missing data (use fill-forward, throw error, etc.)
  }
} catch (error) {
  if (error.message.includes('Series not found')) {
    // Series doesn't exist
    console.error(`Series PLATTS_BRENT not found for tenant`);
  } else {
    // Other error (database connection, etc.)
    console.error('Query failed:', error);
  }
}
```

## Related Documentation

- [PAM Graph Schema](./pam-graph-schema.md) - Factor nodes with series references
- [Graph Execution](./graph-execution.md) - How graphs fetch timeseries data
- [Data Model ERD](./database/ERD.md) - IndexSeries and IndexValue schema

## Future Enhancements

**TimescaleDB Integration** (Issue #9):
- Hypertables for automatic partitioning
- Continuous aggregates for pre-computed averages
- Compression for old data
- Target: P95 <100ms for 36-month range queries at 10M rows

**Fill-Forward Policy** (Issue #13):
- Automatic fill-forward for missing dates (≤10 days)
- Configurable per series
- Audit trail for filled values

**Business Day Calendars** (Issue #14):
- Skip weekends/holidays
- Roll-forward to next business day
- Calendar-aware lag days
