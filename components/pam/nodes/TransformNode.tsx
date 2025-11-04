/**
 * Transform Node Component
 *
 * Displays a Transform node in the React Flow graph.
 * Transform nodes apply mathematical transformations.
 */

'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export default function TransformNode({ data, selected }: NodeProps) {
  const config = data.config || {};
  const func = config.function || 'abs';
  const params = config.params || [];

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-base-100 min-w-[180px] ${
        selected ? 'border-primary shadow-lg' : 'border-green-500'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-sm">
          🔧
        </div>
        <div className="font-semibold text-sm">Transform</div>
      </div>

      {/* Content */}
      <div className="text-xs space-y-1">
        <div className="text-base-content/80">
          <span className="font-medium">Function:</span> {func}
        </div>
        {params.length > 0 && (
          <div className="text-base-content/60">
            Params: {params.join(', ')}
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
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
}
