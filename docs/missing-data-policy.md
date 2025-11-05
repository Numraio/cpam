# Missing Data Policy (Fill-Forward)

Automatic handling of missing index data with configurable fill-forward window.

## Overview

When index values are missing for a requested date, the system automatically "fill-forwards" from the most recent available value within a **10-day window**.

**Policy:**
- ✓ Gap ≤ 10 days: Fill-forward with warning
- ✗ Gap > 10 days: Block calculation with error

## How It Works

```
1. Request index value for date X
2. If value exists → return immediately
3. If missing → look back up to 10 days
4. If found within 10 days → return with warning
5. If not found → throw error (blocks calculation)
```

## Examples

### Example 1: Direct Value (No Fill-Forward)

```typescript
// Value exists for requested date
await fetchIndexValue(prisma, {
  tenantId,
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
});

// Result:
{
  value: 75.50,
  effectiveDate: '2024-01-15',
  versionTag: 'FINAL',
  seriesCode: 'WTI',
  // No warning
}
```

### Example 2: Fill-Forward (1 Day)

```typescript
// Value missing for Jan 15, but exists for Jan 14
await fetchIndexValue(prisma, {
  tenantId,
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
});

// Result:
{
  value: 75.50, // Value from Jan 14
  effectiveDate: '2024-01-15',
  versionTag: 'FINAL',
  seriesCode: 'WTI',
  warning: {
    type: 'fill_forward',
    message: 'Value fill-forwarded from 1 day(s) ago (2024-01-14)',
    gapDays: 1,
    actualDate: '2024-01-14',
  },
}
```

### Example 3: Fill-Forward (7 Days)

```typescript
// Value missing for Jan 15, exists for Jan 8
await fetchIndexValue(prisma, {
  tenantId,
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
});

// Result:
{
  value: 75.50,
  effectiveDate: '2024-01-15',
  warning: {
    type: 'fill_forward',
    message: 'Value fill-forwarded from 7 day(s) ago (2024-01-08)',
    gapDays: 7,
    actualDate: '2024-01-08',
  },
}
```

### Example 4: Gap Too Large (11 Days)

```typescript
// Value missing for Jan 15, last value is Jan 4 (11 days ago)
await fetchIndexValue(prisma, {
  tenantId,
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
});

// Throws error:
// "No index value found for series 'WTI' within 10 days of 2024-01-15.
//  Gap exceeds fill-forward window.
//  Please load recent data or adjust calculation date."
```

## Warning Structure

When fill-forward occurs, a warning is attached to the result:

```typescript
interface Warning {
  type: 'fill_forward';
  message: string; // Human-readable message
  gapDays: number; // Number of days fill-forwarded
  actualDate: Date; // Date of actual value
}
```

## UI Integration

### Display Warning Banner

```tsx
function CalculationResult({ result }) {
  if (result.warning?.type === 'fill_forward') {
    return (
      <div className="alert alert-warning">
        <svg>...</svg>
        <div>
          <h3>Data Fill-Forward Notice</h3>
          <p>{result.warning.message}</p>
          <p className="text-xs">
            Calculation used value from {result.warning.actualDate}
            ({result.warning.gapDays} days ago)
          </p>
        </div>
      </div>
    );
  }

  return <div>Result: {result.value}</div>;
}
```

### Batch Results Metadata

```typescript
// Store warnings in batch metadata
const batch = await prisma.calcBatch.update({
  where: { id: batchId },
  data: {
    metadata: {
      warnings: [
        {
          type: 'fill_forward',
          seriesCode: 'WTI',
          gapDays: 7,
          message: 'WTI value fill-forwarded from 7 day(s) ago',
        },
      ],
    },
  },
});
```

## Error Handling

### Block Calculation

When gap > 10 days, calculation is blocked:

```typescript
try {
  const result = await fetchIndexValue(prisma, query);
} catch (error) {
  if (error.message.includes('Gap exceeds fill-forward window')) {
    // Show actionable error to user
    return {
      error: 'Cannot calculate: Missing index data',
      details: error.message,
      actions: [
        'Load recent index data',
        'Adjust calculation date',
        'Contact data provider',
      ],
    };
  }
}
```

### Actionable Error Message

Error message includes:
1. **Problem**: Gap exceeds 10-day window
2. **Context**: Series code and date
3. **Actions**: Load data or adjust date

Example:
```
No index value found for series 'WTI' within 10 days of 2024-01-15.
Gap exceeds fill-forward window.
Please load recent data or adjust calculation date.
```

## Version Preference

Fill-forward respects version preference:

```typescript
// Prefer FINAL version
await fetchIndexValue(prisma, {
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL', // Try FINAL → REVISED → PRELIMINARY
});

// Will look for FINAL first, then REVISED, then PRELIMINARY
// Returns most recent value within window that matches preference
```

## Business Rules

### 10-Day Window

**Why 10 days?**
- Balance between data availability and staleness
- Covers typical weekend + holiday gaps
- Prevents calculations with severely outdated data

**Configurable?**
Currently hardcoded to 10 days. Can be made configurable per series or tenant if needed.

### Most Recent Value

When multiple values exist within the window, always use the **most recent**:

```typescript
// Values available:
// - Jan 8: 75.00
// - Jan 12: 76.00

// Request for Jan 15
// Returns: 76.00 (from Jan 12, 3 days ago)
```

### Calendar Days

Window is calculated in **calendar days**, not business days:
- Weekends and holidays count
- 10 calendar days = 10 days regardless of business calendar

## Integration with Calculations

### Graph Executor

Warnings are collected during execution:

```typescript
const result = await executeGraph(graph, context);

// Check for warnings
if (result.warnings && result.warnings.length > 0) {
  console.warn('Calculation warnings:', result.warnings);
}
```

### Batch Orchestrator

Store warnings in batch metadata:

```typescript
const warnings = [];

for (const item of items) {
  const result = await calculateItem(item);

  if (result.warning) {
    warnings.push({
      itemId: item.id,
      ...result.warning,
    });
  }
}

await prisma.calcBatch.update({
  where: { id: batchId },
  data: {
    metadata: {
      warnings,
      hasDataQualityIssues: warnings.length > 0,
    },
  },
});
```

## Testing

### Test Scenarios

1. **Direct value**: No fill-forward needed
2. **1-day gap**: Fill-forward with minimal warning
3. **7-day gap**: Fill-forward with notice
4. **10-day gap**: At window boundary (success)
5. **11-day gap**: Beyond window (error)
6. **No data**: Series has no values (error)

### Example Test

```typescript
it('Given a 7-day gap, then averages compute with notice', async () => {
  // Create value 7 days before requested date
  await createIndexValue({
    seriesCode: 'WTI',
    asOfDate: new Date('2024-01-08'),
    value: 75.50,
  });

  const result = await fetchIndexValue(prisma, {
    seriesCode: 'WTI',
    asOfDate: new Date('2024-01-15'),
  });

  expect(result.value).toBe(75.50);
  expect(result.warning.gapDays).toBe(7);
});

it('Given an 11-day gap, then calc blocks with actionable error', async () => {
  // Create value 11 days before requested date
  await createIndexValue({
    seriesCode: 'WTI',
    asOfDate: new Date('2024-01-04'),
    value: 75.50,
  });

  await expect(
    fetchIndexValue(prisma, {
      seriesCode: 'WTI',
      asOfDate: new Date('2024-01-15'),
    })
  ).rejects.toThrow(/Gap exceeds fill-forward window/);
});
```

## Best Practices

1. **Monitor warnings**: Track fill-forward frequency by series
2. **Alert on repeated gaps**: If same series frequently fill-forwards, investigate data feed
3. **Display warnings prominently**: Users should know when data is stale
4. **Include in exports**: Add warning column to CSV exports
5. **Audit trail**: Log all fill-forward occurrences

## Related Documentation

- [Timeseries Store](./timeseries-store.md)
- [Index Value Queries](./index-value-queries.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
