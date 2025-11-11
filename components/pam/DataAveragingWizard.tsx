import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import useIndexSeries from '@/hooks/useIndexSeries';

interface DataAveragingWizardProps {
  currentConfig: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

export default function DataAveragingWizard({
  currentConfig,
  onSave,
  onClose,
}: DataAveragingWizardProps) {
  const { indexSeries, isLoading } = useIndexSeries();

  const [config, setConfig] = useState({
    series: currentConfig.series || '',
    operation: currentConfig.operation || 'value',
    lagDays: currentConfig.lagDays || 0,
  });

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-300 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configure Data Source</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select index series and averaging rules
            </p>
          </div>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Index Selection */}
          <div>
            <h3 className="font-bold text-lg mb-3">1. Index Selection</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Select Index Series</span>
              </label>
              {isLoading ? (
                <div className="skeleton h-10 w-full"></div>
              ) : (
                <select
                  className="select select-bordered"
                  value={config.series}
                  onChange={(e) => setConfig({ ...config, series: e.target.value })}
                >
                  <option value="">Select an index series...</option>
                  {indexSeries?.map((series: any) => (
                    <option key={series.id} value={series.seriesCode}>
                      {series.name} ({series.seriesCode}) - {series.provider}
                    </option>
                  ))}
                </select>
              )}
              <label className="label">
                <span className="label-text-alt">
                  Available index series from configured providers
                </span>
              </label>
            </div>

            {config.series && (
              <div className="mt-3 p-3 bg-base-200 rounded-lg">
                <p className="text-sm font-medium">Selected: {config.series}</p>
                {indexSeries?.find((s: any) => s.seriesCode === config.series) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {
                      indexSeries.find((s: any) => s.seriesCode === config.series)
                        .description
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Averaging Rule */}
          <div>
            <h3 className="font-bold text-lg mb-3">2. Averaging Rule</h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Average Period</span>
              </label>
              <select
                className="select select-bordered"
                value={config.operation}
                onChange={(e) => setConfig({ ...config, operation: e.target.value })}
              >
                <option value="value">Last Value (No Averaging)</option>
                <option value="avg_3m">Arithmetic Mean - 3 Months</option>
                <option value="avg_6m">Arithmetic Mean - 6 Months</option>
                <option value="avg_12m">Arithmetic Mean - 12 Months</option>
                <option value="min">Minimum Value</option>
                <option value="max">Maximum Value</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Lag (Days)</span>
              </label>
              <input
                type="number"
                min="0"
                className="input input-bordered"
                value={config.lagDays}
                onChange={(e) =>
                  setConfig({ ...config, lagDays: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
              <label className="label">
                <span className="label-text-alt">
                  Number of days before calculation date to use data from
                </span>
              </label>
            </div>

            {/* Explanation */}
            <div className="alert alert-info mt-4">
              <div className="text-sm">
                <div className="font-semibold mb-2">How this works:</div>
                <div className="space-y-1 text-xs">
                  {config.operation === 'value' && (
                    <p>
                      • Uses the latest available value as of the calculation date (minus
                      lag)
                    </p>
                  )}
                  {config.operation.startsWith('avg_') && (
                    <>
                      <p>
                        • Calculates the arithmetic mean of values over the specified
                        period
                      </p>
                      <p>
                        • Period ends {config.lagDays} days before the calculation date
                      </p>
                    </>
                  )}
                  {config.operation === 'min' && (
                    <p>• Uses the minimum value in the observation period</p>
                  )}
                  {config.operation === 'max' && (
                    <p>• Uses the maximum value in the observation period</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Preview (Placeholder) */}
          <div>
            <h3 className="font-bold text-lg mb-3">3. Preview</h3>
            <div className="bg-base-200 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Historical data visualization
              </p>
              <p className="text-xs text-gray-500">
                Chart showing how the averaging rule applies to the last 12 months of data
                will appear here
              </p>
              <div className="mt-4 h-32 bg-base-300 rounded flex items-center justify-center">
                <span className="text-gray-400">📊 Chart Placeholder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-base-300 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!config.series}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
