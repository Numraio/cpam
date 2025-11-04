/**
 * PAM Graph Zod Schemas
 *
 * Provides runtime validation for PAM graph structures using Zod.
 */

import { z } from 'zod';

// ============================================================================
// Node Configuration Schemas
// ============================================================================

export const factorNodeConfigSchema = z.object({
  series: z.string().optional(),
  value: z.number().optional(),
  operation: z
    .enum(['value', 'avg_3m', 'avg_6m', 'avg_12m', 'min', 'max'])
    .optional()
    .default('value'),
  lagDays: z.number().int().nonnegative().optional(),
}).refine(
  (data) => data.series !== undefined || data.value !== undefined,
  {
    message: 'Factor node must have either series or value',
  }
);

export const transformNodeConfigSchema = z.object({
  function: z.enum([
    'abs',
    'ceil',
    'floor',
    'round',
    'log',
    'exp',
    'sqrt',
    'pow',
    'percent_change',
  ]),
  params: z
    .object({
      exponent: z.number().optional(),
      decimals: z.number().int().nonnegative().optional(),
      baseValue: z.number().optional(),
    })
    .optional(),
}).refine(
  (data) => {
    if (data.function === 'pow' && !data.params?.exponent) {
      return false;
    }
    return true;
  },
  {
    message: 'pow function requires exponent parameter',
  }
);

export const convertNodeConfigSchema = z.object({
  type: z.enum(['unit', 'currency']),
  from: z.string().min(1),
  to: z.string().min(1),
  density: z.number().positive().optional(),
  conversionFactor: z.number().positive().optional(),
  fxSeries: z.string().optional(),
  fixedRate: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.type === 'unit') {
      // Unit conversion requires density or conversionFactor
      return data.density !== undefined || data.conversionFactor !== undefined;
    }
    if (data.type === 'currency') {
      // Currency conversion requires fxSeries or fixedRate
      return data.fxSeries !== undefined || data.fixedRate !== undefined;
    }
    return true;
  },
  {
    message:
      'Unit conversion requires density or conversionFactor; currency conversion requires fxSeries or fixedRate',
  }
);

export const combineNodeConfigSchema = z.object({
  operation: z.enum([
    'add',
    'subtract',
    'multiply',
    'divide',
    'average',
    'weighted_average',
    'min',
    'max',
  ]),
  weights: z.array(z.number()).optional(),
}).refine(
  (data) => {
    if (data.operation === 'weighted_average' && !data.weights) {
      return false;
    }
    return true;
  },
  {
    message: 'weighted_average operation requires weights',
  }
);

export const controlsNodeConfigSchema = z.object({
  cap: z.number().optional(),
  floor: z.number().optional(),
  triggerBand: z
    .object({
      lower: z.number(),
      upper: z.number(),
    })
    .refine((data) => data.lower < data.upper, {
      message: 'triggerBand.lower must be less than triggerBand.upper',
    })
    .optional(),
  spikeSharing: z
    .object({
      sharePercent: z.number().min(0).max(100),
      direction: z.enum(['above', 'below', 'both']),
    })
    .optional(),
}).refine(
  (data) => {
    // If spikeSharing is defined, triggerBand must also be defined
    if (data.spikeSharing && !data.triggerBand) {
      return false;
    }
    // At least one control must be defined
    return (
      data.cap !== undefined ||
      data.floor !== undefined ||
      data.triggerBand !== undefined
    );
  },
  {
    message:
      'Controls node must have at least one control (cap, floor, or triggerBand); spikeSharing requires triggerBand',
  }
);

// ============================================================================
// Node Schema
// ============================================================================

export const graphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['Factor', 'Transform', 'Convert', 'Combine', 'Controls']),
  config: z.any(), // Will be validated based on type
  label: z.string().optional(),
  description: z.string().optional(),
});

// ============================================================================
// Edge Schema
// ============================================================================

export const graphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

// ============================================================================
// Graph Schema
// ============================================================================

export const pamGraphSchema = z.object({
  nodes: z.array(graphNodeSchema).min(1),
  edges: z.array(graphEdgeSchema),
  output: z.string().min(1),
  metadata: z
    .object({
      version: z.string().optional(),
      author: z.string().optional(),
      createdAt: z.string().optional(),
      description: z.string().optional(),
      baseCurrency: z.string().optional(),
      baseUnit: z.string().optional(),
    })
    .optional(),
});

// ============================================================================
// Validation Function with Type-Specific Config Validation
// ============================================================================

export function validateGraphSchema(graph: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  try {
    // First validate the basic structure
    const result = pamGraphSchema.safeParse(graph);

    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    const validatedGraph = result.data;
    const errors: string[] = [];

    // Validate each node's config based on its type
    for (const node of validatedGraph.nodes) {
      let configSchema: z.ZodSchema;

      switch (node.type) {
        case 'Factor':
          configSchema = factorNodeConfigSchema;
          break;
        case 'Transform':
          configSchema = transformNodeConfigSchema;
          break;
        case 'Convert':
          configSchema = convertNodeConfigSchema;
          break;
        case 'Combine':
          configSchema = combineNodeConfigSchema;
          break;
        case 'Controls':
          configSchema = controlsNodeConfigSchema;
          break;
        default:
          errors.push(`Node ${node.id}: Unknown node type ${node.type}`);
          continue;
      }

      const configResult = configSchema.safeParse(node.config);
      if (!configResult.success) {
        errors.push(
          ...configResult.error.errors.map(
            (e) => `Node ${node.id} config.${e.path.join('.')}: ${e.message}`
          )
        );
      } else {
        // Update config with validated data (includes defaults)
        node.config = configResult.data;
      }
    }

    // Validate that output node exists
    const outputNode = validatedGraph.nodes.find((n: any) => n.id === validatedGraph.output);
    if (!outputNode) {
      errors.push(`Output node '${validatedGraph.output}' not found in nodes`);
    }

    // Validate that all edges reference existing nodes
    const nodeIds = new Set(validatedGraph.nodes.map((n: any) => n.id));
    for (const edge of validatedGraph.edges) {
      if (!nodeIds.has(edge.from)) {
        errors.push(`Edge references non-existent 'from' node: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`Edge references non-existent 'to' node: ${edge.to}`);
      }
    }

    // Check for duplicate node IDs
    const seenIds = new Set<string>();
    for (const node of validatedGraph.nodes) {
      if (seenIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      seenIds.add(node.id);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: validatedGraph };
  } catch (error) {
    return {
      success: false,
      errors: [`Unexpected validation error: ${error}`],
    };
  }
}
