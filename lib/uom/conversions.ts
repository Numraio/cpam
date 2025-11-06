/**
 * Unit of Measure (UoM) Conversions
 *
 * Provides:
 * - Unit conversion library (mass, volume, length, etc.)
 * - Density-based conversions (volume ↔ mass)
 * - Validation of unit compatibility
 */

import { D, multiply, divide, type DecimalValue } from '../calc/decimal';

// ============================================================================
// Types
// ============================================================================

export type UnitCategory = 'mass' | 'volume' | 'length' | 'area' | 'energy' | 'temperature';

export interface Unit {
  symbol: string;
  name: string;
  category: UnitCategory;
  toBase: DecimalValue; // Conversion factor to base unit
}

export interface DensityOverride {
  productCode: string;
  density: number; // kg/L or lb/gal
  unit: 'kg/L' | 'lb/gal';
  source?: string;
  effectiveDate?: Date;
}

// ============================================================================
// Unit Definitions
// ============================================================================

/**
 * Mass units (base: kg)
 */
export const MASS_UNITS: Record<string, Unit> = {
  kg: { symbol: 'kg', name: 'kilogram', category: 'mass', toBase: D(1) },
  g: { symbol: 'g', name: 'gram', category: 'mass', toBase: D(0.001) },
  t: { symbol: 't', name: 'metric ton', category: 'mass', toBase: D(1000) },
  MT: { symbol: 'MT', name: 'metric ton', category: 'mass', toBase: D(1000) },
  lb: { symbol: 'lb', name: 'pound', category: 'mass', toBase: D(0.453592) },
  oz: { symbol: 'oz', name: 'ounce', category: 'mass', toBase: D(0.0283495) },
};

/**
 * Volume units (base: L)
 */
export const VOLUME_UNITS: Record<string, Unit> = {
  L: { symbol: 'L', name: 'liter', category: 'volume', toBase: D(1) },
  mL: { symbol: 'mL', name: 'milliliter', category: 'volume', toBase: D(0.001) },
  m3: { symbol: 'm3', name: 'cubic meter', category: 'volume', toBase: D(1000) },
  'm³': { symbol: 'm³', name: 'cubic meter', category: 'volume', toBase: D(1000) },
  gal: { symbol: 'gal', name: 'US gallon', category: 'volume', toBase: D(3.78541) },
  bbl: { symbol: 'bbl', name: 'barrel (oil)', category: 'volume', toBase: D(158.987) },
};

/**
 * Length units (base: m)
 */
export const LENGTH_UNITS: Record<string, Unit> = {
  m: { symbol: 'm', name: 'meter', category: 'length', toBase: D(1) },
  cm: { symbol: 'cm', name: 'centimeter', category: 'length', toBase: D(0.01) },
  mm: { symbol: 'mm', name: 'millimeter', category: 'length', toBase: D(0.001) },
  km: { symbol: 'km', name: 'kilometer', category: 'length', toBase: D(1000) },
  ft: { symbol: 'ft', name: 'foot', category: 'length', toBase: D(0.3048) },
  in: { symbol: 'in', name: 'inch', category: 'length', toBase: D(0.0254) },
};

/**
 * All units combined
 */
export const ALL_UNITS: Record<string, Unit> = {
  ...MASS_UNITS,
  ...VOLUME_UNITS,
  ...LENGTH_UNITS,
};

// ============================================================================
// Standard Densities (kg/L)
// ============================================================================

/**
 * Common product densities for volume/mass conversion
 */
export const STANDARD_DENSITIES: Record<string, number> = {
  // Petroleum products
  'crude-oil': 0.85, // kg/L
  'gasoline': 0.74,
  'diesel': 0.85,
  'jet-fuel': 0.80,
  'fuel-oil': 0.95,

  // Liquids
  'water': 1.0,
  'ethanol': 0.789,

  // Gases (at STP)
  'natural-gas': 0.0007, // kg/L (very approximate)
};

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts value from one unit to another
 *
 * @param value - Value to convert
 * @param fromUnit - Source unit symbol
 * @param toUnit - Target unit symbol
 * @returns Converted value
 * @throws Error if units are incompatible
 */
export function convert(
  value: DecimalValue,
  fromUnit: string,
  toUnit: string
): DecimalValue {
  // Same unit - no conversion needed
  if (fromUnit === toUnit) {
    return value;
  }

  const from = ALL_UNITS[fromUnit];
  const to = ALL_UNITS[toUnit];

  if (!from) {
    throw new Error(`Unknown unit: ${fromUnit}`);
  }

  if (!to) {
    throw new Error(`Unknown unit: ${toUnit}`);
  }

  // Check compatibility
  if (from.category !== to.category) {
    throw new Error(
      `Incompatible units: Cannot convert ${from.category} (${fromUnit}) to ${to.category} (${toUnit}). ` +
      `Use density-based conversion for mass/volume conversions.`
    );
  }

  // Convert: value → base unit → target unit
  const inBase = multiply(value, from.toBase);
  const inTarget = divide(inBase, to.toBase);

  return inTarget;
}

/**
 * Converts volume to mass using density
 *
 * @param volume - Volume value
 * @param volumeUnit - Volume unit (L, gal, etc.)
 * @param massUnit - Target mass unit (kg, lb, etc.)
 * @param density - Density in kg/L
 * @returns Mass value
 */
export function volumeToMass(
  volume: DecimalValue,
  volumeUnit: string,
  massUnit: string,
  density: number
): DecimalValue {
  // Convert volume to liters (base unit)
  const volumeInLiters = convert(volume, volumeUnit, 'L');

  // Apply density (kg/L) to get mass in kg
  const massInKg = multiply(volumeInLiters, D(density));

  // Convert to target mass unit
  return convert(massInKg, 'kg', massUnit);
}

/**
 * Converts mass to volume using density
 *
 * @param mass - Mass value
 * @param massUnit - Mass unit (kg, lb, etc.)
 * @param volumeUnit - Target volume unit (L, gal, etc.)
 * @param density - Density in kg/L
 * @returns Volume value
 */
export function massToVolume(
  mass: DecimalValue,
  massUnit: string,
  volumeUnit: string,
  density: number
): DecimalValue {
  // Convert mass to kg (base unit)
  const massInKg = convert(mass, massUnit, 'kg');

  // Apply density to get volume in liters
  const volumeInLiters = divide(massInKg, D(density));

  // Convert to target volume unit
  return convert(volumeInLiters, 'L', volumeUnit);
}

/**
 * Gets density for a product
 *
 * @param productCode - Product code
 * @param override - Optional density override
 * @returns Density in kg/L
 */
export function getDensity(
  productCode: string,
  override?: DensityOverride
): { density: number; source: string } {
  // Use override if provided
  if (override) {
    let density = override.density;

    // Convert lb/gal to kg/L if needed
    if (override.unit === 'lb/gal') {
      density = density * 0.119826; // lb/gal to kg/L
    }

    return {
      density,
      source: override.source || 'override',
    };
  }

  // Use standard density
  const standardDensity = STANDARD_DENSITIES[productCode];

  if (standardDensity) {
    return {
      density: standardDensity,
      source: 'standard',
    };
  }

  throw new Error(
    `No density found for product '${productCode}'. ` +
    `Please provide a density override or add to standard densities.`
  );
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that two units are compatible (same category)
 *
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @returns True if compatible
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const u1 = ALL_UNITS[unit1];
  const u2 = ALL_UNITS[unit2];

  if (!u1 || !u2) {
    return false;
  }

  return u1.category === u2.category;
}

/**
 * Gets category for a unit
 *
 * @param unit - Unit symbol
 * @returns Category or undefined
 */
export function getUnitCategory(unit: string): UnitCategory | undefined {
  return ALL_UNITS[unit]?.category;
}

/**
 * Checks if a unit is a mass unit
 */
export function isMassUnit(unit: string): boolean {
  return getUnitCategory(unit) === 'mass';
}

/**
 * Checks if a unit is a volume unit
 */
export function isVolumeUnit(unit: string): boolean {
  return getUnitCategory(unit) === 'volume';
}

/**
 * Validates unit conversion requirement
 *
 * Returns error message if conversion is required but not provided
 *
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @param hasConversion - Whether conversion node exists
 * @returns Error message or undefined
 */
export function validateConversionRequired(
  fromUnit: string,
  toUnit: string,
  hasConversion: boolean
): string | undefined {
  if (fromUnit === toUnit) {
    return undefined; // No conversion needed
  }

  if (!areUnitsCompatible(fromUnit, toUnit)) {
    // Incompatible units - check if mass/volume conversion
    const fromCat = getUnitCategory(fromUnit);
    const toCat = getUnitCategory(toUnit);

    if (
      (fromCat === 'mass' && toCat === 'volume') ||
      (fromCat === 'volume' && toCat === 'mass')
    ) {
      if (!hasConversion) {
        return (
          `Unit conversion required: ${fromUnit} → ${toUnit}. ` +
          `Add a Convert node with density specification for mass/volume conversion.`
        );
      }
    } else {
      return (
        `Incompatible units: Cannot convert ${fromCat} (${fromUnit}) to ${toCat} (${toUnit}). ` +
        `Units must be in the same category or use density for mass/volume conversion.`
      );
    }
  } else if (!hasConversion) {
    // Compatible but different units - conversion node required
    return (
      `Unit conversion required: ${fromUnit} → ${toUnit}. ` +
      `Add a Convert node to perform the conversion.`
    );
  }

  return undefined;
}
