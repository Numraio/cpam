import { useState } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import { ArrowLeftIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import useTeams from '@/hooks/useTeams';
import usePAMs from '@/hooks/usePAMs';
import useIndexSeries from '@/hooks/useIndexSeries';
import { Loading } from '@/components/shared';

type ScenarioOverrides = {
  indexOverrides: {
    [seriesCode: string]: {
      [date: string]: number;
    };
  };
  itemOverrides: {
    [itemId: string]: {
      [key: string]: any;
    };
  };
};

const NewScenarioPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams } = useTeams();
  const { pams, isLoading: pamsLoading } = usePAMs();
  const { indexSeries, isLoading: seriesLoading } = useIndexSeries();
  const teamSlug = teams?.[0]?.slug;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pamId: '',
    baselineId: '',
  });

  const [overrides, setOverrides] = useState<ScenarioOverrides>({
    indexOverrides: {},
    itemOverrides: {},
  });

  // Index override builder state
  const [selectedSeries, setSelectedSeries] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideType, setOverrideType] = useState<'absolute' | 'percent'>('percent');

  if (pamsLoading || seriesLoading) {
    return <Loading />;
  }

  const totalSteps = 4;

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.name) {
        setErrors(['Name is required']);
        return;
      }
      if (!formData.pamId) {
        setErrors(['PAM selection is required']);
        return;
      }
    }

    setErrors([]);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddIndexOverride = () => {
    if (!selectedSeries || !overrideDate || !overrideValue) {
      setErrors(['Please fill in all override fields']);
      return;
    }

    const value = parseFloat(overrideValue);
    if (isNaN(value)) {
      setErrors(['Override value must be a number']);
      return;
    }

    setOverrides(prev => ({
      ...prev,
      indexOverrides: {
        ...prev.indexOverrides,
        [selectedSeries]: {
          ...(prev.indexOverrides[selectedSeries] || {}),
          [overrideDate]: value,
        },
      },
    }));

    // Reset form
    setSelectedSeries('');
    setOverrideDate('');
    setOverrideValue('');
    setErrors([]);
  };

  const handleRemoveIndexOverride = (seriesCode: string, date: string) => {
    setOverrides(prev => {
      const newOverrides = { ...prev };
      if (newOverrides.indexOverrides[seriesCode]) {
        delete newOverrides.indexOverrides[seriesCode][date];
        if (Object.keys(newOverrides.indexOverrides[seriesCode]).length === 0) {
          delete newOverrides.indexOverrides[seriesCode];
        }
      }
      return newOverrides;
    });
  };

  const handleQuickPreset = (percent: number) => {
    if (!selectedSeries) {
      setErrors(['Please select an index series first']);
      return;
    }

    setOverrideType('percent');
    setOverrideValue(percent.toString());
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.pamId) {
      setErrors(['Name and PAM are required']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          pamId: formData.pamId,
          baselineId: formData.baselineId || undefined,
          overrides: {
            indexOverrides: overrides.indexOverrides,
            itemOverrides: overrides.itemOverrides,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/scenarios/${data.scenario.id}`);
      } else {
        const error = await response.json();
        setErrors([error.error || 'Failed to create scenario']);
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
      setErrors(['Failed to create scenario. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const indexOverrideCount = Object.keys(overrides.indexOverrides).reduce((sum, seriesCode) => {
    return sum + Object.keys(overrides.indexOverrides[seriesCode]).length;
  }, 0);

  const itemOverrideCount = Object.keys(overrides.itemOverrides).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/scenarios')}
        >
          Back to Scenarios
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create What-If Scenario</h1>
        <p className="text-gray-600 mt-1">
          Build a scenario to simulate price changes and analyze impact
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <ul className="steps steps-horizontal w-full">
          <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>Basic Info</li>
          <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>PAM Selection</li>
          <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>Price Overrides</li>
          <li className={`step ${currentStep >= 4 ? 'step-primary' : ''}`}>Review</li>
        </ul>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="alert alert-error mb-6">
          <div>
            <div className="font-semibold">Errors:</div>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Step 1: Basic Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              Give your scenario a name and description
            </p>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Scenario Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High Steel Prices Scenario"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of what you're testing"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: PAM Selection */}
      {currentStep === 2 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Step 2: Select Price Adjustment Methodology</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose which PAM to use for calculating adjusted prices
            </p>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">PAM *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.pamId}
                  onChange={(e) => setFormData({ ...formData, pamId: e.target.value })}
                >
                  <option value="">Select a PAM...</option>
                  {pams?.map((pam: any) => (
                    <option key={pam.id} value={pam.id}>
                      {pam.name} (v{pam.version})
                    </option>
                  ))}
                </select>
              </div>

              {pams && pams.length === 0 && (
                <div className="alert alert-warning">
                  <span>No PAMs found. Please create a PAM first.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Price Overrides */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Step 3: Configure Price Overrides</h2>
              <p className="text-sm text-gray-600 mb-4">
                Override index series prices to simulate different market conditions
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Index Series</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedSeries}
                    onChange={(e) => setSelectedSeries(e.target.value)}
                  >
                    <option value="">Select index series...</option>
                    {indexSeries?.map((series: any) => (
                      <option key={series.id} value={series.seriesCode}>
                        {series.name} ({series.seriesCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Effective Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Quick Presets</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" color="success" onClick={() => handleQuickPreset(10)}>
                    +10%
                  </Button>
                  <Button size="sm" color="success" onClick={() => handleQuickPreset(20)}>
                    +20%
                  </Button>
                  <Button size="sm" color="success" onClick={() => handleQuickPreset(30)}>
                    +30%
                  </Button>
                  <Button size="sm" color="error" onClick={() => handleQuickPreset(-10)}>
                    -10%
                  </Button>
                  <Button size="sm" color="error" onClick={() => handleQuickPreset(-20)}>
                    -20%
                  </Button>
                  <Button size="sm" color="error" onClick={() => handleQuickPreset(-30)}>
                    -30%
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Override Type</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value as 'absolute' | 'percent')}
                  >
                    <option value="percent">Percentage Change</option>
                    <option value="absolute">Absolute Value</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">
                      {overrideType === 'percent' ? 'Percentage (%)' : 'Value'}
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(e.target.value)}
                    placeholder={overrideType === 'percent' ? 'e.g., 10 or -15' : 'e.g., 75.50'}
                    step="any"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button color="primary" onClick={handleAddIndexOverride}>
                  Add Override
                </Button>
              </div>
            </div>
          </div>

          {/* Current Overrides */}
          {indexOverrideCount > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold mb-2">
                  Current Index Overrides ({indexOverrideCount})
                </h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Series Code</th>
                        <th>Date</th>
                        <th>Override Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(overrides.indexOverrides).map(([seriesCode, dates]) =>
                        Object.entries(dates).map(([date, value]) => (
                          <tr key={`${seriesCode}-${date}`}>
                            <td>
                              <span className="badge badge-primary">{seriesCode}</span>
                            </td>
                            <td>{date}</td>
                            <td className="font-mono">{value}</td>
                            <td>
                              <Button
                                size="xs"
                                color="error"
                                onClick={() => handleRemoveIndexOverride(seriesCode, date)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Step 4: Review & Create</h2>
              <p className="text-sm text-gray-600 mb-4">
                Review your scenario configuration before creating
              </p>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-600">Scenario Name</div>
                  <div className="text-lg">{formData.name}</div>
                </div>

                {formData.description && (
                  <div>
                    <div className="text-sm font-semibold text-gray-600">Description</div>
                    <div>{formData.description}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold text-gray-600">PAM</div>
                  <div>
                    {pams?.find((p: any) => p.id === formData.pamId)?.name || 'Not selected'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <div className="text-sm font-semibold text-gray-600">Index Overrides</div>
                      <div className="text-3xl font-bold text-primary">{indexOverrideCount}</div>
                      <div className="text-sm text-gray-500">Price series overridden</div>
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body">
                      <div className="text-sm font-semibold text-gray-600">Item Overrides</div>
                      <div className="text-3xl font-bold text-secondary">{itemOverrideCount}</div>
                      <div className="text-sm text-gray-500">Items with custom values</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          color="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          startIcon={<ChevronLeftIcon className="h-4 w-4" />}
        >
          Back
        </Button>

        <div className="flex gap-2">
          <Button color="ghost" onClick={() => router.push('/scenarios')}>
            Cancel
          </Button>

          {currentStep < totalSteps ? (
            <Button
              color="primary"
              onClick={handleNext}
              endIcon={<ChevronRightIcon className="h-4 w-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              color="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              startIcon={<CheckIcon className="h-4 w-4" />}
            >
              Create Scenario
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

NewScenarioPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewScenarioPage;
