import { useRouter } from 'next/router';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';

interface IndexSeries {
  id: string;
  seriesCode: string;
  name: string;
  description?: string;
  provider: string;
  dataType: string;
  unit?: string;
  frequency: string;
  createdAt: string;
  updatedAt: string;
}

interface IndexSeriesTableProps {
  series: IndexSeries[];
  teamSlug: string;
  onDelete?: () => void;
}

const IndexSeriesTable = ({ series, teamSlug, onDelete }: IndexSeriesTableProps) => {
  const router = useRouter();

  const handleView = (seriesId: string) => {
    router.push(`/index-series/${seriesId}`);
  };

  const handleEdit = (seriesId: string) => {
    router.push(`/index-series/${seriesId}/edit`);
  };

  const handleSync = async (seriesId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${seriesId}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Sync triggered successfully');
        if (onDelete) {
          onDelete(); // Refresh the list
        }
      } else {
        alert('Failed to trigger sync. Please try again.');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Failed to trigger sync. Please try again.');
    }
  };

  const handleDelete = async (seriesId: string) => {
    if (!confirm('Are you sure you want to delete this index series?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${seriesId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (onDelete) {
          onDelete();
        } else {
          router.reload();
        }
      } else {
        alert('Failed to delete index series. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting index series:', error);
      alert('Failed to delete index series. Please try again.');
    }
  };

  const getDataTypeBadge = (dataType: string) => {
    const badges: Record<string, string> = {
      INDEX: 'badge-primary',
      FX: 'badge-secondary',
      CUSTOM: 'badge-accent',
    };
    return badges[dataType] || 'badge-ghost';
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, string> = {
      DAILY: 'badge-success',
      WEEKLY: 'badge-info',
      MONTHLY: 'badge-warning',
    };
    return badges[frequency] || 'badge-ghost';
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Series Code</th>
            <th>Name</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Frequency</th>
            <th>Unit</th>
            <th>Updated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.id} className="hover">
              <td className="font-mono font-semibold">{s.seriesCode}</td>
              <td>
                <div className="font-medium">{s.name}</div>
                {s.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {s.description}
                  </div>
                )}
              </td>
              <td>
                <span className="badge badge-outline">{s.provider}</span>
              </td>
              <td>
                <span className={`badge badge-sm ${getDataTypeBadge(s.dataType)}`}>
                  {s.dataType}
                </span>
              </td>
              <td>
                <span className={`badge badge-sm ${getFrequencyBadge(s.frequency)}`}>
                  {s.frequency}
                </span>
              </td>
              <td className="text-sm">{s.unit || '-'}</td>
              <td className="text-sm text-gray-500">
                {formatDistance(new Date(s.updatedAt), new Date(), {
                  addSuffix: true,
                })}
              </td>
              <td>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleView(s.id)}
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSync(s.id)}
                    title="Trigger sync"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleEdit(s.id)}
                    title="Edit series"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDelete(s.id)}
                    title="Delete series"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IndexSeriesTable;
