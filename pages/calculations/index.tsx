import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import useCalculations from '@/hooks/useCalculations';
import { Loading } from '@/components/shared';
import CalculationsTable from '@/components/calculations/CalculationsTable';

const CalculationsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { isLoading, isError, calculations, mutate, teamSlug } = useCalculations();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load calculations. Please try again.</span>
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  // Calculate summary stats
  const totalCalculations = calculations?.length || 0;
  const runningCalculations = calculations?.filter((c: any) => c.status === 'RUNNING').length || 0;
  const completedCalculations = calculations?.filter((c: any) => c.status === 'COMPLETED').length || 0;
  const failedCalculations = calculations?.filter((c: any) => c.status === 'FAILED').length || 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calculations</h1>
          <p className="text-gray-600 mt-1">
            Manage batch calculations and view results
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="ghost"
            size="md"
            startIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            color="primary"
            size="md"
            startIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/calculations/new')}
          >
            New Calculation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Runs</h2>
            <p className="text-3xl font-bold">{totalCalculations}</p>
            <p className="text-sm text-gray-500">All time</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Running</h2>
            <p className="text-3xl font-bold text-info">{runningCalculations}</p>
            <p className="text-sm text-gray-500">In progress</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Completed</h2>
            <p className="text-3xl font-bold text-success">{completedCalculations}</p>
            <p className="text-sm text-gray-500">Successful</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Failed</h2>
            <p className="text-3xl font-bold text-error">{failedCalculations}</p>
            <p className="text-sm text-gray-500">Need attention</p>
          </div>
        </div>
      </div>

      {calculations && calculations.length > 0 ? (
        <CalculationsTable calculations={calculations} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No calculations found</h2>
            <p className="text-gray-600">
              Get started by running your first calculation.
            </p>
            <Button
              color="primary"
              size="md"
              className="mt-4"
              onClick={() => router.push('/calculations/new')}
            >
              Run Your First Calculation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

CalculationsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default CalculationsPage;
