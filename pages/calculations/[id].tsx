import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, ArrowDownTrayIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useCalculationDetail from '@/hooks/useCalculationDetail';
import { formatDistance } from 'date-fns';
import PageHeader from '@/components/navigation/PageHeader';

const CalculationDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, calculation, results, teamSlug } = useCalculationDetail(id as string);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !calculation) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load calculation. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this calculation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${id}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Calculation cancelled successfully');
        router.push('/calculations');
      } else {
        alert('Failed to cancel calculation.');
      }
    } catch (error) {
      console.error('Error cancelling calculation:', error);
      alert('Failed to cancel calculation.');
    }
  };

  const handleRetry = async () => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${id}/retry`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Retry triggered successfully');
        router.reload();
      } else {
        alert('Failed to retry calculation.');
      }
    } catch (error) {
      console.error('Error retrying calculation:', error);
      alert('Failed to retry calculation.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations/${id}/export`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calculation-${id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export results.');
      }
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results.');
    }
  };


  const getDuration = () => {
    if (!calculation.startedAt) return 'Not started';

    const endTime = calculation.completedAt ? new Date(calculation.completedAt) : new Date();
    const startTime = new Date(calculation.startedAt);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSec = Math.floor(durationMs / 1000);

    if (durationSec < 60) {
      return `${durationSec} seconds`;
    }
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes}m ${seconds}s`;
  };

  const resultCount = results?.length || 0;

  const getStatusBadge = () => {
    const statusClasses = {
      QUEUED: 'bg-warning-light/20 text-warning',
      RUNNING: 'bg-info-light/20 text-info',
      COMPLETED: 'bg-success-light/20 text-success',
      FAILED: 'bg-error-light/20 text-error',
    };
    const className = statusClasses[calculation.status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {calculation.status}
      </span>
    );
  };

  const getPrimaryAction = () => {
    if (calculation.status === 'COMPLETED') {
      return (
        <Button
          variant="primary"
          size="md"
          leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
          onClick={handleExport}
        >
          Export Results
        </Button>
      );
    }
    if (calculation.status === 'FAILED') {
      return (
        <Button
          variant="secondary"
          size="md"
          leftIcon={<ArrowPathIcon className="h-5 w-5" />}
          onClick={handleRetry}
        >
          Retry
        </Button>
      );
    }
    if (calculation.status === 'QUEUED' || calculation.status === 'RUNNING') {
      return (
        <Button
          variant="danger"
          size="md"
          leftIcon={<XMarkIcon className="h-5 w-5" />}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Calculation Details"
        subtitle={`ID: ${calculation.id} • ${resultCount} results • Started ${calculation.startedAt ? formatDistance(new Date(calculation.startedAt), new Date(), { addSuffix: true }) : 'Not started'}`}
        sticky
        statusBadge={getStatusBadge()}
        primaryAction={getPrimaryAction()}
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push('/calculations')}
          >
            Back to Calculations
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Status</h2>
            <p className="text-2xl">
              {getStatusBadge()}
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Duration</h2>
            <p className="text-2xl font-bold">{getDuration()}</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Results</h2>
            <p className="text-2xl font-bold">{resultCount}</p>
            <p className="text-sm text-gray-500">Items calculated</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Started</h2>
            <p className="text-sm">
              {calculation.startedAt
                ? formatDistance(new Date(calculation.startedAt), new Date(), { addSuffix: true })
                : 'Not started'}
            </p>
            {calculation.startedAt && (
              <p className="text-xs text-gray-500">
                {new Date(calculation.startedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar for Running Calculations */}
      {calculation.status === 'RUNNING' && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Progress</h2>
            <div className="w-full">
              <progress className="progress progress-info w-full" value="50" max="100"></progress>
              <p className="text-sm text-gray-500 mt-2">Processing items...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {calculation.error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-bold">Calculation Failed</h3>
            <div className="text-sm">{calculation.error}</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">PAM ID</label>
              <p className="text-lg font-mono">{calculation.pamId || 'N/A'}</p>
            </div>
            {calculation.contractId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Contract ID</label>
                <p className="text-lg font-mono">{calculation.contractId}</p>
              </div>
            )}
            {calculation.scenarioId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Scenario ID</label>
                <p className="text-lg font-mono">{calculation.scenarioId}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Inputs Hash</label>
              <p className="text-sm font-mono">{calculation.inputsHash}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Calculation Results</h2>
          {resultCount > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Adjusted Price</th>
                    <th>Currency</th>
                    <th>Effective Date</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((result: any) => (
                    <tr key={result.id}>
                      <td className="font-mono text-xs">{result.itemId.substring(0, 8)}...</td>
                      <td className="font-mono">{parseFloat(result.adjustedPrice).toFixed(2)}</td>
                      <td>{result.adjustedCurrency}</td>
                      <td className="text-sm">{new Date(result.effectiveDate).toLocaleDateString()}</td>
                      <td>
                        {result.isApproved ? (
                          <span className="badge badge-success badge-sm">Yes</span>
                        ) : (
                          <span className="badge badge-warning badge-sm">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resultCount > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing 10 of {resultCount} results. Export to see all.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No results available yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

CalculationDetailPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default CalculationDetailPage;
