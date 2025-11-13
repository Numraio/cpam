import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button, KPICard, Card, CardBody } from '@/components/ui';
import { PlusIcon, ArrowPathIcon, CalculatorIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
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
        <Card variant="outlined" className="bg-error-light/10 border-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load calculations. Please try again.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!teamSlug) {
    return (
      <div className="p-6">
        <Card variant="outlined" className="bg-warning-light/10 border-warning">
          <CardBody>
            <p className="text-warning-dark font-medium">No team found. Please create or join a team first.</p>
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
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/calculations/new')}
          >
            New Calculation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          label="Total Runs"
          value={String(totalCalculations)}
          icon={<CalculatorIcon className="h-8 w-8" />}
        />

        <KPICard
          label="Running"
          value={String(runningCalculations)}
          icon={<ClockIcon className="h-8 w-8" />}
          change={runningCalculations > 0 ? {
            value: 'In progress',
            trend: 'neutral' as const,
          } : undefined}
        />

        <KPICard
          label="Completed"
          value={String(completedCalculations)}
          icon={<CheckCircleIcon className="h-8 w-8" />}
          change={completedCalculations > 0 ? {
            value: 'Successful',
            trend: 'up' as const,
          } : undefined}
        />

        <KPICard
          label="Failed"
          value={String(failedCalculations)}
          icon={<ExclamationCircleIcon className="h-8 w-8" />}
          change={failedCalculations > 0 ? {
            value: 'Need attention',
            trend: 'down' as const,
          } : undefined}
        />
      </div>

      {calculations && calculations.length > 0 ? (
        <CalculationsTable calculations={calculations} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <Card variant="elevated">
          <CardBody>
            <div className="text-center py-12">
              <CalculatorIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No calculations found</h2>
              <p className="text-gray-600 mb-6">
                Get started by running your first batch calculation to adjust item prices.
              </p>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => router.push('/calculations/new')}
              >
                Run Your First Calculation
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

CalculationsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default CalculationsPage;
