/**
 * Convert Node Component
 *
 * Displays a Convert node in the React Flow graph.
 * Convert nodes perform unit or currency conversions.
 */

'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export default function ConvertNode({ data, selected }: NodeProps) {
  const config = data.config || {};
  const conversionType = config.type || 'unit';
  const from = config.from || '';
  const to = config.to || '';
  const factor = config.conversionFactor;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-base-100 min-w-[180px] ${
        selected ? 'border-primary shadow-lg' : 'border-yellow-500'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-sm">
          🔄
        </div>
        <div className="font-semibold text-sm">Convert</div>
      </div>

      {/* Content */}
      <div className="text-xs space-y-1">
        <div className="text-base-content/80">
          <span className="font-medium">Type:</span> {conversionType}
        </div>
        {from && to && (
          <div className="text-base-content/80">
            {from} → {to}
          </div>
        )}
        {factor !== undefined && (
          <div className="text-base-content/60">
            Factor: {factor}
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
        className="w-3 h-3 bg-yellow-500 border-2 border-white"
      />
    </div>
  );
}
