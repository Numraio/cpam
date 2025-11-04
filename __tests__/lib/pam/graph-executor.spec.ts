/**
 * Tests for PAM Graph Executor
 *
 * Validates:
 * - Graph execution with decimal math
 * - Node type execution (Factor, Transform, Convert, Combine, Controls)
 * - Input hashing for determinism
 * - Error handling
 * - Contribution tracking
 */

import {
  executeGraph,
  hashExecutionInputs,
  createExecutionPlan,
  type ExecutionPlan,
} from '@/lib/pam/graph-executor';
import type {
  PAMGraph,
  ExecutionContext,
  ExecutionResult,
} from '@/lib/pam/graph-types';
import { D } from '@/lib/math/decimal';

// ============================================================================
// Test Fixtures
// ============================================================================

const baseContext: ExecutionContext = {
  tenantId: 'test-tenant',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  baseCurrency: 'USD',
  baseUnit: 'MT',
};

// ============================================================================
// Factor Node Tests
// ============================================================================

describe('Graph Executor - Factor Nodes', () => {
  it('should execute Factor node with constant value', async () => {
    const graph: PAMGraph = {
      nodes: [
        {
          id: 'constant',
          type: 'Factor',
          config: { value: 100.5 },
        },
      ],
      edges: [],
      output: 'constant',
    };

    const result = await executeGraph(graph, baseContext);

    expect(result.value).toBe(100.5);
    expect(result.currency).toBe('USD');
    expect(result.contributions['constant']).toBe(100.5);
    expect(result.metadata.nodesEvaluated).toBe(1);
  });

  it('should throw error for Factor node with series (not implemented)', async () => {
    const graph: PAMGraph = {
      nodes: [
        {
          id: 'series',
          type: 'Factor',
          config: { series: 'PLATTS_BRENT', operation: 'value' },
        },
      ],
      edges: [],
      output: 'series',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Timeseries lookup not yet implemented/
    );
  });

  it('should throw error for Factor node without value or series', async () => {
    const graph: PAMGraph = {
      nodes: [
        {
          id: 'invalid',
          type: 'Factor',
          config: {},
        },
      ],
      edges: [],
      output: 'invalid',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Must have either value or series/
    );
  });
});

// ============================================================================
// Transform Node Tests
// ============================================================================

describe('Graph Executor - Transform Nodes', () => {
  it('should execute Transform node with abs function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: -50.5 } },
        { id: 'abs', type: 'Transform', config: { function: 'abs' } },
      ],
      edges: [{ from: 'input', to: 'abs' }],
      output: 'abs',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(50.5);
  });

  it('should execute Transform node with ceil function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 123.456 } },
        { id: 'ceil', type: 'Transform', config: { function: 'ceil' } },
      ],
      edges: [{ from: 'input', to: 'ceil' }],
      output: 'ceil',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(124);
  });

  it('should execute Transform node with floor function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 123.456 } },
        { id: 'floor', type: 'Transform', config: { function: 'floor' } },
      ],
      edges: [{ from: 'input', to: 'floor' }],
      output: 'floor',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(123);
  });

  it('should execute Transform node with round function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 123.456 } },
        {
          id: 'round',
          type: 'Transform',
          config: { function: 'round', params: { decimals: 2 } },
        },
      ],
      edges: [{ from: 'input', to: 'round' }],
      output: 'round',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(123.46);
  });

  it('should execute Transform node with sqrt function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 144 } },
        { id: 'sqrt', type: 'Transform', config: { function: 'sqrt' } },
      ],
      edges: [{ from: 'input', to: 'sqrt' }],
      output: 'sqrt',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(12);
  });

  it('should execute Transform node with pow function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 5 } },
        {
          id: 'pow',
          type: 'Transform',
          config: { function: 'pow', params: { exponent: 3 } },
        },
      ],
      edges: [{ from: 'input', to: 'pow' }],
      output: 'pow',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(125);
  });

  it('should execute Transform node with log function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: Math.E } },
        { id: 'log', type: 'Transform', config: { function: 'log' } },
      ],
      edges: [{ from: 'input', to: 'log' }],
      output: 'log',
    };

    const result = await executeGraph(graph, baseContext);
    expect(Math.abs(result.value - 1)).toBeLessThan(0.000001);
  });

  it('should execute Transform node with exp function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 1 } },
        { id: 'exp', type: 'Transform', config: { function: 'exp' } },
      ],
      edges: [{ from: 'input', to: 'exp' }],
      output: 'exp',
    };

    const result = await executeGraph(graph, baseContext);
    expect(Math.abs(result.value - Math.E)).toBeLessThan(0.000001);
  });

  it('should execute Transform node with percent_change function', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 115 } },
        {
          id: 'pct_change',
          type: 'Transform',
          config: { function: 'percent_change', params: { baseValue: 100 } },
        },
      ],
      edges: [{ from: 'input', to: 'pct_change' }],
      output: 'pct_change',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(0.15); // 15% increase
  });

  it('should throw error for Transform node with wrong input count', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 10 } },
        { id: 'input2', type: 'Factor', config: { value: 20 } },
        { id: 'abs', type: 'Transform', config: { function: 'abs' } },
      ],
      edges: [
        { from: 'input1', to: 'abs' },
        { from: 'input2', to: 'abs' },
      ],
      output: 'abs',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });

  it('should throw error for Transform node with pow missing exponent', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 5 } },
        { id: 'pow', type: 'Transform', config: { function: 'pow' } },
      ],
      edges: [{ from: 'input', to: 'pow' }],
      output: 'pow',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /pow requires exponent parameter/
    );
  });
});

// ============================================================================
// Convert Node Tests
// ============================================================================

describe('Graph Executor - Convert Nodes', () => {
  // NOTE: Convert nodes require inputs with unit/currency metadata
  // Factor nodes with constant values have no unit/currency
  // Therefore, Convert nodes can only be tested with series references (not yet implemented)
  // These tests verify that compilation fails appropriately when unit/currency is missing

  it('should fail compilation for Convert node with unit conversion on constant input', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 100 } },
        {
          id: 'convert',
          type: 'Convert',
          config: {
            type: 'unit',
            from: 'bbl',
            to: 'MT',
            conversionFactor: 7.3,
          },
        },
      ],
      edges: [{ from: 'input', to: 'convert' }],
      output: 'convert',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /attempts unit conversion but input has no unit/
    );
  });

  it('should fail compilation for Convert node with currency conversion on constant input', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 100 } },
        {
          id: 'convert',
          type: 'Convert',
          config: {
            type: 'currency',
            from: 'USD',
            to: 'EUR',
            fixedRate: 0.92,
          },
        },
      ],
      edges: [{ from: 'input', to: 'convert' }],
      output: 'convert',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /attempts currency conversion but input has no currency/
    );
  });

  it('should throw error for Convert node with wrong input count', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 10 } },
        { id: 'input2', type: 'Factor', config: { value: 20 } },
        {
          id: 'convert',
          type: 'Convert',
          config: {
            type: 'unit',
            from: 'bbl',
            to: 'MT',
            conversionFactor: 7.3,
          },
        },
      ],
      edges: [
        { from: 'input1', to: 'convert' },
        { from: 'input2', to: 'convert' },
      ],
      output: 'convert',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });
});

// ============================================================================
// Combine Node Tests
// ============================================================================

describe('Graph Executor - Combine Nodes', () => {
  it('should execute Combine node with add operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 50 } },
        { id: 'add', type: 'Combine', config: { operation: 'add' } },
      ],
      edges: [
        { from: 'input1', to: 'add' },
        { from: 'input2', to: 'add' },
      ],
      output: 'add',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(150);
  });

  it('should execute Combine node with subtract operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 30 } },
        { id: 'subtract', type: 'Combine', config: { operation: 'subtract' } },
      ],
      edges: [
        { from: 'input1', to: 'subtract' },
        { from: 'input2', to: 'subtract' },
      ],
      output: 'subtract',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(70);
  });

  it('should execute Combine node with multiply operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 10 } },
        { id: 'input2', type: 'Factor', config: { value: 5 } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
      ],
      edges: [
        { from: 'input1', to: 'multiply' },
        { from: 'input2', to: 'multiply' },
      ],
      output: 'multiply',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(50);
  });

  it('should execute Combine node with divide operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 4 } },
        { id: 'divide', type: 'Combine', config: { operation: 'divide' } },
      ],
      edges: [
        { from: 'input1', to: 'divide' },
        { from: 'input2', to: 'divide' },
      ],
      output: 'divide',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(25);
  });

  it('should execute Combine node with average operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 200 } },
        { id: 'input3', type: 'Factor', config: { value: 300 } },
        { id: 'average', type: 'Combine', config: { operation: 'average' } },
      ],
      edges: [
        { from: 'input1', to: 'average' },
        { from: 'input2', to: 'average' },
        { from: 'input3', to: 'average' },
      ],
      output: 'average',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(200);
  });

  it('should execute Combine node with weighted_average operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 200 } },
        {
          id: 'weighted_avg',
          type: 'Combine',
          config: { operation: 'weighted_average', weights: [0.6, 0.4] },
        },
      ],
      edges: [
        { from: 'input1', to: 'weighted_avg' },
        { from: 'input2', to: 'weighted_avg' },
      ],
      output: 'weighted_avg',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(140); // 100*0.6 + 200*0.4 = 60 + 80 = 140
  });

  it('should execute Combine node with min operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 50 } },
        { id: 'input3', type: 'Factor', config: { value: 75 } },
        { id: 'min', type: 'Combine', config: { operation: 'min' } },
      ],
      edges: [
        { from: 'input1', to: 'min' },
        { from: 'input2', to: 'min' },
        { from: 'input3', to: 'min' },
      ],
      output: 'min',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(50);
  });

  it('should execute Combine node with max operation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 50 } },
        { id: 'input3', type: 'Factor', config: { value: 75 } },
        { id: 'max', type: 'Combine', config: { operation: 'max' } },
      ],
      edges: [
        { from: 'input1', to: 'max' },
        { from: 'input2', to: 'max' },
        { from: 'input3', to: 'max' },
      ],
      output: 'max',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(100);
  });

  it('should throw error for Combine node with no inputs', async () => {
    const graph: PAMGraph = {
      nodes: [{ id: 'add', type: 'Combine', config: { operation: 'add' } }],
      edges: [],
      output: 'add',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });

  it('should throw error for Combine node with weighted_average without weights', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 200 } },
        {
          id: 'weighted_avg',
          type: 'Combine',
          config: { operation: 'weighted_average' },
        },
      ],
      edges: [
        { from: 'input1', to: 'weighted_avg' },
        { from: 'input2', to: 'weighted_avg' },
      ],
      output: 'weighted_avg',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /weighted_average requires weights/
    );
  });

  it('should throw error for Combine node with mismatched weights length', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 200 } },
        {
          id: 'weighted_avg',
          type: 'Combine',
          config: { operation: 'weighted_average', weights: [0.5, 0.3, 0.2] },
        },
      ],
      edges: [
        { from: 'input1', to: 'weighted_avg' },
        { from: 'input2', to: 'weighted_avg' },
      ],
      output: 'weighted_avg',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });
});

// ============================================================================
// Controls Node Tests
// ============================================================================

describe('Graph Executor - Controls Nodes', () => {
  it('should execute Controls node with cap', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 1500 } },
        { id: 'cap', type: 'Controls', config: { cap: 1000 } },
      ],
      edges: [{ from: 'input', to: 'cap' }],
      output: 'cap',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(1000); // Capped at 1000
  });

  it('should execute Controls node with floor', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 50 } },
        { id: 'floor', type: 'Controls', config: { floor: 100 } },
      ],
      edges: [{ from: 'input', to: 'floor' }],
      output: 'floor',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(100); // Floored at 100
  });

  it('should execute Controls node with cap and floor (collar)', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 500 } },
        { id: 'collar', type: 'Controls', config: { cap: 1000, floor: 100 } },
      ],
      edges: [{ from: 'input', to: 'collar' }],
      output: 'collar',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(500); // Within collar range
  });

  it('should execute Controls node with spike sharing above upper band', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 1100 } },
        {
          id: 'spike',
          type: 'Controls',
          config: {
            triggerBand: { lower: 500, upper: 900 },
            spikeSharing: { sharePercent: 50, direction: 'above' },
          },
        },
      ],
      edges: [{ from: 'input', to: 'spike' }],
      output: 'spike',
    };

    const result = await executeGraph(graph, baseContext);
    // Spike above 900: 1100 - 900 = 200
    // Share 50%: 200 * 0.5 = 100
    // Result: 900 + 100 = 1000
    expect(result.value).toBe(1000);
  });

  it('should execute Controls node with spike sharing below lower band', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 300 } },
        {
          id: 'spike',
          type: 'Controls',
          config: {
            triggerBand: { lower: 500, upper: 900 },
            spikeSharing: { sharePercent: 50, direction: 'below' },
          },
        },
      ],
      edges: [{ from: 'input', to: 'spike' }],
      output: 'spike',
    };

    const result = await executeGraph(graph, baseContext);
    // Spike below 500: 500 - 300 = 200
    // Share 50%: 200 * 0.5 = 100
    // Result: 500 - 100 = 400
    expect(result.value).toBe(400);
  });

  it('should execute Controls node with spike sharing both directions', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 1100 } },
        {
          id: 'spike',
          type: 'Controls',
          config: {
            triggerBand: { lower: 500, upper: 900 },
            spikeSharing: { sharePercent: 50, direction: 'both' },
          },
        },
      ],
      edges: [{ from: 'input', to: 'spike' }],
      output: 'spike',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(1000);
  });

  it('should execute Controls node with value within trigger band (no spike sharing)', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 700 } },
        {
          id: 'spike',
          type: 'Controls',
          config: {
            triggerBand: { lower: 500, upper: 900 },
            spikeSharing: { sharePercent: 50, direction: 'both' },
          },
        },
      ],
      edges: [{ from: 'input', to: 'spike' }],
      output: 'spike',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.value).toBe(700); // No spike sharing applied
  });

  it('should execute Controls node with spike sharing then cap', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 1500 } },
        {
          id: 'spike_and_cap',
          type: 'Controls',
          config: {
            cap: 1200,
            triggerBand: { lower: 500, upper: 900 },
            spikeSharing: { sharePercent: 50, direction: 'above' },
          },
        },
      ],
      edges: [{ from: 'input', to: 'spike_and_cap' }],
      output: 'spike_and_cap',
    };

    const result = await executeGraph(graph, baseContext);
    // Spike above 900: 1500 - 900 = 600
    // Share 50%: 600 * 0.5 = 300
    // After spike sharing: 900 + 300 = 1200
    // Cap at 1200: 1200
    expect(result.value).toBe(1200);
  });

  it('should throw error for Controls node with wrong input count', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 10 } },
        { id: 'input2', type: 'Factor', config: { value: 20 } },
        { id: 'cap', type: 'Controls', config: { cap: 1000 } },
      ],
      edges: [
        { from: 'input1', to: 'cap' },
        { from: 'input2', to: 'cap' },
      ],
      output: 'cap',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });
});

// ============================================================================
// Complex Graph Tests
// ============================================================================

describe('Graph Executor - Complex Graphs', () => {
  it('should execute complex multi-node graph', async () => {
    // Graph: (100 + 50) * 1.15, then apply floor of 150
    const graph: PAMGraph = {
      nodes: [
        { id: 'base', type: 'Factor', config: { value: 100 } },
        { id: 'premium', type: 'Factor', config: { value: 50 } },
        { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
        { id: 'add', type: 'Combine', config: { operation: 'add' } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
        { id: 'floor', type: 'Controls', config: { floor: 150 } },
      ],
      edges: [
        { from: 'base', to: 'add' },
        { from: 'premium', to: 'add' },
        { from: 'add', to: 'multiply' },
        { from: 'multiplier', to: 'multiply' },
        { from: 'multiply', to: 'floor' },
      ],
      output: 'floor',
    };

    const result = await executeGraph(graph, baseContext);
    // (100 + 50) * 1.15 = 150 * 1.15 = 172.5
    expect(result.value).toBe(172.5);
    expect(result.contributions['add']).toBe(150);
    expect(result.contributions['multiply']).toBe(172.5);
    expect(result.contributions['floor']).toBe(172.5);
  });

  it('should track contributions for all nodes', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100 } },
        { id: 'input2', type: 'Factor', config: { value: 50 } },
        { id: 'add', type: 'Combine', config: { operation: 'add' } },
        {
          id: 'round',
          type: 'Transform',
          config: { function: 'round', params: { decimals: 0 } },
        },
      ],
      edges: [
        { from: 'input1', to: 'add' },
        { from: 'input2', to: 'add' },
        { from: 'add', to: 'round' },
      ],
      output: 'round',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.contributions).toEqual({
      input1: 100,
      input2: 50,
      add: 150,
      round: 150,
    });
  });

  it('should include execution metadata', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 100 } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
        { id: 'constant', type: 'Factor', config: { value: 2 } },
      ],
      edges: [
        { from: 'input', to: 'multiply' },
        { from: 'constant', to: 'multiply' },
      ],
      output: 'multiply',
    };

    const result = await executeGraph(graph, baseContext);
    expect(result.metadata).toMatchObject({
      executedAt: expect.any(Date),
      asOfDate: baseContext.asOfDate,
      nodesEvaluated: 3,
      executionTimeMs: expect.any(Number),
    });
    expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Graph Executor - Error Handling', () => {
  it('should throw error for invalid graph compilation', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'node1', type: 'Factor', config: { value: 100 } },
        { id: 'node2', type: 'Factor', config: { value: 50 } },
      ],
      edges: [
        { from: 'node1', to: 'node2' },
        { from: 'node2', to: 'node1' }, // Creates cycle
      ],
      output: 'node1',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });

  it('should throw error for missing output node', async () => {
    const graph: PAMGraph = {
      nodes: [{ id: 'input', type: 'Factor', config: { value: 100 } }],
      edges: [],
      output: 'nonexistent',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Graph compilation failed/
    );
  });

  it('should throw error for unsupported node type', async () => {
    const graph: PAMGraph = {
      nodes: [
        {
          id: 'invalid',
          type: 'InvalidType' as any,
          config: {},
        },
      ],
      edges: [],
      output: 'invalid',
    };

    await expect(executeGraph(graph, baseContext)).rejects.toThrow(
      /Unsupported node type/
    );
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe('Graph Executor - Determinism', () => {
  it('should produce same hash for identical inputs', () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 100 } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
        { id: 'constant', type: 'Factor', config: { value: 2 } },
      ],
      edges: [
        { from: 'input', to: 'multiply' },
        { from: 'constant', to: 'multiply' },
      ],
      output: 'multiply',
    };

    const hash1 = hashExecutionInputs(graph, baseContext);
    const hash2 = hashExecutionInputs(graph, baseContext);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hash length
  });

  it('should produce different hashes for different inputs', () => {
    const graph1: PAMGraph = {
      nodes: [{ id: 'input', type: 'Factor', config: { value: 100 } }],
      edges: [],
      output: 'input',
    };

    const graph2: PAMGraph = {
      nodes: [{ id: 'different_input', type: 'Factor', config: { value: 200 } }],
      edges: [],
      output: 'different_input',
    };

    const hash1 = hashExecutionInputs(graph1, baseContext);
    const hash2 = hashExecutionInputs(graph2, baseContext);

    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes for different asOfDate', () => {
    const graph: PAMGraph = {
      nodes: [{ id: 'input', type: 'Factor', config: { value: 100 } }],
      edges: [],
      output: 'input',
    };

    const context1 = { ...baseContext, asOfDate: new Date('2024-01-01') };
    const context2 = { ...baseContext, asOfDate: new Date('2024-01-15') };

    const hash1 = hashExecutionInputs(graph, context1);
    const hash2 = hashExecutionInputs(graph, context2);

    expect(hash1).not.toBe(hash2);
  });

  it('should create execution plan with input hash', () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input', type: 'Factor', config: { value: 100 } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
        { id: 'constant', type: 'Factor', config: { value: 2 } },
      ],
      edges: [
        { from: 'input', to: 'multiply' },
        { from: 'constant', to: 'multiply' },
      ],
      output: 'multiply',
    };

    const plan = createExecutionPlan(graph, baseContext);

    expect(plan).toMatchObject({
      compiled: expect.objectContaining({
        executionPlan: expect.any(Array),
        dependencies: expect.any(Object),
      }),
      inputsHash: expect.any(String),
      createdAt: expect.any(Date),
    });
    expect(plan.inputsHash).toHaveLength(64);
    expect(plan.compiled.executionPlan).toHaveLength(3);
  });

  it('should produce same execution result for same inputs', async () => {
    const graph: PAMGraph = {
      nodes: [
        { id: 'input1', type: 'Factor', config: { value: 100.123456789012 } },
        { id: 'input2', type: 'Factor', config: { value: 50.987654321098 } },
        { id: 'add', type: 'Combine', config: { operation: 'add' } },
      ],
      edges: [
        { from: 'input1', to: 'add' },
        { from: 'input2', to: 'add' },
      ],
      output: 'add',
    };

    const result1 = await executeGraph(graph, baseContext);
    const result2 = await executeGraph(graph, baseContext);

    expect(result1.value).toBe(result2.value);
    expect(result1.contributions).toEqual(result2.contributions);
  });
});
