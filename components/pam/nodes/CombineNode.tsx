/**
 * Combine Node Component
 *
 * Displays a Combine node in the React Flow graph.
 * Combine nodes merge multiple inputs using operations like add, multiply, etc.
 */

'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export default function CombineNode({ data, selected }: NodeProps) {
  const config = data.config || {};
  const operation = config.operation || 'add';
  const weights = config.weights;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-base-100 min-w-[180px] ${
        selected ? 'border-primary shadow-lg' : 'border-purple-500'
      }`}
    >
      {/* Input Handles - Multiple on left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-1"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-2"
        style={{ top: '50%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-3"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-sm">
          ➕
        </div>
        <div className="font-semibold text-sm">Combine</div>
      </div>

      {/* Content */}
      <div className="text-xs space-y-1">
        <div className="text-base-content/80">
          <span className="font-medium">Operation:</span> {operation}
        </div>
        {weights && weights.length > 0 && (
          <div className="text-base-content/60">
            Weights: {weights.join(', ')}
          </div>
        )}
      </div>

      {/* Label */}
      {data.label && (
        <div className="mt-2 pt-2 border-t border-base-300 text-xs text-base-content/60">
          {data.label}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
    </div>
  );
}
