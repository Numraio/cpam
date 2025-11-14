import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button, Input, Card, CardBody } from '@/components/ui';
import PageHeader from '@/components/navigation/PageHeader';
import { PlusIcon, MagnifyingGlassIcon, CubeIcon } from '@heroicons/react/24/outline';
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
        <Card variant="outlined" className="bg-error-light/10 border-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load items. Please try again.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!teamSlug) {
    return (
      <div className="p-6">
        <Card variant="outlined" className="bg-warning-light/10 border-warning">
          <CardBody>
            <p className="text-warning-dark font-medium">No team found. Please create or join a team first.</p>
          </CardBody>
        </Card>
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
    <>
      <PageHeader
        title="Items"
        subtitle="Manage portfolio items and their price adjustment formulas"
        primaryAction={
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/items/new')}
          >
            Add Item
          </Button>
        }
        sticky
      />

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search items by SKU, name, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          rightIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
          className="max-w-md"
        />
      </div>

      {filteredItems && filteredItems.length > 0 ? (
        <ItemsTable items={filteredItems} teamSlug={teamSlug} onDelete={mutate} />
      ) : (
        <Card variant="elevated">
          <CardBody>
            <div className="text-center py-12">
              <CubeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No items found</h2>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'No items match your search criteria. Try adjusting your search.'
                  : 'Get started by adding your first item to the portfolio.'}
              </p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  onClick={() => router.push('/items/new')}
                >
                  Add Your First Item
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
};

ItemsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ItemsPage;
