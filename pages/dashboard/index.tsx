import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { useDashboardKPIs, useDashboardActivity } from '@/hooks/useDashboard';
import { formatDistance } from 'date-fns';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Loading } from '@/components/shared';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Items</h2>
            <p className="text-3xl font-bold">{kpis?.totalItems || 0}</p>
            <p className="text-sm text-gray-500">Portfolio items</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Exposure</h2>
            <p className="text-3xl font-bold">{formatCurrency(kpis?.totalExposure || 0)}</p>
            <p className="text-sm text-gray-500">Current value</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Pending Approvals</h2>
            <p className="text-3xl font-bold text-warning">{kpis?.pendingApprovals || 0}</p>
            <p className="text-sm text-gray-500">Awaiting review</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Last Calculation</h2>
            {kpis?.lastCalculation ? (
              <>
                <p className="text-lg font-bold">
                  {formatDistance(new Date(kpis.lastCalculation.createdAt), new Date(), { addSuffix: true })}
                </p>
                <div>
                  {kpis.lastCalculation.status === 'COMPLETED' && (
                    <span className="badge badge-success badge-sm">Completed</span>
                  )}
                  {kpis.lastCalculation.status === 'RUNNING' && (
                    <span className="badge badge-info badge-sm">Running</span>
                  )}
                  {kpis.lastCalculation.status === 'FAILED' && (
                    <span className="badge badge-error badge-sm">Failed</span>
                  )}
                  {kpis.lastCalculation.status === 'QUEUED' && (
                    <span className="badge badge-warning badge-sm">Queued</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">--</p>
                <p className="text-sm text-gray-500">Never</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Stats */}
      {kpis?.calculations && (kpis.calculations.completed > 0 || kpis.calculations.running > 0 || kpis.calculations.failed > 0) && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Calculation Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat">
                <div className="stat-title">Completed</div>
                <div className="stat-value text-success">{kpis.calculations.completed}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Running</div>
                <div className="stat-value text-info">{kpis.calculations.running}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Failed</div>
                <div className="stat-value text-error">{kpis.calculations.failed}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <QuickActions />
        <RecentActivity activity={activity} isLoading={activityLoading} />
      </div>

      {/* Empty State */}
      {kpis && kpis.totalItems === 0 && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Welcome to CPAM! Start by adding items, configuring index series, or creating PAMs.</span>
        </div>
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
