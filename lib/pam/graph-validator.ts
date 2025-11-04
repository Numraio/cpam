/**
 * PAM Graph Validator
 *
 * Validates PAM graphs for:
 * - Acyclicity (DAG property)
 * - Unit/currency consistency
 * - Reachability
 * - Semantic correctness
 */

import type {
  PAMGraph,
  GraphNode,
  GraphEdge,
  NodeId,
  ValidationError,
  ValidationResult,
  FactorNode,
  ConvertNode,
  CombineNode,
} from './graph-types';

// ============================================================================
// Graph Topology Validation
// ============================================================================

/**
 * Detects cycles in the graph using DFS
 * Returns the cycle path if found
 */
function detectCycle(
  graph: PAMGraph
): { hasCycle: boolean; cyclePath?: NodeId[] } {
  const adjacencyList = buildAdjacencyList(graph);
  const visited = new Set<NodeId>();
  const recursionStack = new Set<NodeId>();
  const path: NodeId[] = [];

  function dfs(nodeId: NodeId): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true; // Cycle found
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a back edge - cycle detected
        path.push(neighbor);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return { hasCycle: true, cyclePath: [...path] };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Builds adjacency list from edges
 */
function buildAdjacencyList(graph: PAMGraph): Map<NodeId, NodeId[]> {
  const adjacencyList = new Map<NodeId, NodeId[]>();

  // Initialize with all nodes
  for (const node of graph.nodes) {
    adjacencyList.set(node.id, []);
  }

  // Add edges
  for (const edge of graph.edges) {
    const neighbors = adjacencyList.get(edge.from) || [];
    neighbors.push(edge.to);
    adjacencyList.set(edge.from, neighbors);
  }

  return adjacencyList;
}

/**
 * Finds unreachable nodes (nodes not in path to output)
 */
function findUnreachableNodes(graph: PAMGraph): NodeId[] {
  const adjacencyList = buildAdjacencyList(graph);
  const reverseAdjacencyList = buildReverseAdjacencyList(graph);

  // Find all nodes reachable from output (traversing backwards)
  const reachable = new Set<NodeId>();
  const queue: NodeId[] = [graph.output];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;

    reachable.add(nodeId);

    const predecessors = reverseAdjacencyList.get(nodeId) || [];
    queue.push(...predecessors);
  }

  // Return nodes not reachable
  return graph.nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id);
}

/**
 * Builds reverse adjacency list (predecessors)
 */
function buildReverseAdjacencyList(graph: PAMGraph): Map<NodeId, NodeId[]> {
  const reverseAdjacencyList = new Map<NodeId, NodeId[]>();

  // Initialize with all nodes
  for (const node of graph.nodes) {
    reverseAdjacencyList.set(node.id, []);
  }

  // Add reverse edges
  for (const edge of graph.edges) {
    const predecessors = reverseAdjacencyList.get(edge.to) || [];
    predecessors.push(edge.from);
    reverseAdjacencyList.set(edge.to, predecessors);
  }

  return reverseAdjacencyList;
}

// ============================================================================
// Unit/Currency Tracking
// ============================================================================

interface UnitCurrencyInfo {
  currency?: string; // Currency code (e.g., "USD", "EUR")
  unit?: string; // Unit of measure (e.g., "bbl", "MT", "kg")
}

/**
 * Infer output unit/currency for a node based on its type and inputs
 */
function inferNodeOutput(
  node: GraphNode,
  inputs: UnitCurrencyInfo[]
): UnitCurrencyInfo {
  switch (node.type) {
    case 'Factor': {
      const factorNode = node as FactorNode;
      if (factorNode.config.series) {
        // For timeseries, we need to look up the unit/currency from IndexSeries
        // For now, return unknown (will be resolved during execution)
        return { currency: undefined, unit: undefined };
      } else if (factorNode.config.value !== undefined) {
        // Constants have no unit/currency
        return {};
      }
      return {};
    }

    case 'Transform': {
      // Transform preserves unit/currency from input
      return inputs[0] || {};
    }

    case 'Convert': {
      const convertNode = node as ConvertNode;
      if (convertNode.config.type === 'unit') {
        // Unit conversion: currency preserved, unit changed
        return {
          currency: inputs[0]?.currency,
          unit: convertNode.config.to,
        };
      } else {
        // Currency conversion: unit preserved, currency changed
        return {
          currency: convertNode.config.to,
          unit: inputs[0]?.unit,
        };
      }
    }

    case 'Combine': {
      const combineNode = node as CombineNode;
      // For combine, all inputs should have same unit/currency
      // Return the first input's unit/currency
      return inputs[0] || {};
    }

    case 'Controls': {
      // Controls preserves unit/currency from input
      return inputs[0] || {};
    }

    default:
      return {};
  }
}

/**
 * Validates unit/currency consistency across the graph
 */
function validateUnitCurrency(graph: PAMGraph): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeOutputs = new Map<NodeId, UnitCurrencyInfo>();
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const reverseAdjacencyList = buildReverseAdjacencyList(graph);

  // Topological sort to process nodes in order
  const sorted = topologicalSort(graph);
  if (!sorted) {
    // Cycle detected - will be caught by other validator
    return errors;
  }

  for (const nodeId of sorted) {
    const node = nodeMap.get(nodeId)!;
    const predecessors = reverseAdjacencyList.get(nodeId) || [];
    const inputInfos = predecessors.map((p) => nodeOutputs.get(p) || {});

    // Validate combine nodes have consistent inputs
    if (node.type === 'Combine') {
      const currencies = inputInfos.map((i) => i.currency).filter(Boolean);
      const units = inputInfos.map((i) => i.unit).filter(Boolean);

      // Check if all currencies are the same (if currencies are present)
      const uniqueCurrencies = new Set(currencies);
      if (uniqueCurrencies.size > 1) {
        errors.push({
          type: 'CURRENCY_MISMATCH',
          message: `Combine node '${nodeId}' has inputs with different currencies: ${Array.from(uniqueCurrencies).join(', ')}. Add Convert nodes to align currencies.`,
          nodeId,
        });
      }

      // Check if all units are the same (if units are present)
      const uniqueUnits = new Set(units);
      if (uniqueUnits.size > 1) {
        errors.push({
          type: 'UNIT_MISMATCH',
          message: `Combine node '${nodeId}' has inputs with different units: ${Array.from(uniqueUnits).join(', ')}. Add Convert nodes to align units.`,
          nodeId,
        });
      }
    }

    // Validate convert nodes
    if (node.type === 'Convert') {
      const convertNode = node as ConvertNode;
      const inputInfo = inputInfos[0];

      if (convertNode.config.type === 'currency') {
        // Verify input has a currency
        if (!inputInfo?.currency) {
          errors.push({
            type: 'INVALID_NODE_CONFIG',
            message: `Convert node '${nodeId}' attempts currency conversion but input has no currency`,
            nodeId,
          });
        }
      } else if (convertNode.config.type === 'unit') {
        // Verify input has a unit
        if (!inputInfo?.unit) {
          errors.push({
            type: 'INVALID_NODE_CONFIG',
            message: `Convert node '${nodeId}' attempts unit conversion but input has no unit`,
            nodeId,
          });
        }
      }
    }

    // Infer and store output for this node
    const output = inferNodeOutput(node, inputInfos);
    nodeOutputs.set(nodeId, output);
  }

  return errors;
}

/**
 * Topological sort using DFS
 * Returns null if cycle detected
 */
function topologicalSort(graph: PAMGraph): NodeId[] | null {
  const adjacencyList = buildAdjacencyList(graph);
  const visited = new Set<NodeId>();
  const recursionStack = new Set<NodeId>();
  const result: NodeId[] = [];

  function dfs(nodeId: NodeId): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true; // Cycle found
        }
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle found
      }
    }

    recursionStack.delete(nodeId);
    result.unshift(nodeId); // Prepend to get correct order
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return null; // Cycle detected
      }
    }
  }

  return result;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates a PAM graph for semantic correctness
 * Returns validation result with errors and warnings
 */
export function validateGraph(graph: PAMGraph): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Check for cycles
  const { hasCycle, cyclePath } = detectCycle(graph);
  if (hasCycle) {
    errors.push({
      type: 'CYCLIC_GRAPH',
      message: `Graph contains a cycle: ${cyclePath?.join(' → ')}`,
      details: { cyclePath },
    });
    // Don't continue validation if graph is cyclic
    return { valid: false, errors };
  }

  // 2. Check output node exists
  const outputNode = graph.nodes.find((n) => n.id === graph.output);
  if (!outputNode) {
    errors.push({
      type: 'MISSING_OUTPUT_NODE',
      message: `Output node '${graph.output}' not found in graph`,
    });
  }

  // 3. Find unreachable nodes (warnings)
  const unreachable = findUnreachableNodes(graph);
  const warnings: ValidationError[] = [];
  for (const nodeId of unreachable) {
    warnings.push({
      type: 'UNREACHABLE_NODE',
      message: `Node '${nodeId}' is not reachable from output node`,
      nodeId,
    });
  }

  // 4. Validate unit/currency consistency
  const unitCurrencyErrors = validateUnitCurrency(graph);
  errors.push(...unitCurrencyErrors);

  // 5. Validate node-specific constraints
  for (const node of graph.nodes) {
    const nodeErrors = validateNodeConstraints(node, graph);
    errors.push(...nodeErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates node-specific constraints
 */
function validateNodeConstraints(
  node: GraphNode,
  graph: PAMGraph
): ValidationError[] {
  const errors: ValidationError[] = [];
  const reverseAdjacencyList = buildReverseAdjacencyList(graph);
  const inputCount = (reverseAdjacencyList.get(node.id) || []).length;

  switch (node.type) {
    case 'Factor':
      // Factor nodes should have no inputs
      if (inputCount > 0) {
        errors.push({
          type: 'INVALID_OPERATION',
          message: `Factor node '${node.id}' should not have inputs`,
          nodeId: node.id,
        });
      }
      break;

    case 'Transform':
    case 'Controls':
      // These nodes require exactly 1 input
      if (inputCount !== 1) {
        errors.push({
          type: 'INVALID_OPERATION',
          message: `${node.type} node '${node.id}' requires exactly 1 input, but has ${inputCount}`,
          nodeId: node.id,
        });
      }
      break;

    case 'Convert':
      // Convert requires exactly 1 input
      if (inputCount !== 1) {
        errors.push({
          type: 'INVALID_OPERATION',
          message: `Convert node '${node.id}' requires exactly 1 input, but has ${inputCount}`,
          nodeId: node.id,
        });
      }
      break;

    case 'Combine': {
      const combineNode = node as CombineNode;
      // Combine requires at least 2 inputs (except for min/max which can have 1)
      const minInputs =
        combineNode.config.operation === 'min' ||
        combineNode.config.operation === 'max'
          ? 1
          : 2;

      if (inputCount < minInputs) {
        errors.push({
          type: 'INVALID_OPERATION',
          message: `Combine node '${node.id}' with operation '${combineNode.config.operation}' requires at least ${minInputs} inputs, but has ${inputCount}`,
          nodeId: node.id,
        });
      }

      // If weighted_average, check weights count matches input count
      if (
        combineNode.config.operation === 'weighted_average' &&
        combineNode.config.weights
      ) {
        if (combineNode.config.weights.length !== inputCount) {
          errors.push({
            type: 'INVALID_OPERATION',
            message: `Combine node '${node.id}' has weighted_average operation with ${combineNode.config.weights.length} weights but ${inputCount} inputs`,
            nodeId: node.id,
          });
        }
      }
      break;
    }
  }

  return errors;
}

/**
 * Helper to get node by ID
 */
export function getNode(graph: PAMGraph, nodeId: NodeId): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/**
 * Helper to get node inputs (predecessors)
 */
export function getNodeInputs(graph: PAMGraph, nodeId: NodeId): NodeId[] {
  return graph.edges.filter((e) => e.to === nodeId).map((e) => e.from);
}

/**
 * Helper to get node outputs (successors)
 */
export function getNodeOutputs(graph: PAMGraph, nodeId: NodeId): NodeId[] {
  return graph.edges.filter((e) => e.from === nodeId).map((e) => e.to);
}
