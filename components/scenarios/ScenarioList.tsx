import { useRouter } from 'next/router';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BeakerIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatDistance } from 'date-fns';

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

  const handleView = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}`);
  };

  const handleEdit = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}/edit`);
  };

  const handleCompare = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}/compare`);
  };

  const handleDelete = async (scenarioId: string, scenarioName: string) => {
    if (!confirm(`Are you sure you want to delete scenario "${scenarioName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${scenarioId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Scenario deleted successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        alert('Failed to delete scenario. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    }
  };

  const handleRunCalculation = async (scenarioId: string, scenarioName: string) => {
    if (!confirm(`Run calculation for scenario "${scenarioName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamSlug}/scenarios/${scenarioId}/calculate`, {
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

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Index Overrides</th>
            <th>Item Overrides</th>
            <th>Created</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => {
            const overrides = scenario.metadata?.overrides || {};
            const indexOverrideCount = Object.keys(overrides.indexOverrides || {}).length;
            const itemOverrideCount = Object.keys(overrides.itemOverrides || {}).length;

            return (
            <tr key={scenario.id} className="hover">
              <td className="font-medium">{scenario.name}</td>
              <td className="text-sm text-gray-600">
                {scenario.description || '-'}
              </td>
              <td className="text-sm">
                <span className="badge badge-primary badge-sm">
                  {indexOverrideCount}
                </span>
              </td>
              <td className="text-sm">
                <span className="badge badge-secondary badge-sm">
                  {itemOverrideCount}
                </span>
              </td>
              <td className="text-sm text-gray-500">
                {formatDistance(new Date(scenario.createdAt), new Date(), {
                  addSuffix: true,
                })}
              </td>
              <td>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleView(scenario.id)}
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleEdit(scenario.id)}
                    title="Edit scenario"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    className="btn btn-ghost btn-xs text-info"
                    onClick={() => handleCompare(scenario.id)}
                    title="Compare with baseline"
                  >
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                  </button>

                  <button
                    className="btn btn-ghost btn-xs text-success"
                    onClick={() => handleRunCalculation(scenario.id, scenario.name)}
                    title="Run calculation"
                  >
                    <BeakerIcon className="h-4 w-4" />
                  </button>

                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDelete(scenario.id, scenario.name)}
                    title="Delete scenario"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScenarioList;
