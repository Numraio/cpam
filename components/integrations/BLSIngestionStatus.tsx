/**
 * BLS Ingestion Status Component
 * Shows ingestion status and provides manual trigger buttons for BLS IndexSeries
 */

import { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';

interface IngestionStatus {
  totalValues: number;
  latestValue?: {
    date: string;
    value: number;
  };
  oldestValue?: {
    date: string;
    value: number;
  };
  lastIngested?: string;
}

interface BLSIngestionStatusProps {
  indexSeriesId: string;
  seriesCode: string;
  teamSlug: string;
  className?: string;
}

export default function BLSIngestionStatus({
  indexSeriesId,
  seriesCode,
  teamSlug,
  className = '',
}: BLSIngestionStatusProps) {
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ingestion status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamSlug}/index-series/${indexSeriesId}/bls-status`);

      if (!response.ok) {
        throw new Error('Failed to fetch ingestion status');
      }

      const result = await response.json();
      setStatus(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [indexSeriesId]);



  if (loading) {
    return (
      <div className={`card bg-base-100 shadow-xl ${className}`}>
        <div className="card-body">
          <h2 className="card-title">BLS Data Ingestion</h2>
          <div className="flex items-center justify-center py-8">
            <div className="loading loading-spinner loading-md"></div>
            <span className="ml-3">Loading status...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className={`card bg-base-100 shadow-xl ${className}`}>
        <div className="card-body">
          <h2 className="card-title">BLS Data Ingestion</h2>
          <div className="alert alert-error">
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
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <h2 className="card-title">BLS Data Ingestion</h2>

        {status?.totalValues === 0 ? (
          <div className="alert alert-warning">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>No data has been ingested yet. Click "Sync Now" to fetch latest data from BLS.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-title">Total Data Points</div>
                <div className="stat-value text-primary">{status?.totalValues || 0}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Latest Value</div>
                <div className="stat-value text-2xl">
                  {status?.latestValue?.value.toFixed(3) || 'N/A'}
                </div>
                <div className="stat-desc">
                  {status?.latestValue?.date &&
                    formatDistance(new Date(status.latestValue.date), new Date(), {
                      addSuffix: true,
                    })}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Last Ingested</div>
                <div className="stat-value text-sm">
                  {status?.lastIngested
                    ? formatDistance(new Date(status.lastIngested), new Date(), {
                        addSuffix: true,
                      })
                    : 'Never'}
                </div>
              </div>
            </div>

            {/* Date Range */}
            {status?.oldestValue && status?.latestValue && (
              <div className="text-sm text-base-content/70">
                <strong>Date Range:</strong>{' '}
                {new Date(status.oldestValue.date).toLocaleDateString()} -{' '}
                {new Date(status.latestValue.date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Auto-sync info */}
        <div className="mt-4">
          <p className="text-sm text-base-content/70">
            Data is automatically synced daily from BLS at midnight UTC
          </p>
        </div>

        {error && (
          <div className="alert alert-error mt-4">
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
      </div>
    </div>
  );
}
