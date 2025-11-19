import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        if (onDelete) {
          onDelete(); // Refresh the list
        }
      } else {
        console.error('Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    }
  };

  const handleDeleteClick = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSeriesId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}/index-series/${selectedSeriesId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteModalOpen(false);
        setSelectedSeriesId(null);
        // Refresh the list
        if (onDelete) {
          await onDelete();
        } else {
          router.reload();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to delete index series:', errorData);
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting index series:', error);
      alert(`Error deleting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDataTypeBadge = (dataType: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      INDEX: { bg: 'bg-primary-100', text: 'text-primary-700' },
      FX: { bg: 'bg-purple-100', text: 'text-purple-700' },
      CUSTOM: { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const badge = badges[dataType] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`;
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      DAILY: { bg: 'bg-success-light/20', text: 'text-success' },
      WEEKLY: { bg: 'bg-blue-100', text: 'text-blue-700' },
      MONTHLY: { bg: 'bg-warning-light/20', text: 'text-warning' },
    };
    const badge = badges[frequency] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`;
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Series Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {series.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors duration-normal">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono font-semibold text-gray-900">{s.seriesCode}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  {s.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs mt-1">
                      {s.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {s.provider}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getDataTypeBadge(s.dataType)}>
                    {s.dataType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getFrequencyBadge(s.frequency)}>
                    {s.frequency}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {s.unit || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistance(new Date(s.updatedAt), new Date(), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(s.id)}
                      title="View details"
                      className="!p-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(s.id)}
                      title="Trigger sync"
                      className="!p-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(s.id)}
                      title="Edit series"
                      className="!p-2"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(s.id)}
                      title="Delete series"
                      className="!p-2 text-error hover:bg-error-light/10"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Index Series"
        description="Are you sure you want to delete this index series? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </>
  );
};

export default IndexSeriesTable;
