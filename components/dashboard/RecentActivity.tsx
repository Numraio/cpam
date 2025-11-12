import { formatDistance } from 'date-fns';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardBody } from '@/components/ui';
import {
  CalculatorIcon,
  CheckCircleIcon,
  CubeIcon,
  ClockIcon,
  ListBulletIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  type: 'calculation' | 'approval' | 'item';
  id: string;
  status: string;
  timestamp: Date;
  data: any;
}

interface RecentActivityProps {
  activity: Activity[];
  isLoading: boolean;
}

export default function RecentActivity({ activity, isLoading }: RecentActivityProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListBulletIcon className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 rounded" />
                  <div className="w-1/2 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const getIcon = (type: string, status: string) => {
    if (type === 'calculation') {
      return <CalculatorIcon className="h-5 w-5" />;
    } else if (type === 'approval') {
      return status === 'APPROVED' ? (
        <CheckCircleIcon className="h-5 w-5 text-success" />
      ) : (
        <ClockIcon className="h-5 w-5 text-warning" />
      );
    } else if (type === 'item') {
      return <CubeIcon className="h-5 w-5" />;
    }
    return null;
  };

  const getStatusBadge = (type: string, status: string) => {
    const badgeClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    if (type === 'calculation') {
      if (status === 'COMPLETED') return <span className={`${badgeClasses} bg-success-light/20 text-success`}>Completed</span>;
      if (status === 'RUNNING') return <span className={`${badgeClasses} bg-primary-100 text-primary-700`}>Running</span>;
      if (status === 'FAILED') return <span className={`${badgeClasses} bg-error-light/20 text-error`}>Failed</span>;
      return <span className={`${badgeClasses} bg-warning-light/20 text-warning`}>Queued</span>;
    } else if (type === 'approval') {
      if (status === 'APPROVED') return <span className={`${badgeClasses} bg-success-light/20 text-success`}>Approved</span>;
      if (status === 'REJECTED') return <span className={`${badgeClasses} bg-error-light/20 text-error`}>Rejected</span>;
      return <span className={`${badgeClasses} bg-warning-light/20 text-warning`}>Pending</span>;
    } else if (type === 'item') {
      return <span className={`${badgeClasses} bg-primary-100 text-primary-700`}>Created</span>;
    }
    return null;
  };

  const getLabel = (item: Activity) => {
    if (item.type === 'calculation') {
      return `Calculation with ${item.data.pamName}`;
    } else if (item.type === 'approval') {
      const approver = item.data.approver || 'Unknown';
      return `Approval by ${approver}`;
    } else if (item.type === 'item') {
      return `Item: ${item.data.name} (${item.data.sku})`;
    }
    return 'Unknown activity';
  };

  const handleClick = (item: Activity) => {
    if (item.type === 'calculation') {
      router.push(`/calculations/${item.id}`);
    } else if (item.type === 'approval') {
      router.push(`/approvals/${item.id}`);
    } else if (item.type === 'item') {
      router.push(`/items/${item.id}`);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ListBulletIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
      </CardHeader>
      <CardBody>
        {activity.length === 0 ? (
          <div className="text-center py-12">
            <XCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">Get started by creating items or running calculations</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-all duration-normal hover:shadow-sm"
                onClick={() => handleClick(item)}
              >
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  {getIcon(item.type, item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">{getLabel(item)}</span>
                    {getStatusBadge(item.type, item.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDistance(new Date(item.timestamp), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
