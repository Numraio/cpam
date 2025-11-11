import { PlusIcon } from '@heroicons/react/24/outline';

interface NodeType {
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface ComponentPaletteProps {
  onAddNode: (type: NodeType['type']) => void;
  nodeCount: number;
  edgeCount: number;
  outputSet: boolean;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'Factor',
    label: 'Weighted Index',
    description: 'Index series or constant value',
    icon: '⚖️',
    color: 'bg-blue-100 border-blue-500 hover:bg-blue-200',
  },
  {
    type: 'Transform',
    label: 'Transform',
    description: 'Math operations (abs, round, pow)',
    icon: '🔄',
    color: 'bg-green-100 border-green-500 hover:bg-green-200',
  },
  {
    type: 'Convert',
    label: 'Convert',
    description: 'Unit or currency conversion',
    icon: '💱',
    color: 'bg-purple-100 border-purple-500 hover:bg-purple-200',
  },
  {
    type: 'Combine',
    label: 'Combine',
    description: 'Combine inputs (add, multiply)',
    icon: '➕',
    color: 'bg-yellow-100 border-yellow-500 hover:bg-yellow-200',
  },
  {
    type: 'Controls',
    label: 'Controls',
    description: 'Caps, floors, spike sharing',
    icon: '🎚️',
    color: 'bg-red-100 border-red-500 hover:bg-red-200',
  },
];

export default function ComponentPalette({
  onAddNode,
  nodeCount,
  edgeCount,
  outputSet,
}: ComponentPaletteProps) {
  return (
    <div className="w-72 bg-base-100 rounded-lg shadow-lg p-4 flex-shrink-0">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <span>Formula Blocks</span>
      </h3>

      {/* Node Type Cards */}
      <div className="space-y-3 mb-6">
        {NODE_TYPES.map((nodeType) => (
          <button
            key={nodeType.type}
            className={`w-full p-3 rounded-lg border-2 text-left transition shadow-sm ${nodeType.color}`}
            onClick={() => onAddNode(nodeType.type)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{nodeType.icon}</span>
              <span className="font-semibold">{nodeType.label}</span>
            </div>
            <div className="text-xs text-gray-600">{nodeType.description}</div>
            <div className="mt-2 flex justify-end">
              <div className="badge badge-sm badge-ghost">
                <PlusIcon className="h-3 w-3 mr-1" />
                Add
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Graph Stats */}
      <div className="divider"></div>
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Formula Stats</h4>
        <div className="stats stats-vertical shadow bg-base-200 w-full">
          <div className="stat p-3">
            <div className="stat-title text-xs">Components</div>
            <div className="stat-value text-2xl">{nodeCount}</div>
          </div>
          <div className="stat p-3">
            <div className="stat-title text-xs">Connections</div>
            <div className="stat-value text-2xl">{edgeCount}</div>
          </div>
          <div className="stat p-3">
            <div className="stat-title text-xs">Output Set</div>
            <div className="stat-value text-2xl">
              {outputSet ? (
                <span className="text-success">✓</span>
              ) : (
                <span className="text-error">✗</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-base-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> Click a component to configure it. Drag to reorder. Set one as the output node.
        </p>
      </div>
    </div>
  );
}
