import { formatDistance } from 'date-fns';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="elevated" className="animate-pulse">
            <CardBody>
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      APPROVED: {
        bg: 'bg-success-light/20',
        text: 'text-success',
        icon: <CheckCircleIcon className="h-4 w-4" />,
      },
      REJECTED: {
        bg: 'bg-error-light/20',
        text: 'text-error',
        icon: <XCircleIcon className="h-4 w-4" />,
      },
      PENDING: {
        bg: 'bg-warning-light/20',
        text: 'text-warning',
        icon: <ClockIcon className="h-4 w-4" />,
      },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
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
        <Card variant="elevated">
          <CardBody className="flex flex-col items-center text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-success mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">There are no pending approvals at this time.</p>
          </CardBody>
        </Card>
      ) : (
        approvals.map((approval) => (
          <Card
            key={approval.id}
            variant="elevated"
            className={`hover:shadow-lg transition-shadow duration-normal ${
              isUrgent(approval.createdAt) && approval.status === 'PENDING' ? 'border-l-4 border-l-warning' : ''
            }`}
          >
            <CardBody>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{getEntityTypeLabel(approval.entityType)}</h3>
                    {getStatusBadge(approval.status)}
                    {isUrgent(approval.createdAt) && approval.status === 'PENDING' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light/20 text-warning">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1.5">
                    <p>
                      Entity ID: <span className="font-mono text-gray-900">{approval.entityId.substring(0, 12)}...</span>
                    </p>
                    <p>
                      Created {formatDistance(new Date(approval.createdAt), new Date(), { addSuffix: true })}
                      {getDaysOld(approval.createdAt) > 0 && (
                        <span className="ml-2 text-gray-500">({getDaysOld(approval.createdAt)} days old)</span>
                      )}
                    </p>
                    {approval.status !== 'PENDING' && approval.approver && (
                      <p>
                        {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
                        <span className="font-medium text-gray-900">{approval.approver.name || approval.approver.email}</span>
                      </p>
                    )}
                    {approval.comments && (
                      <p className="italic text-gray-700 mt-2">"{approval.comments}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<EyeIcon className="h-4 w-4" />}
                    onClick={() => handleView(approval)}
                  >
                    Review
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
