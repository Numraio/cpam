import { useState } from 'react';
import { PlusIcon, Bars3Icon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface GraphNode {
  id: string;
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  config: any;
  label?: string;
  description?: string;
}

interface ComponentCanvasProps {
  nodes: GraphNode[];
  outputNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeReorder: (dragIndex: number, hoverIndex: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onSetOutput: (nodeId: string) => void;
}

const NODE_TYPE_COLORS = {
  Factor: 'bg-blue-50 border-blue-300',
  Transform: 'bg-green-50 border-green-300',
  Convert: 'bg-purple-50 border-purple-300',
  Combine: 'bg-yellow-50 border-yellow-300',
  Controls: 'bg-red-50 border-red-300',
};

const NODE_TYPE_ICONS = {
  Factor: '⚖️',
  Transform: '🔄',
  Convert: '💱',
  Combine: '➕',
  Controls: '🎚️',
};

export default function ComponentCanvas({
  nodes,
  outputNodeId,
  onNodeClick,
  onNodeReorder,
  onNodeDelete,
  onSetOutput,
}: ComponentCanvasProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const getNodeSummary = (node: GraphNode): string => {
    const config = node.config || {};

    if (node.type === 'Factor') {
      if (config.series) {
        const operation = config.operation || 'value';
        const lag = config.lagDays ? ` (lag ${config.lagDays}d)` : '';
        return `${config.series} - ${operation}${lag}`;
      }
      if (config.value !== undefined) {
        return `Constant: ${config.value}`;
      }
      return 'Not configured';
    }

    if (node.type === 'Transform') {
      return config.function || 'Not configured';
    }

    if (node.type === 'Convert') {
      if (config.type === 'unit') {
        return `${config.from || '?'} → ${config.to || '?'}`;
      }
      if (config.type === 'currency') {
        return `${config.from || '?'} → ${config.to || '?'} (FX)`;
      }
      return 'Not configured';
    }

    if (node.type === 'Combine') {
      const op = config.operation || 'add';
      if (config.weights && config.weights.length > 0) {
        const weightStr = config.weights.map((w: number) => `${(w * 100).toFixed(0)}%`).join(', ');
        return `${op} with weights: ${weightStr}`;
      }
      return op;
    }

    if (node.type === 'Controls') {
      const parts = [];
      if (config.cap) parts.push(`Cap: ${config.cap}%`);
      if (config.floor) parts.push(`Floor: ${config.floor}%`);
      if (config.triggerBand) {
        parts.push(`Band: ${config.triggerBand.lower}% to ${config.triggerBand.upper}%`);
      }
      return parts.length > 0 ? parts.join(', ') : 'Not configured';
    }

    return 'Not configured';
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    onNodeReorder(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex-1 bg-base-200 rounded-lg p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <PlusIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No components yet</p>
          <p className="text-sm mt-2">Add components from the palette on the left to build your formula</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-base-200 rounded-lg p-4 overflow-y-auto">
      <div className="space-y-3">
        {nodes.map((node, index) => {
          const isOutput = node.id === outputNodeId;
          const isDragging = draggedIndex === index;
          const summary = getNodeSummary(node);
          const colorClass = NODE_TYPE_COLORS[node.type];
          const icon = NODE_TYPE_ICONS[node.type];

          return (
            <div
              key={node.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                card bg-base-100 shadow-md border-2 transition-all cursor-move
                ${colorClass}
                ${isOutput ? 'ring-2 ring-success ring-offset-2' : ''}
                ${isDragging ? 'opacity-50' : 'hover:shadow-lg'}
              `}
            >
              <div className="card-body p-4">
                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing">
                    <Bars3Icon className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{icon}</span>
                      <h3 className="font-semibold">{node.label || node.type}</h3>
                      <span className="badge badge-xs">{node.type}</span>
                      {isOutput && (
                        <span className="badge badge-success badge-sm">OUTPUT</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate" title={summary}>
                      {summary}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1">
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => onNodeClick(node.id)}
                      title="Configure"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {!isOutput && (
                      <button
                        className="btn btn-xs btn-success btn-ghost"
                        onClick={() => onSetOutput(node.id)}
                        title="Set as output"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => onNodeDelete(node.id)}
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Output Reminder */}
      {!outputNodeId && nodes.length > 0 && (
        <div className="alert alert-warning mt-4">
          <span className="text-sm">⚠️ Select an output node by clicking the checkmark on a component</span>
        </div>
      )}
    </div>
  );
}
