/**
 * Decimal Math Engine Tests
 *
 * Tests for fixed-point decimal arithmetic including:
 * - Banker's rounding edge cases
 * - Precision enforcement
 * - Vectorized operations
 * - Financial calculations
 */

import {
  D,
  quantize,
  quantizeWhole,
  quantizeCurrency,
  RoundingMode,
  add,
  subtract,
  multiply,
  divide,
  sum,
  average,
  weightedAverage,
  min,
  max,
  clamp,
  cap,
  applyFloor,
  percentageChange,
  applyPercentage,
  equals,
  greaterThan,
  lessThan,
  toFixed,
  formatCurrency,
  INTERNAL_PRECISION,
  addArrays,
  multiplyArrays,
  quantizeArray,
} from '@/lib/math/decimal';

describe('Decimal Math Engine', () => {
  describe('Basic Construction', () => {
    it('should create decimal from number', () => {
      const d = D(123.456);
      expect(d.toString()).toBe('123.456');
    });

    it('should create decimal from string', () => {
      const d = D('123.456789012345');
      expect(d.toString()).toBe('123.456789012345');
    });

    it('should handle very large numbers', () => {
      const d = D('9999999999.999999999999');
      expect(d.toString()).toBe('9999999999.999999999999');
    });

    it('should handle very small numbers', () => {
      const d = D('0.000000000001');
      expect(d.toString()).toBe('0.000000000001');
    });
  });

  describe('Banker\'s Rounding (ROUND_HALF_EVEN)', () => {
    describe('Edge Cases at .5 Boundary', () => {
      it('should round 0.5 to 0 (nearest even)', () => {
        const result = quantize(D('0.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(0);
      });

      it('should round 1.5 to 2 (nearest even)', () => {
        const result = quantize(D('1.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(2);
      });

      it('should round 2.5 to 2 (nearest even)', () => {
        const result = quantize(D('2.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(2);
      });

      it('should round 3.5 to 4 (nearest even)', () => {
        const result = quantize(D('3.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(4);
      });

      it('should round 4.5 to 4 (nearest even)', () => {
        const result = quantize(D('4.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(4);
      });

      it('should round 5.5 to 6 (nearest even)', () => {
        const result = quantize(D('5.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(6);
      });
    });

    describe('Currency Rounding (.005 boundary)', () => {
      it('should round 123.445 to 123.44 (even)', () => {
        const result = quantizeCurrency(D('123.445'));
        expect(result.toString()).toBe('123.44');
      });

      it('should round 123.455 to 123.46 (even)', () => {
        const result = quantizeCurrency(D('123.455'));
        expect(result.toString()).toBe('123.46');
      });

      it('should round 123.465 to 123.46 (even)', () => {
        const result = quantizeCurrency(D('123.465'));
        expect(result.toString()).toBe('123.46');
      });

      it('should round 123.475 to 123.48 (even)', () => {
        const result = quantizeCurrency(D('123.475'));
        expect(result.toString()).toBe('123.48');
      });

      it('should round 123.485 to 123.48 (even)', () => {
        const result = quantizeCurrency(D('123.485'));
        expect(result.toString()).toBe('123.48');
      });

      it('should round 123.495 to 123.50 (even)', () => {
        const result = quantizeCurrency(D('123.495'));
        expect(result.toString()).toBe('123.50');
      });
    });

    describe('Negative Values', () => {
      it('should round -0.5 to 0 (nearest even)', () => {
        const result = quantize(D('-0.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(0);
      });

      it('should round -1.5 to -2 (nearest even)', () => {
        const result = quantize(D('-1.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(-2);
      });

      it('should round -2.5 to -2 (nearest even)', () => {
        const result = quantize(D('-2.5'), 0, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toNumber()).toBe(-2);
      });
    });
  });

  describe('Precision Enforcement', () => {
    it('should enforce 0 decimal places (whole numbers)', () => {
      const result = quantizeWhole(D('123.789'));
      expect(result.toString()).toBe('124');
    });

    it('should enforce 2 decimal places (currency)', () => {
      const result = quantizeCurrency(D('123.456789'));
      expect(result.toString()).toBe('123.46');
    });

    it('should enforce 12 decimal places (internal precision)', () => {
      const result = quantize(D('123.1234567890123456'), INTERNAL_PRECISION);
      expect(result.toString()).toBe('123.123456789012');
    });

    it('should handle item precision 0 (whole number pricing)', () => {
      const price = D('99.67');
      const quantized = quantize(price, 0);
      expect(quantized.toNumber()).toBe(100);
    });

    it('should handle item precision 2 (currency pricing)', () => {
      const price = D('99.67891');
      const quantized = quantize(price, 2);
      expect(quantized.toString()).toBe('99.68');
    });

    it('should handle item precision 4 (commodity pricing)', () => {
      const price = D('1234.56789012');
      const quantized = quantize(price, 4);
      expect(quantized.toString()).toBe('1234.5679');
    });
  });

  describe('Basic Arithmetic', () => {
    it('should add without floating point errors', () => {
      const result = add(D('0.1'), D('0.2'));
      expect(result.toString()).toBe('0.3'); // Not 0.30000000000000004
    });

    it('should subtract accurately', () => {
      const result = subtract(D('1.0'), D('0.9'));
      expect(result.toString()).toBe('0.1'); // Not 0.09999999999999998
    });

    it('should multiply accurately', () => {
      const result = multiply(D('0.1'), D('0.2'));
      expect(result.toString()).toBe('0.02');
    });

    it('should divide accurately', () => {
      const result = divide(D('1'), D('3'));
      // Result has 12dp precision
      expect(result.toFixed(12)).toBe('0.333333333333');
    });

    it('should throw on division by zero', () => {
      expect(() => divide(D('1'), D('0'))).toThrow('Division by zero');
    });
  });

  describe('Aggregation Operations', () => {
    it('should sum array of decimals', () => {
      const values = [D('10.5'), D('20.3'), D('30.2')];
      const result = sum(values);
      expect(result.toString()).toBe('61');
    });

    it('should calculate average', () => {
      const values = [D('10'), D('20'), D('30')];
      const result = average(values);
      expect(result.toString()).toBe('20');
    });

    it('should calculate weighted average', () => {
      const values = [D('100'), D('200')];
      const weights = [D('0.6'), D('0.4')];
      const result = weightedAverage(values, weights);
      expect(result.toString()).toBe('140'); // 100*0.6 + 200*0.4
    });

    it('should throw if weighted average weights don\'t sum to 1', () => {
      const values = [D('100'), D('200')];
      const weights = [D('0.5'), D('0.3')]; // Sum = 0.8, not 1.0
      expect(() => weightedAverage(values, weights)).toThrow('must sum to 1.0');
    });

    it('should find minimum', () => {
      const values = [D('10.5'), D('5.2'), D('30.8')];
      const result = min(values);
      expect(result.toString()).toBe('5.2');
    });

    it('should find maximum', () => {
      const values = [D('10.5'), D('5.2'), D('30.8')];
      const result = max(values);
      expect(result.toString()).toBe('30.8');
    });
  });

  describe('Controls (Caps/Floors)', () => {
    it('should apply cap', () => {
      const result = cap(D('150'), D('100'));
      expect(result.toString()).toBe('100');
    });

    it('should not apply cap if value below cap', () => {
      const result = cap(D('80'), D('100'));
      expect(result.toString()).toBe('80');
    });

    it('should apply floor', () => {
      const result = applyFloor(D('50'), D('100'));
      expect(result.toString()).toBe('100');
    });

    it('should not apply floor if value above floor', () => {
      const result = applyFloor(D('150'), D('100'));
      expect(result.toString()).toBe('150');
    });

    it('should clamp value between min and max', () => {
      expect(clamp(D('50'), D('100'), D('200')).toString()).toBe('100'); // Below min
      expect(clamp(D('150'), D('100'), D('200')).toString()).toBe('150'); // Within range
      expect(clamp(D('250'), D('100'), D('200')).toString()).toBe('200'); // Above max
    });
  });

  describe('Percentage Operations', () => {
    it('should calculate percentage change', () => {
      const result = percentageChange(D('100'), D('115'));
      expect(result.toString()).toBe('0.15'); // 15% increase
    });

    it('should calculate negative percentage change', () => {
      const result = percentageChange(D('100'), D('85'));
      expect(result.toString()).toBe('-0.15'); // 15% decrease
    });

    it('should apply percentage increase', () => {
      const result = applyPercentage(D('100'), D('0.15'));
      expect(result.toString()).toBe('115'); // 100 + 15%
    });

    it('should apply percentage decrease', () => {
      const result = applyPercentage(D('100'), D('-0.15'));
      expect(result.toString()).toBe('85'); // 100 - 15%
    });
  });

  describe('Vectorized Operations', () => {
    it('should add arrays element-wise', () => {
      const a = [D('10'), D('20'), D('30')];
      const b = [D('5'), D('10'), D('15')];
      const result = addArrays(a, b);

      expect(result.map(v => v.toString())).toEqual(['15', '30', '45']);
    });

    it('should multiply arrays element-wise', () => {
      const a = [D('10'), D('20'), D('30')];
      const b = [D('2'), D('3'), D('4')];
      const result = multiplyArrays(a, b);

      expect(result.map(v => v.toString())).toEqual(['20', '60', '120']);
    });

    it('should quantize entire array', () => {
      const values = [D('10.555'), D('20.555'), D('30.555')];
      const result = quantizeArray(values, 2);

      expect(result.map(v => v.toString())).toEqual(['10.56', '20.56', '30.56']);
    });

    it('should throw if arrays have different lengths', () => {
      const a = [D('10'), D('20')];
      const b = [D('5')];

      expect(() => addArrays(a, b)).toThrow('same length');
    });
  });

  describe('Comparison Operations', () => {
    it('should compare equality', () => {
      expect(equals(D('123.45'), D('123.45'))).toBe(true);
      expect(equals(D('123.45'), D('123.46'))).toBe(false);
    });

    it('should compare greater than', () => {
      expect(greaterThan(D('100'), D('99'))).toBe(true);
      expect(greaterThan(D('100'), D('100'))).toBe(false);
      expect(greaterThan(D('100'), D('101'))).toBe(false);
    });

    it('should compare less than', () => {
      expect(lessThan(D('99'), D('100'))).toBe(true);
      expect(lessThan(D('100'), D('100'))).toBe(false);
      expect(lessThan(D('101'), D('100'))).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('should format as currency', () => {
      const result = formatCurrency(D('1234.567'), '$');
      expect(result).toBe('$1234.57');
    });

    it('should format to fixed decimal places', () => {
      const result = toFixed(D('123.456789'), 4);
      expect(result).toBe('123.4568');
    });
  });

  describe('Financial Calculations (Real-World Examples)', () => {
    it('should calculate commodity price with index + premium', () => {
      const brentIndex = D('75.50'); // USD/bbl
      const premium = D('5.00'); // USD/bbl
      const price = add(brentIndex, premium);

      expect(price.toString()).toBe('80.5');
    });

    it('should convert bbl to MT with density', () => {
      const pricePerBbl = D('80.50'); // USD/bbl
      const density = D('7.3'); // bbl per MT
      const pricePerMT = multiply(pricePerBbl, density);

      expect(quantizeCurrency(pricePerMT).toString()).toBe('587.65');
    });

    it('should apply cap and floor (collar)', () => {
      const price1 = D('1200'); // Above cap
      const price2 = D('500'); // Within collar
      const price3 = D('50'); // Below floor

      const capped1 = clamp(price1, D('100'), D('1000'));
      const capped2 = clamp(price2, D('100'), D('1000'));
      const capped3 = clamp(price3, D('100'), D('1000'));

      expect(capped1.toString()).toBe('1000');
      expect(capped2.toString()).toBe('500');
      expect(capped3.toString()).toBe('100');
    });

    it('should calculate 3-month rolling average', () => {
      const month1 = D('75.00');
      const month2 = D('77.50');
      const month3 = D('76.25');

      const avg = average([month1, month2, month3]);
      expect(quantizeCurrency(avg).toString()).toBe('76.25');
    });

    it('should handle complex formula: (Index * Multiplier + Premium) with Cap', () => {
      const index = D('1000');
      const multiplier = D('1.15');
      const premium = D('50');
      const capValue = D('1200');

      const calculated = add(multiply(index, multiplier), premium);
      const final = cap(calculated, capValue);

      expect(final.toString()).toBe('1200'); // (1000 * 1.15 + 50) = 1200, capped at 1200
    });
  });

  describe('Acceptance Tests', () => {
    it('Given values near .005 boundary, then banker\'s rounding behaves as spec', () => {
      // Test multiple .005 boundaries
      const test Cases = [
        { input: '0.005', decimals: 2, expected: '0.00' }, // Round to even (0)
        { input: '0.015', decimals: 2, expected: '0.02' }, // Round to even (2)
        { input: '0.025', decimals: 2, expected: '0.02' }, // Round to even (2)
        { input: '0.035', decimals: 2, expected: '0.04' }, // Round to even (4)
        { input: '0.045', decimals: 2, expected: '0.04' }, // Round to even (4)
        { input: '0.055', decimals: 2, expected: '0.06' }, // Round to even (6)
      ];

      testCases.forEach(({ input, decimals, expected }) => {
        const result = quantize(D(input), decimals, RoundingMode.ROUND_HALF_EVEN);
        expect(result.toString()).toBe(expected);
      });
    });

    it('Given item precision 0, then whole-number pricing enforced', () => {
      const prices = [
        D('99.1'),
        D('99.5'),
        D('99.9'),
        D('100.1'),
        D('100.5'),
        D('100.9'),
      ];

      const quantized = prices.map(p => quantize(p, 0, RoundingMode.ROUND_HALF_EVEN));

      expect(quantized.map(q => q.toNumber())).toEqual([
        99, // Round down
        100, // Round to even (100)
        100, // Round up
        100, // Round down
        100, // Round to even (100)
        101, // Round up
      ]);

      // All should be whole numbers
      quantized.forEach(q => {
        expect(q.modulo(1).toNumber()).toBe(0);
      });
    });
  });
});
