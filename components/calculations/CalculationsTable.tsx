import { useRouter } from 'next/router';
import {
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';

interface Calculation {
  id: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface CalculationsTableProps {
  calculations: Calculation[];
  teamSlug: string;
  onUpdate?: () => void;
}

const CalculationsTable = ({ calculations, teamSlug, onUpdate }: CalculationsTableProps) => {
  const router = useRouter();

  const handleView = (calcId: string) => {
    router.push(`/calculations/${calcId}`);
  };

  const handleCancel = async (calcId: string) => {
    if (!confirm('Are you sure you want to cancel this calculation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${calcId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Calculation cancelled successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        alert('Failed to cancel calculation. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling calculation:', error);
      alert('Failed to cancel calculation. Please try again.');
    }
  };

  const handleRetry = async (calcId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${calcId}/retry`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Retry triggered successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        alert('Failed to retry calculation. Please try again.');
      }
    } catch (error) {
      console.error('Error retrying calculation:', error);
      alert('Failed to retry calculation. Please try again.');
    }
  };

  const handleExport = async (calcId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${calcId}/export`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calculation-${calcId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export results. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      QUEUED: 'badge-warning',
      RUNNING: 'badge-info',
      COMPLETED: 'badge-success',
      FAILED: 'badge-error',
    };
    return badges[status] || 'badge-ghost';
  };

  const getDuration = (calc: Calculation) => {
    if (!calc.startedAt) return '-';

    const endTime = calc.completedAt ? new Date(calc.completedAt) : new Date();
    const startTime = new Date(calc.startedAt);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSec = Math.floor(durationMs / 1000);

    if (durationSec < 60) {
      return `${durationSec}s`;
    }
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Items</th>
            <th>Created</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {calculations.map((calc) => (
            <tr key={calc.id} className="hover">
              <td className="font-mono text-xs">
                {calc.id.substring(0, 8)}...
              </td>
              <td>
                <span className={`badge badge-sm ${getStatusBadge(calc.status)}`}>
                  {calc.status}
                </span>
              </td>
              <td className="text-sm">
                {calc.startedAt
                  ? formatDistance(new Date(calc.startedAt), new Date(), { addSuffix: true })
                  : 'Not started'}
              </td>
              <td className="text-sm font-mono">
                {getDuration(calc)}
              </td>
              <td className="text-sm">
                {calc.metadata?.itemCount || '-'}
              </td>
              <td className="text-sm text-gray-500">
                {formatDistance(new Date(calc.createdAt), new Date(), {
                  addSuffix: true,
                })}
              </td>
              <td>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleView(calc.id)}
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  {calc.status === 'COMPLETED' && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleExport(calc.id)}
                      title="Export results"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                  )}

                  {calc.status === 'FAILED' && (
                    <button
                      className="btn btn-ghost btn-xs text-warning"
                      onClick={() => handleRetry(calc.id)}
                      title="Retry calculation"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}

                  {(calc.status === 'QUEUED' || calc.status === 'RUNNING') && (
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleCancel(calc.id)}
                      title="Cancel calculation"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalculationsTable;
