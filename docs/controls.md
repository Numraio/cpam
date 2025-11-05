## Controls (Caps, Floors, Trigger Bands, Spike Sharing)

Price adjustment controls limit and manage price volatility.

### Overview

Controls apply business rules to limit price changes:
- **Cap**: Maximum allowed price increase/decrease (%)
- **Floor**: Minimum allowed price increase/decrease (%)
- **Trigger Band**: Suppress small price changes within a range
- **Spike Sharing**: Share a portion of large price movements with customers

### How Controls Work

Controls operate on **percentage deltas** relative to a base price:

```
1. Calculate delta: (currentPrice - basePrice) / basePrice × 100
2. Apply trigger band (suppress small deltas)
3. Apply spike sharing (reduce large deltas)
4. Apply cap/floor (hard limits)
5. Convert back: basePrice × (1 + delta/100)
```

### Graph Structure

Controls nodes require:
- **Input 0**: Current adjusted price (after calculations)
- **Input 1**: Base price (reference for delta calculation)

```typescript
const graph: PAMGraph = {
  nodes: [
    {
      id: 'base',
      type: 'factor',
      config: { value: 100 }, // Base price
    },
    {
      id: 'calculated',
      type: 'combine',
      config: { operation: 'multiply' }, // Calculation result
    },
    {
      id: 'controls',
      type: 'controls',
      config: {
        cap: 5, // +5% cap
        floor: -10, // -10% floor
      },
    },
  ],
  edges: [
    { from: 'index_factor', to: 'calculated' },
    { from: 'calculated', to: 'controls' }, // Input 0: current price
    { from: 'base', to: 'controls' }, // Input 1: base price
  ],
  output: 'controls',
};
```

### Cap (Maximum Change)

Prevents prices from increasing/decreasing beyond a limit.

**Example: +5% Cap**
```typescript
config: {
  cap: 5, // Maximum +5% increase
}

// Base: $100, Calculated: $115 (+15%)
// After cap: $105 (+5%)
```

**Example: -10% Cap (Maximum Decrease)**
```typescript
config: {
  cap: -10, // Maximum -10% decrease
}

// Base: $100, Calculated: $70 (-30%)
// After cap: $90 (-10%)
```

### Floor (Minimum Change)

Enforces a minimum price change.

**Example: -5% Floor**
```typescript
config: {
  floor: -5, // Minimum -5% decrease
}

// Base: $100, Calculated: $80 (-20%)
// After floor: $95 (-5%)
```

**Example: +3% Floor (Minimum Increase)**
```typescript
config: {
  floor: 3, // Minimum +3% increase
}

// Base: $100, Calculated: $101 (+1%)
// After floor: $103 (+3%)
```

### Collar (Cap + Floor)

Combination of cap and floor creates a "collar":

```typescript
config: {
  floor: -5, // -5% to +10% collar
  cap: 10,
}

// Price changes limited to this range:
// Base: $100 → Min: $95, Max: $110
```

### Trigger Band

Suppresses small price changes within a specified range.

```typescript
config: {
  triggerBand: {
    lower: -3, // Lower bound: -3%
    upper: 3,  // Upper bound: +3%
  },
}

// Examples:
// Base: $100, Calculated: $102 (+2%) → $100 (suppressed)
// Base: $100, Calculated: $98 (-2%) → $100 (suppressed)
// Base: $100, Calculated: $105 (+5%) → $105 (not suppressed)
```

**Use Case**: Avoid frequent price changes for small market movements.

### Spike Sharing

Shares a portion of large price movements with the customer.

```typescript
config: {
  triggerBand: {
    lower: -3,
    upper: 3,
  },
  spikeSharing: {
    sharePercent: 50, // Share 50% of spike
    direction: 'above', // 'above', 'below', or 'both'
  },
}

// Example: Share 50% of spike above +3%
// Base: $100, Calculated: $110 (+10%)
// Spike above band: 10% - 3% = 7%
// Shared spike: 7% × 50% = 3.5%
// Final delta: 3% + 3.5% = 6.5%
// Result: $106.50
```

**Directions:**
- `'above'`: Share upward spikes only
- `'below'`: Share downward spikes only
- `'both'`: Share spikes in both directions

### Combined Controls

All controls can be combined with execution order:
1. Trigger band (suppress small deltas)
2. Spike sharing (reduce large deltas)
3. Cap/floor (hard limits)

```typescript
config: {
  floor: -10,
  cap: 10,
  triggerBand: {
    lower: -3,
    upper: 3,
  },
  spikeSharing: {
    sharePercent: 50,
    direction: 'both',
  },
}

// Example scenarios:
//
// Small change (+2%):
// → Suppressed by trigger band → $100
//
// Moderate increase (+8%):
// → Spike: 8% - 3% = 5%
// → Shared: 5% × 50% = 2.5%
// → Final: 3% + 2.5% = 5.5% → $105.50
//
// Large increase (+25%):
// → Spike: 25% - 3% = 22%
// → Shared: 22% × 50% = 11%
// → Before cap: 3% + 11% = 14%
// → After cap: 10% (capped) → $110
```

### Real-World Examples

**Example 1: Commodity Contract**

"Price adjustments limited to ±5% with 3% trigger band"

```typescript
config: {
  floor: -5,
  cap: 5,
  triggerBand: {
    lower: -3,
    upper: 3,
  },
}
```

**Example 2: Shared Risk**

"Pass through 50% of price increases above 5%, full protection below -10%"

```typescript
config: {
  floor: -10, // Full protection below -10%
  triggerBand: {
    lower: -5,
    upper: 5,
  },
  spikeSharing: {
    sharePercent: 50, // Share 50% above 5%
    direction: 'above',
  },
}
```

**Example 3: Asymmetric Sharing**

"Customer absorbs 100% of decreases, shares 25% of increases above 3%"

```typescript
config: {
  triggerBand: {
    lower: -100, // No lower trigger (pass through all decreases)
    upper: 3,
  },
  spikeSharing: {
    sharePercent: 25, // Customer pays 25% of increases above 3%
    direction: 'above',
  },
}
```

### Validation Rules

- Cap must be greater than floor (if both specified)
- Trigger band upper must be greater than lower
- Spike sharing percent must be 0-100
- Spike sharing requires trigger band

### Testing

```typescript
import { executeGraph } from '@/lib/pam/graph-executor';

const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'factor', config: { value: 100 } },
    { id: 'calculated', type: 'factor', config: { value: 115 } },
    {
      id: 'controls',
      type: 'controls',
      config: { cap: 5 },
    },
  ],
  edges: [
    { from: 'calculated', to: 'controls' },
    { from: 'base', to: 'controls' },
  ],
  output: 'controls',
};

const result = executeGraph(graph, {});
expect(result.toNumber()).toBe(105); // Capped at +5%
```

### Best Practices

1. **Always provide base price**: Controls need a reference point
2. **Cap before floor**: Cap should be > floor
3. **Test edge cases**: Test at trigger band boundaries
4. **Document intent**: Clearly explain business rules
5. **Validate inputs**: Ensure base price is non-zero

### Common Patterns

**Pattern 1: Simple Collar**
```typescript
{ cap: 10, floor: -10 } // ±10% collar
```

**Pattern 2: Deadband (Trigger Band Only)**
```typescript
{ triggerBand: { lower: -2, upper: 2 } } // Suppress ±2% changes
```

**Pattern 3: Cap with Sharing**
```typescript
{
  cap: 15,
  triggerBand: { lower: -5, upper: 5 },
  spikeSharing: { sharePercent: 50, direction: 'both' },
}
// Share 50% of spikes beyond ±5%, cap at ±15%
```

## See Also

- [PAM Graph Schema](./pam-graph.md)
- [Graph Executor](./graph-executor.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
