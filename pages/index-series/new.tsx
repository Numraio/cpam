import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
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
        <Card variant="elevated" className="border-l-4 border-l-warning">
          <CardBody>
            <p className="text-warning font-medium">No team found. Please create or join a team first.</p>
          </CardBody>
        </Card>
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
          variant="ghost"
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/index-series')}
        >
          Back to Index Series
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Index Series</h1>
        <p className="text-gray-600 mt-2">
          Create a new market price data source
        </p>
      </div>

      {error && (
        <Card variant="elevated" className="border-l-4 border-l-error mb-6">
          <CardBody>
            <p className="text-error font-medium">{error}</p>
          </CardBody>
        </Card>
      )}

      <IndexSeriesForm onSubmit={handleSubmit} onCancel={() => router.push('/index-series')} />
    </div>
  );
};

NewIndexSeriesPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewIndexSeriesPage;
