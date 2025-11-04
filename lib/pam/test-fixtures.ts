/**
 * PAM Graph Test Fixtures
 *
 * Valid and invalid graphs for testing validation logic
 */

import type { PAMGraph } from './graph-types';

// ============================================================================
// Valid Graphs
// ============================================================================

/**
 * Simple valid graph: Index + Premium + Cap
 * Flow: PLATTS_BRENT → Convert (USD/bbl → USD/MT) → Add Premium → Apply Cap
 */
export const validSimpleGraph: PAMGraph = {
  nodes: [
    {
      id: 'brent_index',
      type: 'Factor',
      config: {
        series: 'PLATTS_BRENT',
        operation: 'value',
      },
    },
    {
      id: 'unit_convert',
      type: 'Convert',
      config: {
        type: 'unit',
        from: 'USD/bbl',
        to: 'USD/MT',
        density: 7.3,
      },
    },
    {
      id: 'premium',
      type: 'Factor',
      config: {
        value: 50.0,
      },
    },
    {
      id: 'add_premium',
      type: 'Combine',
      config: {
        operation: 'add',
      },
    },
    {
      id: 'apply_cap',
      type: 'Controls',
      config: {
        cap: 1000.0,
        floor: 100.0,
      },
    },
  ],
  edges: [
    { from: 'brent_index', to: 'unit_convert' },
    { from: 'unit_convert', to: 'add_premium' },
    { from: 'premium', to: 'add_premium' },
    { from: 'add_premium', to: 'apply_cap' },
  ],
  output: 'apply_cap',
  metadata: {
    description: 'Simple Brent-based pricing with premium and cap',
    baseCurrency: 'USD',
    baseUnit: 'MT',
  },
};

/**
 * Complex valid graph: Multiple indices with FX conversion
 */
export const validComplexGraph: PAMGraph = {
  nodes: [
    {
      id: 'copper_index',
      type: 'Factor',
      config: {
        series: 'LME_COPPER',
        operation: 'avg_3m',
      },
    },
    {
      id: 'multiplier',
      type: 'Factor',
      config: {
        value: 1.15,
      },
    },
    {
      id: 'apply_multiplier',
      type: 'Combine',
      config: {
        operation: 'multiply',
      },
    },
    {
      id: 'fx_convert',
      type: 'Convert',
      config: {
        type: 'currency',
        from: 'USD',
        to: 'EUR',
        fxSeries: 'USD_EUR',
      },
    },
    {
      id: 'floor_control',
      type: 'Controls',
      config: {
        floor: 500.0,
      },
    },
  ],
  edges: [
    { from: 'copper_index', to: 'apply_multiplier' },
    { from: 'multiplier', to: 'apply_multiplier' },
    { from: 'apply_multiplier', to: 'fx_convert' },
    { from: 'fx_convert', to: 'floor_control' },
  ],
  output: 'floor_control',
  metadata: {
    description: 'Copper-based pricing with FX conversion to EUR',
    baseCurrency: 'EUR',
    baseUnit: 'MT',
  },
};

/**
 * Weighted average graph
 */
export const validWeightedAverageGraph: PAMGraph = {
  nodes: [
    {
      id: 'brent',
      type: 'Factor',
      config: {
        series: 'PLATTS_BRENT',
        operation: 'value',
      },
    },
    {
      id: 'wti',
      type: 'Factor',
      config: {
        series: 'PLATTS_WTI',
        operation: 'value',
      },
    },
    {
      id: 'weighted_avg',
      type: 'Combine',
      config: {
        operation: 'weighted_average',
        weights: [0.6, 0.4], // 60% Brent, 40% WTI
      },
    },
  ],
  edges: [
    { from: 'brent', to: 'weighted_avg' },
    { from: 'wti', to: 'weighted_avg' },
  ],
  output: 'weighted_avg',
};

// ============================================================================
// Invalid Graphs
// ============================================================================

/**
 * Invalid: Cyclic graph
 */
export const invalidCyclicGraph: PAMGraph = {
  nodes: [
    {
      id: 'node_a',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'node_b',
      type: 'Transform',
      config: { function: 'abs' },
    },
    {
      id: 'node_c',
      type: 'Transform',
      config: { function: 'abs' },
    },
  ],
  edges: [
    { from: 'node_a', to: 'node_b' },
    { from: 'node_b', to: 'node_c' },
    { from: 'node_c', to: 'node_b' }, // Creates cycle!
  ],
  output: 'node_c',
};

/**
 * Invalid: Currency mismatch without conversion
 */
export const invalidCurrencyMismatch: PAMGraph = {
  nodes: [
    {
      id: 'usd_index',
      type: 'Factor',
      config: {
        series: 'PLATTS_BRENT', // Returns USD
      },
    },
    {
      id: 'eur_premium',
      type: 'Factor',
      config: {
        series: 'EUROPE_PREMIUM', // Returns EUR
      },
    },
    {
      id: 'combine',
      type: 'Combine',
      config: {
        operation: 'add', // Trying to add USD + EUR without conversion!
      },
    },
  ],
  edges: [
    { from: 'usd_index', to: 'combine' },
    { from: 'eur_premium', to: 'combine' },
  ],
  output: 'combine',
};

/**
 * Invalid: Missing output node
 */
export const invalidMissingOutput: PAMGraph = {
  nodes: [
    {
      id: 'node_a',
      type: 'Factor',
      config: { value: 100 },
    },
  ],
  edges: [],
  output: 'non_existent_node', // This node doesn't exist!
};

/**
 * Invalid: Transform node with multiple inputs
 */
export const invalidTransformMultipleInputs: PAMGraph = {
  nodes: [
    {
      id: 'input1',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'input2',
      type: 'Factor',
      config: { value: 200 },
    },
    {
      id: 'transform',
      type: 'Transform',
      config: { function: 'abs' },
    },
  ],
  edges: [
    { from: 'input1', to: 'transform' },
    { from: 'input2', to: 'transform' }, // Transform should only have 1 input!
  ],
  output: 'transform',
};

/**
 * Invalid: Combine node with single input (for operations requiring 2+)
 */
export const invalidCombineSingleInput: PAMGraph = {
  nodes: [
    {
      id: 'input',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'combine',
      type: 'Combine',
      config: {
        operation: 'add', // Add requires at least 2 inputs
      },
    },
  ],
  edges: [{ from: 'input', to: 'combine' }],
  output: 'combine',
};

/**
 * Invalid: Weighted average with mismatched weights
 */
export const invalidWeightedAverageMismatch: PAMGraph = {
  nodes: [
    {
      id: 'input1',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'input2',
      type: 'Factor',
      config: { value: 200 },
    },
    {
      id: 'input3',
      type: 'Factor',
      config: { value: 300 },
    },
    {
      id: 'weighted_avg',
      type: 'Combine',
      config: {
        operation: 'weighted_average',
        weights: [0.5, 0.5], // Only 2 weights but 3 inputs!
      },
    },
  ],
  edges: [
    { from: 'input1', to: 'weighted_avg' },
    { from: 'input2', to: 'weighted_avg' },
    { from: 'input3', to: 'weighted_avg' },
  ],
  output: 'weighted_avg',
};

/**
 * Invalid: Factor node with inputs
 */
export const invalidFactorWithInputs: PAMGraph = {
  nodes: [
    {
      id: 'source',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'factor',
      type: 'Factor',
      config: { value: 50 },
    },
  ],
  edges: [
    { from: 'source', to: 'factor' }, // Factor nodes shouldn't have inputs!
  ],
  output: 'factor',
};

/**
 * Invalid: Unreachable nodes (warning)
 */
export const invalidUnreachableNodes: PAMGraph = {
  nodes: [
    {
      id: 'main_branch',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'unreachable',
      type: 'Factor',
      config: { value: 50 },
    },
    {
      id: 'also_unreachable',
      type: 'Transform',
      config: { function: 'abs' },
    },
  ],
  edges: [
    { from: 'unreachable', to: 'also_unreachable' }, // These don't connect to output
  ],
  output: 'main_branch',
};

/**
 * Invalid: Duplicate node IDs
 */
export const invalidDuplicateNodeIds: PAMGraph = {
  nodes: [
    {
      id: 'node_a',
      type: 'Factor',
      config: { value: 100 },
    },
    {
      id: 'node_a', // Duplicate ID!
      type: 'Factor',
      config: { value: 200 },
    },
  ],
  edges: [],
  output: 'node_a',
};

// ============================================================================
// Export All Fixtures
// ============================================================================

export const validGraphs = {
  simple: validSimpleGraph,
  complex: validComplexGraph,
  weightedAverage: validWeightedAverageGraph,
};

export const invalidGraphs = {
  cyclic: invalidCyclicGraph,
  currencyMismatch: invalidCurrencyMismatch,
  missingOutput: invalidMissingOutput,
  transformMultipleInputs: invalidTransformMultipleInputs,
  combineSingleInput: invalidCombineSingleInput,
  weightedAverageMismatch: invalidWeightedAverageMismatch,
  factorWithInputs: invalidFactorWithInputs,
  unreachableNodes: invalidUnreachableNodes,
  duplicateNodeIds: invalidDuplicateNodeIds,
};
