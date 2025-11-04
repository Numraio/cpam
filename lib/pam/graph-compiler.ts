/**
 * PAM Graph Compiler
 *
 * Compiles and validates PAM graphs, producing an execution plan.
 */

import type {
  PAMGraph,
  NodeId,
  CompiledGraph,
  ValidationResult,
} from './graph-types';
import { validateGraph } from './graph-validator';

/**
 * Compiles a PAM graph into an executable form
 *
 * Steps:
 * 1. Validate graph structure and semantics
 * 2. Generate topological sort (execution order)
 * 3. Build dependency maps
 * 4. Infer input/output units and currencies
 *
 * @param graph - The PAM graph to compile
 * @returns Compiled graph with execution plan, or validation errors
 */
export function compileGraph(graph: PAMGraph): {
  success: boolean;
  compiled?: CompiledGraph;
  validation?: ValidationResult;
} {
  // Step 1: Validate the graph
  const validation = validateGraph(graph);

  if (!validation.valid) {
    return { success: false, validation };
  }

  // Step 2: Generate execution plan (topological sort)
  const executionPlan = topologicalSort(graph);

  if (!executionPlan) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [
          {
            type: 'CYCLIC_GRAPH',
            message: 'Failed to generate execution plan: graph contains cycles',
          },
        ],
      },
    };
  }

  // Step 3: Build dependency maps
  const dependencies = buildDependencyMap(graph);
  const dependents = buildDependentsMap(graph);

  // Step 4: Create compiled graph
  const compiled: CompiledGraph = {
    graph,
    executionPlan,
    dependencies,
    dependents,
    inputCurrency: graph.metadata?.baseCurrency,
    inputUnit: graph.metadata?.baseUnit,
    compiledAt: new Date(),
  };

  return {
    success: true,
    compiled,
    validation,
  };
}

/**
 * Topological sort using DFS
 * Returns nodes in execution order
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
          return true; // Cycle detected
        }
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    result.unshift(nodeId); // Prepend for correct topological order
    return false;
  }

  // Start DFS from all nodes
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return null; // Cycle detected
      }
    }
  }

  return result;
}

/**
 * Builds adjacency list (node → successors)
 */
function buildAdjacencyList(graph: PAMGraph): Map<NodeId, NodeId[]> {
  const adjacencyList = new Map<NodeId, NodeId[]>();

  // Initialize all nodes
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
 * Builds dependency map (node → predecessors)
 */
function buildDependencyMap(graph: PAMGraph): Record<NodeId, NodeId[]> {
  const dependencies: Record<NodeId, NodeId[]> = {};

  // Initialize all nodes
  for (const node of graph.nodes) {
    dependencies[node.id] = [];
  }

  // Add dependencies from edges
  for (const edge of graph.edges) {
    dependencies[edge.to].push(edge.from);
  }

  return dependencies;
}

/**
 * Builds dependents map (node → successors)
 */
function buildDependentsMap(graph: PAMGraph): Record<NodeId, NodeId[]> {
  const dependents: Record<NodeId, NodeId[]> = {};

  // Initialize all nodes
  for (const node of graph.nodes) {
    dependents[node.id] = [];
  }

  // Add dependents from edges
  for (const edge of graph.edges) {
    dependents[edge.from].push(edge.to);
  }

  return dependents;
}

/**
 * Pretty-prints the execution plan
 */
export function printExecutionPlan(compiled: CompiledGraph): string {
  const lines: string[] = [];
  lines.push('Execution Plan:');
  lines.push('==============');

  for (let i = 0; i < compiled.executionPlan.length; i++) {
    const nodeId = compiled.executionPlan[i];
    const node = compiled.graph.nodes.find((n) => n.id === nodeId);

    if (!node) continue;

    const deps = compiled.dependencies[nodeId] || [];
    const depsStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';

    lines.push(`${i + 1}. [${node.type}] ${nodeId}${depsStr}`);
  }

  lines.push('');
  lines.push(`Output: ${compiled.graph.output}`);

  return lines.join('\n');
}
