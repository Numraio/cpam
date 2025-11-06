## Data Ingestion

Automated and manual data ingestion with adapters, scheduling, and idempotent upserts.

## Overview

The ingestion system fetches external data (FX rates, commodity prices, etc.) and stores it in the timeseries database. Features include:

- **Adapter interface** - Pluggable adapters for different providers
- **Daily scheduler** - Cron-based with jitter to avoid thundering herd
- **Manual CSV upload** - Owner-only API for ad-hoc data
- **Idempotent upserts** - Duplicate-safe with unique constraints
- **Rate limiting** - Controlled DB write pace
- **Retry logic** - Exponential backoff for transient failures
- **Metrics** - Track fetched/upserted/skipped counts

## Architecture

```
┌─────────────┐
│  Scheduler  │──────┐
│ (cron+jitter│      │
└─────────────┘      │
                     ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Manual API  │─▶│   Adapter    │─▶│  Upsert      │
│ (CSV upload)│  │  (OANDA/CSV) │  │  Logic       │
└─────────────┘  └──────────────┘  └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ IndexValue   │
                                   │ (Timeseries) │
                                   └──────────────┘
```

## Adapters

### Adapter Interface

All adapters implement:

```typescript
interface IngestionAdapter {
  readonly name: string; // "OANDA", "CSV", etc.

  // Fetch data from provider
  fetch(request: IngestionRequest): Promise<DataPoint[]>;

  // Validate configuration
  validate(tenantId: string): Promise<boolean>;

  // Test connection
  testConnection(tenantId: string): Promise<boolean>;
}
```

### OANDA Adapter

Fetches FX rates from OANDA API.

**Configuration:**
```typescript
// Provider credentials required (see Provider Credentials doc)
{
  "provider": "OANDA",
  "name": "default",
  "credentials": {
    "accountId": "001-123-456",
    "apiToken": "abc123xyz"
  }
}
```

**Usage:**
```typescript
import { OANDAAdapter } from '@/lib/ingestion/adapters/oanda-adapter';

const adapter = new OANDAAdapter();

const dataPoints = await adapter.fetch({
  tenantId: 'tenant-123',
  seriesCodes: ['EUR_USD', 'GBP_USD'],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});

// dataPoints: DataPoint[]
// [
//   { seriesCode: 'EUR_USD', asOfDate: 2024-01-01, value: 1.10, versionTag: 'FINAL' },
//   { seriesCode: 'EUR_USD', asOfDate: 2024-01-02, value: 1.11, versionTag: 'FINAL' },
//   ...
// ]
```

### CSV Adapter

Parses CSV files with standard format.

**CSV Format:**
```csv
seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL
BRENT,2024-01-15,80.25,FINAL
USD_EUR,2024-01-15,1.10,FINAL
```

**Usage:**
```typescript
import { CSVAdapter } from '@/lib/ingestion/adapters/csv-adapter';

const csvData = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL`;

const adapter = new CSVAdapter(csvData);

const dataPoints = await adapter.fetch({
  tenantId: 'tenant-123',
  seriesCodes: [],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
```

## Scheduling

### Daily Scheduled Ingestion

Schedule automatic daily ingestion:

```typescript
import { scheduleDailyIngestion } from '@/lib/ingestion/scheduler';

await scheduleDailyIngestion(
  'tenant-123',
  'OANDA',
  ['EUR_USD', 'GBP_USD'],
  '0 1 * * *' // 1 AM daily (cron format)
);
```

**Jitter:**
- Random delay up to 5 minutes
- Prevents thundering herd
- Spreads load across time window

**Example:**
- Scheduled time: 1:00 AM
- Actual execution: 1:00 AM + random(0-5min)
- Tenant A: 1:02:34 AM
- Tenant B: 1:04:17 AM
- Tenant C: 1:00:52 AM

### Manual Trigger

Trigger ingestion immediately:

```typescript
import { triggerManualIngestion } from '@/lib/ingestion/scheduler';

await triggerManualIngestion(
  'tenant-123',
  'OANDA',
  ['EUR_USD'],
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  false // force
);
```

### Via API

**Schedule daily ingestion:**
```bash
POST /api/ingestion/schedule
Content-Type: application/json

{
  "provider": "OANDA",
  "seriesCodes": ["EUR_USD", "GBP_USD"],
  "cronSchedule": "0 1 * * *"
}
```

**Trigger manual ingestion:**
```bash
POST /api/ingestion/schedule
Content-Type: application/json

{
  "provider": "OANDA",
  "seriesCodes": ["EUR_USD"],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T00:00:00Z",
  "force": false
}
```

**Cancel scheduled ingestion:**
```bash
DELETE /api/ingestion/schedule
Content-Type: application/json

{
  "provider": "OANDA"
}
```

## CSV Upload

Owner-only API for manual CSV uploads.

**Endpoint:**
```bash
POST /api/ingestion/csv-upload
Content-Type: application/json

{
  "csvData": "seriesCode,asOfDate,value,versionTag\nWTI,2024-01-15,75.50,FINAL",
  "seriesCodes": [],       // Optional filter
  "startDate": "2024-01-01T00:00:00Z",  // Optional filter
  "endDate": "2024-01-31T00:00:00Z",    // Optional filter
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "provider": "CSV",
    "fetchedCount": 10,
    "upsertedCount": 8,
    "skippedCount": 2,
    "errors": [],
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:00:05Z",
    "durationMs": 5000
  }
}
```

**File size limit:** 10MB

## Idempotent Upserts

### Unique Constraint

Data points are unique by:
```prisma
@@unique([seriesId, asOfDate, versionTag])
```

### Upsert Behavior

**New data point:**
```typescript
// Given: No existing data
// When: Upsert WTI 2024-01-15 FINAL = 75.50
// Then: INSERT new record
```

**Duplicate (same value):**
```typescript
// Given: WTI 2024-01-15 FINAL = 75.50 exists
// When: Upsert WTI 2024-01-15 FINAL = 75.50 (force=false)
// Then: SKIP (no update)
```

**Duplicate (different value):**
```typescript
// Given: WTI 2024-01-15 FINAL = 75.50 exists
// When: Upsert WTI 2024-01-15 FINAL = 75.60
// Then: UPDATE to 75.60 (potential revision)
```

**Force upsert:**
```typescript
// Given: WTI 2024-01-15 FINAL = 75.50 exists
// When: Upsert WTI 2024-01-15 FINAL = 75.50 (force=true)
// Then: UPDATE (refresh ingestedAt timestamp)
```

### Version Tags

Different versions coexist:
```typescript
// Database:
// WTI 2024-01-15 PRELIMINARY = 75.00
// WTI 2024-01-15 FINAL       = 75.50
// WTI 2024-01-15 REVISED     = 75.60

// All 3 versions stored separately
```

## Rate Limiting & Backoff

### Rate Limiting

100ms delay between upserts:

```typescript
for (const dataPoint of dataPoints) {
  await upsertDataPoint(dataPoint);
  await sleep(100); // Rate limit
}
```

**Why:**
- Avoid overwhelming database
- Smooth out write spikes
- Allow other operations to proceed

### Retry Logic

Exponential backoff for transient failures:

```typescript
// Attempt 1: immediate
// Attempt 2: +1000ms
// Attempt 3: +2000ms
// Attempt 4: +4000ms (final)
```

**Example:**
```
10:00:00.000 - Attempt 1 (fail: connection timeout)
10:00:01.000 - Attempt 2 (fail: connection timeout)
10:00:03.000 - Attempt 3 (success)
```

## Error Handling

### Provider Outage

```typescript
// Given: OANDA API returns 500
// Then: Error logged, no partial writes

{
  fetchedCount: 0,
  upsertedCount: 0,
  errors: [
    {
      message: "OANDA API error: 500 - Internal Server Error",
      seriesCode: undefined,
      asOfDate: undefined,
    }
  ]
}
```

### Partial Failure

```typescript
// Given: 3 data points, 2nd fails
// Then: 1st and 3rd succeed, 2nd error logged

{
  fetchedCount: 3,
  upsertedCount: 2,
  skippedCount: 0,
  errors: [
    {
      message: "Failed to upsert: Series not found: UNKNOWN",
      seriesCode: "UNKNOWN",
      asOfDate: "2024-01-15T00:00:00Z",
    }
  ]
}
```

### Series Not Found

```typescript
// Given: Series "WTI" not configured
// Then: Error thrown, ingestion aborted

throw new Error("Series not found: WTI");
```

**Solution:** Use `ensureSeriesExists()` to auto-create series.

## Metrics & Logging

### Ingestion Result

```typescript
interface IngestionResult {
  provider: string;        // "OANDA", "CSV"
  fetchedCount: number;    // Data points fetched from provider
  upsertedCount: number;   // Data points written to DB
  skippedCount: number;    // Duplicates skipped
  errors: IngestionError[]; // Errors encountered
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}
```

### Logging

```typescript
console.log(`Ingestion completed:`, {
  provider: 'OANDA',
  fetched: 100,
  upserted: 95,
  skipped: 5,
  duration: '2.5s',
});

console.error(`Ingestion error:`, {
  message: 'OANDA API error: 500',
  seriesCode: 'EUR_USD',
});
```

## Testing

### Unit Tests

```typescript
import { CSVAdapter } from '@/lib/ingestion/adapters/csv-adapter';

it('parses valid CSV', async () => {
  const csv = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL`;

  const adapter = new CSVAdapter(csv);
  const dataPoints = await adapter.fetch({
    tenantId: 'test',
    seriesCodes: [],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
  });

  expect(dataPoints).toHaveLength(1);
  expect(dataPoints[0].seriesCode).toBe('WTI');
  expect(dataPoints[0].value.toString()).toBe('75.5');
});
```

### Integration Tests

```typescript
it('upserts data from OANDA', async () => {
  const adapter = new OANDAAdapter();

  const result = await runIngestion(adapter, {
    tenantId: 'tenant-123',
    seriesCodes: ['EUR_USD'],
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-15'),
  });

  expect(result.fetchedCount).toBeGreaterThan(0);
  expect(result.upsertedCount).toBeGreaterThan(0);
  expect(result.errors).toHaveLength(0);
});
```

### Acceptance Tests

```typescript
it('Given duplicate CSV rows, then upsert is stable and no duplicates created', async () => {
  const csv = `seriesCode,asOfDate,value,versionTag
WTI,2024-01-15,75.50,FINAL
WTI,2024-01-15,75.50,FINAL`;

  const adapter = new CSVAdapter(csv);
  const result = await runIngestion(adapter, request);

  // Both rows processed, but only 1 upserted (2nd skipped as duplicate)
  expect(result.fetchedCount).toBe(2);
  expect(result.upsertedCount).toBe(1);
  expect(result.skippedCount).toBe(1);
});

it('Given provider outage, then retries and alert; no partial corrupt writes', async () => {
  // Mock OANDA adapter to simulate outage
  const adapter = new MockOANDAAdapter({ simulateOutage: true });

  const result = await runIngestion(adapter, request);

  // No data fetched or written
  expect(result.fetchedCount).toBe(0);
  expect(result.upsertedCount).toBe(0);

  // Error logged
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].message).toContain('OANDA API error');

  // Database unchanged (no corrupt writes)
});
```

## Best Practices

### 1. Ensure Series Exist

```typescript
// ✅ Good: Auto-create series if missing
await ensureSeriesExists('tenant-123', 'WTI', 'PLATTS', 'INDEX');

// ❌ Bad: Assume series exists (will fail if not)
await runIngestion(adapter, request);
```

### 2. Use Force Sparingly

```typescript
// ✅ Good: Normal ingestion (skip duplicates)
await runIngestion(adapter, { ...request, force: false });

// ❌ Bad: Always forcing (unnecessary DB writes)
await runIngestion(adapter, { ...request, force: true });
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good: Check result.errors
const result = await runIngestion(adapter, request);

if (result.errors.length > 0) {
  console.error('Ingestion had errors:', result.errors);
  // Alert, retry, or log for investigation
}

// ❌ Bad: Ignore errors
await runIngestion(adapter, request);
```

### 4. Use Appropriate Adapters

```typescript
// ✅ Good: Use OANDA adapter for FX rates
const adapter = new OANDAAdapter();

// ❌ Bad: Use CSV for real-time FX (manual, error-prone)
const adapter = new CSVAdapter(csvData);
```

### 5. Schedule with Jitter

```typescript
// ✅ Good: Let scheduler add jitter automatically
await scheduleDailyIngestion(tenantId, provider, seriesCodes);

// ❌ Bad: Schedule all tenants at exact same time
// (causes thundering herd)
```

## Troubleshooting

### Series not found

**Error:** `Series not found: WTI`

**Solution:**
```typescript
await ensureSeriesExists('tenant-123', 'WTI', 'PLATTS', 'INDEX');
```

### OANDA credentials not configured

**Error:** `OANDA credentials not configured for tenant`

**Solution:** Configure credentials via API (see Provider Credentials doc)

### CSV header invalid

**Error:** `Invalid CSV header`

**Solution:** Ensure CSV has exact header:
```csv
seriesCode,asOfDate,value,versionTag
```

### Duplicate data

**Issue:** Same data appearing multiple times

**Solution:** Duplicates are automatically skipped via unique constraint. Check `result.skippedCount`.

## Related Documentation

- [Provider Credentials](./provider-credentials.md) - Configure OANDA credentials
- [Timeseries Versioning](./timeseries-versioning.md) - Version tags (PRELIMINARY/FINAL/REVISED)
- [Job Queue](./job-queue.md) - Background job processing
- [FX Rates](./fx-rates.md) - OANDA integration for FX rates

## Future Enhancements

- Additional adapters (Platts, Argus, Bloomberg)
- WebSocket/streaming ingestion for real-time data
- Automatic backfilling for historical data
- Data quality checks (outlier detection)
- Configurable rate limits per tenant
- Ingestion monitoring dashboard
