import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PencilIcon, ArrowLeftIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useIndexSeriesDetail from '@/hooks/useIndexSeriesDetail';
import { formatDistance } from 'date-fns';

const IndexSeriesDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, indexSeries, teamSlug } = useIndexSeriesDetail(id as string);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !indexSeries) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load index series. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this index series?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/index-series');
      } else {
        alert('Failed to delete index series. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting index series:', error);
      alert('Failed to delete index series. Please try again.');
    }
  };

  const handleSync = async () => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${id}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Sync triggered successfully');
      } else {
        alert('Failed to trigger sync. Please try again.');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Failed to trigger sync. Please try again.');
    }
  };

  const getDataTypeBadge = (dataType: string) => {
    const badges: Record<string, string> = {
      INDEX: 'badge-primary',
      FX: 'badge-secondary',
      CUSTOM: 'badge-accent',
    };
    return badges[dataType] || 'badge-ghost';
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, string> = {
      DAILY: 'badge-success',
      WEEKLY: 'badge-info',
      MONTHLY: 'badge-warning',
    };
    return badges[frequency] || 'badge-ghost';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/index-series')}
        >
          Back to Index Series
        </Button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{indexSeries.name}</h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">
            Series Code: {indexSeries.seriesCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="info"
            size="md"
            startIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleSync}
          >
            Sync Now
          </Button>
          <Button
            color="primary"
            size="md"
            startIcon={<PencilIcon className="h-5 w-5" />}
            onClick={() => router.push(`/index-series/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            color="error"
            size="md"
            startIcon={<TrashIcon className="h-5 w-5" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{indexSeries.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Series Code</label>
                <p className="text-lg font-mono">{indexSeries.seriesCode}</p>
              </div>
              {indexSeries.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-lg">{indexSeries.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Provider</label>
                <p className="text-lg">
                  <span className="badge badge-outline">{indexSeries.provider}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Data Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Data Type</label>
                <p className="text-lg">
                  <span className={`badge ${getDataTypeBadge(indexSeries.dataType)}`}>
                    {indexSeries.dataType}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Frequency</label>
                <p className="text-lg">
                  <span className={`badge ${getFrequencyBadge(indexSeries.frequency)}`}>
                    {indexSeries.frequency}
                  </span>
                </p>
              </div>
              {indexSeries.unit && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Unit</label>
                  <p className="text-lg">{indexSeries.unit}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Timestamps</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-lg">
                  {formatDistance(new Date(indexSeries.createdAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(indexSeries.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-lg">
                  {formatDistance(new Date(indexSeries.updatedAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(indexSeries.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Sync Status</h2>
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Sync status and ingestion metrics will be displayed here when implemented.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price History Chart - Placeholder */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h2 className="card-title">Price History</h2>
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>Price chart visualization not yet implemented. This will show historical price data with interactive zoom and pan controls.</span>
          </div>
        </div>
      </div>

      {/* Recent Values - Placeholder */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h2 className="card-title">Recent Values</h2>
          <div className="text-center py-8 text-gray-500">
            No price values found for this series
          </div>
        </div>
      </div>
    </div>
  );
};

IndexSeriesDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default IndexSeriesDetailPage;
