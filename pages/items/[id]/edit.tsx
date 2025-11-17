import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ItemForm from '@/components/items/ItemForm';
import useItem from '@/hooks/useItem';
import { Loading } from '@/components/shared';
import PageHeader from '@/components/navigation/PageHeader';

const EditItemPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, item, teamSlug } = useItem(id as string);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      const response = await fetch(`/api/teams/${teamSlug}/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update item');
      }

      // Redirect to item detail page
      router.push(`/items/${id}`);
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError(err.message || 'Failed to update item. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Edit Item"
        subtitle={`SKU: ${item.sku}`}
        sticky
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push(`/items/${id}`)}
          >
            Back to Item
          </Button>
        }
      />

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <ItemForm
        initialData={item}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/items/${id}`)}
      />
    </div>
  );
};

EditItemPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default EditItemPage;
