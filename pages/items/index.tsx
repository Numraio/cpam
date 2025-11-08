import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { PlusIcon } from '@heroicons/react/24/outline';
import useItems from '@/hooks/useItems';
import { Loading } from '@/components/shared';
import ItemsTable from '@/components/items/ItemsTable';

const ItemsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { isLoading, isError, items, mutate, teamSlug } = useItems();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load items. Please try again.</span>
        </div>
      </div>
    );
  }

  if (!teamSlug) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>No team found. Please create or join a team first.</span>
        </div>
      </div>
    );
  }

  const filteredItems = items?.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    return (
      item.sku?.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Items</h1>
          <p className="text-gray-600 mt-1">
            Manage portfolio items and their price adjustment formulas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            startIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/items/new')}
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items by SKU, name, or description..."
          className="input input-bordered w-full max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredItems && filteredItems.length > 0 ? (
        <ItemsTable items={filteredItems} teamSlug={teamSlug} onDelete={mutate} />
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No items found</h2>
            <p className="text-gray-600">
              {searchQuery
                ? 'No items match your search criteria.'
                : 'Get started by adding your first item.'}
            </p>
            {!searchQuery && (
              <Button
                color="primary"
                size="md"
                className="mt-4"
                onClick={() => router.push('/items/new')}
              >
                Add Your First Item
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

ItemsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ItemsPage;
