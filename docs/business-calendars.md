# Business Calendars

Business day calculations, holiday calendars, and date rolling for contract settlements.

## Overview

Business calendars handle:
- **Holiday calendars** by region (US, EU, AU, UK)
- **Weekend identification** (configurable)
- **Date rolling** to business days
- **Business day arithmetic** (add/subtract business days)
- **Contract-specific calendars** (custom holidays)

## Regions

### US (United States)

**Holidays:**
- New Year's Day (Jan 1)
- Independence Day (Jul 4)
- Thanksgiving (4th Thursday in November)
- Christmas (Dec 25)

**Weekends:** Saturday, Sunday

### EU (European Union)

**Holidays:**
- New Year's Day (Jan 1)
- Labour Day (May 1)
- Christmas (Dec 25)
- Boxing Day (Dec 26)

**Weekends:** Saturday, Sunday

### AU (Australia)

**Holidays:**
- New Year's Day (Jan 1)
- Australia Day (Jan 26)
- ANZAC Day (Apr 25)
- Christmas (Dec 25)
- Boxing Day (Dec 26)

**Weekends:** Saturday, Sunday

### UK (United Kingdom)

**Holidays:**
- New Year's Day (Jan 1)
- Early May Bank Holiday (1st Monday in May)
- Summer Bank Holiday (Last Monday in August)
- Christmas (Dec 25)
- Boxing Day (Dec 26)

**Weekends:** Saturday, Sunday

### CUSTOM

Define your own holidays for contract-specific calendars.

## Usage

### Create Calendar

```typescript
import { createCalendar } from '@/lib/calendar/business-calendar';

// Standard US calendar
const usCalendar = createCalendar('US');

// Custom calendar with specific holidays
const customCalendar = createCalendar('CUSTOM', [
  new Date('2024-03-15'),
  new Date('2024-06-21'),
]);
```

### Check Business Days

```typescript
import { isBusinessDay, isWeekend, isHoliday } from '@/lib/calendar/business-calendar';

const date = new Date('2024-01-01'); // New Year's Day

console.log(isWeekend(date)); // false (Monday)
console.log(isHoliday(date, usCalendar)); // true (holiday)
console.log(isBusinessDay(date, usCalendar)); // false (holiday)
```

### Roll Dates

```typescript
import { rollForward, rollBackward } from '@/lib/calendar/business-calendar';

// Jan 1, 2024 is Monday (New Year's holiday)
const newYears = new Date('2024-01-01');

// Roll forward to next business day
const nextBusinessDay = rollForward(newYears, usCalendar);
// Result: Jan 2, 2024 (Tuesday)

// Roll backward from weekend
const sunday = new Date('2024-01-07');
const prevBusinessDay = rollBackward(sunday, usCalendar);
// Result: Jan 5, 2024 (Friday)
```

## Roll Conventions

### Following

Roll forward to the next business day.

```typescript
import { applyRollConvention } from '@/lib/calendar/business-calendar';

const holiday = new Date('2024-01-01');
const rolled = applyRollConvention(holiday, usCalendar, 'following');
// Result: Jan 2, 2024
```

**Use case:** Standard settlement date adjustment.

### Preceding

Roll backward to the previous business day.

```typescript
const holiday = new Date('2024-01-01');
const rolled = applyRollConvention(holiday, usCalendar, 'preceding');
// Result: Dec 29, 2023 (Friday)
```

**Use case:** Payment dates that must be before original date.

### Modified Following

Roll forward, but if it crosses into next month, roll backward instead.

```typescript
// Dec 31, 2023 is Sunday (would roll to Jan 2, 2024)
const lastDay = new Date('2023-12-31');
const rolled = applyRollConvention(lastDay, usCalendar, 'modified_following');
// Result: Dec 29, 2023 (stays in December)
```

**Use case:** Month-end settlements that must stay in the same month.

### Modified Preceding

Roll backward, but if it crosses into previous month, roll forward instead.

```typescript
// Jan 1, 2024 is Monday (holiday, would roll to Dec 29, 2023)
const firstDay = new Date('2024-01-01');
const rolled = applyRollConvention(firstDay, usCalendar, 'modified_preceding');
// Result: Jan 2, 2024 (stays in January)
```

**Use case:** Month-start settlements that must stay in the same month.

## Business Day Arithmetic

### Add Business Days

```typescript
import { addBusinessDays } from '@/lib/calendar/business-calendar';

// Start on Friday, Jan 5, 2024
const start = new Date('2024-01-05');

// Add 3 business days (skips weekend)
const result = addBusinessDays(start, 3, usCalendar);
// Result: Wednesday, Jan 10, 2024

// Subtract 2 business days
const earlier = addBusinessDays(start, -2, usCalendar);
// Result: Wednesday, Jan 3, 2024
```

### Count Business Days

```typescript
import { countBusinessDays } from '@/lib/calendar/business-calendar';

const start = new Date('2024-01-05'); // Friday
const end = new Date('2024-01-12'); // Friday

const count = countBusinessDays(start, end, usCalendar);
// Result: 6 business days (5, 8, 9, 10, 11, 12)
```

### First/Last Business Day

```typescript
import {
  firstBusinessDayOfMonth,
  lastBusinessDayOfMonth,
} from '@/lib/calendar/business-calendar';

// January 2024: 1st is Monday (holiday), so first business day is Jan 2
const first = firstBusinessDayOfMonth(2024, 0, usCalendar);
// Result: Jan 2, 2024 (Tuesday)

// March 2024: 31st is Sunday, so last business day is March 29
const last = lastBusinessDayOfMonth(2024, 2, usCalendar);
// Result: March 29, 2024 (Friday)
```

## Contract-Specific Calendars

### Per-Contract Calendar Selection

Contracts can specify their own business calendar:

```typescript
// Example: Contract with custom holidays
const contractCalendar = createCalendar('CUSTOM', [
  new Date('2024-03-15'), // Company shutdown
  new Date('2024-06-21'), // Special event
]);

// Use for settlement date calculations
const settlementDate = new Date('2024-03-15');
const adjustedDate = rollForward(settlementDate, contractCalendar);
// Result: March 18, 2024 (Monday)
```

### Merge Calendars

Combine multiple regional calendars:

```typescript
import { mergeCalendars } from '@/lib/calendar/business-calendar';

const usCalendar = createCalendar('US');
const ukCalendar = createCalendar('UK');

// Combined calendar with holidays from both regions
const combinedCalendar = mergeCalendars(usCalendar, ukCalendar);

// Now both US and UK holidays are observed
const isHol = isHoliday(new Date('2024-08-26'), combinedCalendar);
// Result: true (UK Summer Bank Holiday)
```

## Use Cases

### Use Case 1: Settlement Date Adjustment

```typescript
// Contract specifies settlement on 1st of month
const rawSettlementDate = new Date('2024-01-01'); // New Year's Day

// Adjust to first business day
const calendar = createCalendar('US');
const actualSettlement = rollForward(rawSettlementDate, calendar);

console.log(`Settlement date: ${actualSettlement.toDateString()}`);
// Output: Settlement date: Tue Jan 02 2024
```

### Use Case 2: Index Publication Date

```typescript
// Index published on 1st business day of month
const calendar = createCalendar('US');
const publicationDate = firstBusinessDayOfMonth(2024, 0, calendar);

console.log(`Index published: ${publicationDate.toDateString()}`);
// Output: Index published: Tue Jan 02 2024
```

### Use Case 3: Payment Terms (NET 30)

```typescript
// Invoice date
const invoiceDate = new Date('2024-01-15');

// Payment due 30 business days later
const calendar = createCalendar('US');
const dueDate = addBusinessDays(invoiceDate, 30, calendar);

console.log(`Payment due: ${dueDate.toDateString()}`);
// Output: Payment due: Thu Feb 29 2024
```

### Use Case 4: Contract Review Period

```typescript
// Contract effective date
const effectiveDate = new Date('2024-01-01'); // Holiday

// Must be reviewed 5 business days before
const calendar = createCalendar('US');

// First adjust effective date to business day
const adjustedEffective = rollForward(effectiveDate, calendar); // Jan 2

// Then subtract 5 business days
const reviewDate = addBusinessDays(adjustedEffective, -5, calendar);

console.log(`Review by: ${reviewDate.toDateString()}`);
// Output: Review by: Thu Dec 28 2023
```

### Use Case 5: Multi-Region Contracts

```typescript
// Contract observed in both US and UK
const usCalendar = createCalendar('US');
const ukCalendar = createCalendar('UK');
const multiRegionCalendar = mergeCalendars(usCalendar, ukCalendar);

// Check if date is business day in both regions
const date = new Date('2024-05-06'); // UK Early May Bank Holiday

console.log(isBusinessDay(date, usCalendar)); // true (US working day)
console.log(isBusinessDay(date, ukCalendar)); // false (UK holiday)
console.log(isBusinessDay(date, multiRegionCalendar)); // false (holiday in either region)
```

## Integration with PAM

### Factor Node with Business Day Adjustment

```typescript
// Example: Factor node configuration
const factorNode = {
  id: 'factor-1',
  type: 'factor',
  config: {
    seriesCode: 'WTI',
    lagDays: 1,
    businessDayAdjustment: true, // Enable adjustment
    calendar: 'US', // Use US calendar
  },
};

// During execution:
// 1. Calculate raw date: asOfDate - lagDays
// 2. Adjust to business day using calendar
// 3. Fetch index value for adjusted date
```

### Contract with Custom Calendar

```prisma
model Contract {
  id              String   @id
  name            String
  calendar        String?  // 'US', 'EU', 'AU', 'UK', 'CUSTOM'
  customHolidays  Json?    // Array of date strings for CUSTOM calendar
  // ...
}
```

## Testing

### Unit Tests

```typescript
import { rollForward, createCalendar } from '@/lib/calendar/business-calendar';

it('rolls forward from holiday', () => {
  const calendar = createCalendar('US');
  const newYears = new Date('2024-01-01');
  const rolled = rollForward(newYears, calendar);

  expect(rolled.getDate()).toBe(2); // Jan 2
  expect(isBusinessDay(rolled, calendar)).toBe(true);
});
```

### Integration Tests

```typescript
it('calculates settlement date for contract', async () => {
  const contract = await prisma.contract.findUnique({
    where: { id: 'contract-123' },
  });

  const calendar = createCalendar(contract.calendar || 'US');
  const rawDate = new Date('2024-01-01');
  const settlement = rollForward(rawDate, calendar);

  expect(settlement.getDate()).toBe(2);
});
```

## Best Practices

### 1. Always Use Business Day Adjustment for Settlements

```typescript
// ✅ Good: Adjust settlement dates
const settlementDate = rollForward(rawDate, calendar);

// ❌ Bad: Use raw date (might be holiday/weekend)
const settlementDate = rawDate;
```

### 2. Document Calendar Choice

```typescript
// Document why specific calendar is used
const calendar = createCalendar('US'); // Contract follows US holidays per section 5.2
```

### 3. Handle Edge Cases

```typescript
// Check if adjustment crossed month boundary
const original = new Date('2024-01-31'); // Wednesday
const adjusted = rollForward(original, calendar);

if (adjusted.getMonth() !== original.getMonth()) {
  console.warn('Settlement date rolled into next month');
}
```

### 4. Cache Calendars

```typescript
// Create calendar once, reuse
const calendarCache = new Map<string, BusinessCalendar>();

function getCalendar(region: CalendarRegion): BusinessCalendar {
  if (!calendarCache.has(region)) {
    calendarCache.set(region, createCalendar(region));
  }
  return calendarCache.get(region)!;
}
```

### 5. Validate Contract Calendar Configuration

```typescript
function validateContractCalendar(contract: Contract): void {
  if (contract.calendar === 'CUSTOM' && !contract.customHolidays) {
    throw new Error('CUSTOM calendar requires customHolidays');
  }

  if (contract.calendar && !['US', 'EU', 'AU', 'UK', 'CUSTOM'].includes(contract.calendar)) {
    throw new Error(`Invalid calendar: ${contract.calendar}`);
  }
}
```

## Limitations

### Current Implementation

- **Fixed holidays only** - Does not calculate floating holidays (e.g., Thanksgiving, Easter)
- **No half-days** - Treats all business days as full days
- **No time zones** - Operates on dates only (no time component)
- **Limited years** - Holiday data for 2024-2025 only

### Future Enhancements

- Dynamic holiday calculation (floating holidays)
- Half-day support (early close days)
- Historical holiday data API
- Time zone support
- Region-specific business hours

## Troubleshooting

### Date rolls into different month

**Cause:** Rolling forward/backward crossed month boundary

**Solution:** Use `modified_following` or `modified_preceding` convention

### Wrong business day returned

**Cause:** Incorrect calendar or missing holidays

**Solution:** Verify calendar region matches contract requirements

### Performance with large date ranges

**Cause:** Iterating day-by-day for business day counting

**Solution:** Cache results or use approximate calculations for very large ranges

## Related Documentation

- [Timeseries Versioning](./timeseries-versioning.md)
- [Missing Data Policy](./missing-data-policy.md)
- [PAM Graph Executor](./pam-graph-executor.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
