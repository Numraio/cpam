# Decimal Math Engine

## Overview

The CPAM decimal math engine provides fixed-point arithmetic with **12 decimal places** precision, eliminating floating-point errors in financial calculations. It wraps [decimal.js](https://github.com/MikeMcl/decimal.js/) with a type-safe, convenient API optimized for price adjustment calculations.

## Why Fixed-Point Decimal Math?

JavaScript's native `number` type uses IEEE 754 floating-point, which causes precision errors:

```javascript
// ❌ Floating-point errors
0.1 + 0.2 === 0.3 // false! Actually 0.30000000000000004
1.0 - 0.9 === 0.1 // false! Actually 0.09999999999999998

// ✅ Decimal math (correct)
add(D('0.1'), D('0.2')).toString() // '0.3'
subtract(D('1.0'), D('0.9')).toString() // '0.1'
```

**For financial calculations, this is unacceptable.** The decimal math engine ensures:
- ✅ Exact decimal arithmetic
- ✅ 12 decimal place precision (matches database `DECIMAL(20,12)`)
- ✅ Banker's rounding (IEEE 754 standard)
- ✅ Per-item precision control

## Quick Start

```typescript
import { D, add, multiply, quantizeCurrency } from '@/lib/math/decimal';

// Create decimals
const price = D('75.50'); // From string (recommended)
const premium = D(5.00); // From number (okay for simple values)

// Arithmetic
const total = add(price, premium); // 80.50
const doubled = multiply(total, D(2)); // 161.00

// Quantize to currency (2 decimal places)
const final = quantizeCurrency(total); // '80.50'
```

## Core API

### Creating Decimals

```typescript
import { D } from '@/lib/math/decimal';

// From string (recommended for precision)
const a = D('123.456789012345');

// From number
const b = D(123.456);

// From another Decimal
const c = D(a);
```

**Best Practice:** Always use strings for values with many decimal places to avoid JavaScript's floating-point representation.

### Quantization (Rounding to Precision)

```typescript
import { quantize, quantizeCurrency, quantizeWhole, RoundingMode } from '@/lib/math/decimal';

// Quantize to 2 decimal places (currency)
quantizeCurrency(D('123.456')) // Decimal('123.46')

// Quantize to 0 decimal places (whole numbers)
quantizeWhole(D('123.789')) // Decimal('124')

// Quantize to custom precision
quantize(D('123.456789'), 4) // Decimal('123.4568')

// Quantize with specific rounding mode
quantize(D('123.455'), 2, RoundingMode.ROUND_UP) // Decimal('123.46')
```

### Rounding Modes

| Mode | Description | Example (2.5 → ?) |
|------|-------------|-------------------|
| `ROUND_HALF_EVEN` | Banker's rounding (default) | 2 (to even) |
| `ROUND_HALF_UP` | Round 0.5 away from zero | 3 |
| `ROUND_HALF_DOWN` | Round 0.5 towards zero | 2 |
| `ROUND_UP` | Always round away from zero | 3 |
| `ROUND_DOWN` | Always round towards zero | 2 |
| `ROUND_CEIL` | Round towards +∞ | 3 |
| `ROUND_FLOOR` | Round towards -∞ | 2 |

**Default:** `ROUND_HALF_EVEN` (Banker's rounding) - reduces cumulative rounding errors in large datasets.

## Banker's Rounding (ROUND_HALF_EVEN)

Banker's rounding rounds 0.5 values to the **nearest even number**, reducing bias in repeated rounding operations.

```typescript
import { quantize, RoundingMode } from '@/lib/math/decimal';

// At integer boundaries
quantize(D('0.5'), 0) // 0 (to even)
quantize(D('1.5'), 0) // 2 (to even)
quantize(D('2.5'), 0) // 2 (to even)
quantize(D('3.5'), 0) // 4 (to even)

// At currency boundaries (.005)
quantizeCurrency(D('123.445')) // '123.44' (to even)
quantizeCurrency(D('123.455')) // '123.46' (to even)
quantizeCurrency(D('123.465')) // '123.46' (to even)
quantizeCurrency(D('123.475')) // '123.48' (to even)
```

### Why Banker's Rounding?

Traditional "round half up" creates upward bias:
```
Sum([0.5, 1.5, 2.5, 3.5]) = 8
Round half up: [1, 2, 3, 4] = 10 (bias: +2)
Banker's rounding: [0, 2, 2, 4] = 8 (bias: 0)
```

## Arithmetic Operations

```typescript
import { add, subtract, multiply, divide, power, sqrt, abs } from '@/lib/math/decimal';

// Basic arithmetic
add(D('10.5'), D('20.3')) // 30.8
subtract(D('100'), D('25')) // 75
multiply(D('12.5'), D('8')) // 100
divide(D('100'), D('3')) // 33.333333333333...

// Advanced
power(D('2'), D('10')) // 1024
sqrt(D('144')) // 12
abs(D('-50')) // 50
```

## Aggregation Operations

```typescript
import { sum, average, weightedAverage, min, max } from '@/lib/math/decimal';

const values = [D('10'), D('20'), D('30')];

sum(values) // 60
average(values) // 20
min(values) // 10
max(values) // 30

// Weighted average
weightedAverage(
  [D('100'), D('200')],
  [D('0.6'), D('0.4')]
) // 140 (100*0.6 + 200*0.4)
```

## Controls (Caps/Floors)

```typescript
import { cap, applyFloor, clamp } from '@/lib/math/decimal';

// Apply cap (maximum)
cap(D('150'), D('100')) // 100

// Apply floor (minimum)
applyFloor(D('50'), D('100')) // 100

// Clamp between min and max
clamp(D('50'), D('100'), D('200')) // 100 (below min)
clamp(D('150'), D('100'), D('200')) // 150 (within range)
clamp(D('250'), D('100'), D('200')) // 200 (above max)
```

## Percentage Operations

```typescript
import { percentageChange, applyPercentage } from '@/lib/math/decimal';

// Calculate percentage change
percentageChange(D('100'), D('115')) // 0.15 (15% increase)
percentageChange(D('100'), D('85')) // -0.15 (15% decrease)

// Apply percentage
applyPercentage(D('100'), D('0.15')) // 115 (100 + 15%)
applyPercentage(D('100'), D('-0.15')) // 85 (100 - 15%)
```

## Vectorized Operations (Performance)

For processing arrays of values efficiently:

```typescript
import { addArrays, multiplyArrays, quantizeArray } from '@/lib/math/decimal';

const a = [D('10'), D('20'), D('30')];
const b = [D('5'), D('10'), D('15')];

// Element-wise addition
addArrays(a, b) // [15, 30, 45]

// Element-wise multiplication
multiplyArrays(a, b) // [50, 200, 450]

// Quantize entire array
quantizeArray([D('10.555'), D('20.555')], 2) // ['10.56', '20.56']
```

## Comparison Operations

```typescript
import { equals, greaterThan, lessThan, isZero, isPositive, isNegative } from '@/lib/math/decimal';

equals(D('123.45'), D('123.45')) // true
greaterThan(D('100'), D('99')) // true
lessThan(D('99'), D('100')) // true

isZero(D('0')) // true
isPositive(D('10')) // true
isNegative(D('-10')) // true
```

## Formatting

```typescript
import { formatCurrency, toFixed, toString } from '@/lib/math/decimal';

const value = D('1234.567');

formatCurrency(value, '$') // '$1234.57'
toFixed(value, 2) // '1234.57'
toString(value) // '1234.567'
```

## Real-World Examples

### Example 1: Commodity Pricing with Index

```typescript
import { D, add, multiply, quantizeCurrency } from '@/lib/math/decimal';

// Brent crude index + premium
const brentIndex = D('75.50'); // USD/bbl
const premium = D('5.00'); // USD/bbl
const pricePerBbl = add(brentIndex, premium); // 80.50

// Convert bbl to MT (metric ton) using density
const density = D('7.3'); // bbl per MT
const pricePerMT = multiply(pricePerBbl, density); // 587.65

// Round to currency
const final = quantizeCurrency(pricePerMT); // '587.65'
```

### Example 2: Price with Cap and Floor

```typescript
import { D, add, clamp, quantizeCurrency } from '@/lib/math/decimal';

const basePrice = D('1000');
const indexAdjustment = D('250');
const adjustedPrice = add(basePrice, indexAdjustment); // 1250

// Apply collar (floor 500, cap 1200)
const controlled = clamp(adjustedPrice, D('500'), D('1200')); // 1200
const final = quantizeCurrency(controlled); // '1200.00'
```

### Example 3: Weighted Average of Indices

```typescript
import { D, weightedAverage, quantizeCurrency } from '@/lib/math/decimal';

// 60% Brent, 40% WTI
const brent = D('75.00');
const wti = D('72.50');

const blended = weightedAverage(
  [brent, wti],
  [D('0.6'), D('0.4')]
); // 74.00

const final = quantizeCurrency(blended); // '74.00'
```

### Example 4: 3-Month Rolling Average

```typescript
import { D, average, quantizeCurrency } from '@/lib/math/decimal';

const prices = [
  D('75.00'), // Month 1
  D('77.50'), // Month 2
  D('76.25'), // Month 3
];

const avg = average(prices); // 76.25
const final = quantizeCurrency(avg); // '76.25'
```

## Per-Item Precision

Different items may require different precision levels:

```typescript
import { D, quantize } from '@/lib/math/decimal';

// Whole number pricing (precision 0)
const wholesalePrice = quantize(D('99.67'), 0); // 100

// Currency pricing (precision 2)
const retailPrice = quantize(D('99.67891'), 2); // '99.68'

// Commodity pricing (precision 4)
const commodityPrice = quantize(D('1234.56789'), 4); // '1234.5679'
```

Store precision in `Item` model:

```typescript
interface Item {
  id: string;
  basePrice: Decimal;
  pricePrecision: number; // 0, 2, 4, etc.
}

// When quantizing final price
const finalPrice = quantize(calculatedPrice, item.pricePrecision);
```

## Best Practices

### 1. Always Use Strings for Input

```typescript
// ❌ Bad: Loses precision
const price = D(123.456789012345); // JavaScript rounds to ~123.45678901234499

// ✅ Good: Exact precision
const price = D('123.456789012345');
```

### 2. Quantize at the End

```typescript
// ❌ Bad: Quantize early, lose precision in subsequent calculations
const a = quantizeCurrency(D('10.555')); // 10.56
const b = multiply(a, D('100')); // 1056.00 (lost 0.005 * 100 = 0.50)

// ✅ Good: Keep full precision until final result
const a = D('10.555');
const b = multiply(a, D('100')); // 1055.50
const final = quantizeCurrency(b); // 1055.50
```

### 3. Use Banker's Rounding for Repeated Operations

```typescript
// ✅ Good: Banker's rounding reduces bias
const values = [D('0.5'), D('1.5'), D('2.5'), D('3.5')];
const rounded = values.map(v => quantizeWhole(v)); // [0, 2, 2, 4] = 8 (unbiased)
```

### 4. Store Precision Per Item

```typescript
// ✅ Good: Different items, different precision
const wholesaleItem = { precision: 0 }; // Whole numbers
const retailItem = { precision: 2 }; // Currency
const commodityItem = { precision: 4 }; // High precision
```

### 5. Handle Division by Zero

```typescript
// ❌ Bad: Unhandled error
const result = divide(D('100'), D('0')); // Throws

// ✅ Good: Handle explicitly
try {
  const result = divide(D('100'), denominator);
} catch (error) {
  // Handle division by zero
}
```

## Performance Considerations

### Decimal vs Number

Decimal operations are ~10-50x slower than native number operations, but:
- **Accuracy** trumps speed for financial calculations
- Vectorized operations minimize overhead
- Only calculate when needed (cache results)

### Vectorized Operations

```typescript
// ❌ Slower: Individual operations
const results = values.map(v => add(v, premium));

// ✅ Faster: Vectorized (if available)
const results = addScalar(values, premium);
```

### Memoization

```typescript
// Cache expensive calculations
const cache = new Map<string, Decimal>();

function expensiveCalc(input: Decimal): Decimal {
  const key = input.toString();
  if (cache.has(key)) return cache.get(key)!;

  const result = /* expensive calculation */;
  cache.set(key, result);
  return result;
}
```

## Integration with Database

Prisma `Decimal` type maps to PostgreSQL `DECIMAL(20,12)`:

```typescript
import { Decimal as PrismaDecimal } from '@prisma/client/runtime/library';
import { D } from '@/lib/math/decimal';

// From database to decimal.js
const dbValue: PrismaDecimal = item.basePrice;
const decimal = D(dbValue.toString());

// From decimal.js to database
const calculated = add(D('100'), D('50'));
await prisma.item.update({
  where: { id },
  data: { basePrice: calculated.toString() }
});
```

## Troubleshooting

### "Unexpected floating-point result"

**Problem:** Using JavaScript numbers instead of Decimals
```typescript
// ❌ Wrong
const result = D(0.1 + 0.2); // JavaScript adds first: 0.30000000000000004

// ✅ Correct
const result = add(D('0.1'), D('0.2')); // '0.3'
```

### "Weights must sum to 1.0"

**Problem:** Floating-point errors in weights
```typescript
// ❌ Wrong
weightedAverage(values, [D(0.6), D(0.4)]); // May not sum to exactly 1.0

// ✅ Correct
weightedAverage(values, [D('0.6'), D('0.4')]); // Exact 1.0
```

### "Division by zero"

**Problem:** Dividing by zero
```typescript
// ✅ Check before dividing
if (!isZero(denominator)) {
  const result = divide(numerator, denominator);
}
```

## Related Files

- [lib/math/decimal.ts](../lib/math/decimal.ts) - Implementation
- [__tests__/lib/math/decimal.spec.ts](../__tests__/lib/math/decimal.spec.ts) - Tests

## Related Issues

- [Issue #20](https://github.com/Numraio/cpam/issues/20) - Decimal math engine (this document)
- [Issue #19](https://github.com/Numraio/cpam/issues/19) - Graph compiler (uses decimal math)
- [Issue #22](https://github.com/Numraio/cpam/issues/22) - Calc orchestrator (uses decimal math)
