/**
 * PAM Graph Executor
 *
 * Executes compiled PAM graphs using decimal math for precise calculations.
 * Produces deterministic results with input hashing for idempotency.
 */

import type {
  CompiledGraph,
  ExecutionContext,
  ExecutionResult,
  GraphNode,
  NodeId,
  FactorNode,
  TransformNode,
  ConvertNode,
  CombineNode,
  ControlsNode,
} from './graph-types';
import { compileGraph } from './graph-compiler';
import {
  D,
  add,
  subtract,
  multiply,
  divide,
  abs,
  ceil as decimalCeil,
  floor as decimalFloor,
  round as decimalRound,
  ln,
  exp,
  sqrt,
  power,
  sum,
  average,
  weightedAverage,
  min as decimalMin,
  max as decimalMax,
  cap,
  applyFloor,
  clamp,
  percentageChange,
  type DecimalValue,
} from '../math/decimal';
import type { PAMGraph } from './graph-types';
import crypto from 'crypto';

// ============================================================================
// Execution Engine
// ============================================================================

/**
 * Executes a PAM graph with given context
 *
 * @param graph - The PAM graph to execute
 * @param context - Execution context with input data
 * @returns Execution result with final value and contributions
 */
export async function executeGraph(
  graph: PAMGraph,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Compile graph (includes validation)
  const compileResult = compileGraph(graph);
  if (!compileResult.success || !compileResult.compiled) {
    throw new Error(
      `Graph compilation failed: ${compileResult.validation?.errors.map((e) => e.message).join(', ')}`
    );
  }

  const compiled = compileResult.compiled;

  // Create node value storage
  const nodeValues = new Map<NodeId, DecimalValue>();
  const contributions: Record<NodeId, number> = {};

  // Execute nodes in topological order
  for (const nodeId of compiled.executionPlan) {
    const node = getNodeById(graph, nodeId);
    if (!node) {
      throw new Error(`Node not found in execution plan: ${nodeId}`);
    }

    // Get input values for this node
    const inputNodeIds = compiled.dependencies[nodeId] || [];
    const inputValues = inputNodeIds.map((id) => {
      const value = nodeValues.get(id);
      if (value === undefined) {
        throw new Error(`Input node ${id} has no value for node ${nodeId}`);
      }
      return value;
    });

    // Execute node
    const value = await executeNode(node, inputValues, context);
    nodeValues.set(nodeId, value);

    // Track contribution (convert to number for JSON serialization)
    contributions[nodeId] = value.toNumber();
  }

  // Get output value
  const outputValue = nodeValues.get(graph.output);
  if (outputValue === undefined) {
    throw new Error(`Output node ${graph.output} has no value`);
  }

  const endTime = Date.now();

  return {
    value: outputValue.toNumber(),
    currency: compiled.outputCurrency || context.baseCurrency || 'USD',
    unit: compiled.outputUnit || context.baseUnit || '',
    contributions,
    metadata: {
      executedAt: new Date(),
      asOfDate: context.asOfDate,
      nodesEvaluated: compiled.executionPlan.length,
      executionTimeMs: endTime - startTime,
    },
  };
}

/**
 * Executes a single node based on its type
 */
async function executeNode(
  node: GraphNode,
  inputs: DecimalValue[],
  context: ExecutionContext
): Promise<DecimalValue> {
  switch (node.type) {
    case 'Factor':
      return executeFactor(node as FactorNode, context);
    case 'Transform':
      return executeTransform(node as TransformNode, inputs);
    case 'Convert':
      return executeConvert(node as ConvertNode, inputs, context);
    case 'Combine':
      return executeCombine(node as CombineNode, inputs);
    case 'Controls':
      return executeControls(node as ControlsNode, inputs);
    default:
      throw new Error(`Unsupported node type: ${(node as any).type}`);
  }
}

// ============================================================================
// Node Type Executors
// ============================================================================

/**
 * Execute Factor node: Returns timeseries value or constant
 */
async function executeFactor(
  node: FactorNode,
  context: ExecutionContext
): Promise<DecimalValue> {
  const config = node.config;

  // If constant value, return it
  if (config.value !== undefined) {
    return D(config.value);
  }

  // If series reference, fetch from timeseries
  if (config.series) {
    // TODO: Fetch from IndexValue table
    // For now, throw error indicating this needs database access
    throw new Error(
      `Factor node ${node.id}: Timeseries lookup not yet implemented. ` +
        `Need to fetch series '${config.series}' from database.`
    );

    // Future implementation:
    // const value = await fetchIndexValue(
    //   context.tenantId,
    //   config.series,
    //   context.asOfDate,
    //   config.lagDays || 0,
    //   config.operation || 'value',
    //   context.versionPreference
    // );
    // return D(value);
  }

  throw new Error(`Factor node ${node.id}: Must have either value or series`);
}

/**
 * Execute Transform node: Apply mathematical transformation
 */
function executeTransform(
  node: TransformNode,
  inputs: DecimalValue[]
): DecimalValue {
  if (inputs.length !== 1) {
    throw new Error(`Transform node ${node.id}: Expected 1 input, got ${inputs.length}`);
  }

  const input = inputs[0];
  const config = node.config;

  switch (config.function) {
    case 'abs':
      return abs(input);

    case 'ceil':
      return decimalCeil(input);

    case 'floor':
      return decimalFloor(input);

    case 'round':
      if (config.params?.decimals !== undefined) {
        return input.toDecimalPlaces(config.params.decimals);
      }
      return decimalRound(input);

    case 'log':
      return ln(input);

    case 'exp':
      return exp(input);

    case 'sqrt':
      return sqrt(input);

    case 'pow':
      if (!config.params?.exponent) {
        throw new Error(`Transform node ${node.id}: pow requires exponent parameter`);
      }
      return power(input, D(config.params.exponent));

    case 'percent_change':
      if (!config.params?.baseValue) {
        throw new Error(
          `Transform node ${node.id}: percent_change requires baseValue parameter`
        );
      }
      return percentageChange(D(config.params.baseValue), input);

    default:
      throw new Error(
        `Transform node ${node.id}: Unsupported function ${config.function}`
      );
  }
}

/**
 * Execute Convert node: Convert units or currencies
 */
async function executeConvert(
  node: ConvertNode,
  inputs: DecimalValue[],
  context: ExecutionContext
): Promise<DecimalValue> {
  if (inputs.length !== 1) {
    throw new Error(`Convert node ${node.id}: Expected 1 input, got ${inputs.length}`);
  }

  const input = inputs[0];
  const config = node.config;

  if (config.type === 'unit') {
    // Unit conversion using density or conversion factor
    const factor = config.conversionFactor || config.density;
    if (!factor) {
      throw new Error(
        `Convert node ${node.id}: Unit conversion requires conversionFactor or density`
      );
    }
    return multiply(input, D(factor));
  } else if (config.type === 'currency') {
    // Currency conversion
    if (config.fixedRate) {
      // Use fixed rate
      return multiply(input, D(config.fixedRate));
    } else if (config.fxSeries) {
      // Fetch FX rate from timeseries
      // TODO: Implement FX lookup
      throw new Error(
        `Convert node ${node.id}: FX series lookup not yet implemented. ` +
          `Need to fetch series '${config.fxSeries}' from database.`
      );
    } else {
      throw new Error(
        `Convert node ${node.id}: Currency conversion requires fixedRate or fxSeries`
      );
    }
  }

  throw new Error(`Convert node ${node.id}: Invalid conversion type ${config.type}`);
}

/**
 * Execute Combine node: Combine multiple inputs
 */
function executeCombine(node: CombineNode, inputs: DecimalValue[]): DecimalValue {
  const config = node.config;

  if (inputs.length === 0) {
    throw new Error(`Combine node ${node.id}: No inputs provided`);
  }

  switch (config.operation) {
    case 'add':
      return sum(inputs);

    case 'subtract':
      if (inputs.length < 2) {
        throw new Error(`Combine node ${node.id}: subtract requires at least 2 inputs`);
      }
      return inputs.slice(1).reduce((acc, val) => subtract(acc, val), inputs[0]);

    case 'multiply':
      return inputs.reduce((acc, val) => multiply(acc, val), D(1));

    case 'divide':
      if (inputs.length < 2) {
        throw new Error(`Combine node ${node.id}: divide requires at least 2 inputs`);
      }
      return inputs.slice(1).reduce((acc, val) => divide(acc, val), inputs[0]);

    case 'average':
      return average(inputs);

    case 'weighted_average':
      if (!config.weights) {
        throw new Error(
          `Combine node ${node.id}: weighted_average requires weights`
        );
      }
      if (config.weights.length !== inputs.length) {
        throw new Error(
          `Combine node ${node.id}: weights length ${config.weights.length} does not match inputs length ${inputs.length}`
        );
      }
      const weights = config.weights.map((w) => D(w));
      return weightedAverage(inputs, weights);

    case 'min':
      return decimalMin(inputs);

    case 'max':
      return decimalMax(inputs);

    default:
      throw new Error(
        `Combine node ${node.id}: Unsupported operation ${config.operation}`
      );
  }
}

/**
 * Execute Controls node: Apply caps, floors, spike sharing
 */
function executeControls(node: ControlsNode, inputs: DecimalValue[]): DecimalValue {
  if (inputs.length !== 1) {
    throw new Error(`Controls node ${node.id}: Expected 1 input, got ${inputs.length}`);
  }

  let value = inputs[0];
  const config = node.config;

  // Apply trigger band and spike sharing if configured
  if (config.triggerBand && config.spikeSharing) {
    const lower = D(config.triggerBand.lower);
    const upper = D(config.triggerBand.upper);
    const sharePercent = D(config.spikeSharing.sharePercent).dividedBy(100);

    const direction = config.spikeSharing.direction;

    if ((direction === 'above' || direction === 'both') && value.greaterThan(upper)) {
      // Spike above: Share portion of spike
      const spike = subtract(value, upper);
      const shared = multiply(spike, sharePercent);
      value = add(upper, shared);
    }

    if ((direction === 'below' || direction === 'both') && value.lessThan(lower)) {
      // Spike below: Share portion of spike
      const spike = subtract(lower, value);
      const shared = multiply(spike, sharePercent);
      value = subtract(lower, shared);
    }
  }

  // Apply cap and floor (collar)
  if (config.cap !== undefined && config.floor !== undefined) {
    value = clamp(value, D(config.floor), D(config.cap));
  } else if (config.cap !== undefined) {
    value = cap(value, D(config.cap));
  } else if (config.floor !== undefined) {
    value = applyFloor(value, D(config.floor));
  }

  return value;
}

// ============================================================================
// Input Hashing for Determinism
// ============================================================================

/**
 * Generates a deterministic hash of execution inputs
 * This ensures the same inputs always produce the same hash
 */
export function hashExecutionInputs(
  graph: PAMGraph,
  context: ExecutionContext
): string {
  const inputData = {
    graph: serializeGraph(graph),
    asOfDate: context.asOfDate.toISOString(),
    versionPreference: context.versionPreference,
    basePrice: context.basePrice,
    baseCurrency: context.baseCurrency,
    baseUnit: context.baseUnit,
  };

  // Stringify with sorted keys for deterministic JSON
  const jsonString = JSON.stringify(inputData, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys alphabetically
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });

  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Serializes graph to canonical form for hashing
 */
function serializeGraph(graph: PAMGraph): any {
  return {
    nodes: graph.nodes
      .map((n) => ({
        id: n.id,
        type: n.type,
        config: n.config,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: graph.edges
      .map((e) => ({ from: e.from, to: e.to }))
      .sort((a, b) => {
        const fromCmp = a.from.localeCompare(b.from);
        return fromCmp !== 0 ? fromCmp : a.to.localeCompare(b.to);
      }),
    output: graph.output,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNodeById(graph: PAMGraph, nodeId: NodeId): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

// ============================================================================
// Execution Plan with Hash
// ============================================================================

export interface ExecutionPlan {
  compiled: CompiledGraph;
  inputsHash: string;
  createdAt: Date;
}

/**
 * Creates an execution plan with input hash for determinism
 */
export function createExecutionPlan(
  graph: PAMGraph,
  context: ExecutionContext
): ExecutionPlan {
  const compileResult = compileGraph(graph);
  if (!compileResult.success || !compileResult.compiled) {
    throw new Error(
      `Failed to create execution plan: ${compileResult.validation?.errors.map((e) => e.message).join(', ')}`
    );
  }

  const inputsHash = hashExecutionInputs(graph, context);

  return {
    compiled: compileResult.compiled,
    inputsHash,
    createdAt: new Date(),
  };
}
