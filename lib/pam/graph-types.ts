/**
 * PAM Graph Type Definitions
 *
 * Defines the structure of Price Adjustment Mechanism (PAM) graphs.
 * A PAM graph is a Directed Acyclic Graph (DAG) that represents a formula
 * for calculating adjusted prices based on various factors.
 *
 * Node Types:
 * - Factor: References a timeseries or constant value
 * - Transform: Applies a mathematical transformation (average, lag, etc.)
 * - Convert: Converts between units or currencies
 * - Combine: Combines multiple inputs (add, multiply, etc.)
 * - Controls: Applies caps, floors, or other constraints
 */

// ============================================================================
// Base Types
// ============================================================================

export type NodeId = string;

export interface GraphEdge {
  from: NodeId;
  to: NodeId;
}

// ============================================================================
// Node Configuration Types
// ============================================================================

/**
 * Factor Node: References an index series or constant value
 */
export interface FactorNodeConfig {
  /** Reference to IndexSeries.seriesCode (e.g., "PLATTS_BRENT", "USD_EUR") */
  series?: string;
  /** Constant numeric value (if not using a series) */
  value?: number;
  /** Operation to apply: value (latest), avg_3m, avg_6m, avg_12m, etc. */
  operation?: 'value' | 'avg_3m' | 'avg_6m' | 'avg_12m' | 'min' | 'max';
  /** Lag in days (optional: use value from N days ago) */
  lagDays?: number;
}

/**
 * Transform Node: Applies mathematical transformations
 */
export interface TransformNodeConfig {
  /** Transformation function */
  function:
    | 'abs' // Absolute value
    | 'ceil' // Round up
    | 'floor' // Round down
    | 'round' // Round to nearest
    | 'log' // Natural logarithm
    | 'exp' // Exponential
    | 'sqrt' // Square root
    | 'pow' // Power (requires exponent parameter)
    | 'percent_change'; // Percentage change from base value

  /** Parameters for the transformation */
  params?: {
    /** For 'pow': exponent */
    exponent?: number;
    /** For 'round': decimal places */
    decimals?: number;
    /** For 'percent_change': base value */
    baseValue?: number;
  };
}

/**
 * Convert Node: Unit or currency conversion
 */
export interface ConvertNodeConfig {
  /** Conversion type */
  type: 'unit' | 'currency';

  /** Source unit/currency */
  from: string;

  /** Target unit/currency */
  to: string;

  /** For unit conversions: density or conversion factor */
  density?: number;

  /** For unit conversions: explicit conversion factor (overrides density) */
  conversionFactor?: number;

  /** For currency conversions: FX series code (e.g., "USD_EUR") */
  fxSeries?: string;

  /** For currency conversions: use a fixed rate instead of series */
  fixedRate?: number;
}

/**
 * Combine Node: Combines multiple inputs
 */
export interface CombineNodeConfig {
  /** Operation to combine inputs */
  operation:
    | 'add' // Sum all inputs
    | 'subtract' // First input minus subsequent inputs
    | 'multiply' // Product of all inputs
    | 'divide' // First input divided by subsequent inputs
    | 'average' // Average of all inputs
    | 'weighted_average' // Weighted average (requires weights)
    | 'min' // Minimum of all inputs
    | 'max'; // Maximum of all inputs

  /** For weighted_average: weights for each input (must match input count) */
  weights?: number[];
}

/**
 * Controls Node: Applies caps, floors, collars, and spike sharing
 */
export interface ControlsNodeConfig {
  /** Maximum value (cap) */
  cap?: number;

  /** Minimum value (floor) */
  floor?: number;

  /** Trigger band for spike sharing (optional) */
  triggerBand?: {
    /** Lower bound of trigger band */
    lower: number;
    /** Upper bound of trigger band */
    upper: number;
  };

  /** Spike sharing configuration (optional) */
  spikeSharing?: {
    /** Percentage of spike to share (0-100) */
    sharePercent: number;
    /** Which direction: 'above' (above upper band), 'below' (below lower band), 'both' */
    direction: 'above' | 'below' | 'both';
  };
}

// ============================================================================
// Node Types
// ============================================================================

export type NodeType = 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';

export type NodeConfig =
  | FactorNodeConfig
  | TransformNodeConfig
  | ConvertNodeConfig
  | CombineNodeConfig
  | ControlsNodeConfig;

export interface GraphNode {
  id: NodeId;
  type: NodeType;
  config: NodeConfig;

  /** Optional display name for UI */
  label?: string;

  /** Optional description */
  description?: string;
}

// Typed node interfaces for convenience
export interface FactorNode extends GraphNode {
  type: 'Factor';
  config: FactorNodeConfig;
}

export interface TransformNode extends GraphNode {
  type: 'Transform';
  config: TransformNodeConfig;
}

export interface ConvertNode extends GraphNode {
  type: 'Convert';
  config: ConvertNodeConfig;
}

export interface CombineNode extends GraphNode {
  type: 'Combine';
  config: CombineNodeConfig;
}

export interface ControlsNode extends GraphNode {
  type: 'Controls';
  config: ControlsNodeConfig;
}

// ============================================================================
// Graph Structure
// ============================================================================

export interface PAMGraph {
  /** Graph nodes */
  nodes: GraphNode[];

  /** Graph edges (directed) */
  edges: GraphEdge[];

  /** Output node ID (the node that produces the final result) */
  output: NodeId;

  /** Optional metadata */
  metadata?: {
    /** Graph version */
    version?: string;
    /** Author/creator */
    author?: string;
    /** Creation timestamp */
    createdAt?: string;
    /** Description */
    description?: string;
    /** Expected base currency */
    baseCurrency?: string;
    /** Expected base unit */
    baseUnit?: string;
  };
}

// ============================================================================
// Execution Context
// ============================================================================

/**
 * Context for graph execution
 * Provides access to timeseries data, FX rates, etc.
 */
export interface ExecutionContext {
  /** Calculation date (as-of date) */
  asOfDate: Date;

  /** Tenant ID for data scoping */
  tenantId: string;

  /** Version preference for timeseries data */
  versionPreference: 'PRELIMINARY' | 'FINAL' | 'REVISED';

  /** Base price (if applicable) */
  basePrice?: number;

  /** Base currency */
  baseCurrency?: string;

  /** Base unit of measure */
  baseUnit?: string;
}

/**
 * Result of graph execution
 */
export interface ExecutionResult {
  /** Final calculated value */
  value: number;

  /** Output currency */
  currency: string;

  /** Output unit */
  unit: string;

  /** Contribution waterfall (breakdown by node) */
  contributions: Record<NodeId, number>;

  /** Execution metadata */
  metadata: {
    /** Execution timestamp */
    executedAt: Date;
    /** As-of date used */
    asOfDate: Date;
    /** Number of nodes evaluated */
    nodesEvaluated: number;
    /** Execution time in milliseconds */
    executionTimeMs: number;
  };
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationErrorType =
  | 'CYCLIC_GRAPH'
  | 'MISSING_OUTPUT_NODE'
  | 'INVALID_NODE_CONFIG'
  | 'UNREACHABLE_NODE'
  | 'CURRENCY_MISMATCH'
  | 'UNIT_MISMATCH'
  | 'MISSING_FX_CONVERSION'
  | 'MISSING_UNIT_CONVERSION'
  | 'INVALID_EDGE'
  | 'DUPLICATE_NODE_ID'
  | 'INVALID_OPERATION';

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  nodeId?: NodeId;
  edge?: GraphEdge;
  details?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// ============================================================================
// Compilation Types
// ============================================================================

/**
 * Compiled graph ready for execution
 * Contains the execution plan (topologically sorted nodes)
 */
export interface CompiledGraph {
  /** Original graph */
  graph: PAMGraph;

  /** Execution plan (topologically sorted node IDs) */
  executionPlan: NodeId[];

  /** Node dependencies map */
  dependencies: Record<NodeId, NodeId[]>;

  /** Reverse dependencies (nodes that depend on this node) */
  dependents: Record<NodeId, NodeId[]>;

  /** Expected input currency (inferred from graph) */
  inputCurrency?: string;

  /** Expected input unit (inferred from graph) */
  inputUnit?: string;

  /** Output currency (inferred from graph) */
  outputCurrency?: string;

  /** Output unit (inferred from graph) */
  outputUnit?: string;

  /** Compilation timestamp */
  compiledAt: Date;
}
