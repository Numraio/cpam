import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PlusIcon, MagnifyingGlassIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import useIndexSeries from '@/hooks/useIndexSeries';
import { Loading } from '@/components/shared';
import IndexSeriesTable from '@/components/index-series/IndexSeriesTable';
import PageHeader from '@/components/navigation/PageHeader';

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
        <Card variant="elevated" className="border-l-4 border-l-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load index series. Please try again.</p>
          </CardBody>
        </Card>
      </div>
    );
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
      <PageHeader
        title="Index Series"
        subtitle="Manage market price data sources and time series"
        sticky
        primaryAction={
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/index-series/new')}
          >
            Add Index Series
          </Button>
        }
      />

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by series code, name, provider, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          rightIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          className="max-w-md"
        />
      </div>

      {filteredSeries && filteredSeries.length > 0 ? (
        <IndexSeriesTable series={filteredSeries} teamSlug={teamSlug} onDelete={mutate} />
      ) : (
        <Card variant="elevated" className="border-t-4 border-t-primary">
          <CardBody className="flex flex-col items-center text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No index series found</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              {searchQuery
                ? 'No index series match your search criteria. Try adjusting your filters.'
                : 'Get started by adding your first index series to track market data.'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => router.push('/index-series/new')}
              >
                Add Your First Index Series
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

IndexSeriesPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default IndexSeriesPage;
