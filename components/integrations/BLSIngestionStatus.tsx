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
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

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

  // Manual sync (ingest latest data)
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamSlug}/index-series/${indexSeriesId}/bls-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest' }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      // Refresh status after sync
      await fetchStatus();

      // Show success message
      alert(`Sync completed! ${result.data.valuesIngested} new values ingested.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      alert(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Manual backfill (fetch historical data)
  const handleBackfill = async () => {
    const yearsBack = prompt('How many years of historical data to backfill?', '50');
    if (!yearsBack) return;

    try {
      setBackfilling(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamSlug}/index-series/${indexSeriesId}/bls-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backfill', yearsBack: parseInt(yearsBack, 10) }),
      });

      if (!response.ok) {
        throw new Error('Backfill failed');
      }

      const result = await response.json();

      // Refresh status after backfill
      await fetchStatus();

      // Show success message
      alert(
        `Backfill completed! ${result.data.valuesIngested} new values ingested, ${result.data.valuesSkipped} skipped.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
      alert(`Backfill failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBackfilling(false);
    }
  };

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

        {/* Action Buttons */}
        <div className="card-actions justify-end mt-4">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSync}
            disabled={syncing || backfilling}
          >
            {syncing ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Syncing...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync Now
              </>
            )}
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={handleBackfill}
            disabled={syncing || backfilling}
          >
            {backfilling ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Backfilling...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Backfill Historical
              </>
            )}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchStatus}
            disabled={syncing || backfilling}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
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
