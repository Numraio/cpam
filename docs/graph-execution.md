# PAM Graph Execution

This document describes how to execute PAM (Price Adjustment Mechanism) graphs to calculate adjusted prices.

## Table of Contents

- [Overview](#overview)
- [Execution Context](#execution-context)
- [Executing Graphs](#executing-graphs)
- [Execution Results](#execution-results)
- [Deterministic Execution](#deterministic-execution)
- [Node Execution](#node-execution)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The PAM graph executor takes a compiled graph and execution context, then:

1. **Validates** the graph structure and semantics
2. **Compiles** the graph into a topologically-sorted execution plan
3. **Executes** each node in dependency order using decimal math
4. **Tracks** contributions from each node
5. **Returns** the final calculated value with metadata

All calculations use 12-decimal place precision to eliminate floating-point errors.

## Execution Context

The execution context provides the environment for graph execution:

```typescript
interface ExecutionContext {
  tenantId: string;          // Tenant ID for data isolation
  asOfDate: Date;            // Reference date for calculations
  versionPreference: VersionTag; // 'PRELIMINARY' | 'FINAL' | 'REVISED'
  basePrice?: number;        // Optional base price
  baseCurrency?: string;     // Default currency (e.g., 'USD')
  baseUnit?: string;         // Default unit (e.g., 'MT', 'bbl')
}
```

### Example Context

```typescript
const context: ExecutionContext = {
  tenantId: 'acme-corp',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  baseCurrency: 'USD',
  baseUnit: 'MT',
};
```

## Executing Graphs

### Basic Execution

```typescript
import { executeGraph } from '@/lib/pam';
import type { PAMGraph, ExecutionContext } from '@/lib/pam';

const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'Factor', config: { value: 100 } },
    { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
    { id: 'apply', type: 'Combine', config: { operation: 'multiply' } },
  ],
  edges: [
    { from: 'base', to: 'apply' },
    { from: 'multiplier', to: 'apply' },
  ],
  output: 'apply',
};

const context: ExecutionContext = {
  tenantId: 'test-tenant',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  baseCurrency: 'USD',
};

const result = await executeGraph(graph, context);
console.log(result.value); // 115
```

### Execution Flow

1. **Graph Compilation**: Validates graph structure and creates execution plan
2. **Node Execution**: Executes nodes in topological order
3. **Value Tracking**: Stores intermediate values in a map
4. **Contribution Tracking**: Records each node's output value
5. **Result Assembly**: Combines final value with metadata

## Execution Results

The executor returns a comprehensive result object:

```typescript
interface ExecutionResult {
  value: number;                 // Final calculated value
  currency: string;              // Output currency
  unit: string;                  // Output unit
  contributions: Record<NodeId, number>; // All node values
  metadata: {
    executedAt: Date;            // Execution timestamp
    asOfDate: Date;              // Context as-of date
    nodesEvaluated: number;      // Number of nodes executed
    executionTimeMs: number;     // Execution duration
  };
}
```

### Example Result

```typescript
{
  value: 172.5,
  currency: 'USD',
  unit: 'MT',
  contributions: {
    'base': 100,
    'premium': 50,
    'multiplier': 1.15,
    'add': 150,
    'multiply': 172.5,
    'floor': 172.5
  },
  metadata: {
    executedAt: new Date('2024-01-15T10:30:00Z'),
    asOfDate: new Date('2024-01-15T00:00:00Z'),
    nodesEvaluated: 6,
    executionTimeMs: 15
  }
}
```

## Deterministic Execution

The executor ensures deterministic results through:

1. **Input Hashing**: SHA-256 hash of graph + context
2. **Canonical Serialization**: Sorted keys for consistent JSON
3. **Decimal Math**: Fixed-point arithmetic (no floating-point)
4. **Topological Ordering**: Consistent node execution order

### Input Hashing

```typescript
import { hashExecutionInputs } from '@/lib/pam';

const hash1 = hashExecutionInputs(graph, context);
const hash2 = hashExecutionInputs(graph, context);

console.log(hash1 === hash2); // true - same inputs = same hash
```

### Execution Plans

Create reusable execution plans with input hashes:

```typescript
import { createExecutionPlan } from '@/lib/pam';

const plan = createExecutionPlan(graph, context);

console.log(plan);
// {
//   compiled: { executionPlan: [...], dependencies: {...} },
//   inputsHash: 'a1b2c3...',
//   createdAt: Date
// }
```

Use execution plans for:
- **Caching**: Cache results by input hash
- **Idempotency**: Skip re-execution if hash matches
- **Auditing**: Track which inputs produced which results

## Node Execution

Each node type executes differently:

### Factor Nodes

Returns constant values or fetches timeseries data:

```typescript
// Constant value
{ id: 'premium', type: 'Factor', config: { value: 50.0 } }
// Returns: D(50.0)

// Timeseries reference (not yet implemented)
{ id: 'brent', type: 'Factor', config: { series: 'PLATTS_BRENT' } }
// Will fetch from IndexValue table
```

### Transform Nodes

Applies mathematical transformations:

```typescript
// Absolute value
{ id: 'abs', type: 'Transform', config: { function: 'abs' } }
// Input: D(-50) → Output: D(50)

// Round to 2 decimals
{ id: 'round', type: 'Transform', config: { function: 'round', params: { decimals: 2 } } }
// Input: D(123.456) → Output: D(123.46)

// Power
{ id: 'square', type: 'Transform', config: { function: 'pow', params: { exponent: 2 } } }
// Input: D(5) → Output: D(25)
```

### Convert Nodes

Converts units or currencies:

```typescript
// Unit conversion (requires input with unit)
{
  id: 'bbl_to_mt',
  type: 'Convert',
  config: { type: 'unit', from: 'bbl', to: 'MT', conversionFactor: 7.3 }
}
// Input: D(100) → Output: D(730)

// Currency conversion (requires input with currency)
{
  id: 'usd_to_eur',
  type: 'Convert',
  config: { type: 'currency', from: 'USD', to: 'EUR', fixedRate: 0.92 }
}
// Input: D(100) → Output: D(92)
```

**Note**: Convert nodes require inputs with unit/currency metadata. Factor nodes with constant values have no unit/currency, so Convert nodes can only be used with series references or other Convert nodes.

### Combine Nodes

Combines multiple inputs:

```typescript
// Addition
{ id: 'add', type: 'Combine', config: { operation: 'add' } }
// Inputs: [D(100), D(50)] → Output: D(150)

// Weighted average
{
  id: 'wavg',
  type: 'Combine',
  config: { operation: 'weighted_average', weights: [0.6, 0.4] }
}
// Inputs: [D(100), D(200)] → Output: D(140)  // 100*0.6 + 200*0.4

// Min/Max
{ id: 'min', type: 'Combine', config: { operation: 'min' } }
// Inputs: [D(100), D(50), D(75)] → Output: D(50)
```

### Controls Nodes

Applies caps, floors, and spike sharing:

```typescript
// Simple cap
{ id: 'cap', type: 'Controls', config: { cap: 1000 } }
// Input: D(1500) → Output: D(1000)

// Collar (cap + floor)
{ id: 'collar', type: 'Controls', config: { cap: 1000, floor: 100 } }
// Input: D(50) → Output: D(100)
// Input: D(500) → Output: D(500)
// Input: D(1500) → Output: D(1000)

// Spike sharing
{
  id: 'spike',
  type: 'Controls',
  config: {
    triggerBand: { lower: 500, upper: 900 },
    spikeSharing: { sharePercent: 50, direction: 'above' }
  }
}
// Input: D(1100) → Output: D(1000)
// Calculation: spike = 1100 - 900 = 200, shared = 200 * 0.5 = 100, result = 900 + 100 = 1000
```

## Error Handling

### Compilation Errors

If graph compilation fails, execution throws an error:

```typescript
try {
  const result = await executeGraph(invalidGraph, context);
} catch (error) {
  console.error(error.message);
  // "Graph compilation failed: Graph contains a cycle: node_a → node_b → node_a"
}
```

Common compilation errors:
- **CYCLIC_GRAPH**: Graph contains cycles
- **MISSING_OUTPUT_NODE**: Output node doesn't exist
- **INVALID_INPUT_COUNT**: Node has wrong number of inputs
- **CURRENCY_MISMATCH**: Combine node inputs have different currencies
- **UNIT_MISMATCH**: Combine node inputs have different units

### Runtime Errors

Execution errors are thrown during node execution:

```typescript
try {
  const result = await executeGraph(graph, context);
} catch (error) {
  console.error(error.message);
  // "Division by zero"
  // "Timeseries lookup not yet implemented"
  // "FX series lookup not yet implemented"
}
```

### Error Recovery

For production use, implement error handling:

```typescript
async function safeExecuteGraph(
  graph: PAMGraph,
  context: ExecutionContext
): Promise<ExecutionResult | null> {
  try {
    return await executeGraph(graph, context);
  } catch (error) {
    console.error('Graph execution failed:', error);

    // Log to monitoring system
    await logError({
      type: 'GRAPH_EXECUTION_ERROR',
      graph: graph.metadata?.description,
      context: context.tenantId,
      error: error.message,
    });

    return null;
  }
}
```

## Examples

### Simple Price Calculation

```typescript
// Graph: base_price * multiplier
const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'Factor', config: { value: 100 } },
    { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
    { id: 'result', type: 'Combine', config: { operation: 'multiply' } },
  ],
  edges: [
    { from: 'base', to: 'result' },
    { from: 'multiplier', to: 'result' },
  ],
  output: 'result',
};

const result = await executeGraph(graph, context);
console.log(result.value); // 115
```

### Price with Premium and Cap

```typescript
// Graph: min((base + premium) * multiplier, cap)
const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'Factor', config: { value: 100 } },
    { id: 'premium', type: 'Factor', config: { value: 50 } },
    { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
    { id: 'add', type: 'Combine', config: { operation: 'add' } },
    { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
    { id: 'cap', type: 'Controls', config: { cap: 200 } },
  ],
  edges: [
    { from: 'base', to: 'add' },
    { from: 'premium', to: 'add' },
    { from: 'add', to: 'multiply' },
    { from: 'multiplier', to: 'multiply' },
    { from: 'multiply', to: 'cap' },
  ],
  output: 'cap',
};

const result = await executeGraph(graph, context);
// (100 + 50) * 1.15 = 172.5, capped at 200
console.log(result.value); // 172.5
console.log(result.contributions);
// {
//   base: 100,
//   premium: 50,
//   multiplier: 1.15,
//   add: 150,
//   multiply: 172.5,
//   cap: 172.5
// }
```

### Weighted Average

```typescript
// Graph: 60% base + 40% alternative
const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'Factor', config: { value: 100 } },
    { id: 'alternative', type: 'Factor', config: { value: 120 } },
    {
      id: 'wavg',
      type: 'Combine',
      config: {
        operation: 'weighted_average',
        weights: [0.6, 0.4]
      }
    },
  ],
  edges: [
    { from: 'base', to: 'wavg' },
    { from: 'alternative', to: 'wavg' },
  ],
  output: 'wavg',
};

const result = await executeGraph(graph, context);
console.log(result.value); // 108 (100 * 0.6 + 120 * 0.4)
```

### Spike Sharing

```typescript
// Graph: Share 50% of spikes above 900
const graph: PAMGraph = {
  nodes: [
    { id: 'input', type: 'Factor', config: { value: 1100 } },
    {
      id: 'spike_control',
      type: 'Controls',
      config: {
        triggerBand: { lower: 500, upper: 900 },
        spikeSharing: { sharePercent: 50, direction: 'above' }
      }
    },
  ],
  edges: [{ from: 'input', to: 'spike_control' }],
  output: 'spike_control',
};

const result = await executeGraph(graph, context);
// Input: 1100
// Spike above 900: 1100 - 900 = 200
// Share 50%: 200 * 0.5 = 100
// Result: 900 + 100 = 1000
console.log(result.value); // 1000
```

### Complex Multi-Stage Calculation

```typescript
// Graph: Apply multiple transformations
const graph: PAMGraph = {
  nodes: [
    { id: 'base', type: 'Factor', config: { value: 85.5 } },
    { id: 'premium', type: 'Factor', config: { value: 12.3 } },
    { id: 'discount', type: 'Factor', config: { value: -5.0 } },

    // Stage 1: Add premium and discount
    { id: 'adjust', type: 'Combine', config: { operation: 'add' } },

    // Stage 2: Round to 2 decimals
    {
      id: 'round',
      type: 'Transform',
      config: { function: 'round', params: { decimals: 2 } }
    },

    // Stage 3: Apply collar
    {
      id: 'collar',
      type: 'Controls',
      config: { floor: 80, cap: 100 }
    },
  ],
  edges: [
    { from: 'base', to: 'adjust' },
    { from: 'premium', to: 'adjust' },
    { from: 'discount', to: 'adjust' },
    { from: 'adjust', to: 'round' },
    { from: 'round', to: 'collar' },
  ],
  output: 'collar',
};

const result = await executeGraph(graph, context);
// 85.5 + 12.3 + (-5.0) = 92.8
// Round to 2 decimals = 92.80
// Collar (80-100) = 92.80 (within range)
console.log(result.value); // 92.8
console.log(result.contributions);
// {
//   base: 85.5,
//   premium: 12.3,
//   discount: -5,
//   adjust: 92.8,
//   round: 92.8,
//   collar: 92.8
// }
```

## Related Documentation

- [PAM Graph Schema](./pam-graph-schema.md) - Graph structure and node types
- [Decimal Math Engine](./decimal-math.md) - Precision arithmetic
- [Graph Compiler](../lib/pam/graph-compiler.ts) - Compilation logic
- [Graph Validator](../lib/pam/graph-validator.ts) - Validation rules

## Future Enhancements

**Timeseries Integration** (Issue #22):
- Fetch IndexValue data for Factor nodes with `series` config
- Support lag days and time-based operations (avg_3m, etc.)
- FX rate lookup for dynamic currency conversion

**Execution Caching**:
- Cache results by input hash
- Skip re-execution for identical inputs
- Store execution plans for performance

**Parallel Execution**:
- Execute independent nodes in parallel
- Optimize execution time for large graphs
- Stream results as nodes complete
