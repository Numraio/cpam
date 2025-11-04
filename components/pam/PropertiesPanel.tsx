/**
 * Properties Panel Component
 *
 * Displays and edits properties for the selected node.
 * Provides type-specific configuration forms for each node type.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import type { NodeType } from '@/lib/pam/graph-types';

// ============================================================================
// Types
// ============================================================================

interface PropertiesPanelProps {
  node: Node;
  isOutputNode: boolean;
  onUpdateConfig: (config: any) => void;
  onSetOutputNode: () => void;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function PropertiesPanel({
  node,
  isOutputNode,
  onUpdateConfig,
  onSetOutputNode,
  onClose,
}: PropertiesPanelProps) {
  const [config, setConfig] = useState(node.data.config || {});

  // Update local config when node changes
  useEffect(() => {
    setConfig(node.data.config || {});
  }, [node]);

  const handleConfigChange = (updates: any) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onUpdateConfig(newConfig);
  };

  const renderConfigForm = () => {
    switch (node.type as NodeType) {
      case 'Factor':
        return <FactorConfig config={config} onChange={handleConfigChange} />;
      case 'Transform':
        return <TransformConfig config={config} onChange={handleConfigChange} />;
      case 'Convert':
        return <ConvertConfig config={config} onChange={handleConfigChange} />;
      case 'Combine':
        return <CombineConfig config={config} onChange={handleConfigChange} />;
      case 'Controls':
        return <ControlsConfig config={config} onChange={handleConfigChange} />;
      default:
        return <div className="text-sm text-base-content/60">Unknown node type</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Node Properties</h2>
        <button
          onClick={onClose}
          className="btn btn-sm btn-ghost btn-circle"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Node Info */}
      <div className="bg-base-300 p-3 rounded-lg">
        <div className="text-sm font-semibold">{node.type}</div>
        <div className="text-xs text-base-content/60 mt-1">{node.id}</div>
      </div>

      {/* Output Node Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            checked={isOutputNode}
            onChange={onSetOutputNode}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">Set as output node</span>
        </label>
        <p className="text-xs text-base-content/60 mt-1 ml-9">
          The output node defines the final result of the graph
        </p>
      </div>

      <div className="divider my-2"></div>

      {/* Configuration Form */}
      <div className="space-y-4">{renderConfigForm()}</div>
    </div>
  );
}

// ============================================================================
// Factor Config
// ============================================================================

function FactorConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  const [mode, setMode] = useState<'value' | 'series'>(
    config.series ? 'series' : 'value'
  );

  const handleModeChange = (newMode: 'value' | 'series') => {
    setMode(newMode);
    if (newMode === 'value') {
      onChange({ value: config.value || 100, series: undefined });
    } else {
      onChange({ series: config.series || '', value: undefined });
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Factor Type</span>
        </label>
        <div className="btn-group w-full">
          <button
            className={`btn btn-sm flex-1 ${mode === 'value' ? 'btn-active' : ''}`}
            onClick={() => handleModeChange('value')}
          >
            Constant
          </button>
          <button
            className={`btn btn-sm flex-1 ${mode === 'series' ? 'btn-active' : ''}`}
            onClick={() => handleModeChange('series')}
          >
            Timeseries
          </button>
        </div>
      </div>

      {mode === 'value' ? (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Value</span>
          </label>
          <input
            type="number"
            value={config.value || ''}
            onChange={(e) => onChange({ value: parseFloat(e.target.value) || 0 })}
            className="input input-bordered input-sm"
            placeholder="100"
          />
        </div>
      ) : (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Series Code</span>
            </label>
            <input
              type="text"
              value={config.series || ''}
              onChange={(e) => onChange({ series: e.target.value })}
              className="input input-bordered input-sm"
              placeholder="BRENT"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Lag Days</span>
            </label>
            <input
              type="number"
              value={config.lagDays || 0}
              onChange={(e) => onChange({ lagDays: parseInt(e.target.value) || 0 })}
              className="input input-bordered input-sm"
              placeholder="0"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Operation</span>
            </label>
            <select
              value={config.operation || 'value'}
              onChange={(e) => onChange({ operation: e.target.value })}
              className="select select-bordered select-sm"
            >
              <option value="value">Value</option>
              <option value="avg_7d">7-day Average</option>
              <option value="avg_30d">30-day Average</option>
              <option value="avg_90d">90-day Average</option>
              <option value="avg_365d">365-day Average</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Transform Config
// ============================================================================

function TransformConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  const func = config.function || 'abs';
  const needsParams = ['pow', 'round'].includes(func);

  return (
    <div className="space-y-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Function</span>
        </label>
        <select
          value={func}
          onChange={(e) => onChange({ function: e.target.value })}
          className="select select-bordered select-sm"
        >
          <option value="abs">Absolute Value</option>
          <option value="ceil">Ceiling</option>
          <option value="floor">Floor</option>
          <option value="round">Round</option>
          <option value="log">Natural Log</option>
          <option value="exp">Exponential</option>
          <option value="sqrt">Square Root</option>
          <option value="pow">Power</option>
        </select>
      </div>

      {needsParams && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {func === 'pow' ? 'Exponent' : 'Decimal Places'}
            </span>
          </label>
          <input
            type="number"
            value={
              func === 'pow'
                ? config.params?.exponent || ''
                : config.params?.decimals || ''
            }
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              onChange({
                params:
                  func === 'pow' ? { exponent: value } : { decimals: value },
              });
            }}
            className="input input-bordered input-sm"
            placeholder={func === 'pow' ? '2' : '2'}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Convert Config
// ============================================================================

function ConvertConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Conversion Type</span>
        </label>
        <select
          value={config.type || 'unit'}
          onChange={(e) => onChange({ type: e.target.value })}
          className="select select-bordered select-sm"
        >
          <option value="unit">Unit Conversion</option>
          <option value="currency">Currency Conversion</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">From</span>
        </label>
        <input
          type="text"
          value={config.from || ''}
          onChange={(e) => onChange({ from: e.target.value })}
          className="input input-bordered input-sm"
          placeholder={config.type === 'currency' ? 'USD' : 'bbl'}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">To</span>
        </label>
        <input
          type="text"
          value={config.to || ''}
          onChange={(e) => onChange({ to: e.target.value })}
          className="input input-bordered input-sm"
          placeholder={config.type === 'currency' ? 'EUR' : 'MT'}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Conversion Factor</span>
        </label>
        <input
          type="number"
          value={config.conversionFactor || ''}
          onChange={(e) =>
            onChange({ conversionFactor: parseFloat(e.target.value) || 1 })
          }
          className="input input-bordered input-sm"
          placeholder="7.3"
          step="0.01"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Combine Config
// ============================================================================

function CombineConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  const operation = config.operation || 'add';
  const needsWeights = operation === 'weighted_average';

  return (
    <div className="space-y-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Operation</span>
        </label>
        <select
          value={operation}
          onChange={(e) => onChange({ operation: e.target.value })}
          className="select select-bordered select-sm"
        >
          <option value="add">Add</option>
          <option value="subtract">Subtract</option>
          <option value="multiply">Multiply</option>
          <option value="divide">Divide</option>
          <option value="average">Average</option>
          <option value="weighted_average">Weighted Average</option>
          <option value="min">Minimum</option>
          <option value="max">Maximum</option>
        </select>
      </div>

      {needsWeights && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Weights (comma-separated)</span>
          </label>
          <input
            type="text"
            value={config.weights?.join(', ') || ''}
            onChange={(e) =>
              onChange({
                weights: e.target.value
                  .split(',')
                  .map((w) => parseFloat(w.trim()))
                  .filter((w) => !isNaN(w)),
              })
            }
            className="input input-bordered input-sm"
            placeholder="0.5, 0.3, 0.2"
          />
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              Weights should sum to 1.0
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Controls Config
// ============================================================================

function ControlsConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Cap (maximum value)</span>
        </label>
        <input
          type="number"
          value={config.cap || ''}
          onChange={(e) =>
            onChange({ cap: e.target.value ? parseFloat(e.target.value) : undefined })
          }
          className="input input-bordered input-sm"
          placeholder="1000"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Floor (minimum value)</span>
        </label>
        <input
          type="number"
          value={config.floor || ''}
          onChange={(e) =>
            onChange({
              floor: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          className="input input-bordered input-sm"
          placeholder="100"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Spike Sharing (%)</span>
        </label>
        <input
          type="number"
          value={config.spikeSharing || ''}
          onChange={(e) =>
            onChange({
              spikeSharing: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          className="input input-bordered input-sm"
          placeholder="50"
          min="0"
          max="100"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Percentage of spike to share with buyer/seller
          </span>
        </label>
      </div>
    </div>
  );
}
