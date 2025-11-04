# PAM Graph Schema Documentation

## Overview

A **Price Adjustment Mechanism (PAM)** graph is a Directed Acyclic Graph (DAG) that defines how to calculate adjusted prices based on various factors such as commodity indices, currency conversions, and business rules.

PAM graphs are stored as JSON in the `PAM.graph` column and validated both at schema level (Zod) and semantic level (cycle detection, unit/currency consistency).

## Graph Structure

```typescript
interface PAMGraph {
  nodes: GraphNode[];      // Array of computation nodes
  edges: GraphEdge[];      // Array of directed edges
  output: string;          // ID of the output node
  metadata?: {             // Optional metadata
    description?: string;
    baseCurrency?: string;
    baseUnit?: string;
  };
}
```

### Example Graph

```json
{
  "nodes": [
    {
      "id": "brent_index",
      "type": "Factor",
      "config": {
        "series": "PLATTS_BRENT",
        "operation": "value"
      }
    },
    {
      "id": "premium",
      "type": "Factor",
      "config": { "value": 50.0 }
    },
    {
      "id": "add_premium",
      "type": "Combine",
      "config": { "operation": "add" }
    },
    {
      "id": "apply_cap",
      "type": "Controls",
      "config": {
        "cap": 1000.0,
        "floor": 100.0
      }
    }
  ],
  "edges": [
    { "from": "brent_index", "to": "add_premium" },
    { "from": "premium", "to": "add_premium" },
    { "from": "add_premium", "to": "apply_cap" }
  ],
  "output": "apply_cap"
}
```

This graph represents: `min(max(PLATTS_BRENT + 50, 100), 1000)`

## Node Types

### 1. Factor Node

References a timeseries or constant value.

```typescript
{
  id: string;
  type: "Factor";
  config: {
    series?: string;          // IndexSeries.seriesCode
    value?: number;           // Or constant value
    operation?: "value" |     // Latest value (default)
                "avg_3m" |    // 3-month average
                "avg_6m" |    // 6-month average
                "avg_12m" |   // 12-month average
                "min" |       // Minimum over period
                "max";        // Maximum over period
    lagDays?: number;         // Lag in days (optional)
  };
}
```

**Rules:**
- Must have EITHER `series` OR `value` (not both)
- Cannot have inputs
- If `lagDays` specified, uses value from N days before as-of date

**Examples:**
```json
// Timeseries reference
{
  "id": "brent",
  "type": "Factor",
  "config": {
    "series": "PLATTS_BRENT",
    "operation": "avg_3m"
  }
}

// Constant value
{
  "id": "premium",
  "type": "Factor",
  "config": { "value": 50.0 }
}

// Lagged value
{
  "id": "brent_lagged",
  "type": "Factor",
  "config": {
    "series": "PLATTS_BRENT",
    "lagDays": 30
  }
}
```

### 2. Transform Node

Applies mathematical transformations.

```typescript
{
  id: string;
  type: "Transform";
  config: {
    function: "abs" | "ceil" | "floor" | "round" |
              "log" | "exp" | "sqrt" | "pow" |
              "percent_change";
    params?: {
      exponent?: number;      // For 'pow'
      decimals?: number;      // For 'round'
      baseValue?: number;     // For 'percent_change'
    };
  };
}
```

**Rules:**
- Requires exactly 1 input
- `pow` function requires `params.exponent`
- Preserves unit/currency from input

**Examples:**
```json
{
  "id": "round_price",
  "type": "Transform",
  "config": {
    "function": "round",
    "params": { "decimals": 2 }
  }
}

{
  "id": "square_root",
  "type": "Transform",
  "config": { "function": "sqrt" }
}
```

### 3. Convert Node

Converts between units or currencies.

```typescript
{
  id: string;
  type: "Convert";
  config: {
    type: "unit" | "currency";
    from: string;
    to: string;

    // For unit conversion:
    density?: number;
    conversionFactor?: number;

    // For currency conversion:
    fxSeries?: string;
    fixedRate?: number;
  };
}
```

**Rules:**
- Requires exactly 1 input
- Unit conversion requires `density` OR `conversionFactor`
- Currency conversion requires `fxSeries` OR `fixedRate`
- Unit conversion preserves currency, changes unit
- Currency conversion preserves unit, changes currency

**Examples:**
```json
// Unit conversion
{
  "id": "bbl_to_mt",
  "type": "Convert",
  "config": {
    "type": "unit",
    "from": "USD/bbl",
    "to": "USD/MT",
    "density": 7.3
  }
}

// Currency conversion
{
  "id": "usd_to_eur",
  "type": "Convert",
  "config": {
    "type": "currency",
    "from": "USD",
    "to": "EUR",
    "fxSeries": "USD_EUR"
  }
}

// Fixed rate conversion
{
  "id": "usd_to_eur_fixed",
  "type": "Convert",
  "config": {
    "type": "currency",
    "from": "USD",
    "to": "EUR",
    "fixedRate": 0.92
  }
}
```

### 4. Combine Node

Combines multiple inputs using an operation.

```typescript
{
  id: string;
  type: "Combine";
  config: {
    operation: "add" | "subtract" | "multiply" | "divide" |
               "average" | "weighted_average" | "min" | "max";
    weights?: number[];  // For weighted_average
  };
}
```

**Rules:**
- Requires at least 2 inputs (except `min`/`max` which can have 1)
- `weighted_average` requires `weights` array matching input count
- All inputs must have same unit/currency (or use Convert nodes first)

**Examples:**
```json
// Simple addition
{
  "id": "add_premium",
  "type": "Combine",
  "config": { "operation": "add" }
}

// Weighted average
{
  "id": "weighted_avg",
  "type": "Combine",
  "config": {
    "operation": "weighted_average",
    "weights": [0.6, 0.4]  // 60% first input, 40% second
  }
}

// Multiplication
{
  "id": "apply_multiplier",
  "type": "Combine",
  "config": { "operation": "multiply" }
}
```

### 5. Controls Node

Applies caps, floors, and spike sharing.

```typescript
{
  id: string;
  type: "Controls";
  config: {
    cap?: number;
    floor?: number;
    triggerBand?: {
      lower: number;
      upper: number;
    };
    spikeSharing?: {
      sharePercent: number;  // 0-100
      direction: "above" | "below" | "both";
    };
  };
}
```

**Rules:**
- Requires exactly 1 input
- Must have at least one of: `cap`, `floor`, or `triggerBand`
- `spikeSharing` requires `triggerBand`
- Preserves unit/currency from input

**Examples:**
```json
// Simple cap and floor
{
  "id": "price_collar",
  "type": "Controls",
  "config": {
    "cap": 1000.0,
    "floor": 100.0
  }
}

// Trigger band with spike sharing
{
  "id": "spike_control",
  "type": "Controls",
  "config": {
    "triggerBand": {
      "lower": 500,
      "upper": 900
    },
    "spikeSharing": {
      "sharePercent": 50,     // Share 50% of spikes
      "direction": "above"    // Only for values above upper band
    }
  }
}
```

## Validation Rules

### Schema Validation (Zod)

Validates JSON structure and node configurations:

```typescript
import { validateGraphSchema } from '@/lib/pam/graph-schema';

const result = validateGraphSchema(graphJson);
if (!result.success) {
  console.error('Schema errors:', result.errors);
}
```

### Semantic Validation

Validates graph semantics:

```typescript
import { validateGraph } from '@/lib/pam/graph-validator';

const result = validateGraph(graph);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings) {
  console.warn('Warnings:', result.warnings);
}
```

**Validation Checks:**
1. ✅ **Acyclicity**: Graph must be a DAG (no cycles)
2. ✅ **Output node exists**: `output` must reference a valid node
3. ✅ **Reachable nodes**: All nodes should be reachable from output (warning)
4. ✅ **Input constraints**: Nodes must have correct number of inputs
5. ✅ **Currency consistency**: Combine nodes require matching currencies
6. ✅ **Unit consistency**: Combine nodes require matching units
7. ✅ **Node configuration**: Type-specific config validation

### Compilation

Compiles graph into execution plan:

```typescript
import { compileGraph, printExecutionPlan } from '@/lib/pam/graph-compiler';

const result = compileGraph(graph);
if (result.success) {
  console.log(printExecutionPlan(result.compiled));
  // Execute using execution plan
} else {
  console.error('Compilation failed:', result.validation.errors);
}
```

## Usage Examples

### Creating a PAM Graph

```typescript
import type { PAMGraph } from '@/lib/pam/graph-types';

const pamGraph: PAMGraph = {
  nodes: [
    {
      id: 'copper_3m',
      type: 'Factor',
      config: {
        series: 'LME_COPPER',
        operation: 'avg_3m'
      }
    },
    {
      id: 'multiplier',
      type: 'Factor',
      config: { value: 1.15 }
    },
    {
      id: 'apply_multiplier',
      type: 'Combine',
      config: { operation: 'multiply' }
    },
    {
      id: 'price_floor',
      type: 'Controls',
      config: { floor: 500.0 }
    }
  ],
  edges: [
    { from: 'copper_3m', to: 'apply_multiplier' },
    { from: 'multiplier', to: 'apply_multiplier' },
    { from: 'apply_multiplier', to: 'price_floor' }
  ],
  output: 'price_floor',
  metadata: {
    description: 'Copper-based pricing with 15% markup and floor',
    baseCurrency: 'USD',
    baseUnit: 'MT'
  }
};
```

### Validating Before Saving

```typescript
import { validateGraphSchema } from '@/lib/pam/graph-schema';
import { compileGraph } from '@/lib/pam/graph-compiler';

// 1. Validate schema
const schemaResult = validateGraphSchema(pamGraph);
if (!schemaResult.success) {
  throw new Error(`Schema validation failed: ${schemaResult.errors.join(', ')}`);
}

// 2. Compile and validate semantics
const compileResult = compileGraph(pamGraph);
if (!compileResult.success) {
  const errors = compileResult.validation.errors.map(e => e.message).join(', ');
  throw new Error(`Graph validation failed: ${errors}`);
}

// 3. Save to database
await prisma.pAM.create({
  data: {
    tenantId,
    name: 'Copper 15% Markup',
    description: pamGraph.metadata?.description,
    version: 1,
    graph: pamGraph,  // Stored as JSON
    createdBy: userId
  }
});
```

## Error Messages

### Common Validation Errors

**CYCLIC_GRAPH:**
```
Graph contains a cycle: node_a → node_b → node_c → node_b
```
**Fix:** Remove back edges to make graph acyclic.

**CURRENCY_MISMATCH:**
```
Combine node 'add_prices' has inputs with different currencies: USD, EUR.
Add Convert nodes to align currencies.
```
**Fix:** Add Convert node before Combine to align currencies.

**INVALID_OPERATION:**
```
Combine node 'average' with operation 'add' requires at least 2 inputs, but has 1
```
**Fix:** Add more inputs or change operation.

**MISSING_OUTPUT_NODE:**
```
Output node 'final_price' not found in graph
```
**Fix:** Ensure output node ID matches a node in the graph.

## Best Practices

### 1. Name Nodes Descriptively

```typescript
// ❌ Bad
{ id: 'n1', type: 'Factor', config: { series: 'PLATTS_BRENT' } }

// ✅ Good
{ id: 'brent_crude_index', type: 'Factor', config: { series: 'PLATTS_BRENT' } }
```

### 2. Use Metadata

```typescript
{
  nodes: [...],
  edges: [...],
  output: 'final_price',
  metadata: {
    description: 'Brent-based pricing with EUR conversion',
    baseCurrency: 'EUR',
    baseUnit: 'MT',
    version: '1.0',
    author: 'john@example.com'
  }
}
```

### 3. Validate Early

Always validate graphs before saving to database:
- Schema validation catches config errors
- Semantic validation catches logic errors
- Compilation catches execution errors

### 4. Handle Units/Currencies Explicitly

```typescript
// ✅ Good: Explicit conversion
[Factor(USD/bbl)] → [Convert(USD/bbl → USD/MT)] → [Combine]

// ❌ Bad: Implicit assumptions
[Factor(USD/bbl)] → [Combine] // What unit is the output?
```

### 5. Keep Graphs Simple

- Max 20-30 nodes per graph
- Use sub-graphs for complex calculations
- Document complex logic in metadata

## Related Files

- [graph-types.ts](../lib/pam/graph-types.ts) - TypeScript type definitions
- [graph-schema.ts](../lib/pam/graph-schema.ts) - Zod schemas
- [graph-validator.ts](../lib/pam/graph-validator.ts) - Semantic validation
- [graph-compiler.ts](../lib/pam/graph-compiler.ts) - Compilation logic
- [test-fixtures.ts](../lib/pam/test-fixtures.ts) - Example graphs

## Related Issues

- [Issue #17](https://github.com/Numraio/cpam/issues/17) - PAM graph schema (this document)
- [Issue #18](https://github.com/Numraio/cpam/issues/18) - PAM Builder UI
- [Issue #19](https://github.com/Numraio/cpam/issues/19) - Graph compiler
- [Issue #22](https://github.com/Numraio/cpam/issues/22) - Calc orchestrator
