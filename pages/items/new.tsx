import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ItemForm from '@/components/items/ItemForm';
import useTeams from '@/hooks/useTeams';
import { Loading } from '@/components/shared';
import PageHeader from '@/components/navigation/PageHeader';

const NewItemPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams, isLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <Loading />;
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

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      const response = await fetch(`/api/teams/${teamSlug}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create item');
      }

      // Redirect to items list
      router.push('/items');
    } catch (err: any) {
      console.error('Error creating item:', err);
      setError(err.message || 'Failed to create item. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Add New Item"
        subtitle="Create a new portfolio item with price adjustment formula"
        sticky
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push('/items')}
          >
            Back to Items
          </Button>
        }
      />

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <ItemForm onSubmit={handleSubmit} onCancel={() => router.push('/items')} />
    </div>
  );
};

NewItemPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewItemPage;
