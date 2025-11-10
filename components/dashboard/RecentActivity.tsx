import { formatDistance } from 'date-fns';
import { useRouter } from 'next/router';
import {
  CalculatorIcon,
  CheckCircleIcon,
  CubeIcon,
  ClockIcon,
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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-base-200 rounded animate-pulse">
                <div className="w-8 h-8 bg-base-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-base-300 rounded" />
                  <div className="w-1/2 h-3 bg-base-300 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
    if (type === 'calculation') {
      if (status === 'COMPLETED') return <span className="badge badge-success badge-sm">Completed</span>;
      if (status === 'RUNNING') return <span className="badge badge-info badge-sm">Running</span>;
      if (status === 'FAILED') return <span className="badge badge-error badge-sm">Failed</span>;
      return <span className="badge badge-warning badge-sm">Queued</span>;
    } else if (type === 'approval') {
      if (status === 'APPROVED') return <span className="badge badge-success badge-sm">Approved</span>;
      if (status === 'REJECTED') return <span className="badge badge-error badge-sm">Rejected</span>;
      return <span className="badge badge-warning badge-sm">Pending</span>;
    } else if (type === 'item') {
      return <span className="badge badge-info badge-sm">Created</span>;
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
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Get started by creating items or running calculations</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 p-3 bg-base-200 rounded hover:bg-base-300 cursor-pointer transition-colors"
                onClick={() => handleClick(item)}
              >
                <div className="flex-shrink-0">
                  {getIcon(item.type, item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{getLabel(item)}</span>
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
      </div>
    </div>
  );
}
