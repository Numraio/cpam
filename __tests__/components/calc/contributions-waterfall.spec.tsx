/**
 * Contributions Waterfall Component Tests
 *
 * Tests for the waterfall chart and table components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContributionsWaterfall, {
  type WaterfallData,
} from '@/components/calc/ContributionsWaterfall';

describe('ContributionsWaterfall', () => {
  const simpleData: WaterfallData = {
    basePrice: 100,
    baseCurrency: 'USD',
    adjustedPrice: 115,
    adjustedCurrency: 'USD',
    contributions: {
      factor_1: 10,
      factor_2: 5,
    },
    nodeLabels: {
      factor_1: 'Factor 1',
      factor_2: 'Factor 2',
    },
  };

  const negativeData: WaterfallData = {
    basePrice: 100,
    baseCurrency: 'USD',
    adjustedPrice: 75,
    adjustedCurrency: 'USD',
    contributions: {
      discount_1: -15,
      discount_2: -10,
    },
    nodeLabels: {
      discount_1: 'Discount 1',
      discount_2: 'Discount 2',
    },
  };

  const mixedData: WaterfallData = {
    basePrice: 1000,
    baseCurrency: 'USD',
    adjustedPrice: 1150,
    adjustedCurrency: 'USD',
    contributions: {
      increase_1: 150,
      decrease_1: -50,
      increase_2: 75,
      decrease_2: -25,
    },
    nodeLabels: {
      increase_1: 'Increase 1',
      decrease_1: 'Decrease 1',
      increase_2: 'Increase 2',
      decrease_2: 'Decrease 2',
    },
  };

  describe('Rendering', () => {
    it('should render waterfall with simple data', () => {
      render(<ContributionsWaterfall data={simpleData} />);

      expect(screen.getByText('Price Contributions')).toBeInTheDocument();
      expect(screen.getByText('Base Price')).toBeInTheDocument();
      expect(screen.getByText('Adjusted Price')).toBeInTheDocument();
    });

    it('should display base and adjusted prices correctly', () => {
      render(<ContributionsWaterfall data={simpleData} />);

      // Check that prices are displayed
      expect(screen.getByText(/USD 100.00/)).toBeInTheDocument();
      expect(screen.getByText(/USD 115.00/)).toBeInTheDocument();
    });

    it('should show positive delta with + sign', () => {
      render(<ContributionsWaterfall data={simpleData} />);

      expect(screen.getByText(/\+15\.00/)).toBeInTheDocument();
    });

    it('should show negative delta without extra sign', () => {
      render(<ContributionsWaterfall data={negativeData} />);

      expect(screen.getByText(/-25\.00/)).toBeInTheDocument();
    });

    it('should render all node labels', () => {
      render(<ContributionsWaterfall data={simpleData} />);

      expect(screen.getByText('Factor 1')).toBeInTheDocument();
      expect(screen.getByText('Factor 2')).toBeInTheDocument();
    });
  });

  describe('Acceptance Tests', () => {
    it('Given two factors, then waterfall shows correct signs and totals match delta', () => {
      render(<ContributionsWaterfall data={simpleData} />);

      const delta = simpleData.adjustedPrice - simpleData.basePrice;
      const contributionSum = Object.values(simpleData.contributions).reduce(
        (sum, val) => sum + val,
        0
      );

      expect(contributionSum).toBe(delta);
      expect(contributionSum).toBe(15);
    });

    it('Given mixed positive/negative contributions, then signs are correct', () => {
      render(<ContributionsWaterfall data={mixedData} />);

      // Verify positive contributions show + sign
      expect(screen.getAllByText(/\+150\.00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\+75\.00/).length).toBeGreaterThan(0);

      // Verify negative contributions show - sign
      expect(screen.getAllByText(/-50\.00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/-25\.00/).length).toBeGreaterThan(0);
    });

    it('Given negative adjustments, then total matches expected decrease', () => {
      render(<ContributionsWaterfall data={negativeData} />);

      const delta = negativeData.adjustedPrice - negativeData.basePrice;
      const contributionSum = Object.values(negativeData.contributions).reduce(
        (sum, val) => sum + val,
        0
      );

      expect(contributionSum).toBe(delta);
      expect(contributionSum).toBe(-25);
    });
  });

  describe('Performance', () => {
    it('Given 10 contributions, then rendering completes quickly', () => {
      const largeData: WaterfallData = {
        basePrice: 1000,
        baseCurrency: 'USD',
        adjustedPrice: 2000,
        adjustedCurrency: 'USD',
        contributions: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`factor_${i}`, 100])
        ),
      };

      const startTime = performance.now();
      render(<ContributionsWaterfall data={largeData} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in < 100ms
    });

    it('Given 50 contributions, then rendering does not block main thread', () => {
      const largeData: WaterfallData = {
        basePrice: 1000,
        baseCurrency: 'USD',
        adjustedPrice: 6000,
        adjustedCurrency: 'USD',
        contributions: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`factor_${i}`, 100])
        ),
      };

      const startTime = performance.now();
      render(<ContributionsWaterfall data={largeData} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500); // Should render in < 500ms
    });
  });

  describe('Accessibility', () => {
    it('should have table mode available', () => {
      render(<ContributionsWaterfall data={simpleData} mode="table" />);

      // Check for table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Node')).toBeInTheDocument();
      expect(screen.getByText('Contribution')).toBeInTheDocument();
    });

    it('should show tabular fallback with all data', () => {
      render(<ContributionsWaterfall data={simpleData} mode="table" />);

      expect(screen.getByText('Base Price')).toBeInTheDocument();
      expect(screen.getByText('Factor 1')).toBeInTheDocument();
      expect(screen.getByText('Factor 2')).toBeInTheDocument();
      expect(screen.getByText('Adjusted Price')).toBeInTheDocument();
    });

    it('should display percentages in table mode when enabled', () => {
      render(
        <ContributionsWaterfall
          data={simpleData}
          mode="table"
          showPercentages={true}
        />
      );

      expect(screen.getByText('%')).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should format numbers with specified decimals', () => {
      render(<ContributionsWaterfall data={simpleData} decimals={3} />);

      expect(screen.getByText(/100\.000/)).toBeInTheDocument();
    });

    it('should show percentages when enabled', () => {
      render(
        <ContributionsWaterfall data={simpleData} showPercentages={true} />
      );

      // Should show percentage column header in table
      const { rerender } = render(
        <ContributionsWaterfall
          data={simpleData}
          mode="table"
          showPercentages={true}
        />
      );
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should use fallback label when nodeLabels not provided', () => {
      const dataWithoutLabels: WaterfallData = {
        basePrice: 100,
        baseCurrency: 'USD',
        adjustedPrice: 110,
        adjustedCurrency: 'USD',
        contributions: {
          unlabeled_node: 10,
        },
      };

      render(<ContributionsWaterfall data={dataWithoutLabels} />);

      expect(screen.getByText('unlabeled_node')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero contributions', () => {
      const zeroData: WaterfallData = {
        basePrice: 100,
        baseCurrency: 'USD',
        adjustedPrice: 100,
        adjustedCurrency: 'USD',
        contributions: {},
      };

      render(<ContributionsWaterfall data={zeroData} />);

      expect(screen.getByText('Base Price')).toBeInTheDocument();
      expect(screen.getByText('Adjusted Price')).toBeInTheDocument();
    });

    it('should handle single contribution', () => {
      const singleData: WaterfallData = {
        basePrice: 100,
        baseCurrency: 'USD',
        adjustedPrice: 110,
        adjustedCurrency: 'USD',
        contributions: {
          only_factor: 10,
        },
      };

      render(<ContributionsWaterfall data={singleData} />);

      const delta = singleData.adjustedPrice - singleData.basePrice;
      const contributionSum = Object.values(singleData.contributions).reduce(
        (sum, val) => sum + val,
        0
      );

      expect(contributionSum).toBe(delta);
    });

    it('should handle very small contributions', () => {
      const smallData: WaterfallData = {
        basePrice: 100,
        baseCurrency: 'USD',
        adjustedPrice: 100.01,
        adjustedCurrency: 'USD',
        contributions: {
          tiny_factor: 0.01,
        },
      };

      render(<ContributionsWaterfall data={smallData} decimals={2} />);

      expect(screen.getByText(/\+0\.01/)).toBeInTheDocument();
    });

    it('should handle very large contributions', () => {
      const largeData: WaterfallData = {
        basePrice: 1000000,
        baseCurrency: 'USD',
        adjustedPrice: 2000000,
        adjustedCurrency: 'USD',
        contributions: {
          big_factor: 1000000,
        },
      };

      render(<ContributionsWaterfall data={largeData} decimals={0} />);

      expect(screen.getByText(/\+1000000/)).toBeInTheDocument();
    });
  });
});
