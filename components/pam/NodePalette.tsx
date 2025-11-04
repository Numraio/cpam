/**
 * Node Palette Component
 *
 * Displays available PAM node types that can be added to the graph.
 * Clicking a node type calls the onAddNode callback.
 */

'use client';

import React from 'react';
import type { NodeType } from '@/lib/pam/graph-types';

// ============================================================================
// Types
// ============================================================================

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

interface NodeTypeInfo {
  type: NodeType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ============================================================================
// Node Type Definitions
// ============================================================================

const nodeTypes: NodeTypeInfo[] = [
  {
    type: 'Factor',
    name: 'Factor',
    description: 'Timeseries reference or constant value',
    icon: '📊',
    color: 'bg-blue-500',
  },
  {
    type: 'Transform',
    name: 'Transform',
    description: 'Mathematical transformation (abs, ceil, floor, etc.)',
    icon: '🔧',
    color: 'bg-green-500',
  },
  {
    type: 'Convert',
    name: 'Convert',
    description: 'Unit or currency conversion',
    icon: '🔄',
    color: 'bg-yellow-500',
  },
  {
    type: 'Combine',
    name: 'Combine',
    description: 'Combine multiple inputs (add, multiply, etc.)',
    icon: '➕',
    color: 'bg-purple-500',
  },
  {
    type: 'Controls',
    name: 'Controls',
    description: 'Apply caps, floors, or spike sharing',
    icon: '🎚️',
    color: 'bg-red-500',
  },
];

// ============================================================================
// Component
// ============================================================================

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-2">Node Palette</h2>
        <p className="text-sm text-base-content/60 mb-4">
          Click a node type to add it to the graph
        </p>
      </div>

      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => onAddNode(nodeType.type)}
            className="w-full p-3 rounded-lg border-2 border-base-300 hover:border-primary hover:bg-base-300 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 ${nodeType.color} rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {nodeType.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold group-hover:text-primary transition-colors">
                  {nodeType.name}
                </div>
                <div className="text-xs text-base-content/60 mt-1">
                  {nodeType.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-info/10 rounded-lg">
        <div className="text-sm">
          <div className="font-semibold mb-1">💡 Tip</div>
          <div className="text-xs text-base-content/60">
            Connect nodes by dragging from one node&apos;s output handle to another
            node&apos;s input handle. Delete nodes by selecting them and pressing
            Delete.
          </div>
        </div>
      </div>
    </div>
  );
}
