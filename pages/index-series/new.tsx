import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import IndexSeriesForm from '@/components/index-series/IndexSeriesForm';
import useTeams from '@/hooks/useTeams';
import { Loading } from '@/components/shared';

const NewIndexSeriesPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams, isLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <Loading />;
  }

  if (!teamSlug) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>No team found. Please create or join a team first.</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      const response = await fetch(`/api/teams/${teamSlug}/index-series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create index series');
      }

      // Redirect to index series list
      router.push('/index-series');
    } catch (err: any) {
      console.error('Error creating index series:', err);
      setError(err.message || 'Failed to create index series. Please try again.');
    }
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

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Index Series</h1>
        <p className="text-gray-600 mt-1">
          Create a new market price data source
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <IndexSeriesForm onSubmit={handleSubmit} onCancel={() => router.push('/index-series')} />
    </div>
  );
};

NewIndexSeriesPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewIndexSeriesPage;
