# Timeseries Versioning

Version tag semantics and precedence rules for index data.

## Overview

Index data (commodity prices, FX rates, etc.) is published in multiple versions:
- **PRELIMINARY** - Initial estimates, published quickly
- **FINAL** - Confirmed data after verification
- **REVISED** - Corrections to previously published data

The versioning system ensures calculations use the most appropriate data version.

## Version Types

### PRELIMINARY

**Purpose:** Quick, early data release

**Characteristics:**
- Published same-day or next-day
- Subject to revision
- May be estimates or incomplete
- Used when timeliness is critical

**Example:** Same-day WTI oil price estimate at 4 PM before market close.

### FINAL

**Purpose:** Authoritative, confirmed data

**Characteristics:**
- Published after verification
- Preferred for official calculations
- Most accurate available
- Rarely revised

**Example:** Next-day confirmed WTI oil price after full reconciliation.

### REVISED

**Purpose:** Corrections to previous data

**Characteristics:**
- Published when errors discovered
- Overwrites or augments previous versions
- Less common than prelim/final
- Triggers recalculation consideration

**Example:** Retroactive correction to published final price due to reporting error.

## Version Precedence

### Default Precedence

When multiple versions exist for the same date:

```
FINAL > REVISED > PRELIMINARY
```

**Rationale:**
- FINAL is most authoritative
- REVISED includes corrections
- PRELIMINARY is fallback

### Configurable Precedence

Different use cases may require different precedence:

```typescript
import { getConfigurablePreference } from '@/lib/timeseries/versioning';

// Prefer revised data (corrections matter most)
const revisedFirst = getConfigurablePreference({
  primary: 'REVISED',
  secondary: 'FINAL',
  tertiary: 'PRELIMINARY',
});

// Exclude preliminary (only use verified data)
const verifiedOnly = getConfigurablePreference({
  exclude: ['PRELIMINARY'],
});
```

## Query Behavior

### Forward-Looking Queries

For current or future calculations, use latest available version:

```typescript
import { fetchIndexValue } from '@/lib/timeseries/index-value-queries';

// Get WTI price for today (prefers FINAL if available)
const result = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL', // Default
});

// result.versionTag will be 'FINAL' if available, else 'REVISED', else 'PRELIMINARY'
```

### Historical "As-Of" Queries

For historical calculations, use only versions available at that time:

```typescript
import {
  getVersionsAvailableAsOf,
  filterToAvailableVersions,
} from '@/lib/timeseries/versioning';

// Scenario: Recalculate what prices were on 2024-01-15
const dataDate = new Date('2024-01-10');
const asOfDate = new Date('2024-01-15');

// Map of when each version was published
const publishDates = new Map([
  ['PRELIMINARY', new Date('2024-01-10')], // Published same day
  ['FINAL', new Date('2024-01-12')],       // Published 2 days later
  ['REVISED', new Date('2024-01-20')],     // Published 10 days later
]);

// Get versions visible as of 2024-01-15
const availableVersions = getVersionsAvailableAsOf(
  dataDate,
  asOfDate,
  publishDates
);

// Result: ['PRELIMINARY', 'FINAL']
// REVISED not included (wasn't published yet on 2024-01-15)
```

**Why This Matters:**
- Enables accurate historical reconstruction
- Critical for audits and compliance
- Prevents anachronistic data usage

## Version Lifecycle

### Typical Flow

```
PRELIMINARY → FINAL
```

**Timeline:**
- T+0: PRELIMINARY published
- T+1: FINAL published, replaces PRELIMINARY

**Example:**
```
2024-01-10 4:00 PM: PRELIMINARY WTI = $75.20
2024-01-11 9:00 AM: FINAL WTI = $75.35
```

### With Revision

```
PRELIMINARY → FINAL → REVISED
```

**Timeline:**
- T+0: PRELIMINARY published
- T+1: FINAL published
- T+30: REVISED published (correction)

**Example:**
```
2024-01-10: PRELIMINARY WTI = $75.20
2024-01-11: FINAL WTI = $75.35
2024-02-10: REVISED WTI = $75.40 (correction discovered)
```

### Final Only

Some data sources skip preliminary:

```
FINAL (only)
```

**Example:** Official government statistics published only when verified.

## Version Transitions

### Valid Transitions

- ✅ **PRELIMINARY → FINAL** - Standard flow
- ✅ **PRELIMINARY → REVISED** - Skip final (rare)
- ✅ **FINAL → REVISED** - Correction after publication

### Invalid Transitions

- ❌ **FINAL → PRELIMINARY** - Can't downgrade
- ❌ **REVISED → PRELIMINARY** - Can't downgrade
- ❌ **REVISED → FINAL** - Can't undo revision

**Validation:**
```typescript
import { isValidVersionTransition } from '@/lib/timeseries/versioning';

console.log(isValidVersionTransition('PRELIMINARY', 'FINAL')); // true
console.log(isValidVersionTransition('FINAL', 'PRELIMINARY')); // false
```

## Usage Examples

### Example 1: Standard Query

```typescript
import { fetchIndexValue } from '@/lib/timeseries/index-value-queries';

// Get current price (prefers FINAL)
const result = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'WTI',
  asOfDate: new Date(),
  versionPreference: 'FINAL',
});

console.log(`Price: ${result.value}`);
console.log(`Version: ${result.versionTag}`);
// Output:
// Price: 75.35
// Version: FINAL
```

### Example 2: Explicit Preliminary Query

```typescript
// Use preliminary data (fastest available)
const prelim = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'WTI',
  asOfDate: new Date(),
  versionPreference: 'PRELIMINARY',
});

// Will use PRELIMINARY even if FINAL available
```

### Example 3: Historical Reconstruction

```typescript
import {
  getVersionsAvailableAsOf,
  selectBestVersion,
} from '@/lib/timeseries/versioning';

// Reconstruct calculation as of 2024-01-15
const asOfDate = new Date('2024-01-15');

// Determine which versions were available then
const publishDates = await getPublishDates('WTI', new Date('2024-01-10'));
const available = getVersionsAvailableAsOf(
  new Date('2024-01-10'),
  asOfDate,
  publishDates
);

// Select best version from those available
const preferenceOrder = getVersionPreferenceOrder('FINAL');
const filtered = filterToAvailableVersions(preferenceOrder, available);
const bestVersion = selectBestVersion(available, filtered);

// Use bestVersion for historical calculation
```

### Example 4: Handling Revisions

```typescript
// Check for revised data
const revised = await fetchIndexValue(prisma, {
  tenantId: 'tenant-123',
  seriesCode: 'WTI',
  asOfDate: new Date('2024-01-10'),
  versionPreference: 'REVISED',
});

if (revised.versionTag === 'REVISED') {
  console.log('⚠️ Revised data detected - may need recalculation');

  // Compare with previously used version
  const final = await fetchIndexValue(prisma, {
    tenantId: 'tenant-123',
    seriesCode: 'WTI',
    asOfDate: new Date('2024-01-10'),
    versionPreference: 'FINAL',
  });

  const difference = revised.value.minus(final.value);
  console.log(`Revision delta: ${difference}`);
}
```

## Best Practices

### 1. Use FINAL for Production Calculations

```typescript
// ✅ Good: Official calculations use final data
await fetchIndexValue(prisma, {
  ...query,
  versionPreference: 'FINAL',
});

// ❌ Bad: Production calculations using preliminary
await fetchIndexValue(prisma, {
  ...query,
  versionPreference: 'PRELIMINARY',
});
```

**Exception:** When timeliness is critical and final data isn't available yet.

### 2. Document Version Preference Policies

```typescript
// Document why you're using specific version preference
const policy = {
  // For regulatory reports, only use verified data
  regulatory: {
    primary: 'FINAL',
    exclude: ['PRELIMINARY'],
  },

  // For daily operations, prioritize speed
  operational: {
    primary: 'PRELIMINARY',
    secondary: 'FINAL',
  },
};
```

### 3. Handle Missing Versions Gracefully

```typescript
const result = await fetchIndexValue(prisma, query);

if (!result) {
  // No data available for any version
  throw new Error('Index value not found');
}

if (result.versionTag === 'PRELIMINARY') {
  console.warn('Using preliminary data - final not available');
}
```

### 4. Monitor for Revisions

```typescript
// Check for revisions that might require recalculation
async function checkForRevisions(tenantId, seriesCode, startDate, endDate) {
  const values = await fetchIndexValueRange(
    prisma,
    tenantId,
    seriesCode,
    startDate,
    endDate,
    'REVISED'
  );

  const revisions = values.filter((v) => v.versionTag === 'REVISED');

  if (revisions.length > 0) {
    console.log(`⚠️ ${revisions.length} revisions detected`);
    return revisions;
  }

  return [];
}
```

### 5. Audit Version Usage

```typescript
// Log which version was used for calculations
await auditLog.log({
  action: 'CALCULATION',
  details: {
    batchId: 'batch-123',
    seriesCode: 'WTI',
    asOfDate: '2024-01-15',
    versionUsed: result.versionTag,
    versionPreference: 'FINAL',
  },
});
```

## Testing Version Logic

### Unit Tests

```typescript
import { selectBestVersion, getVersionPreferenceOrder } from '@/lib/timeseries/versioning';

it('prefers FINAL over PRELIMINARY', () => {
  const versions = ['PRELIMINARY', 'FINAL'];
  const best = selectBestVersion(versions);
  expect(best).toBe('FINAL');
});

it('uses REVISED when available', () => {
  const versions = ['FINAL', 'REVISED'];
  const revised Preference = getVersionPreferenceOrder('REVISED');
  const best = selectBestVersion(versions, revisedPreference);
  expect(best).toBe('REVISED');
});
```

### Integration Tests

```typescript
it('selects correct version from database', async () => {
  // Insert multiple versions
  await prisma.indexValue.createMany({
    data: [
      { seriesId, asOfDate, versionTag: 'PRELIMINARY', value: 75.20 },
      { seriesId, asOfDate, versionTag: 'FINAL', value: 75.35 },
    ],
  });

  // Query should return FINAL
  const result = await fetchIndexValue(prisma, {
    tenantId,
    seriesCode: 'WTI',
    asOfDate,
    versionPreference: 'FINAL',
  });

  expect(result.versionTag).toBe('FINAL');
  expect(result.value.toNumber()).toBe(75.35);
});
```

## Troubleshooting

### "Using preliminary data" Warning

**Cause:** Final data not available yet

**Solution:**
1. Wait for final data to be published
2. Or explicitly allow preliminary: `versionPreference: 'PRELIMINARY'`

### Historical Query Returns Wrong Version

**Cause:** Not filtering to versions available at that time

**Solution:** Use `getVersionsAvailableAsOf()` to filter versions

### Calculation Changed After Revision

**Expected Behavior:** Revisions are meant to correct data

**Action:**
1. Log the revision
2. Decide whether to recalculate affected batches
3. Create proposal if recalculation needed

## Schema

### IndexValue Table

```prisma
model IndexValue {
  id           String     @id @default(uuid())
  seriesId     String
  asOfDate     DateTime
  versionTag   VersionTag
  value        Decimal    @db.Decimal(20, 12)
  publishedAt  DateTime   @default(now())

  @@unique([seriesId, asOfDate, versionTag])
  @@index([seriesId, asOfDate])
}

enum VersionTag {
  PRELIMINARY
  FINAL
  REVISED
}
```

### Key Fields

- `asOfDate` - The date the data is for
- `versionTag` - PRELIMINARY, FINAL, or REVISED
- `publishedAt` - When this version was published (for historical queries)

## Related Documentation

- [Timeseries Store](./timeseries-store.md)
- [Missing Data Policy](./missing-data-policy.md)
- [Revised Data Handling](./revised-data-handling.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)

## Future Enhancements

- Support for numbered revisions (rev1, rev2, rev3, ...)
- Automatic recalculation triggers on revisions
- Version conflict resolution
- Data quality scores per version
