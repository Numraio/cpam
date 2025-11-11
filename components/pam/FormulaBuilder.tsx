import { useState, useCallback } from 'react';
import ComponentPalette from './ComponentPalette';
import ComponentCanvas from './ComponentCanvas';
import ComponentConfigPanel from './ComponentConfigPanel';

interface GraphNode {
  id: string;
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  config: any;
  label?: string;
  description?: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface PAMGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  output: string;
  metadata?: any;
}

interface FormulaBuilderProps {
  initialGraph?: PAMGraph;
  onChange: (graph: PAMGraph) => void;
}

function getDefaultConfig(type: GraphNode['type']): any {
  switch (type) {
    case 'Factor':
      return {};
    case 'Transform':
      return { function: 'abs' };
    case 'Convert':
      return { type: 'unit' };
    case 'Combine':
      return { operation: 'add' };
    case 'Controls':
      return {};
    default:
      return {};
  }
}

export default function FormulaBuilder({
  initialGraph,
  onChange,
}: FormulaBuilderProps) {
  const [graph, setGraph] = useState<PAMGraph>(
    initialGraph || {
      nodes: [],
      edges: [],
      output: '',
      metadata: {},
    }
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const updateGraph = useCallback(
    (updates: Partial<PAMGraph>) => {
      const newGraph = { ...graph, ...updates };
      setGraph(newGraph);
      onChange(newGraph);
    },
    [graph, onChange]
  );

  const handleAddNode = (type: GraphNode['type']) => {
    const newNode: GraphNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      config: getDefaultConfig(type),
      label: `${type} ${graph.nodes.length + 1}`,
    };

    updateGraph({ nodes: [...graph.nodes, newNode] });
  };

  const handleNodeReorder = (dragIndex: number, hoverIndex: number) => {
    const newNodes = [...graph.nodes];
    const [draggedNode] = newNodes.splice(dragIndex, 1);
    newNodes.splice(hoverIndex, 0, draggedNode);
    updateGraph({ nodes: newNodes });
  };

  const handleNodeDelete = (nodeId: string) => {
    updateGraph({
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      output: graph.output === nodeId ? '' : graph.output,
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleSetOutput = (nodeId: string) => {
    updateGraph({ output: nodeId });
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<GraphNode>) => {
    updateGraph({
      nodes: graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
    });
  };

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Left: Component Palette */}
      <ComponentPalette
        onAddNode={handleAddNode}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        outputSet={!!graph.output}
      />

      {/* Center: Component Canvas */}
      <ComponentCanvas
        nodes={graph.nodes}
        outputNodeId={graph.output}
        onNodeClick={setSelectedNodeId}
        onNodeReorder={handleNodeReorder}
        onNodeDelete={handleNodeDelete}
        onSetOutput={handleSetOutput}
      />

      {/* Right: Configuration Panel */}
      {selectedNode && (
        <ComponentConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={handleNodeUpdate}
        />
      )}
    </div>
  );
}
