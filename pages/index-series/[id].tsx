import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { PencilIcon, ArrowLeftIcon, TrashIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useIndexSeriesDetail from '@/hooks/useIndexSeriesDetail';
import { formatDistance } from 'date-fns';
import BLSIngestionStatus from '@/components/integrations/BLSIngestionStatus';

const IndexSeriesDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, indexSeries, teamSlug } = useIndexSeriesDetail(id as string);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !indexSeries) {
    return (
      <div className="p-6">
        <Card variant="elevated" className="border-l-4 border-l-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load index series. Please try again.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteModalOpen(false);
        // Redirect to list page after successful deletion
        router.push('/index-series');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to delete index series:', errorData);
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting index series:', error);
      alert(`Error deleting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSync = async () => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.error('Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    }
  };

  const getDataTypeBadge = (dataType: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      INDEX: { bg: 'bg-primary-100', text: 'text-primary-700' },
      FX: { bg: 'bg-purple-100', text: 'text-purple-700' },
      CUSTOM: { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const badge = badges[dataType] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`;
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      DAILY: { bg: 'bg-success-light/20', text: 'text-success' },
      WEEKLY: { bg: 'bg-blue-100', text: 'text-blue-700' },
      MONTHLY: { bg: 'bg-warning-light/20', text: 'text-warning' },
    };
    const badge = badges[frequency] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/index-series')}
        >
          Back to Index Series
        </Button>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{indexSeries.name}</h1>
          <p className="text-gray-600 mt-2 font-mono text-sm">
            Series Code: {indexSeries.seriesCode}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleSync}
          >
            Sync Now
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<PencilIcon className="h-5 w-5" />}
            onClick={() => router.push(`/index-series/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="md"
            leftIcon={<TrashIcon className="h-5 w-5" />}
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-base text-gray-900 mt-1">{indexSeries.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Series Code</label>
                <p className="text-base text-gray-900 font-mono mt-1">{indexSeries.seriesCode}</p>
              </div>
              {indexSeries.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-base text-gray-900 mt-1">{indexSeries.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Provider</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {indexSeries.provider}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Data Type</label>
                <div className="mt-1">
                  <span className={getDataTypeBadge(indexSeries.dataType)}>
                    {indexSeries.dataType}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Frequency</label>
                <div className="mt-1">
                  <span className={getFrequencyBadge(indexSeries.frequency)}>
                    {indexSeries.frequency}
                  </span>
                </div>
              </div>
              {indexSeries.unit && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Unit</label>
                  <p className="text-base text-gray-900 mt-1">{indexSeries.unit}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timestamps</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-base text-gray-900 mt-1">
                  {formatDistance(new Date(indexSeries.createdAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(indexSeries.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-base text-gray-900 mt-1">
                  {formatDistance(new Date(indexSeries.updatedAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(indexSeries.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

      </div>

      {/* BLS Ingestion Status - Show for BLS provider */}
      {indexSeries.provider === 'BLS' && (
        <BLSIngestionStatus
          indexSeriesId={indexSeries.id}
          seriesCode={indexSeries.seriesCode}
          teamSlug={teamSlug}
          className="mt-6"
        />
      )}

      {/* Price History Chart - Placeholder */}
      <Card variant="elevated" className="mt-6">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Price History</h2>
          <Card variant="bordered" className="border-l-4 border-l-warning">
            <CardBody className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Price chart visualization not yet implemented. This will show historical price data with interactive zoom and pan controls.
              </p>
            </CardBody>
          </Card>
        </CardBody>
      </Card>

      {/* Recent Values - Placeholder */}
      <Card variant="elevated" className="mt-6">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Values</h2>
          <div className="text-center py-12 text-gray-500">
            <p className="font-medium">No price values found for this series</p>
            <p className="text-sm mt-2">Historical price data will appear here once ingested</p>
          </div>
        </CardBody>
      </Card>

      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Index Series"
        description="Are you sure you want to delete this index series? All associated data will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

IndexSeriesDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default IndexSeriesDetailPage;
