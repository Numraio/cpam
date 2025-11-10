import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import { Loading } from '@/components/shared';
import { Button } from 'react-daisyui';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import usePAMs from '@/hooks/usePAMs';
import { useRouter } from 'next/router';
import PAMList from '@/components/pam/PAMList';

const PAMsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { isLoading, isError, pams, mutate, teamSlug } = usePAMs();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load PAMs. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  // Calculate summary stats
  const totalPAMs = pams?.length || 0;
  const totalNodes = pams?.reduce((sum: number, p: any) => {
    const graph = p.graph || {};
    return sum + (graph.nodes?.length || 0);
  }, 0) || 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Price Adjustment Methodologies</h1>
          <p className="text-gray-600 mt-1">
            Build formula graphs for calculating adjusted prices
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            color="ghost"
            startIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            color="primary"
            startIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => router.push('/pams/new')}
          >
            Create PAM
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total PAMs</h2>
            <p className="text-3xl font-bold">{totalPAMs}</p>
            <p className="text-sm text-gray-500">Formula graphs</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Nodes</h2>
            <p className="text-3xl font-bold text-primary">{totalNodes}</p>
            <p className="text-sm text-gray-500">Across all PAMs</p>
          </div>
        </div>
      </div>

      {pams && pams.length > 0 ? (
        <PAMList pams={pams} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No PAMs Found</h2>
            <p className="text-gray-600 mb-4">
              Get started by creating your first Price Adjustment Methodology
            </p>
            <Button
              color="primary"
              startIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => router.push('/pams/new')}
            >
              Create PAM
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

PAMsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default PAMsPage;
