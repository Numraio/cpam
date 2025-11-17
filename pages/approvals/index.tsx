import { useState } from 'react';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { useApprovals } from '@/hooks/useApprovals';
import { Loading } from '@/components/shared';
import ApprovalQueue from '@/components/approvals/ApprovalQueue';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/navigation/PageHeader';

const ApprovalsPage: NextPageWithLayout = () => {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const { approvals, isLoading, mutate } = useApprovals(statusFilter);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  const pendingCount = approvals.filter((a: any) => a.status === 'PENDING').length;
  const approvedCount = approvals.filter((a: any) => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter((a: any) => a.status === 'REJECTED').length;

  return (
    <div className="p-6">
      <PageHeader
        title="Approvals"
        subtitle="Review and approve or reject changes"
        sticky
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
          title="Pending"
          value={pendingCount}
          subtitle="Awaiting review"
          icon={<ClockIcon className="h-6 w-6" />}
          variant="warning"
        />
        <KPICard
          title="Approved"
          value={approvedCount}
          subtitle="Accepted"
          icon={<CheckCircleIcon className="h-6 w-6" />}
          variant="success"
        />
        <KPICard
          title="Rejected"
          value={rejectedCount}
          subtitle="Declined"
          icon={<XCircleIcon className="h-6 w-6" />}
          variant="error"
        />
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'PENDING'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'APPROVED'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setStatusFilter('APPROVED')}
        >
          Approved ({approvedCount})
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'REJECTED'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          Rejected ({rejectedCount})
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setStatusFilter('ALL')}
        >
          All
        </button>
      </div>

      {/* Approval Queue */}
      {isLoading ? (
        <Loading />
      ) : (
        <ApprovalQueue approvals={approvals} isLoading={isLoading} onUpdate={mutate} />
      )}
    </div>
  );
};

ApprovalsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ApprovalsPage;
