import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/shared';
import useTeams from '@/hooks/useTeams';
import useItems from '@/hooks/useItems';

const NewCalculationPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams } = useTeams();
  const { items, isLoading: itemsLoading } = useItems();
  const teamSlug = teams?.[0]?.slug;

  const [formData, setFormData] = useState({
    pamId: '',
    contractId: '',
    scenarioId: '',
    itemSelection: 'all', // 'all' or 'contract'
    priority: 'NORMAL',
    estimatedDuration: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (itemsLoading) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.pamId.trim()) {
      setError('PAM ID is required');
      return;
    }

    if (formData.itemSelection === 'contract' && !formData.contractId.trim()) {
      setError('Contract ID is required when calculating by contract');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${teamSlug}/calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pamId: formData.pamId,
          contractId: formData.itemSelection === 'contract' ? formData.contractId : null,
          scenarioId: formData.scenarioId || null,
          metadata: {
            priority: formData.priority,
            itemCount: formData.itemSelection === 'all' ? items?.length || 0 : null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start calculation');
      }

      // Redirect to calculation detail page
      router.push(`/calculations/${result.calculation.id}`);
    } catch (err: any) {
      console.error('Error starting calculation:', err);
      setError(err.message || 'Failed to start calculation. Please try again.');
      setIsSubmitting(false);
    }
  };

  const estimatedItemCount = formData.itemSelection === 'all' ? items?.length || 0 : '?';
  const estimatedDuration = estimatedItemCount === '?' ? '?' : `~${Math.ceil((estimatedItemCount as number) / 10)} minutes`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/calculations')}
        >
          Back to Calculations
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Start New Calculation</h1>
        <p className="text-gray-600 mt-1">
          Configure and run a batch price adjustment calculation
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Configuration</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text font-medium">PAM ID *</span>
                  </label>
                  <input
                    type="text"
                    name="pamId"
                    placeholder="e.g., pam-2024-q1-commodities"
                    className="input input-bordered w-full"
                    value={formData.pamId}
                    onChange={handleChange}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">
                      The Price Adjustment Methodology to apply
                    </span>
                  </label>
                </div>

                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Item Selection</span>
                  </label>
                  <select
                    name="itemSelection"
                    className="select select-bordered w-full"
                    value={formData.itemSelection}
                    onChange={handleChange}
                  >
                    <option value="all">All Items</option>
                    <option value="contract">By Contract</option>
                  </select>
                </div>

                {formData.itemSelection === 'contract' && (
                  <div className="form-control w-full mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Contract ID *</span>
                    </label>
                    <input
                      type="text"
                      name="contractId"
                      placeholder="Enter contract ID"
                      className="input input-bordered w-full"
                      value={formData.contractId}
                      onChange={handleChange}
                    />
                    <label className="label">
                      <span className="label-text-alt text-gray-500">
                        Calculate only items under this contract
                      </span>
                    </label>
                  </div>
                )}

                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Scenario ID (Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="scenarioId"
                    placeholder="Leave blank for baseline calculation"
                    className="input input-bordered w-full"
                    value={formData.scenarioId}
                    onChange={handleChange}
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">
                      Apply a what-if scenario to the calculation
                    </span>
                  </label>
                </div>

                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Priority</span>
                  </label>
                  <select
                    name="priority"
                    className="select select-bordered w-full"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    type="submit"
                    color="primary"
                    size="md"
                    startIcon={<PlayIcon className="h-5 w-5" />}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Start Calculation
                  </Button>
                  <Button
                    type="button"
                    color="ghost"
                    size="md"
                    onClick={() => router.push('/calculations')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Estimate */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl sticky top-6">
            <div className="card-body">
              <h2 className="card-title text-lg">Estimate</h2>
              <div className="divider my-2"></div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Items to Calculate</label>
                <p className="text-3xl font-bold text-primary">{estimatedItemCount}</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Estimated Duration</label>
                <p className="text-xl font-bold">{estimatedDuration}</p>
              </div>

              <div className="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div className="text-xs">
                  <p className="font-semibold">Processing Info</p>
                  <p>Calculations run asynchronously. You'll be notified when complete.</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-medium text-sm mb-2">What happens next?</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ Calculation queued</li>
                  <li>✓ Items fetched</li>
                  <li>✓ Price data retrieved</li>
                  <li>✓ PAM formula applied</li>
                  <li>✓ Results generated</li>
                  <li>✓ Ready for review</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

NewCalculationPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewCalculationPage;
