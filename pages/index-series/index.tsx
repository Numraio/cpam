import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PlusIcon } from '@heroicons/react/24/outline';
import useIndexSeries from '@/hooks/useIndexSeries';
import { Loading } from '@/components/shared';
import IndexSeriesTable from '@/components/index-series/IndexSeriesTable';

const IndexSeriesPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { isLoading, isError, indexSeries, mutate, teamSlug } = useIndexSeries();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load index series. Please try again.</span>
        </div>
      </div>
    );
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

  const filteredSeries = indexSeries?.filter((series: any) => {
    const query = searchQuery.toLowerCase();
    return (
      series.seriesCode?.toLowerCase().includes(query) ||
      series.name?.toLowerCase().includes(query) ||
      series.provider?.toLowerCase().includes(query) ||
      series.dataType?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Index Series</h1>
          <p className="text-gray-600 mt-1">
            Manage market price data sources and time series
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            startIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/index-series/new')}
          >
            Add Index Series
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by series code, name, provider, or type..."
          className="input input-bordered w-full max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredSeries && filteredSeries.length > 0 ? (
        <IndexSeriesTable series={filteredSeries} teamSlug={teamSlug} onDelete={mutate} />
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No index series found</h2>
            <p className="text-gray-600">
              {searchQuery
                ? 'No index series match your search criteria.'
                : 'Get started by adding your first index series.'}
            </p>
            {!searchQuery && (
              <Button
                color="primary"
                size="md"
                className="mt-4"
                onClick={() => router.push('/index-series/new')}
              >
                Add Your First Index Series
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

IndexSeriesPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default IndexSeriesPage;
