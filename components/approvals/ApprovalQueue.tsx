import { formatDistance } from 'date-fns';
import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  approvedBy?: string;
  rejectedBy?: string;
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  approver?: {
    name?: string;
    email: string;
  };
}

interface ApprovalQueueProps {
  approvals: Approval[];
  isLoading: boolean;
  onUpdate: () => void;
}

export default function ApprovalQueue({ approvals, isLoading, onUpdate }: ApprovalQueueProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
            <div className="card-body">
              <div className="h-6 bg-base-300 rounded w-3/4" />
              <div className="h-4 bg-base-300 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success gap-2"><CheckCircleIcon className="h-4 w-4" />Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-error gap-2"><XCircleIcon className="h-4 w-4" />Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-warning gap-2"><ClockIcon className="h-4 w-4" />Pending</span>;
      default:
        return <span className="badge">{status}</span>;
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

  const handleView = (approval: Approval) => {
    router.push(`/approvals/${approval.id}`);
  };

  const getDaysOld = (createdAt: Date) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const isUrgent = (createdAt: Date) => {
    return getDaysOld(createdAt) > 3;
  };

  return (
    <div className="space-y-3">
      {approvals.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <CheckCircleIcon className="h-16 w-16 mx-auto text-success mb-4" />
            <h3 className="text-xl font-bold">All caught up!</h3>
            <p className="text-gray-600">There are no pending approvals at this time.</p>
          </div>
        </div>
      ) : (
        approvals.map((approval) => (
          <div
            key={approval.id}
            className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow ${
              isUrgent(approval.createdAt) && approval.status === 'PENDING' ? 'border-2 border-warning' : ''
            }`}
          >
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="card-title">{getEntityTypeLabel(approval.entityType)}</h3>
                    {getStatusBadge(approval.status)}
                    {isUrgent(approval.createdAt) && approval.status === 'PENDING' && (
                      <span className="badge badge-warning">Urgent</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Entity ID: <span className="font-mono">{approval.entityId.substring(0, 12)}...</span></p>
                    <p>
                      Created {formatDistance(new Date(approval.createdAt), new Date(), { addSuffix: true })}
                      {getDaysOld(approval.createdAt) > 0 && (
                        <span className="ml-2">({getDaysOld(approval.createdAt)} days old)</span>
                      )}
                    </p>
                    {approval.status !== 'PENDING' && approval.approver && (
                      <p>
                        {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {approval.approver.name || approval.approver.email}
                      </p>
                    )}
                    {approval.comments && (
                      <p className="italic">"{approval.comments}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    startIcon={<EyeIcon className="h-4 w-4" />}
                    onClick={() => handleView(approval)}
                  >
                    Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
