/**
 * PAM Graph Library
 *
 * Main exports for Price Adjustment Mechanism graph functionality.
 */

// Types
export type {
  PAMGraph,
  GraphNode,
  GraphEdge,
  NodeId,
  NodeType,
  NodeConfig,
  FactorNode,
  TransformNode,
  ConvertNode,
  CombineNode,
  ControlsNode,
  FactorNodeConfig,
  TransformNodeConfig,
  ConvertNodeConfig,
  CombineNodeConfig,
  ControlsNodeConfig,
  ExecutionContext,
  ExecutionResult,
  ValidationError,
  ValidationResult,
  ValidationErrorType,
  CompiledGraph,
} from './graph-types';

// Schema validation
export {
  validateGraphSchema,
  pamGraphSchema,
  graphNodeSchema,
  graphEdgeSchema,
  factorNodeConfigSchema,
  transformNodeConfigSchema,
  convertNodeConfigSchema,
  combineNodeConfigSchema,
  controlsNodeConfigSchema,
} from './graph-schema';

// Semantic validation
export {
  validateGraph,
  getNode,
  getNodeInputs,
  getNodeOutputs,
} from './graph-validator';

// Compilation
export {
  compileGraph,
  printExecutionPlan,
} from './graph-compiler';

// Test fixtures (for testing/examples)
export {
  validGraphs,
  invalidGraphs,
} from './test-fixtures';
