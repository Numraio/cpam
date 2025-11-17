import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { PlusIcon, ArrowPathIcon, BeakerIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import useScenarios from '@/hooks/useScenarios';
import { Loading } from '@/components/shared';
import ScenarioList from '@/components/scenarios/ScenarioList';
import PageHeader from '@/components/navigation/PageHeader';

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
        <Card variant="elevated" className="border-l-4 border-l-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load scenarios. Please try again.</p>
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
      <PageHeader
        title="What-If Scenarios"
        subtitle="Create and compare scenarios with price overrides and hedge positions"
        sticky
        primaryAction={
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/scenarios/new')}
          >
            New Scenario
          </Button>
        }
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KPICard
          title="Total Scenarios"
          value={totalScenarios}
          subtitle="Active simulations"
          icon={<BeakerIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Index Overrides"
          value={totalIndexOverrides}
          subtitle="Price series overridden"
          icon={<ChartBarIcon className="h-6 w-6" />}
          variant="primary"
        />
        <KPICard
          title="Item Overrides"
          value={totalItemOverrides}
          subtitle="Items with custom values"
          icon={<ChartBarIcon className="h-6 w-6" />}
          variant="secondary"
        />
      </div>

      {scenarios && scenarios.length > 0 ? (
        <ScenarioList scenarios={scenarios} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <Card variant="elevated" className="border-t-4 border-t-primary">
          <CardBody className="flex flex-col items-center text-center py-12">
            <BeakerIcon className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No scenarios found</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Create your first what-if scenario to simulate price changes and hedge positions.
            </p>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusIcon className="h-5 w-5" />}
              onClick={() => router.push('/scenarios/new')}
            >
              Create Your First Scenario
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

ScenariosPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ScenariosPage;
