import { useRouter } from 'next/router';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';

interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  basePrice: string;
  baseCurrency: string;
  uom: string;
  pamId?: string;
  createdAt: string;
  updatedAt: string;
  contract?: {
    name: string;
  };
}

interface ItemsTableProps {
  items: Item[];
  teamSlug: string;
  onDelete?: () => void;
}

const ItemsTable = ({ items, teamSlug, onDelete }: ItemsTableProps) => {
  const router = useRouter();

  const handleView = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  const handleEdit = (itemId: string) => {
    router.push(`/items/${itemId}/edit`);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Call onDelete callback to refresh the list
        if (onDelete) {
          onDelete();
        } else {
          router.reload();
        }
      } else {
        alert('Failed to delete item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Base Price</th>
            <th>UoM</th>
            <th>Contract</th>
            <th>PAM</th>
            <th>Updated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover">
              <td className="font-mono font-semibold">{item.sku}</td>
              <td>
                <div className="font-medium">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {item.description}
                  </div>
                )}
              </td>
              <td className="font-mono">
                {parseFloat(item.basePrice).toFixed(2)} {item.baseCurrency}
              </td>
              <td>{item.uom}</td>
              <td>{item.contract?.name || '-'}</td>
              <td>
                {item.pamId ? (
                  <span className="badge badge-success badge-sm">Active</span>
                ) : (
                  <span className="badge badge-ghost badge-sm">None</span>
                )}
              </td>
              <td className="text-sm text-gray-500">
                {formatDistance(new Date(item.updatedAt), new Date(), {
                  addSuffix: true,
                })}
              </td>
              <td>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleView(item.id)}
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleEdit(item.id)}
                    title="Edit item"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDelete(item.id)}
                    title="Delete item"
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

export default ItemsTable;
