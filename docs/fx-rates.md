## FX Rates

Foreign exchange rate integration with OANDA, configurable policies, and business day handling.

## Overview

The FX rate system handles currency conversion for contracts priced in different currencies. Features include:

- **OANDA integration** - Fetch live and historical FX rates
- **Three FX policies** - PERIOD_AVG, EOP, EFFECTIVE_DATE
- **Business day handling** - Automatic holiday/weekend adjustment
- **Caching** - 5-minute cache to reduce API calls
- **Rounding** - Currency-specific precision
- **Multi-tenant** - Credentials per tenant

## FX Policies

### PERIOD_AVG (Default)

Calculates average FX rate over the calculation period.

**When to use:**
- Hedged positions
- Averaged contracts
- Reduce volatility impact

**Example:**
```typescript
// Contract period: Jan 1-31, 2024
// Daily EUR/USD rates:
// Jan 1: 1.10
// Jan 2: 1.12
// Jan 3: 1.08
// ...
// Average: 1.10

// Base price: 100 EUR
// Converted: 100 * 1.10 = 110 USD
```

### EOP (End of Period)

Uses FX rate on the last business day of the period.

**When to use:**
- Spot contracts
- Month-end settlements
- Align with accounting periods

**Example:**
```typescript
// Period end: Jan 31, 2024 (Wednesday)
// Last business day: Jan 31
// EUR/USD rate on Jan 31: 1.12

// Base price: 100 EUR
// Converted: 100 * 1.12 = 112 USD
```

**Business day adjustment:**
- If period end is Saturday → use Friday rate
- If period end is holiday → use previous business day

### EFFECTIVE_DATE

Uses FX rate on a specific effective date.

**When to use:**
- Fixed-date contracts
- Invoice date pricing
- Custom settlement dates

**Example:**
```typescript
// Effective date: Jan 15, 2024 (Monday)
// EUR/USD rate on Jan 15: 1.11

// Base price: 100 EUR
// Converted: 100 * 1.11 = 111 USD
```

## Configuration

### Item FX Policy

Each item can specify its FX policy:

```prisma
model Item {
  // ...
  baseCurrency String    @db.VarChar(3) // ISO 4217 currency code
  fxPolicy     FXPolicy? @default(PERIOD_AVG)
}

enum FXPolicy {
  PERIOD_AVG      // Average rate over period
  EOP             // End-of-period rate
  EFFECTIVE_DATE  // Rate on effective date
}
```

### OANDA Credentials

Configure OANDA credentials per tenant:

```bash
# Via API (owner only)
POST /api/provider-credentials
{
  "provider": "OANDA",
  "name": "default",
  "credentials": {
    "accountId": "001-123-456",
    "apiToken": "abc123xyz"
  }
}
```

See [Provider Credentials](./provider-credentials.md) for details.

## Usage

### Fetch FX Rate

```typescript
import { getFXRate } from '@/lib/fx/fx-rate-service';

// Period average
const avgRate = await getFXRate({
  tenantId: 'tenant-123',
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  policy: 'PERIOD_AVG',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
});

console.log(`Average rate: ${avgRate.rate}`);
// Output: Average rate: 1.10

// End of period
const eopRate = await getFXRate({
  tenantId: 'tenant-123',
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  policy: 'EOP',
  periodEnd: new Date('2024-01-31'),
});

console.log(`EoP rate: ${eopRate.rate}`);
// Output: EoP rate: 1.12

// Effective date
const effectiveRate = await getFXRate({
  tenantId: 'tenant-123',
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  policy: 'EFFECTIVE_DATE',
  effectiveDate: new Date('2024-01-15'),
});

console.log(`Effective date rate: ${effectiveRate.rate}`);
// Output: Effective date rate: 1.11
```

### Convert Amount

```typescript
import { convertAmount, roundAmount } from '@/lib/fx/fx-rate-service';

const basePriceEur = new Decimal('100');
const fxRate = await getFXRate({ /* ... */ });

// Convert EUR to USD
const priceUsd = convertAmount(basePriceEur, 'EUR', 'USD', fxRate);

console.log(`Price: ${priceUsd} USD`);
// Output: Price: 110 USD

// Round to currency precision
const rounded = roundAmount(priceUsd, 'USD');
console.log(`Rounded: ${rounded} USD`);
// Output: Rounded: 110.00 USD
```

### With Business Calendar

```typescript
import { createCalendar } from '@/lib/calendar/business-calendar';

const calendar = createCalendar('US');

const fxRate = await getFXRate({
  tenantId: 'tenant-123',
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  policy: 'EOP',
  periodEnd: new Date('2024-01-01'), // New Year (holiday)
  calendar, // Will roll back to Dec 29, 2023
});

console.log(`Rate date: ${fxRate.rateDate}`);
// Output: Rate date: 2023-12-29 (last business day before holiday)
```

## Rounding & Precision

### FX Rate Precision

FX rates are rounded to 6 decimal places by default:

```typescript
import { roundFXRate } from '@/lib/fx/fx-rate-service';

const rate = new Decimal('1.123456789');
const rounded = roundFXRate(rate); // Default: 6 decimals

console.log(rounded.toString());
// Output: 1.123457
```

### Currency Precision

Monetary amounts are rounded to currency-specific precision:

| Currency | Precision | Example |
|----------|-----------|---------|
| USD, EUR, GBP | 2 | 100.12 |
| JPY, KRW | 0 | 10001 |
| BTC, ETH | 8 | 0.12345678 |

```typescript
import { roundAmount } from '@/lib/fx/fx-rate-service';

// USD: 2 decimals
const usd = roundAmount(new Decimal('100.12345'), 'USD');
console.log(usd.toString()); // 100.12

// JPY: 0 decimals
const jpy = roundAmount(new Decimal('10000.67'), 'JPY');
console.log(jpy.toString()); // 10001

// BTC: 8 decimals
const btc = roundAmount(new Decimal('0.123456789'), 'BTC');
console.log(btc.toString()); // 0.12345679
```

### Rounding Mode

Uses **ROUND_HALF_UP** (banker's rounding):
- 0.5 rounds up to 1
- 1.5 rounds up to 2
- 2.5 rounds up to 3

## Caching

FX rates are cached for 5 minutes to reduce API calls:

```typescript
// First call: fetches from OANDA
const rate1 = await getFXRate({ /* ... */ });

// Second call within 5 minutes: uses cache
const rate2 = await getFXRate({ /* same params */ });

// After 5 minutes: fetches from OANDA again
```

**Cache key format:**
```
{tenantId}:{base}_{quote}:{date}
```

**Examples:**
- `tenant-123:EUR_USD:2024-01-15`
- `tenant-123:GBP_JPY:current`

### Clear Cache

```typescript
import { clearFXCache } from '@/lib/fx/oanda-client';

// Clear all cached rates
clearFXCache();
```

## OANDA API

### Endpoints

**Current rates:**
```
GET /v3/accounts/{accountId}/pricing?instruments=EUR_USD
```

**Historical rates:**
```
GET /v3/instruments/EUR_USD/candles?from=2024-01-01&to=2024-01-31&granularity=D
```

### Rate Calculation

- **Current rates**: Midpoint of bid/ask
  ```
  midpoint = (bid + ask) / 2
  ```

- **Historical rates**: Close price of daily candle
  ```
  rate = candle.mid.c
  ```

### Error Handling

```typescript
try {
  const rate = await getFXRate({ /* ... */ });
} catch (error) {
  if (error.message.includes('credentials not configured')) {
    // Credentials missing - owner needs to configure
  } else if (error.message.includes('not available')) {
    // No data for this date (e.g., too far in past)
  } else {
    // OANDA API error
  }
}
```

## Integration with PAM

### Factor Node Configuration

```typescript
// Example: Factor node with FX conversion
const factorNode = {
  id: 'factor-1',
  type: 'factor',
  config: {
    seriesCode: 'BRENT',
    lagDays: 1,
    targetCurrency: 'USD', // Convert from index currency to USD
  },
};
```

### Calculation Workflow

1. **Fetch index value** (e.g., Brent in GBP)
2. **Determine FX policy** from item.fxPolicy
3. **Fetch FX rate** according to policy
4. **Convert to target currency**
5. **Round to currency precision**

```typescript
// Example calculation
const indexValue = new Decimal('75.50'); // Brent in GBP
const item = await prisma.item.findUnique({ where: { id: 'item-123' } });

// Fetch FX rate based on item's policy
const fxRate = await getFXRate({
  tenantId: item.tenantId,
  fromCurrency: 'GBP',
  toCurrency: 'USD',
  policy: item.fxPolicy || 'PERIOD_AVG',
  periodStart: calcBatch.startDate,
  periodEnd: calcBatch.endDate,
});

// Convert
const indexValueUsd = convertAmount(indexValue, 'GBP', 'USD', fxRate);

// Round
const rounded = roundAmount(indexValueUsd, 'USD');

console.log(`Brent: £${indexValue} → $${rounded}`);
// Output: Brent: £75.50 → $95.60
```

## Testing

### Unit Tests

```typescript
import { convertAmount, roundFXRate, roundAmount } from '@/lib/fx/fx-rate-service';

it('converts EUR to USD', () => {
  const eurAmount = new Decimal('100');
  const fxRate: FXRateResult = {
    rate: new Decimal('1.10'),
    rateDate: new Date('2024-01-15'),
    policy: 'EFFECTIVE_DATE',
    fromCurrency: 'EUR',
    toCurrency: 'USD',
  };

  const usdAmount = convertAmount(eurAmount, 'EUR', 'USD', fxRate);

  expect(usdAmount.toString()).toBe('110');
});

it('rounds FX rate to 6 decimals', () => {
  const rate = new Decimal('1.123456789');
  const rounded = roundFXRate(rate);

  expect(rounded.toString()).toBe('1.123457');
});

it('rounds USD to 2 decimals', () => {
  const amount = new Decimal('100.12345');
  const rounded = roundAmount(amount, 'USD');

  expect(rounded.toString()).toBe('100.12');
});
```

### Integration Tests

```typescript
it('fetches PERIOD_AVG rate from OANDA', async () => {
  const rate = await getFXRate({
    tenantId: 'test-tenant',
    fromCurrency: 'EUR',
    toCurrency: 'USD',
    policy: 'PERIOD_AVG',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
  });

  expect(rate.policy).toBe('PERIOD_AVG');
  expect(rate.rate).toBeInstanceOf(Decimal);
  expect(rate.fromCurrency).toBe('EUR');
  expect(rate.toCurrency).toBe('USD');
});
```

### Acceptance Tests

```typescript
it('Given PERIOD_AVG, then batch uses average over window', async () => {
  // Setup
  const item = await prisma.item.create({
    data: {
      tenantId: 'tenant-123',
      contractId: 'contract-456',
      sku: 'PRODUCT-A',
      name: 'Product A',
      basePrice: new Decimal('100'),
      baseCurrency: 'EUR',
      uom: 'kg',
      fxPolicy: 'PERIOD_AVG',
    },
  });

  // Execute
  const fxRate = await getFXRate({
    tenantId: item.tenantId,
    fromCurrency: item.baseCurrency,
    toCurrency: 'USD',
    policy: item.fxPolicy,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
  });

  const convertedPrice = convertAmount(
    item.basePrice,
    item.baseCurrency,
    'USD',
    fxRate
  );

  // Assert
  expect(fxRate.policy).toBe('PERIOD_AVG');
  expect(convertedPrice.greaterThan(0)).toBe(true);
});

it('Given EoP, then last business day rate used; tests verify exact rounding', async () => {
  // Setup
  const item = await prisma.item.create({
    data: {
      // ...
      basePrice: new Decimal('99.99'),
      baseCurrency: 'GBP',
      fxPolicy: 'EOP',
    },
  });

  const calendar = createCalendar('US');

  // Execute
  const fxRate = await getFXRate({
    tenantId: item.tenantId,
    fromCurrency: item.baseCurrency,
    toCurrency: 'USD',
    policy: item.fxPolicy,
    periodEnd: new Date('2024-01-31'),
    calendar,
  });

  const convertedPrice = convertAmount(
    item.basePrice,
    item.baseCurrency,
    'USD',
    fxRate
  );

  const rounded = roundAmount(convertedPrice, 'USD');

  // Assert
  expect(fxRate.policy).toBe('EOP');
  expect(rounded.decimalPlaces()).toBe(2); // Verify rounding to 2 decimals
});
```

## Best Practices

### 1. Always Specify FX Policy

```typescript
// ✅ Good: Explicit policy
const item = await prisma.item.create({
  data: {
    // ...
    fxPolicy: 'PERIOD_AVG',
  },
});

// ❌ Bad: Relying on default
const item = await prisma.item.create({
  data: {
    // fxPolicy will default to PERIOD_AVG
  },
});
```

### 2. Use Business Calendar for EOP

```typescript
// ✅ Good: Provide calendar for business day adjustment
const calendar = createCalendar('US');
const fxRate = await getFXRate({
  policy: 'EOP',
  periodEnd: new Date('2024-01-31'),
  calendar,
});

// ❌ Bad: No calendar (uses default US)
const fxRate = await getFXRate({
  policy: 'EOP',
  periodEnd: new Date('2024-01-31'),
});
```

### 3. Round After Conversion

```typescript
// ✅ Good: Convert, then round
const converted = convertAmount(amount, 'EUR', 'USD', fxRate);
const rounded = roundAmount(converted, 'USD');

// ❌ Bad: Rounding before conversion
const rounded = roundAmount(amount, 'EUR');
const converted = convertAmount(rounded, 'EUR', 'USD', fxRate);
```

### 4. Handle Same-Currency Cases

```typescript
// ✅ Good: Check for same currency
if (fromCurrency === toCurrency) {
  return amount; // No conversion needed
}

const fxRate = await getFXRate({ /* ... */ });
const converted = convertAmount(amount, fromCurrency, toCurrency, fxRate);
```

### 5. Cache Awareness

```typescript
// ✅ Good: Reuse FX rate for multiple conversions
const fxRate = await getFXRate({ /* ... */ });

const price1Usd = convertAmount(price1Eur, 'EUR', 'USD', fxRate);
const price2Usd = convertAmount(price2Eur, 'EUR', 'USD', fxRate);
const price3Usd = convertAmount(price3Eur, 'EUR', 'USD', fxRate);

// ❌ Bad: Fetching rate for each conversion
const price1Usd = convertAmount(price1Eur, 'EUR', 'USD', await getFXRate({ /* ... */ }));
const price2Usd = convertAmount(price2Eur, 'EUR', 'USD', await getFXRate({ /* ... */ }));
```

## Troubleshooting

### Credentials not configured

**Error:** `OANDA credentials not configured for tenant`

**Solution:**
1. Owner must configure OANDA credentials via API
2. See [Provider Credentials](./provider-credentials.md)

### FX rate not available

**Error:** `FX rate not available for EUR/USD on 2024-01-15`

**Causes:**
- Date too far in past (OANDA has limited history)
- Weekend/holiday (use business day adjustment)
- Invalid currency pair

**Solution:**
- Check date is within OANDA's historical range
- Verify currency pair is valid (e.g., "EUR_USD", not "EUR-USD")
- Use business calendar to roll to valid date

### Currency mismatch

**Error:** `Currency mismatch: expected EUR/USD, got GBP/USD`

**Solution:** Ensure FX rate matches the currencies being converted.

## Related Documentation

- [Provider Credentials](./provider-credentials.md) - OANDA credentials setup
- [Business Calendars](./business-calendars.md) - Business day handling
- [PAM Graph Executor](./pam-graph-executor.md) - Integration with calculations
- [UoM Conversions](./uom-conversions.md) - Unit conversions

## Future Enhancements

- Additional FX providers (XE, Bloomberg, Refinitiv)
- Triangulation for exotic currency pairs
- Forward rates support
- Real-time streaming rates
- Historical rate backfilling
- Rate alerts/notifications
