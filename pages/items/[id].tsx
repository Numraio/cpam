import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PencilIcon, ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useItem from '@/hooks/useItem';
import { formatDistance } from 'date-fns';

const ItemDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, item, teamSlug } = useItem(id as string);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !item) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load item. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/items');
      } else {
        alert('Failed to delete item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/items')}
        >
          Back to Items
        </Button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">SKU: {item.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            startIcon={<PencilIcon className="h-5 w-5" />}
            onClick={() => router.push(`/items/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            color="error"
            size="md"
            startIcon={<TrashIcon className="h-5 w-5" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{item.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">SKU</label>
                <p className="text-lg font-mono">{item.sku}</p>
              </div>
              {item.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-lg">{item.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Unit of Measure</label>
                <p className="text-lg">{item.uom}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Pricing</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Base Price</label>
                <p className="text-2xl font-bold font-mono">
                  {parseFloat(item.basePrice).toFixed(2)} {item.baseCurrency}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Base Currency</label>
                <p className="text-lg">{item.baseCurrency}</p>
              </div>
              {item.fxPolicy && (
                <div>
                  <label className="text-sm font-medium text-gray-500">FX Policy</label>
                  <p className="text-lg">{item.fxPolicy.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Associations</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Contract</label>
                <p className="text-lg">{item.contract?.name || 'No contract assigned'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">PAM Status</label>
                <p className="text-lg">
                  {item.pamId ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-ghost">No PAM assigned</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Timestamps</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-lg">
                  {formatDistance(new Date(item.createdAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-lg">
                  {formatDistance(new Date(item.updatedAt), new Date(), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calculations Section - Placeholder */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h2 className="card-title">Recent Calculations</h2>
          <div className="text-center py-8 text-gray-500">
            No calculations found for this item
          </div>
        </div>
      </div>
    </div>
  );
};

ItemDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ItemDetailPage;
