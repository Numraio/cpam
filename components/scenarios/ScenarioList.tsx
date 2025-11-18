import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BeakerIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioListProps {
  scenarios: Scenario[];
  teamSlug: string;
  onUpdate?: () => void;
}

const ScenarioList = ({ scenarios, teamSlug, onUpdate }: ScenarioListProps) => {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runCalcModalOpen, setRunCalcModalOpen] = useState(false);
  const [isStartingCalc, setIsStartingCalc] = useState(false);

  const handleView = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}`);
  };

  const handleEdit = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}/edit`);
  };

  const handleCompare = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}/compare`);
  };

  const handleDeleteClick = (scenarioId: string, scenarioName: string) => {
    setSelectedScenario({ id: scenarioId, name: scenarioName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedScenario) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${selectedScenario.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (onUpdate) {
          onUpdate();
        }
        setDeleteModalOpen(false);
      } else {
        console.error('Failed to delete scenario');
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRunCalculationClick = (scenarioId: string, scenarioName: string) => {
    setSelectedScenario({ id: scenarioId, name: scenarioName });
    setRunCalcModalOpen(true);
  };

  const handleRunCalculationConfirm = async () => {
    if (!selectedScenario) return;

    setIsStartingCalc(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${selectedScenario.id}/calculate`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setRunCalcModalOpen(false);
        router.push(`/calculations/${result.calculation.id}`);
      } else {
        console.error('Failed to start calculation');
      }
    } catch (error) {
      console.error('Error starting calculation:', error);
    } finally {
      setIsStartingCalc(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Index Overrides
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Overrides
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scenarios.map((scenario) => {
              const overrides = scenario.metadata?.overrides || {};
              const indexOverrideCount = Object.keys(overrides.indexOverrides || {}).length;
              const itemOverrideCount = Object.keys(overrides.itemOverrides || {}).length;

              return (
                <tr key={scenario.id} className="hover:bg-gray-50 transition-colors duration-normal">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{scenario.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 truncate max-w-xs block">
                      {scenario.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {indexOverrideCount} {indexOverrideCount === 1 ? 'override' : 'overrides'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {itemOverrideCount} {itemOverrideCount === 1 ? 'override' : 'overrides'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistance(new Date(scenario.createdAt), new Date(), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(scenario.id)}
                        title="View details"
                        className="!p-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(scenario.id)}
                        title="Edit scenario"
                        className="!p-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCompare(scenario.id)}
                        title="Compare with baseline"
                        className="!p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunCalculationClick(scenario.id, scenario.name)}
                        title="Run calculation"
                        className="!p-2 text-success hover:bg-success-light/10"
                      >
                        <BeakerIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(scenario.id, scenario.name)}
                        title="Delete scenario"
                        className="!p-2 text-error hover:bg-error-light/10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Scenario"
        message={`Are you sure you want to delete scenario "${selectedScenario?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={runCalcModalOpen}
        onClose={() => setRunCalcModalOpen(false)}
        onConfirm={handleRunCalculationConfirm}
        title="Run Calculation"
        message={`Start a new calculation for scenario "${selectedScenario?.name}"?`}
        confirmText="Start Calculation"
        confirmVariant="primary"
        isLoading={isStartingCalc}
      />
    </>
  );
};

export default ScenarioList;
