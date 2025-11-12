import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { useDashboardKPIs, useDashboardActivity } from '@/hooks/useDashboard';
import { formatDistance } from 'date-fns';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Loading } from '@/components/shared';
import { KPICard, Card, CardHeader, CardBody } from '@/components/ui';
import {
  CubeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CalculatorIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Dashboard: NextPageWithLayout = () => {
  const { kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { activity, isLoading: activityLoading } = useDashboardActivity(10);

  if (kpisLoading) {
    return <Loading />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CPAM Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your pricing and exposure management</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          label="Total Items"
          value={String(kpis?.totalItems || 0)}
          icon={<CubeIcon className="h-8 w-8" />}
        />

        <KPICard
          label="Total Exposure"
          value={formatCurrency(kpis?.totalExposure || 0)}
          icon={<CurrencyDollarIcon className="h-8 w-8" />}
        />

        <KPICard
          label="Pending Approvals"
          value={String(kpis?.pendingApprovals || 0)}
          icon={<ClockIcon className="h-8 w-8" />}
          change={kpis?.pendingApprovals && kpis.pendingApprovals > 0 ? {
            value: 'Needs review',
            trend: 'neutral' as const,
          } : undefined}
        />

        <KPICard
          label="Last Calculation"
          value={
            kpis?.lastCalculation
              ? formatDistance(new Date(kpis.lastCalculation.createdAt), new Date(), { addSuffix: true })
              : 'Never'
          }
          icon={<CalculatorIcon className="h-8 w-8" />}
          change={
            kpis?.lastCalculation
              ? {
                  value:
                    kpis.lastCalculation.status === 'COMPLETED'
                      ? 'Completed'
                      : kpis.lastCalculation.status === 'RUNNING'
                      ? 'Running'
                      : kpis.lastCalculation.status === 'FAILED'
                      ? 'Failed'
                      : 'Queued',
                  trend:
                    kpis.lastCalculation.status === 'COMPLETED'
                      ? ('up' as const)
                      : kpis.lastCalculation.status === 'FAILED'
                      ? ('down' as const)
                      : ('neutral' as const),
                }
              : undefined
          }
        />
      </div>

      {/* Calculation Stats */}
      {kpis?.calculations && (kpis.calculations.completed > 0 || kpis.calculations.running > 0 || kpis.calculations.failed > 0) && (
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Calculation Statistics</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-success-light/10 border border-success-light">
                <p className="text-sm font-medium text-gray-600 mb-2">Completed</p>
                <p className="text-4xl font-bold text-success">{kpis.calculations.completed}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary-50 border border-primary-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Running</p>
                <p className="text-4xl font-bold text-primary-600">{kpis.calculations.running}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-error-light/10 border border-error-light">
                <p className="text-sm font-medium text-gray-600 mb-2">Failed</p>
                <p className="text-4xl font-bold text-error">{kpis.calculations.failed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <QuickActions />
        <RecentActivity activity={activity} isLoading={activityLoading} />
      </div>

      {/* Empty State */}
      {kpis && kpis.totalItems === 0 && (
        <Card variant="outlined" className="bg-primary-50 border-primary-200">
          <CardBody>
            <div className="flex items-start gap-4">
              <InformationCircleIcon className="h-6 w-6 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Welcome to CPAM!</h3>
                <p className="text-gray-700">
                  Start by adding items, configuring index series, or creating PAMs to begin managing your commodity pricing.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

Dashboard.getLayout = function getLayout(page) {
  return <AccountLayout>{page}</AccountLayout>;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

export default Dashboard;
