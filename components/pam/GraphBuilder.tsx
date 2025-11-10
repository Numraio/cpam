import { useState, useCallback } from 'react';
import { PlusIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface GraphNode {
  id: string;
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  config: any;
  label?: string;
  description?: string;
  position?: { x: number; y: number };
}

interface GraphEdge {
  from: string;
  to: string;
}

interface PAMGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  output: string;
  metadata?: {
    description?: string;
    baseCurrency?: string;
    baseUnit?: string;
  };
}

interface GraphBuilderProps {
  initialGraph?: PAMGraph;
  onChange: (graph: PAMGraph) => void;
}

const NODE_TYPES = [
  { type: 'Factor', label: 'Factor', description: 'Index series or constant value', color: 'bg-blue-100 border-blue-500' },
  { type: 'Transform', label: 'Transform', description: 'Math operations (abs, round, pow)', color: 'bg-green-100 border-green-500' },
  { type: 'Convert', label: 'Convert', description: 'Unit or currency conversion', color: 'bg-purple-100 border-purple-500' },
  { type: 'Combine', label: 'Combine', description: 'Combine inputs (add, multiply, etc)', color: 'bg-yellow-100 border-yellow-500' },
  { type: 'Controls', label: 'Controls', description: 'Caps, floors, spike sharing', color: 'bg-red-100 border-red-500' },
];

const GraphBuilder: React.FC<GraphBuilderProps> = ({ initialGraph, onChange }) => {
  const [graph, setGraph] = useState<PAMGraph>(
    initialGraph || {
      nodes: [],
      edges: [],
      output: '',
      metadata: {},
    }
  );

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const updateGraph = useCallback((updates: Partial<PAMGraph>) => {
    const newGraph = { ...graph, ...updates };
    setGraph(newGraph);
    onChange(newGraph);
  }, [graph, onChange]);

  const addNode = (type: GraphNode['type']) => {
    const newNode: GraphNode = {
      id: `node_${Date.now()}`,
      type,
      config: getDefaultConfig(type),
      label: `${type} ${graph.nodes.length + 1}`,
      position: { x: 100 + graph.nodes.length * 50, y: 100 + graph.nodes.length * 50 },
    };

    updateGraph({ nodes: [...graph.nodes, newNode] });
  };

  const deleteNode = (nodeId: string) => {
    updateGraph({
      nodes: graph.nodes.filter(n => n.id !== nodeId),
      edges: graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
      output: graph.output === nodeId ? '' : graph.output,
    });
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const addEdge = (from: string, to: string) => {
    // Prevent duplicate edges
    if (graph.edges.some(e => e.from === from && e.to === to)) {
      return;
    }
    updateGraph({ edges: [...graph.edges, { from, to }] });
  };

  const deleteEdge = (from: string, to: string) => {
    updateGraph({
      edges: graph.edges.filter(e => !(e.from === from && e.to === to)),
    });
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    updateGraph({
      nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, config } : n),
    });
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    updateGraph({
      nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, label } : n),
    });
  };

  const setOutputNode = (nodeId: string) => {
    updateGraph({ output: nodeId });
  };

  const getNodeInputs = (nodeId: string) => {
    return graph.edges.filter(e => e.to === nodeId).map(e => e.from);
  };

  const getNodeOutputs = (nodeId: string) => {
    return graph.edges.filter(e => e.from === nodeId).map(e => e.to);
  };

  const handleConnect = (nodeId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
    } else {
      if (connectingFrom !== nodeId) {
        addEdge(connectingFrom, nodeId);
      }
      setConnectingFrom(null);
    }
  };

  const selectedNodeData = graph.nodes.find(n => n.id === selectedNode);

  return (
    <div className="flex gap-4 h-full">
      {/* Node Palette */}
      <div className="w-64 bg-base-100 rounded-lg shadow-lg p-4 flex-shrink-0">
        <h3 className="font-bold text-lg mb-4">Node Types</h3>
        <div className="space-y-2">
          {NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              className={`w-full p-3 rounded-lg border-2 text-left hover:shadow-md transition ${nodeType.color}`}
              onClick={() => addNode(nodeType.type as GraphNode['type'])}
            >
              <div className="font-semibold">{nodeType.label}</div>
              <div className="text-xs text-gray-600">{nodeType.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold mb-2">Graph Stats</h4>
          <div className="text-sm space-y-1">
            <div>Nodes: {graph.nodes.length}</div>
            <div>Edges: {graph.edges.length}</div>
            <div>Output: {graph.output ? graph.nodes.find(n => n.id === graph.output)?.label : 'Not set'}</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-base-100 rounded-lg shadow-lg p-4 overflow-auto relative">
        <div className="min-h-[600px] relative">
          {graph.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <PlusIcon className="h-16 w-16 mx-auto mb-2" />
                <p>Drag nodes from the left palette to build your formula</p>
              </div>
            </div>
          )}

          {/* Render nodes */}
          {graph.nodes.map((node) => {
            const nodeTypeInfo = NODE_TYPES.find(t => t.type === node.type);
            const inputs = getNodeInputs(node.id);
            const outputs = getNodeOutputs(node.id);
            const isOutput = graph.output === node.id;
            const isSelected = selectedNode === node.id;
            const isConnecting = connectingFrom === node.id;

            return (
              <div
                key={node.id}
                className={`absolute p-4 rounded-lg border-2 ${nodeTypeInfo?.color} cursor-pointer transition
                  ${isSelected ? 'ring-4 ring-primary' : ''}
                  ${isOutput ? 'ring-2 ring-success' : ''}
                  ${isConnecting ? 'ring-4 ring-warning' : ''}
                `}
                style={{
                  left: node.position?.x || 0,
                  top: node.position?.y || 0,
                  minWidth: '200px',
                }}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{node.label || node.type}</div>
                    <div className="text-xs text-gray-600">{node.type}</div>
                  </div>
                  <button
                    className="btn btn-xs btn-circle btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>

                <div className="text-xs space-y-1 mb-2">
                  {inputs.length > 0 && (
                    <div>Inputs: {inputs.length}</div>
                  )}
                  {outputs.length > 0 && (
                    <div>Outputs: {outputs.length}</div>
                  )}
                </div>

                <div className="flex gap-1 mt-2">
                  <button
                    className={`btn btn-xs ${isConnecting ? 'btn-warning' : 'btn-primary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(node.id);
                    }}
                  >
                    {connectingFrom === node.id ? 'Cancel' : 'Connect'}
                  </button>
                  <button
                    className={`btn btn-xs ${isOutput ? 'btn-success' : 'btn-ghost'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOutputNode(node.id);
                    }}
                  >
                    {isOutput ? 'Output' : 'Set Output'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Connection hint */}
          {connectingFrom && (
            <div className="absolute top-2 left-2 bg-warning text-warning-content px-4 py-2 rounded-lg">
              Click another node to create connection
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 bg-base-100 rounded-lg shadow-lg p-4 flex-shrink-0 overflow-auto">
        <h3 className="font-bold text-lg mb-4">Properties</h3>

        {selectedNodeData ? (
          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Label</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={selectedNodeData.label || ''}
                onChange={(e) => updateNodeLabel(selectedNode!, e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Type</span>
              </label>
              <div className="badge badge-lg">{selectedNodeData.type}</div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Configuration</span>
              </label>
              <NodeConfigEditor
                nodeType={selectedNodeData.type}
                config={selectedNodeData.config}
                onChange={(config) => updateNodeConfig(selectedNode!, config)}
              />
            </div>

            {/* Connections */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Connections</span>
              </label>
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium mb-1">Inputs:</div>
                  {getNodeInputs(selectedNode!).length > 0 ? (
                    <div className="space-y-1">
                      {getNodeInputs(selectedNode!).map((inputId) => {
                        const inputNode = graph.nodes.find(n => n.id === inputId);
                        return (
                          <div key={inputId} className="flex justify-between items-center bg-base-200 p-2 rounded">
                            <span className="text-sm">{inputNode?.label}</span>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => deleteEdge(inputId, selectedNode!)}
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No inputs</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Outputs:</div>
                  {getNodeOutputs(selectedNode!).length > 0 ? (
                    <div className="space-y-1">
                      {getNodeOutputs(selectedNode!).map((outputId) => {
                        const outputNode = graph.nodes.find(n => n.id === outputId);
                        return (
                          <div key={outputId} className="flex justify-between items-center bg-base-200 p-2 rounded">
                            <span className="text-sm">{outputNode?.label}</span>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => deleteEdge(selectedNode!, outputId)}
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No outputs</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            Select a node to edit its properties
          </div>
        )}
      </div>
    </div>
  );
};

// Node Config Editor Component
interface NodeConfigEditorProps {
  nodeType: string;
  config: any;
  onChange: (config: any) => void;
}

const NodeConfigEditor: React.FC<NodeConfigEditorProps> = ({ nodeType, config, onChange }) => {
  const updateField = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  switch (nodeType) {
    case 'Factor':
      return (
        <div className="space-y-2">
          <div>
            <label className="label label-text-alt">Series Code</label>
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={config.series || ''}
              onChange={(e) => updateField('series', e.target.value)}
              placeholder="e.g., PLATTS_BRENT"
            />
          </div>
          <div>
            <label className="label label-text-alt">OR Constant Value</label>
            <input
              type="number"
              step="any"
              className="input input-sm input-bordered w-full"
              value={config.value || ''}
              onChange={(e) => updateField('value', parseFloat(e.target.value) || undefined)}
            />
          </div>
          <div>
            <label className="label label-text-alt">Operation</label>
            <select
              className="select select-sm select-bordered w-full"
              value={config.operation || 'value'}
              onChange={(e) => updateField('operation', e.target.value)}
            >
              <option value="value">Value (latest)</option>
              <option value="avg_3m">3-month average</option>
              <option value="avg_6m">6-month average</option>
              <option value="avg_12m">12-month average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
          <div>
            <label className="label label-text-alt">Lag Days</label>
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              value={config.lagDays || 0}
              onChange={(e) => updateField('lagDays', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      );

    case 'Transform':
      return (
        <div className="space-y-2">
          <div>
            <label className="label label-text-alt">Function</label>
            <select
              className="select select-sm select-bordered w-full"
              value={config.function || 'abs'}
              onChange={(e) => updateField('function', e.target.value)}
            >
              <option value="abs">Absolute value</option>
              <option value="ceil">Ceiling</option>
              <option value="floor">Floor</option>
              <option value="round">Round</option>
              <option value="log">Natural log</option>
              <option value="exp">Exponential</option>
              <option value="sqrt">Square root</option>
              <option value="pow">Power</option>
              <option value="percent_change">Percent change</option>
            </select>
          </div>
          {config.function === 'pow' && (
            <div>
              <label className="label label-text-alt">Exponent</label>
              <input
                type="number"
                step="any"
                className="input input-sm input-bordered w-full"
                value={config.params?.exponent || 2}
                onChange={(e) => updateField('params', { ...config.params, exponent: parseFloat(e.target.value) })}
              />
            </div>
          )}
        </div>
      );

    case 'Convert':
      return (
        <div className="space-y-2">
          <div>
            <label className="label label-text-alt">Type</label>
            <select
              className="select select-sm select-bordered w-full"
              value={config.type || 'unit'}
              onChange={(e) => updateField('type', e.target.value)}
            >
              <option value="unit">Unit conversion</option>
              <option value="currency">Currency conversion</option>
            </select>
          </div>
          <div>
            <label className="label label-text-alt">From</label>
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={config.from || ''}
              onChange={(e) => updateField('from', e.target.value)}
              placeholder={config.type === 'currency' ? 'USD' : 'bbl'}
            />
          </div>
          <div>
            <label className="label label-text-alt">To</label>
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={config.to || ''}
              onChange={(e) => updateField('to', e.target.value)}
              placeholder={config.type === 'currency' ? 'EUR' : 'MT'}
            />
          </div>
          {config.type === 'unit' && (
            <div>
              <label className="label label-text-alt">Conversion Factor</label>
              <input
                type="number"
                step="any"
                className="input input-sm input-bordered w-full"
                value={config.conversionFactor || config.density || ''}
                onChange={(e) => updateField('conversionFactor', parseFloat(e.target.value))}
              />
            </div>
          )}
          {config.type === 'currency' && (
            <div>
              <label className="label label-text-alt">FX Series OR Fixed Rate</label>
              <input
                type="text"
                className="input input-sm input-bordered w-full"
                value={config.fxSeries || ''}
                onChange={(e) => updateField('fxSeries', e.target.value)}
                placeholder="USD_EUR"
              />
              <input
                type="number"
                step="any"
                className="input input-sm input-bordered w-full mt-1"
                value={config.fixedRate || ''}
                onChange={(e) => updateField('fixedRate', parseFloat(e.target.value) || undefined)}
                placeholder="Fixed rate"
              />
            </div>
          )}
        </div>
      );

    case 'Combine':
      return (
        <div className="space-y-2">
          <div>
            <label className="label label-text-alt">Operation</label>
            <select
              className="select select-sm select-bordered w-full"
              value={config.operation || 'add'}
              onChange={(e) => updateField('operation', e.target.value)}
            >
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
              <option value="multiply">Multiply</option>
              <option value="divide">Divide</option>
              <option value="average">Average</option>
              <option value="weighted_average">Weighted average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        </div>
      );

    case 'Controls':
      return (
        <div className="space-y-2">
          <div>
            <label className="label label-text-alt">Cap (%)</label>
            <input
              type="number"
              step="any"
              className="input input-sm input-bordered w-full"
              value={config.cap || ''}
              onChange={(e) => updateField('cap', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., 10 for +10%"
            />
          </div>
          <div>
            <label className="label label-text-alt">Floor (%)</label>
            <input
              type="number"
              step="any"
              className="input input-sm input-bordered w-full"
              value={config.floor || ''}
              onChange={(e) => updateField('floor', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., -10 for -10%"
            />
          </div>
        </div>
      );

    default:
      return <div className="text-sm text-gray-500">No configuration needed</div>;
  }
};

function getDefaultConfig(type: string): any {
  switch (type) {
    case 'Factor':
      return { operation: 'value' };
    case 'Transform':
      return { function: 'abs' };
    case 'Convert':
      return { type: 'unit', from: '', to: '' };
    case 'Combine':
      return { operation: 'add' };
    case 'Controls':
      return {};
    default:
      return {};
  }
}

export default GraphBuilder;
