# Contributions Waterfall

Visual representation of how each factor/node contributes to the final adjusted price in a PAM calculation.

## Overview

The Contributions Waterfall component displays a waterfall chart showing:
- Base price (starting point)
- Each factor's contribution (positive or negative)
- Cumulative effect of each contribution
- Final adjusted price

The component includes:
- Visual waterfall chart with bars
- Accessible table fallback
- Percentage contributions
- Sign indicators (increase/decrease)

## Usage

### Basic Example

```tsx
import ContributionsWaterfall from '@/components/calc/ContributionsWaterfall';

function PriceBreakdown({ calcResult }: { calcResult: CalcResult }) {
  const waterfallData = {
    basePrice: calcResult.item.basePrice.toNumber(),
    baseCurrency: calcResult.item.baseCurrency,
    adjustedPrice: calcResult.adjustedPrice.toNumber(),
    adjustedCurrency: calcResult.adjustedCurrency,
    contributions: calcResult.contributions as Record<string, number>,
  };

  return <ContributionsWaterfall data={waterfallData} />;
}
```

### With Custom Labels

```tsx
const waterfallData = {
  basePrice: 1000,
  baseCurrency: 'USD',
  adjustedPrice: 1150,
  adjustedCurrency: 'USD',
  contributions: {
    brent_factor: 150,
    quality_discount: -50,
    freight_surcharge: 75,
    fx_adjustment: -25,
  },
  nodeLabels: {
    brent_factor: 'Brent Crude Factor (30d avg)',
    quality_discount: 'Quality Discount',
    freight_surcharge: 'Freight Surcharge',
    fx_adjustment: 'FX Adjustment (USD→EUR→USD)',
  },
};

<ContributionsWaterfall
  data={waterfallData}
  showPercentages={true}
  decimals={2}
/>
```

### Table Mode (Accessible)

```tsx
<ContributionsWaterfall
  data={waterfallData}
  mode="table"
  showPercentages={true}
/>
```

## Component Props

```typescript
interface ContributionsWaterfallProps {
  /** Waterfall data */
  data: WaterfallData;
  /** Display mode: chart or table (default: 'chart') */
  mode?: 'chart' | 'table';
  /** Show percentage contributions (default: true) */
  showPercentages?: boolean;
  /** Decimal places for display (default: 2) */
  decimals?: number;
}

interface WaterfallData {
  /** Base price (starting value) */
  basePrice: number;
  /** Base currency */
  baseCurrency: string;
  /** Final adjusted price */
  adjustedPrice: number;
  /** Final currency */
  adjustedCurrency: string;
  /** Node contributions: nodeId → value */
  contributions: Record<string, number>;
  /** Optional node labels for display */
  nodeLabels?: Record<string, string>;
}
```

## Features

### Waterfall Chart

The chart view displays:
- **Base Price**: Starting value (vertical line)
- **Positive Contributions**: Green bars showing increases
- **Negative Contributions**: Red bars showing decreases
- **Final Price**: Ending value (vertical line)

Each bar is positioned to show the cumulative effect of contributions.

### Table View

The table view provides an accessible fallback showing:
- Node name
- Contribution amount (with sign)
- Percentage of total change
- Cumulative value

### Percentage Contributions

When enabled, shows each contribution as a percentage of the total delta:
```
Contribution % = (Node Value / |Total Delta|) × 100
```

### Formatting

- Numbers formatted with `Decimal.js` for precision
- Configurable decimal places
- Sign indicators (+ for positive, - for negative)
- Color coding (green for increase, red for decrease)

## Data Validation

The component expects:
1. **Valid contributions**: Sum of contributions should equal `adjustedPrice - basePrice`
2. **Node order**: Contributions are displayed in object key order (assumes execution order)
3. **Number precision**: Uses `Decimal.js` for accurate formatting

Example validation:
```typescript
const totalDelta = adjustedPrice - basePrice;
const contributionSum = Object.values(contributions).reduce(
  (sum, val) => sum + val,
  0
);

console.assert(
  Math.abs(contributionSum - totalDelta) < 0.01,
  'Contributions must sum to total delta'
);
```

## Integration with CalcResult

The waterfall component integrates seamlessly with `CalcResult` from the calculation orchestrator:

```tsx
import { getBatchResults } from '@/lib/calc/batch-orchestrator';

async function PriceDetailsPage({ batchId, itemId }: Props) {
  const results = await getBatchResults(prisma, batchId);
  const result = results.results.find((r) => r.itemId === itemId);

  if (!result) {
    return <div>Result not found</div>;
  }

  const waterfallData = {
    basePrice: result.item.basePrice.toNumber(),
    baseCurrency: result.item.baseCurrency,
    adjustedPrice: result.adjustedPrice.toNumber(),
    adjustedCurrency: result.adjustedCurrency,
    contributions: result.contributions as Record<string, number>,
  };

  return (
    <div>
      <h1>Price Breakdown for {result.item.sku}</h1>
      <ContributionsWaterfall data={waterfallData} />
    </div>
  );
}
```

## Performance

The component is optimized for rendering large batches:

### Benchmarks

| Contributions | Render Time (P95) | Result |
|--------------|-------------------|--------|
| 10 nodes     | < 100ms          | ✓ Pass |
| 50 nodes     | < 500ms          | ✓ Pass |
| 100 nodes    | < 1000ms         | ✓ Pass |

### Optimization Techniques

1. **Memoization**: Uses `useMemo` to compute segments only when data changes
2. **SVG-free**: Uses CSS positioning for chart bars (faster than SVG)
3. **Lazy rendering**: Chart bars rendered as simple divs with transforms
4. **Virtual scrolling**: Not needed for typical PAM graphs (<20 nodes)

### Large Batch Handling

For batches with 10k+ items:
- Render waterfall on-demand (expand/collapse pattern)
- Use pagination for item list
- Consider server-side rendering for initial load

Example:
```tsx
function BatchResults({ batchId }: { batchId: string }) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <div onClick={() => setExpandedItem(item.id)}>
            {item.sku}: {item.adjustedPrice}
          </div>
          {expandedItem === item.id && (
            <ContributionsWaterfall data={item.waterfallData} />
          )}
        </div>
      ))}
    </div>
  );
}
```

## Accessibility

### Keyboard Navigation

- Tab through mode toggle buttons
- Table mode supports full keyboard navigation
- Screen reader announces chart/table mode

### ARIA Labels

- Chart bars have aria-labels describing value and type
- Table has proper semantic markup
- Headers clearly labeled

### Color Contrast

- Green/red colors meet WCAG AA contrast requirements
- Fallback to table mode always available
- Sign indicators (+ / -) supplement color

### Tabular Fallback

The table mode provides full data access for:
- Screen readers
- Print media
- Copy-paste into spreadsheets
- Low-bandwidth scenarios

## Test Page

Test page available at `/test/contributions-waterfall` with scenarios:
- **Simple**: 2 positive contributions
- **Complex**: Mixed positive/negative with FX
- **Negative**: All decreases
- **Large**: 10 contributions for performance testing

## Styling

Uses DaisyUI classes:
- `base-100`: Page background
- `base-200`: Card background
- `base-300`: Grid lines
- `success`: Positive contributions (green)
- `error`: Negative contributions (red)
- `primary`: Final price marker

Custom chart styling:
```css
.waterfall-bar {
  transition: opacity 0.2s;
}

.waterfall-bar:hover {
  opacity: 1;
}
```

## Future Enhancements

Potential improvements:
- [ ] Interactive tooltips on hover
- [ ] Drill-down into node configuration
- [ ] Export as image/PDF
- [ ] Comparative waterfall (before/after)
- [ ] Animation on initial render
- [ ] Zoom/pan for large graphs
- [ ] Dark mode optimizations
- [ ] Mobile-optimized touch interactions

## Examples

### Simple Two-Factor Adjustment

```typescript
const data = {
  basePrice: 100,
  baseCurrency: 'USD',
  adjustedPrice: 115,
  adjustedCurrency: 'USD',
  contributions: {
    market_index: 10,
    quality_premium: 5,
  },
  nodeLabels: {
    market_index: 'Market Index (Brent 30d avg)',
    quality_premium: 'Quality Premium',
  },
};
```

Result:
```
100 (Base) → +10 (Market) → +5 (Quality) → 115 (Final)
```

### Complex Multi-Factor with Discounts

```typescript
const data = {
  basePrice: 1000,
  baseCurrency: 'USD',
  adjustedPrice: 1150,
  adjustedCurrency: 'USD',
  contributions: {
    commodity_index: 200,
    quality_discount: -50,
    freight: 75,
    volume_discount: -75,
  },
};
```

Result:
```
1000 → +200 → -50 → +75 → -75 → 1150
Total change: +150 (15%)
```

### Currency Conversion Example

```typescript
const data = {
  basePrice: 100,
  baseCurrency: 'USD',
  adjustedPrice: 92,
  adjustedCurrency: 'EUR',
  contributions: {
    market_adj: 10,
    fx_conversion: -18, // USD → EUR conversion
  },
  nodeLabels: {
    market_adj: 'Market Adjustment',
    fx_conversion: 'FX Conversion (USD→EUR)',
  },
};
```

## Related Documentation

- [PAM Graph Schema](./pam-graph-schema.md)
- [Graph Executor](./graph-execution.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
- [PAM Builder UI](./pam-builder-ui.md)
