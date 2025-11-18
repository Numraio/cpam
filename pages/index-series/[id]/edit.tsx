import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
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
        <Card variant="elevated" className="border-l-4 border-l-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load index series. Please try again.</p>
          </CardBody>
        </Card>
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
          variant="ghost"
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push(`/index-series/${id}`)}
        >
          Back to Index Series
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Index Series</h1>
        <p className="text-gray-600 mt-2 font-mono text-sm">
          Series Code: {indexSeries.seriesCode}
        </p>
      </div>

      {error && (
        <Card variant="elevated" className="border-l-4 border-l-error mb-6">
          <CardBody>
            <p className="text-error font-medium">{error}</p>
          </CardBody>
        </Card>
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
