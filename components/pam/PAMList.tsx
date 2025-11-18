import { useState } from 'react';
import { useRouter } from 'next/router';
import { EyeIcon, PencilIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';

interface PAM {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'TEST' | 'ACTIVE';
  version: number;
  graph: any;
  createdAt: string;
  updatedAt: string;
}

interface PAMListProps {
  pams: PAM[];
  teamSlug: string;
  onUpdate: () => void;
}

const PAMList: React.FC<PAMListProps> = ({ pams, teamSlug, onUpdate }) => {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPAM, setSelectedPAM] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = (pamId: string) => {
    router.push(`/pams/${pamId}`);
  };

  const handleEdit = (pamId: string) => {
    router.push(`/pams/${pamId}/edit`);
  };

  const handleDeleteClick = (pamId: string, pamName: string) => {
    setSelectedPAM({ id: pamId, name: pamName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPAM) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}/pams/${selectedPAM.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate(); // Refresh list
        setDeleteModalOpen(false);
      } else {
        console.error('Failed to delete PAM');
      }
    } catch (error) {
      console.error('Error deleting PAM:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: 'bg-success-light/20', text: 'text-success' },
      TEST: { bg: 'bg-warning-light/20', text: 'text-warning' },
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`;
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nodes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
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
            {pams.map((pam) => {
              const graph = pam.graph || {};
              const nodeCount = graph.nodes?.length || 0;

              return (
                <tr key={pam.id} className="hover:bg-gray-50 transition-colors duration-normal">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{pam.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(pam.status)}>
                      {pam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 truncate max-w-xs block">
                      {pam.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {nodeCount} nodes
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                      v{pam.version}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistance(new Date(pam.updatedAt), new Date(), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(pam.id)}
                        title="View details"
                        className="!p-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pam.id)}
                        title="Edit PAM"
                        className="!p-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(pam.id, pam.name)}
                        title="Delete PAM"
                        className="!p-2 text-error hover:bg-error-light/10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete PAM"
        message={`Are you sure you want to delete PAM "${selectedPAM?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default PAMList;
