/**
 * BLS Preview Modal Component
 * Shows BLS data preview before importing to IndexSeries
 */

import { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';

interface BLSDataPoint {
  date: string;
  value: number;
  period: string;
  year: string;
}

interface BLSMetadata {
  title?: string;
  seasonallyAdjusted?: boolean;
  surveyName?: string;
  baseYear?: string;
  area?: string;
  item?: string;
}

interface BLSPreviewData {
  seriesId: string;
  metadata: BLSMetadata;
  dataPoints: BLSDataPoint[];
  count: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface BLSPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  seriesId: string;
  seriesName: string;
  yearsBack?: number;
}

export default function BLSPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  seriesId,
  seriesName,
  yearsBack = 2,
}: BLSPreviewModalProps) {
  const [previewData, setPreviewData] = useState<BLSPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch preview data when modal opens
  useEffect(() => {
    if (isOpen && seriesId) {
      fetchPreview();
    }
  }, [isOpen, seriesId, yearsBack]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/integrations/bls/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId, yearsBack }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch BLS preview data');
      }

      const result = await response.json();
      setPreviewData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg mb-4">Preview BLS Data: {seriesName}</h3>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
            <span className="ml-3">Loading preview data...</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {previewData && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h4 className="font-semibold mb-2">Series Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-base-content/60">Series ID:</span>
                    <span className="ml-2 font-mono">{previewData.seriesId}</span>
                  </div>
                  {previewData.metadata?.surveyName && (
                    <div>
                      <span className="text-base-content/60">Survey:</span>
                      <span className="ml-2">{previewData.metadata.surveyName}</span>
                    </div>
                  )}
                  {previewData.metadata?.baseYear && (
                    <div>
                      <span className="text-base-content/60">Base Year:</span>
                      <span className="ml-2">{previewData.metadata.baseYear}</span>
                    </div>
                  )}
                  {previewData.metadata?.area && (
                    <div>
                      <span className="text-base-content/60">Area:</span>
                      <span className="ml-2">{previewData.metadata.area}</span>
                    </div>
                  )}
                  {previewData.metadata?.item && (
                    <div>
                      <span className="text-base-content/60">Item:</span>
                      <span className="ml-2">{previewData.metadata.item}</span>
                    </div>
                  )}
                  {previewData.metadata && (
                    <div>
                      <span className="text-base-content/60">Seasonal Adjustment:</span>
                      <span className="ml-2">
                        {previewData.metadata.seasonallyAdjusted ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-title">Total Data Points</div>
                <div className="stat-value text-primary">{previewData.count}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Date Range</div>
                <div className="stat-value text-sm">
                  {new Date(previewData.dateRange.start).toLocaleDateString()} -{' '}
                  {new Date(previewData.dateRange.end).toLocaleDateString()}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Latest Value</div>
                <div className="stat-value text-2xl">
                  {previewData.dataPoints[0]?.value.toFixed(3)}
                </div>
                <div className="stat-desc">
                  {previewData.dataPoints[0]?.date &&
                    formatDistance(new Date(previewData.dataPoints[0].date), new Date(), {
                      addSuffix: true,
                    })}
                </div>
              </div>
            </div>

            {/* Data Points Table */}
            <div>
              <h4 className="font-semibold mb-2">Recent Data Points (Latest 10)</h4>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="table table-zebra table-sm">
                  <thead className="sticky top-0 bg-base-200">
                    <tr>
                      <th>Date</th>
                      <th>Period</th>
                      <th>Year</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.dataPoints.slice(0, 10).map((dp, idx) => (
                      <tr key={idx}>
                        <td>{new Date(dp.date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-sm badge-ghost">{dp.period}</span>
                        </td>
                        <td>{dp.year}</td>
                        <td className="text-right font-mono">{dp.value.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.count > 10 && (
                <div className="text-sm text-base-content/60 mt-2 text-center">
                  Showing 10 of {previewData.count} data points
                </div>
              )}
            </div>

            {/* Info Alert */}
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-sm">
                This data will be imported into your Index Series. Existing data points for the
                same dates will be skipped (not overwritten).
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || !!error || !previewData}
          >
            Confirm Import
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
