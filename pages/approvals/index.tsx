import { useState } from 'react';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { useApprovals } from '@/hooks/useApprovals';
import { Loading } from '@/components/shared';
import ApprovalQueue from '@/components/approvals/ApprovalQueue';
import { Button } from 'react-daisyui';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-gray-600 mt-1">
            Review and approve or reject changes
          </p>
        </div>
        <Button
          color="ghost"
          size="md"
          startIcon={<ArrowPathIcon className="h-5 w-5" />}
          onClick={handleRefresh}
          loading={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Pending</h2>
            <p className="text-3xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-gray-500">Awaiting review</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Approved</h2>
            <p className="text-3xl font-bold text-success">{approvedCount}</p>
            <p className="text-sm text-gray-500">Accepted</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Rejected</h2>
            <p className="text-3xl font-bold text-error">{rejectedCount}</p>
            <p className="text-sm text-gray-500">Declined</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${statusFilter === 'PENDING' ? 'tab-active' : ''}`}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`tab ${statusFilter === 'APPROVED' ? 'tab-active' : ''}`}
          onClick={() => setStatusFilter('APPROVED')}
        >
          Approved ({approvedCount})
        </button>
        <button
          className={`tab ${statusFilter === 'REJECTED' ? 'tab-active' : ''}`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          Rejected ({rejectedCount})
        </button>
        <button
          className={`tab ${statusFilter === 'ALL' ? 'tab-active' : ''}`}
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
