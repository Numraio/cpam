import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, PencilIcon, ArrowsRightLeftIcon, BeakerIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useScenarioDetail from '@/hooks/useScenarioDetail';
import { formatDistance } from 'date-fns';
import PageHeader from '@/components/navigation/PageHeader';

const ScenarioDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, scenario, teamSlug } = useScenarioDetail(id as string);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !scenario) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load scenario. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/scenarios/${id}/edit`);
  };

  const handleCompare = () => {
    router.push(`/scenarios/${id}/compare`);
  };

  const handleRunCalculation = async () => {
    if (!confirm(`Run calculation for scenario "${scenario.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${id}/calculate`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert('Calculation started successfully');
        router.push(`/calculations/${result.calculation.id}`);
      } else {
        alert('Failed to start calculation. Please try again.');
      }
    } catch (error) {
      console.error('Error starting calculation:', error);
      alert('Failed to start calculation. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete scenario "${scenario.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Scenario deleted successfully');
        router.push('/scenarios');
      } else {
        alert('Failed to delete scenario. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    }
  };

  // Extract overrides from JSON
  const overrides = scenario.overrides as any || {};
  const itemOverrides = overrides.itemOverrides || {};
  const indexOverrides = overrides.indexOverrides || {};

  const itemOverrideCount = Object.keys(itemOverrides).length;
  const indexOverrideCount = Object.keys(indexOverrides).length;

  return (
    <div className="p-6">
      <PageHeader
        title={scenario.name}
        subtitle={`${scenario.description || 'No description'} • ${indexOverrideCount} index overrides, ${itemOverrideCount} item overrides • Created ${formatDistance(new Date(scenario.createdAt), new Date(), { addSuffix: true })}`}
        sticky
        primaryAction={
          <Button
            variant="success"
            size="md"
            leftIcon={<BeakerIcon className="h-5 w-5" />}
            onClick={handleRunCalculation}
          >
            Run Calculation
          </Button>
        }
        secondaryActions={
          <>
            <Button
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
              onClick={() => router.push('/scenarios')}
            >
              Back to Scenarios
            </Button>
            <Button
              variant="ghost"
              size="md"
              leftIcon={<PencilIcon className="h-5 w-5" />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowsRightLeftIcon className="h-5 w-5" />}
              onClick={handleCompare}
            >
              Compare
            </Button>
            <Button
              variant="danger"
              size="md"
              leftIcon={<TrashIcon className="h-5 w-5" />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Index Overrides</h2>
            <p className="text-3xl font-bold text-primary">{indexOverrideCount}</p>
            <p className="text-sm text-gray-500">Price series overridden</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Item Overrides</h2>
            <p className="text-3xl font-bold text-secondary">{itemOverrideCount}</p>
            <p className="text-sm text-gray-500">Items with custom values</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Created</h2>
            <p className="text-sm">
              {formatDistance(new Date(scenario.createdAt), new Date(), { addSuffix: true })}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(scenario.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Index Overrides Table */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Index Price Overrides</h2>
          {indexOverrideCount > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Series Code</th>
                    <th>Date</th>
                    <th>Override Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(indexOverrides).map(([seriesCode, dates]: [string, any]) => (
                    Object.entries(dates).map(([date, value]: [string, any]) => (
                      <tr key={`${seriesCode}-${date}`}>
                        <td className="font-mono text-sm">{seriesCode}</td>
                        <td className="text-sm">{new Date(date).toLocaleDateString()}</td>
                        <td className="font-mono">{value}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No index price overrides configured
            </div>
          )}
        </div>
      </div>

      {/* Item Overrides Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Item Overrides</h2>
          {itemOverrideCount > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Properties Overridden</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(itemOverrides).map(([itemId, overrides]: [string, any]) => (
                    <tr key={itemId}>
                      <td className="font-mono text-xs">{itemId.substring(0, 8)}...</td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(overrides).map(([key, value]: [string, any]) => (
                            <span key={key} className="badge badge-sm">
                              {key}: {JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No item overrides configured
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ScenarioDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ScenarioDetailPage;
