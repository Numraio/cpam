/**
 * Tests for UoM Conversions
 */

import { D } from '@/lib/calc/decimal';
import {
  convert,
  volumeToMass,
  massToVolume,
  getDensity,
  areUnitsCompatible,
  validateConversionRequired,
} from '@/lib/uom/conversions';

describe('UoM - Basic Conversions', () => {
  it('converts kg to t (metric tons)', () => {
    const result = convert(D(1000), 'kg', 't');
    expect(result.toNumber()).toBe(1);
  });

  it('converts t to kg', () => {
    const result = convert(D(2.5), 't', 'kg');
    expect(result.toNumber()).toBe(2500);
  });

  it('converts L to m³', () => {
    const result = convert(D(1000), 'L', 'm3');
    expect(result.toNumber()).toBe(1);
  });

  it('converts m³ to L', () => {
    const result = convert(D(1), 'm3', 'L');
    expect(result.toNumber()).toBe(1000);
  });

  it('throws error for incompatible units', () => {
    expect(() => convert(D(100), 'kg', 'L')).toThrow(/Incompatible units/);
    expect(() => convert(D(100), 'kg', 'L')).toThrow(/density-based conversion/);
  });
});

describe('UoM - Density Conversions', () => {
  it('converts volume to mass using density', () => {
    // 100 L of crude oil (density 0.85 kg/L) = 85 kg
    const result = volumeToMass(D(100), 'L', 'kg', 0.85);
    expect(result.toNumber()).toBe(85);
  });

  it('converts mass to volume using density', () => {
    // 85 kg of crude oil (density 0.85 kg/L) = 100 L
    const result = massToVolume(D(85), 'kg', 'L', 0.85);
    expect(result.toNumber()).toBe(100);
  });

  it('handles unit conversion in density calculation', () => {
    // 1 bbl (158.987 L) of crude oil = 135.14 kg
    const result = volumeToMass(D(1), 'bbl', 'kg', 0.85);
    expect(result.toNumber()).toBeCloseTo(135.14, 2);
  });
});

describe('UoM - Validation', () => {
  it('identifies compatible units', () => {
    expect(areUnitsCompatible('kg', 't')).toBe(true);
    expect(areUnitsCompatible('L', 'm3')).toBe(true);
    expect(areUnitsCompatible('kg', 'L')).toBe(false);
  });

  it('validates conversion requirement', () => {
    const error = validateConversionRequired('kg', 'L', false);
    expect(error).toContain('Unit conversion required');
    expect(error).toContain('density');
  });
});

describe('UoM - Acceptance Tests', () => {
  it('Given incompatible units, when compiling graph, then validation error explains required conversion', () => {
    const error = validateConversionRequired('kg', 'bbl', false);

    expect(error).toBeDefined();
    expect(error).toContain('Unit conversion required');
    expect(error).toContain('kg → bbl');
    expect(error).toContain('Convert node');
    expect(error).toContain('density');
  });

  it('Given density override, then conversion follows override with audit note', () => {
    const override = {
      productCode: 'custom-product',
      density: 0.92,
      unit: 'kg/L' as const,
      source: 'Lab test 2024-01-15',
    };

    const densityInfo = getDensity('custom-product', override);

    expect(densityInfo.density).toBe(0.92);
    expect(densityInfo.source).toBe('Lab test 2024-01-15');
  });
});
