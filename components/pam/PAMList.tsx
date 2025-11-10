import { useRouter } from 'next/router';
import { EyeIcon, PencilIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';

interface PAM {
  id: string;
  name: string;
  description?: string;
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

  const handleView = (pamId: string) => {
    router.push(`/pams/${pamId}`);
  };

  const handleEdit = (pamId: string) => {
    router.push(`/pams/${pamId}/edit`);
  };

  const handleDelete = async (pamId: string, pamName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete PAM "${pamName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/teams/${teamSlug}/pams/${pamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate(); // Refresh list
      } else {
        alert('Failed to delete PAM. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting PAM:', error);
      alert('Failed to delete PAM. Please try again.');
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Nodes</th>
            <th>Version</th>
            <th>Updated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pams.map((pam) => {
            const graph = pam.graph || {};
            const nodeCount = graph.nodes?.length || 0;

            return (
              <tr key={pam.id} className="hover">
                <td className="font-medium">{pam.name}</td>
                <td className="text-sm text-gray-600">
                  {pam.description || '-'}
                </td>
                <td className="text-sm">
                  <span className="badge badge-primary badge-sm">
                    {nodeCount} nodes
                  </span>
                </td>
                <td className="text-sm">
                  <span className="badge badge-sm">v{pam.version}</span>
                </td>
                <td className="text-sm text-gray-500">
                  {formatDistance(new Date(pam.updatedAt), new Date(), {
                    addSuffix: true,
                  })}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => handleView(pam.id)}
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => handleEdit(pam.id)}
                      title="Edit PAM"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => handleDelete(pam.id, pam.name)}
                      title="Delete PAM"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PAMList;
