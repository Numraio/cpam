import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { useApprovalDetail } from '@/hooks/useApprovals';
import { Loading } from '@/components/shared';
import { Button } from 'react-daisyui';
import { formatDistance } from 'date-fns';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const ApprovalDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { approval, isLoading, isError, mutate } = useApprovalDetail(id as string);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !approval) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Approval not found or you do not have access to it.</span>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/approvals/${approval.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          comment: comment || undefined,
        }),
      });

      if (response.ok) {
        await mutate();
        router.push('/approvals');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to approve');
      }
    } catch (err) {
      console.error('Error approving:', err);
      setError('Failed to approve. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('Comment is required for rejection');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/approvals/${approval.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          comment,
        }),
      });

      if (response.ok) {
        await mutate();
        router.push('/approvals');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject');
      }
    } catch (err) {
      console.error('Error rejecting:', err);
      setError('Failed to reject. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success badge-lg gap-2"><CheckCircleIcon className="h-5 w-5" />Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-error badge-lg gap-2"><XCircleIcon className="h-5 w-5" />Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-warning badge-lg">Pending</span>;
      default:
        return <span className="badge badge-lg">{status}</span>;
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'CALC_BATCH':
        return 'Calculation Batch';
      case 'CONTRACT':
        return 'Contract';
      case 'PAM':
        return 'Price Adjustment Methodology';
      default:
        return entityType;
    }
  };

  const isPending = approval.status === 'PENDING';

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/approvals')}
        >
          Back to Approvals
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{getEntityTypeLabel(approval.entityType)}</h1>
            <p className="text-gray-600 mt-1">
              Created {formatDistance(new Date(approval.createdAt), new Date(), { addSuffix: true })}
            </p>
          </div>
          {getStatusBadge(approval.status)}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Approval Details */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Approval Details</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-600">Entity Type</div>
              <div className="text-lg">{getEntityTypeLabel(approval.entityType)}</div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-600">Entity ID</div>
              <div className="font-mono text-sm">{approval.entityId}</div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-600">Status</div>
              <div className="mt-1">{getStatusBadge(approval.status)}</div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-600">Created</div>
              <div>{new Date(approval.createdAt).toLocaleString()}</div>
            </div>

            {approval.approver && (
              <div>
                <div className="text-sm font-semibold text-gray-600">
                  {approval.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}
                </div>
                <div>{approval.approver.name || approval.approver.email}</div>
              </div>
            )}

            {approval.comments && (
              <div>
                <div className="text-sm font-semibold text-gray-600">Comments</div>
                <div className="mt-2 p-4 bg-base-200 rounded">
                  {approval.comments}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Panel */}
      {isPending && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Take Action</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Comment (optional for approval, required for rejection)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Add your comments here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                color="success"
                size="lg"
                className="flex-1"
                startIcon={<CheckCircleIcon className="h-5 w-5" />}
                onClick={handleApprove}
                loading={isSubmitting}
              >
                Approve
              </Button>
              <Button
                color="error"
                size="lg"
                className="flex-1"
                startIcon={<XCircleIcon className="h-5 w-5" />}
                onClick={handleReject}
                loading={isSubmitting}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ApprovalDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ApprovalDetailPage;
