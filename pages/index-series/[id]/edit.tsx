import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import IndexSeriesForm from '@/components/index-series/IndexSeriesForm';
import useIndexSeriesDetail from '@/hooks/useIndexSeriesDetail';
import { Loading } from '@/components/shared';

const EditIndexSeriesPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, indexSeries, teamSlug } = useIndexSeriesDetail(id as string);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update index series');
      }

      // Redirect to index series detail page
      router.push(`/index-series/${id}`);
    } catch (err: any) {
      console.error('Error updating index series:', err);
      setError(err.message || 'Failed to update index series. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push(`/index-series/${id}`)}
        >
          Back to Index Series
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Index Series</h1>
        <p className="text-gray-600 mt-1 font-mono text-sm">
          Series Code: {indexSeries.seriesCode}
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <IndexSeriesForm
        initialData={indexSeries}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/index-series/${id}`)}
      />
    </div>
  );
};

EditIndexSeriesPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default EditIndexSeriesPage;
