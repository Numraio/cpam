import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DataAveragingWizard from './DataAveragingWizard';

interface GraphNode {
  id: string;
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  config: any;
  label?: string;
  description?: string;
}

interface ComponentConfigPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
}

export default function ComponentConfigPanel({
  node,
  onClose,
  onUpdate,
}: ComponentConfigPanelProps) {
  const [showDataWizard, setShowDataWizard] = useState(false);

  if (!node) {
    return null;
  }

  const handleConfigChange = (key: string, value: any) => {
    onUpdate(node.id, {
      config: {
        ...node.config,
        [key]: value,
      },
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdate(node.id, { label });
  };

  return (
    <>
      <div className="w-96 bg-base-100 rounded-lg shadow-lg flex flex-col max-h-screen">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h3 className="font-bold text-lg">Configure Component</h3>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* General Settings */}
          <div>
            <h4 className="font-semibold mb-3">General Settings</h4>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Component Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={node.label || ''}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder={`${node.type} Component`}
              />
            </div>
          </div>

          {/* Type-Specific Configuration */}
          {node.type === 'Factor' && (
            <FactorConfig
              config={node.config}
              onChange={handleConfigChange}
              onOpenWizard={() => setShowDataWizard(true)}
            />
          )}

          {node.type === 'Transform' && (
            <TransformConfig config={node.config} onChange={handleConfigChange} />
          )}

          {node.type === 'Convert' && (
            <ConvertConfig config={node.config} onChange={handleConfigChange} />
          )}

          {node.type === 'Combine' && (
            <CombineConfig config={node.config} onChange={handleConfigChange} />
          )}

          {node.type === 'Controls' && (
            <ControlsConfig config={node.config} onChange={handleConfigChange} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <button className="btn btn-primary btn-sm w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {/* Data Averaging Wizard Modal */}
      {showDataWizard && (
        <DataAveragingWizard
          currentConfig={node.config}
          onSave={(config) => {
            onUpdate(node.id, { config: { ...node.config, ...config } });
            setShowDataWizard(false);
          }}
          onClose={() => setShowDataWizard(false)}
        />
      )}
    </>
  );
}

// Factor Configuration
function FactorConfig({
  config,
  onChange,
  onOpenWizard,
}: {
  config: any;
  onChange: (key: string, value: any) => void;
  onOpenWizard: () => void;
}) {
  const [useConstant, setUseConstant] = useState(!config.series);

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Factor Configuration</h4>

      {/* Toggle: Series vs Constant */}
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Use Constant Value</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={useConstant}
            onChange={(e) => {
              setUseConstant(e.target.checked);
              if (e.target.checked) {
                onChange('series', undefined);
              } else {
                onChange('value', undefined);
              }
            }}
          />
        </label>
      </div>

      {useConstant ? (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Constant Value</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="input input-bordered input-sm"
            value={config.value || ''}
            onChange={(e) => onChange('value', parseFloat(e.target.value))}
            placeholder="e.g., 100"
          />
        </div>
      ) : (
        <>
          <div className="alert alert-info">
            <span className="text-sm">Configure index series data source</span>
          </div>
          <button
            className="btn btn-primary btn-sm w-full"
            onClick={onOpenWizard}
          >
            📊 Configure Data Source
          </button>
          {config.series && (
            <div className="text-xs text-gray-600 p-2 bg-base-200 rounded">
              <div><strong>Series:</strong> {config.series}</div>
              <div><strong>Operation:</strong> {config.operation || 'value'}</div>
              {config.lagDays && <div><strong>Lag:</strong> {config.lagDays} days</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Transform Configuration
function TransformConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Transform Configuration</h4>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Function</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={config.function || ''}
          onChange={(e) => onChange('function', e.target.value)}
        >
          <option value="">Select function</option>
          <option value="abs">Absolute Value</option>
          <option value="ceil">Ceiling</option>
          <option value="floor">Floor</option>
          <option value="round">Round</option>
          <option value="log">Natural Log</option>
          <option value="exp">Exponential</option>
          <option value="sqrt">Square Root</option>
          <option value="pow">Power</option>
          <option value="percent_change">Percentage Change</option>
        </select>
      </div>

      {config.function === 'pow' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Exponent</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="input input-bordered input-sm"
            value={config.params?.exponent || ''}
            onChange={(e) =>
              onChange('params', {
                ...config.params,
                exponent: parseFloat(e.target.value),
              })
            }
          />
        </div>
      )}

      {config.function === 'round' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Decimal Places</span>
          </label>
          <input
            type="number"
            className="input input-bordered input-sm"
            value={config.params?.decimals || 2}
            onChange={(e) =>
              onChange('params', {
                ...config.params,
                decimals: parseInt(e.target.value),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

// Convert Configuration
function ConvertConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Conversion Configuration</h4>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Conversion Type</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={config.type || ''}
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="">Select type</option>
          <option value="unit">Unit Conversion</option>
          <option value="currency">Currency Conversion</option>
        </select>
      </div>

      {config.type && (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">From</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              value={config.from || ''}
              onChange={(e) => onChange('from', e.target.value)}
              placeholder={config.type === 'unit' ? 'e.g., MT' : 'e.g., USD'}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">To</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              value={config.to || ''}
              onChange={(e) => onChange('to', e.target.value)}
              placeholder={config.type === 'unit' ? 'e.g., L' : 'e.g., EUR'}
            />
          </div>

          {config.type === 'unit' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Conversion Factor</span>
              </label>
              <input
                type="number"
                step="0.000001"
                className="input input-bordered input-sm"
                value={config.conversionFactor || ''}
                onChange={(e) => onChange('conversionFactor', parseFloat(e.target.value))}
                placeholder="e.g., 0.0009"
              />
              <label className="label">
                <span className="label-text-alt">Factor to convert From unit to To unit</span>
              </label>
            </div>
          )}

          {config.type === 'currency' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">FX Series Code</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={config.fxSeries || ''}
                onChange={(e) => onChange('fxSeries', e.target.value)}
                placeholder="e.g., USD_EUR"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Combine Configuration
function CombineConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Combine Configuration</h4>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Operation</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={config.operation || ''}
          onChange={(e) => onChange('operation', e.target.value)}
        >
          <option value="">Select operation</option>
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

      {config.operation === 'weighted_average' && (
        <div className="alert alert-info">
          <span className="text-xs">Configure weights for each input component</span>
        </div>
      )}
    </div>
  );
}

// Controls Configuration
function ControlsConfig({
  config,
  onChange,
}: {
  config: any;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Controls Configuration</h4>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Cap (%)</span>
        </label>
        <input
          type="number"
          className="input input-bordered input-sm"
          value={config.cap || ''}
          onChange={(e) => onChange('cap', parseFloat(e.target.value) || undefined)}
          placeholder="e.g., 10"
        />
        <label className="label">
          <span className="label-text-alt">Maximum percentage change allowed</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Floor (%)</span>
        </label>
        <input
          type="number"
          className="input input-bordered input-sm"
          value={config.floor || ''}
          onChange={(e) => onChange('floor', parseFloat(e.target.value) || undefined)}
          placeholder="e.g., -10"
        />
        <label className="label">
          <span className="label-text-alt">Minimum percentage change allowed</span>
        </label>
      </div>

      <div className="divider text-xs">Trigger Band (Optional)</div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text-alt">Lower (%)</span>
          </label>
          <input
            type="number"
            className="input input-bordered input-sm"
            value={config.triggerBand?.lower || ''}
            onChange={(e) =>
              onChange('triggerBand', {
                ...config.triggerBand,
                lower: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text-alt">Upper (%)</span>
          </label>
          <input
            type="number"
            className="input input-bordered input-sm"
            value={config.triggerBand?.upper || ''}
            onChange={(e) =>
              onChange('triggerBand', {
                ...config.triggerBand,
                upper: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
