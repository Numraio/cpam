/**
 * Controls Node Component
 *
 * Displays a Controls node in the React Flow graph.
 * Controls nodes apply caps, floors, or spike sharing.
 */

'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export default function ControlsNode({ data, selected }: NodeProps) {
  const config = data.config || {};
  const hasCap = config.cap !== undefined;
  const hasFloor = config.floor !== undefined;
  const hasSpikeSharing = config.spikeSharing !== undefined;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-base-100 min-w-[180px] ${
        selected ? 'border-primary shadow-lg' : 'border-red-500'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-sm">
          🎚️
        </div>
        <div className="font-semibold text-sm">Controls</div>
      </div>

      {/* Content */}
      <div className="text-xs space-y-1">
        {hasCap && (
          <div className="text-base-content/80">
            <span className="font-medium">Cap:</span> {config.cap}
          </div>
        )}
        {hasFloor && (
          <div className="text-base-content/80">
            <span className="font-medium">Floor:</span> {config.floor}
          </div>
        )}
        {hasSpikeSharing && (
          <div className="text-base-content/80">
            <span className="font-medium">Spike:</span> {config.spikeSharing}%
          </div>
        )}
        {!hasCap && !hasFloor && !hasSpikeSharing && (
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
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />
    </div>
  );
}
