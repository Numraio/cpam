/**
 * PAM Builder Component
 *
 * Drag-and-drop visual editor for PAM graphs using React Flow.
 * Allows users to create, edit, and validate PAM graphs visually.
 */

'use client';

import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  ConnectionMode,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { validateGraph, compileGraph } from '@/lib/pam';
import type { PAMGraph, NodeType, GraphNode } from '@/lib/pam/graph-types';

import FactorNodeComponent from './nodes/FactorNode';
import TransformNodeComponent from './nodes/TransformNode';
import ConvertNodeComponent from './nodes/ConvertNode';
import CombineNodeComponent from './nodes/CombineNode';
import ControlsNodeComponent from './nodes/ControlsNode';
import NodePalette from './NodePalette';
import ValidationPanel from './ValidationPanel';
import PropertiesPanel from './PropertiesPanel';

// Register custom node types
const nodeTypes = {
  Factor: FactorNodeComponent,
  Transform: TransformNodeComponent,
  Convert: ConvertNodeComponent,
  Combine: CombineNodeComponent,
  Controls: ControlsNodeComponent,
};

// ============================================================================
// Types
// ============================================================================

interface PAMBuilderProps {
  initialGraph?: PAMGraph;
  onSave?: (graph: PAMGraph) => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  readOnly?: boolean;
}

interface ValidationState {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Component
// ============================================================================

function PAMBuilderInner({
  initialGraph,
  onSave,
  onValidate,
  readOnly = false,
}: PAMBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [outputNodeId, setOutputNodeId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    valid: true,
    errors: [],
    warnings: [],
  });

  // Initialize from PAM graph
  React.useEffect(() => {
    if (initialGraph) {
      loadGraph(initialGraph);
    }
  }, [initialGraph]);

  /**
   * Load PAM graph into React Flow
   */
  const loadGraph = useCallback((graph: PAMGraph) => {
    // Convert PAM nodes to React Flow nodes
    const flowNodes: Node[] = graph.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { x: 100 + index * 200, y: 100 + Math.floor(index / 3) * 150 },
      data: {
        config: node.config,
        label: node.id,
      },
    }));

    // Convert PAM edges to React Flow edges
    const flowEdges: Edge[] = graph.edges.map((edge, index) => ({
      id: `e${index}-${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: true,
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
    setOutputNodeId(graph.output);
  }, [setNodes, setEdges]);

  /**
   * Convert React Flow graph to PAM graph
   */
  const toPAMGraph = useCallback((): PAMGraph => {
    const pamNodes: GraphNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type as NodeType,
      config: node.data.config || {},
    }));

    const pamEdges = edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
    }));

    return {
      nodes: pamNodes,
      edges: pamEdges,
      output: outputNodeId || (nodes.length > 0 ? nodes[nodes.length - 1].id : ''),
    };
  }, [nodes, edges, outputNodeId]);

  /**
   * Validate current graph
   */
  const validateCurrentGraph = useCallback(() => {
    const graph = toPAMGraph();

    // Run validation
    const result = validateGraph(graph);

    const newValidation: ValidationState = {
      valid: result.valid,
      errors: result.errors?.map((e) => e.message) || [],
      warnings: result.warnings?.map((w) => w.message) || [],
    };

    setValidation(newValidation);
    onValidate?.(newValidation.valid, newValidation.errors);

    return newValidation;
  }, [toPAMGraph, onValidate]);

  /**
   * Handle edge connection
   */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
          },
          eds
        )
      );

      // Revalidate after connection
      setTimeout(() => validateCurrentGraph(), 100);
    },
    [readOnly, setEdges, validateCurrentGraph]
  );

  /**
   * Handle node selection
   */
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  /**
   * Handle node deletion
   */
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (readOnly) return;

      // If output node was deleted, clear output
      if (deleted.some((n) => n.id === outputNodeId)) {
        setOutputNodeId(null);
      }

      setTimeout(() => validateCurrentGraph(), 100);
    },
    [readOnly, outputNodeId, validateCurrentGraph]
  );

  /**
   * Add node from palette
   */
  const onAddNode = useCallback(
    (type: NodeType) => {
      if (readOnly) return;

      const newNodeId = `${type.toLowerCase()}_${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          config: getDefaultConfig(type),
          label: newNodeId,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [readOnly, setNodes]
  );

  /**
   * Update node configuration
   */
  const onUpdateNodeConfig = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config } }
            : node
        )
      );

      // Revalidate after config change
      setTimeout(() => validateCurrentGraph(), 100);
    },
    [setNodes, validateCurrentGraph]
  );

  /**
   * Set output node
   */
  const onSetOutputNode = useCallback(
    (nodeId: string) => {
      setOutputNodeId(nodeId);
      setTimeout(() => validateCurrentGraph(), 100);
    },
    [validateCurrentGraph]
  );

  /**
   * Save graph
   */
  const handleSave = useCallback(() => {
    const validation = validateCurrentGraph();

    if (!validation.valid) {
      alert('Cannot save: Graph has validation errors');
      return;
    }

    const graph = toPAMGraph();
    onSave?.(graph);
  }, [validateCurrentGraph, toPAMGraph, onSave]);

  /**
   * Test graph (compile and check execution plan)
   */
  const handleTest = useCallback(() => {
    const graph = toPAMGraph();
    const result = compileGraph(graph);

    if (!result.success) {
      alert(
        `Compilation failed:\n${result.validation?.errors.map((e) => e.message).join('\n')}`
      );
      return;
    }

    alert(
      `Graph compiled successfully!\n\nExecution plan: ${result.compiled?.executionPlan.length} nodes\nOrder: ${result.compiled?.executionPlan.join(' → ')}`
    );
  }, [toPAMGraph]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-base-200 p-4 flex items-center justify-between border-b">
        <h1 className="text-2xl font-bold">PAM Builder</h1>
        <div className="flex gap-2">
          <button
            onClick={validateCurrentGraph}
            className="btn btn-sm btn-outline"
            disabled={readOnly}
          >
            Validate
          </button>
          <button
            onClick={handleTest}
            className="btn btn-sm btn-outline"
            disabled={readOnly}
          >
            Test
          </button>
          <button
            onClick={handleSave}
            className="btn btn-sm btn-primary"
            disabled={readOnly}
          >
            Save
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Node palette */}
        {!readOnly && (
          <div className="w-64 bg-base-200 border-r p-4 overflow-y-auto">
            <NodePalette onAddNode={onAddNode} />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            deleteKeyCode={readOnly ? null : 'Delete'}
          >
            <Background />
            <Controls />
            <MiniMap />

            {/* Validation panel */}
            <Panel position="top-right">
              <ValidationPanel validation={validation} />
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties panel */}
        {selectedNode && !readOnly && (
          <div className="w-96 bg-base-200 border-l p-4 overflow-y-auto">
            <PropertiesPanel
              node={selectedNode}
              isOutputNode={selectedNode.id === outputNodeId}
              onUpdateConfig={(config) =>
                onUpdateNodeConfig(selectedNode.id, config)
              }
              onSetOutputNode={() => onSetOutputNode(selectedNode.id)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get default configuration for node type
 */
function getDefaultConfig(type: NodeType): any {
  switch (type) {
    case 'Factor':
      return { value: 100 };
    case 'Transform':
      return { function: 'abs' };
    case 'Convert':
      return { type: 'unit', from: 'bbl', to: 'MT', conversionFactor: 7.3 };
    case 'Combine':
      return { operation: 'add' };
    case 'Controls':
      return { cap: 1000, floor: 100 };
    default:
      return {};
  }
}

// ============================================================================
// Export with Provider
// ============================================================================

export default function PAMBuilder(props: PAMBuilderProps) {
  return (
    <ReactFlowProvider>
      <PAMBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
