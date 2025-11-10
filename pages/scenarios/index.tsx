import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import useScenarios from '@/hooks/useScenarios';
import { Loading } from '@/components/shared';
import ScenarioList from '@/components/scenarios/ScenarioList';

const ScenariosPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { isLoading, isError, scenarios, mutate, teamSlug } = useScenarios();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load scenarios. Please try again.</span>
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
  const totalScenarios = scenarios?.length || 0;
  const totalIndexOverrides = scenarios?.reduce((sum: number, s: any) => {
    const overrides = s.metadata?.overrides || {};
    return sum + Object.keys(overrides.indexOverrides || {}).length;
  }, 0) || 0;
  const totalItemOverrides = scenarios?.reduce((sum: number, s: any) => {
    const overrides = s.metadata?.overrides || {};
    return sum + Object.keys(overrides.itemOverrides || {}).length;
  }, 0) || 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">What-If Scenarios</h1>
          <p className="text-gray-600 mt-1">
            Create and compare scenarios with price overrides and hedge positions
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
            onClick={() => router.push('/scenarios/new')}
          >
            New Scenario
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Scenarios</h2>
            <p className="text-3xl font-bold">{totalScenarios}</p>
            <p className="text-sm text-gray-500">Active simulations</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Index Overrides</h2>
            <p className="text-3xl font-bold text-primary">{totalIndexOverrides}</p>
            <p className="text-sm text-gray-500">Price series overridden</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Item Overrides</h2>
            <p className="text-3xl font-bold text-secondary">{totalItemOverrides}</p>
            <p className="text-sm text-gray-500">Items with custom values</p>
          </div>
        </div>
      </div>

      {scenarios && scenarios.length > 0 ? (
        <ScenarioList scenarios={scenarios} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No scenarios found</h2>
            <p className="text-gray-600">
              Create your first what-if scenario to simulate price changes and hedge positions.
            </p>
            <Button
              color="primary"
              size="md"
              className="mt-4"
              onClick={() => router.push('/scenarios/new')}
            >
              Create Your First Scenario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

ScenariosPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ScenariosPage;
