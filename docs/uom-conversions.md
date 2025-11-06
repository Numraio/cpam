# Unit of Measure (UoM) Conversions

Comprehensive unit conversion library with density-based mass/volume conversions.

## Overview

The UoM conversion system provides:
- **Standard unit conversions** within categories (mass, volume, length)
- **Density-based conversions** between mass and volume
- **Validation** to ensure unit compatibility
- **Precision** using Decimal.js for accurate calculations

## Supported Units

### Mass Units (Base: kg)
- `kg` - kilogram
- `g` - gram
- `t` / `MT` - metric ton
- `lb` - pound
- `oz` - ounce

### Volume Units (Base: L)
- `L` - liter
- `mL` - milliliter
- `m3` / `m³` - cubic meter
- `gal` - US gallon
- `bbl` - barrel (oil, 42 US gallons)

### Length Units (Base: m)
- `m` - meter
- `cm` - centimeter
- `mm` - millimeter
- `km` - kilometer
- `ft` - foot
- `in` - inch

## Basic Conversions

### Same Category Conversions

```typescript
import { convert, D } from '@/lib/uom/conversions';

// Mass conversions
const tons = convert(D(1000), 'kg', 't');
// → 1 (1000 kg = 1 metric ton)

const kg = convert(D(2.5), 't', 'kg');
// → 2500 (2.5 tons = 2500 kg)

// Volume conversions
const cubicMeters = convert(D(1000), 'L', 'm3');
// → 1 (1000 L = 1 m³)

const liters = convert(D(1), 'bbl', 'L');
// → 158.987 (1 barrel = 158.987 L)

// Length conversions
const meters = convert(D(100), 'cm', 'm');
// → 1 (100 cm = 1 m)
```

### Incompatible Units

```typescript
// This will throw an error
try {
  convert(D(100), 'kg', 'L');
} catch (error) {
  console.error(error.message);
  // → "Incompatible units: Cannot convert mass (kg) to volume (L).
  //    Use density-based conversion for mass/volume conversions."
}
```

## Density-Based Conversions

### Volume to Mass

```typescript
import { volumeToMass, D } from '@/lib/uom/conversions';

// 100 L of crude oil (density 0.85 kg/L) = 85 kg
const mass = volumeToMass(D(100), 'L', 'kg', 0.85);
// → 85

// With unit conversion: 1 bbl of crude oil → kg
const massFromBarrel = volumeToMass(D(1), 'bbl', 'kg', 0.85);
// → 135.14 (1 bbl = 158.987 L × 0.85 kg/L)
```

### Mass to Volume

```typescript
import { massToVolume, D } from '@/lib/uom/conversions';

// 85 kg of crude oil (density 0.85 kg/L) = 100 L
const volume = massToVolume(D(85), 'kg', 'L', 0.85);
// → 100

// With unit conversion: 1000 lb → bbl (using density 0.85 kg/L)
const volumeInBarrels = massToVolume(D(1000), 'lb', 'bbl', 0.85);
// → 2.67 (1000 lb = 453.592 kg, 453.592 / 0.85 = 533.4 L = 3.36 bbl)
```

## Standard Densities

Pre-configured densities for common petroleum products (kg/L):

```typescript
import { STANDARD_DENSITIES, getDensity } from '@/lib/uom/conversions';

// Standard densities
STANDARD_DENSITIES['crude-oil']  // 0.85 kg/L
STANDARD_DENSITIES['gasoline']   // 0.74 kg/L
STANDARD_DENSITIES['diesel']     // 0.85 kg/L
STANDARD_DENSITIES['jet-fuel']   // 0.80 kg/L
STANDARD_DENSITIES['fuel-oil']   // 0.95 kg/L
STANDARD_DENSITIES['water']      // 1.00 kg/L

// Get density with metadata
const densityInfo = getDensity('crude-oil');
// → { density: 0.85, source: 'standard' }
```

## Density Overrides

Override standard densities with product-specific values:

```typescript
import { getDensity, type DensityOverride } from '@/lib/uom/conversions';

const override: DensityOverride = {
  productCode: 'custom-product',
  density: 0.92,
  unit: 'kg/L',
  source: 'Lab test 2024-01-15',
  effectiveDate: new Date('2024-01-15'),
};

const densityInfo = getDensity('custom-product', override);
// → {
//     density: 0.92,
//     source: 'Lab test 2024-01-15'
//   }

// Supports lb/gal (auto-converted to kg/L)
const usOverride: DensityOverride = {
  productCode: 'us-product',
  density: 7.1,
  unit: 'lb/gal',
  source: 'Field measurement',
};

const converted = getDensity('us-product', usOverride);
// → {
//     density: 0.851,  // 7.1 lb/gal × 0.119826 = 0.851 kg/L
//     source: 'Field measurement'
//   }
```

## Validation

### Unit Compatibility

```typescript
import { areUnitsCompatible, getUnitCategory } from '@/lib/uom/conversions';

// Check if units can be converted
areUnitsCompatible('kg', 't');  // → true (both mass)
areUnitsCompatible('L', 'm3');  // → true (both volume)
areUnitsCompatible('kg', 'L');  // → false (mass vs volume)

// Get unit category
getUnitCategory('kg');   // → 'mass'
getUnitCategory('L');    // → 'volume'
getUnitCategory('m');    // → 'length'
getUnitCategory('xyz');  // → undefined
```

### Conversion Validation

```typescript
import { validateConversionRequired } from '@/lib/uom/conversions';

// Validate if conversion is needed
const error1 = validateConversionRequired('kg', 't', false);
// → "Unit conversion required: kg → t. Add a Convert node to perform the conversion."

const error2 = validateConversionRequired('kg', 'bbl', false);
// → "Unit conversion required: kg → bbl. Add a Convert node with density specification for mass/volume conversion."

const error3 = validateConversionRequired('kg', 'kg', false);
// → undefined (no conversion needed)

const error4 = validateConversionRequired('kg', 't', true);
// → undefined (conversion node present)
```

## Integration with PAM Graph

### Convert Node

Use in PAM calculation graphs to convert between units:

```typescript
// Example PAM node configuration
const convertNode = {
  id: 'convert-1',
  type: 'convert',
  config: {
    fromUnit: 'kg',
    toUnit: 't',
  },
  inputs: ['base-price-node'],
};

// For density-based conversion
const densityConvertNode = {
  id: 'convert-2',
  type: 'convert',
  config: {
    fromUnit: 'L',
    toUnit: 'kg',
    productCode: 'crude-oil',
    densityOverride: {
      productCode: 'crude-oil',
      density: 0.87,
      unit: 'kg/L',
      source: 'Contract specification',
    },
  },
  inputs: ['volume-node'],
};
```

### Graph Compilation Validation

The PAM compiler validates unit compatibility:

```typescript
// Compilation error example
const pam = {
  items: [
    {
      id: 'item-1',
      unit: 'kg',  // Mass unit
      basePrice: 100,
      baseCurrency: 'USD',
    },
  ],
  graph: {
    nodes: [
      {
        id: 'output',
        type: 'output',
        inputs: ['factor-1'],  // Returns volume (L)
      },
      {
        id: 'factor-1',
        type: 'factor',
        config: {
          seriesCode: 'OIL-PRICE',
          unit: 'L',  // Volume unit
        },
      },
    ],
  },
};

// Compilation fails with:
// "Unit conversion required: L → kg. Add a Convert node with density specification for mass/volume conversion."
```

## Use Cases

### 1. Oil Trading

```typescript
import { volumeToMass, massToVolume, D } from '@/lib/uom/conversions';

// Buy in barrels, sell in metric tons
const volumeBarrels = D(1000);  // Purchase 1000 barrels
const density = 0.85;  // Crude oil density

// Convert to mass for invoicing
const massKg = volumeToMass(volumeBarrels, 'bbl', 'kg', density);
const massTons = convert(massKg, 'kg', 't');
// → 135.14 metric tons

// Price calculation
const pricePerTon = D(800);  // USD per ton
const totalCost = multiply(massTons, pricePerTon);
// → $108,112
```

### 2. Multi-Unit Contracts

```typescript
// Contract specifies price in $/bbl
// Customer wants price in $/kg

const pricePerBarrel = D(75);  // USD/bbl
const density = 0.85;  // kg/L

// Method 1: Convert price
const volumePerBarrel = convert(D(1), 'bbl', 'L');  // 158.987 L
const massPerBarrel = multiply(volumePerBarrel, D(density));  // 135.14 kg
const pricePerKg = divide(pricePerBarrel, massPerBarrel);
// → $0.555 per kg

// Method 2: Direct conversion
const quantity = D(1000);  // 1000 bbl
const quantityKg = volumeToMass(quantity, 'bbl', 'kg', density);
const totalPrice = multiply(pricePerKg, quantityKg);
```

### 3. Density Variance Handling

```typescript
// Standard contract density: 0.85 kg/L
// Actual shipment density: 0.87 kg/L (heavier)

const volume = D(100);  // 100 barrels
const standardDensity = 0.85;
const actualDensity = 0.87;

const standardMass = volumeToMass(volume, 'bbl', 'kg', standardDensity);
// → 13,514 kg

const actualMass = volumeToMass(volume, 'bbl', 'kg', actualDensity);
// → 13,832 kg

const variance = actualMass.minus(standardMass);
// → +318 kg (2.3% heavier)

// Price adjustment
const pricePerKg = D(0.50);
const adjustment = multiply(variance, pricePerKg);
// → +$159
```

## Error Handling

```typescript
import { convert, getDensity, volumeToMass } from '@/lib/uom/conversions';

// Unknown unit
try {
  convert(D(100), 'xyz', 'kg');
} catch (error) {
  // → "Unknown unit: xyz"
}

// Incompatible units
try {
  convert(D(100), 'kg', 'L');
} catch (error) {
  // → "Incompatible units: Cannot convert mass (kg) to volume (L).
  //    Use density-based conversion for mass/volume conversions."
}

// Missing density
try {
  getDensity('unknown-product');
} catch (error) {
  // → "No density found for product 'unknown-product'.
  //    Please provide a density override or add to standard densities."
}

// Validation error
const error = validateConversionRequired('kg', 'bbl', false);
if (error) {
  console.error(error);
  // → "Unit conversion required: kg → bbl.
  //    Add a Convert node with density specification for mass/volume conversion."
}
```

## Best Practices

### 1. Always Validate Units

```typescript
// Before conversion
if (!areUnitsCompatible(fromUnit, toUnit)) {
  const fromCat = getUnitCategory(fromUnit);
  const toCat = getUnitCategory(toUnit);

  if ((fromCat === 'mass' && toCat === 'volume') ||
      (fromCat === 'volume' && toCat === 'mass')) {
    // Require density
    throw new Error('Density required for mass/volume conversion');
  } else {
    throw new Error(`Cannot convert ${fromCat} to ${toCat}`);
  }
}
```

### 2. Use Standard Densities When Available

```typescript
// Good: Use standard density
const density = STANDARD_DENSITIES['crude-oil'];
const mass = volumeToMass(volume, 'L', 'kg', density);

// Better: Use getDensity() for metadata
const { density, source } = getDensity('crude-oil');
const mass = volumeToMass(volume, 'L', 'kg', density);
// source = 'standard'
```

### 3. Document Density Overrides

```typescript
// Always include source and effective date
const override: DensityOverride = {
  productCode: 'WTI-2024-Q1',
  density: 0.87,
  unit: 'kg/L',
  source: 'Lab analysis report #12345',
  effectiveDate: new Date('2024-01-15'),
};

// Audit trail
auditLog.log({
  action: 'DENSITY_OVERRIDE',
  productCode: override.productCode,
  density: override.density,
  source: override.source,
  effectiveDate: override.effectiveDate,
});
```

### 4. Handle Edge Cases

```typescript
// Zero values
const result1 = convert(D(0), 'kg', 't');
// → 0 (always valid)

// Same unit
const result2 = convert(D(100), 'kg', 'kg');
// → 100 (no conversion)

// Very small values
const result3 = convert(D(0.001), 'kg', 'g');
// → 1 (0.001 kg = 1 g)

// Very large values
const result4 = convert(D(1000000), 'kg', 't');
// → 1000 (1,000,000 kg = 1000 metric tons)
```

## Performance

- **Conversion**: O(1) - Direct multiplication/division
- **Validation**: O(1) - Hash map lookup
- **No external API calls** - All conversions local
- **Decimal precision** - No floating-point errors

## Related Documentation

- [PAM Graph Executor](./pam-graph-executor.md) - Convert node integration
- [Calculation Orchestrator](./calculation-orchestrator.md) - Unit handling in calculations
- [Price Math Report](./price-math-report.md) - Unit display in reports

## Future Enhancements

- Area units (m², ft², acres)
- Energy units (BTU, kWh, GJ)
- Temperature conversions (°C, °F, K)
- Pressure units (psi, bar, Pa)
- Custom unit definitions via database
- Historical density tracking
