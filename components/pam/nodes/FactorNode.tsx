/**
 * Factor Node Component
 *
 * Displays a Factor node in the React Flow graph.
 * Factor nodes can reference timeseries or provide constant values.
 */

'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export default function FactorNode({ data, selected }: NodeProps) {
  const config = data.config || {};
  const hasValue = config.value !== undefined;
  const hasSeries = config.series !== undefined;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-base-100 min-w-[180px] ${
        selected ? 'border-primary shadow-lg' : 'border-blue-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-sm">
          📊
        </div>
        <div className="font-semibold text-sm">Factor</div>
      </div>

      {/* Content */}
      <div className="text-xs space-y-1">
        {hasValue && (
          <div className="text-base-content/80">
            <span className="font-medium">Value:</span> {config.value}
          </div>
        )}
        {hasSeries && (
          <>
            <div className="text-base-content/80">
              <span className="font-medium">Series:</span> {config.series}
            </div>
            {config.lagDays !== undefined && config.lagDays !== 0 && (
              <div className="text-base-content/60">
                Lag: {config.lagDays} days
              </div>
            )}
            {config.operation && config.operation !== 'value' && (
              <div className="text-base-content/60">
                Op: {config.operation}
              </div>
            )}
          </>
        )}
        {!hasValue && !hasSeries && (
          <div className="text-base-content/40 italic">Not configured</div>
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
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
}
