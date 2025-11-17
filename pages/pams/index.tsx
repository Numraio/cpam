import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import { Loading } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { PlusIcon, ArrowPathIcon, CubeIcon } from '@heroicons/react/24/outline';
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
        <Card variant="elevated" className="border-l-4 border-l-error">
          <CardBody>
            <p className="text-error font-medium">Failed to load PAMs. Please try again.</p>
          </CardBody>
        </Card>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Price Adjustment Methodologies</h1>
          <p className="text-gray-600 mt-2">
            Build formula graphs for calculating adjusted prices
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            size="md"
            variant="ghost"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            size="md"
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={() => router.push('/pams/new')}
          >
            Create PAM
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <KPICard
          title="Total PAMs"
          value={totalPAMs}
          subtitle="Formula graphs"
          icon={<CubeIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Total Nodes"
          value={totalNodes}
          subtitle="Across all PAMs"
          icon={<CubeIcon className="h-6 w-6" />}
          variant="primary"
        />
      </div>

      {pams && pams.length > 0 ? (
        <PAMList pams={pams} teamSlug={teamSlug} onUpdate={mutate} />
      ) : (
        <Card variant="elevated" className="border-t-4 border-t-primary">
          <CardBody className="flex flex-col items-center text-center py-12">
            <CubeIcon className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No PAMs Found</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Get started by creating your first Price Adjustment Methodology
            </p>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusIcon className="h-5 w-5" />}
              onClick={() => router.push('/pams/new')}
            >
              Create PAM
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

PAMsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default PAMsPage;
