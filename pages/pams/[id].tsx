import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useRouter } from 'next/router';
import { Loading } from '@/components/shared';
import { Button } from 'react-daisyui';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import usePAMDetail from '@/hooks/usePAMDetail';
import { formatDistance } from 'date-fns';

const PAMDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, pam, teamSlug } = usePAMDetail(id as string);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !pam) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>PAM not found or you do not have access to it.</span>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete PAM "${pam.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/teams/${teamSlug}/pams/${pam.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/pams');
      } else {
        alert('Failed to delete PAM. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting PAM:', error);
      alert('Failed to delete PAM. Please try again.');
    }
  };

  const graph = pam.graph || { nodes: [], edges: [], output: '' };
  const nodeCount = graph.nodes?.length || 0;
  const edgeCount = graph.edges?.length || 0;
  const outputNode = graph.nodes?.find((n: any) => n.id === graph.output);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          size="sm"
          color="ghost"
          startIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/pams')}
        >
          Back to PAMs
        </Button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{pam.name}</h1>
          {pam.description && (
            <p className="text-gray-600 mt-1">{pam.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>Version {pam.version}</span>
            <span>Updated {formatDistance(new Date(pam.updatedAt), new Date(), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            color="primary"
            startIcon={<PencilIcon className="h-4 w-4" />}
            onClick={() => router.push(`/pams/${pam.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            color="error"
            startIcon={<TrashIcon className="h-4 w-4" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Nodes</h2>
            <p className="text-3xl font-bold text-primary">{nodeCount}</p>
            <p className="text-sm text-gray-500">Graph components</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Connections</h2>
            <p className="text-3xl font-bold text-secondary">{edgeCount}</p>
            <p className="text-sm text-gray-500">Between nodes</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Output Node</h2>
            <p className="text-lg font-bold">{outputNode?.label || outputNode?.type || 'Not set'}</p>
            <p className="text-xs text-gray-500">{graph.output ? graph.output.substring(0, 12) + '...' : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Graph Visualization</h2>
          {nodeCount > 0 ? (
            <div className="space-y-4">
              {/* Nodes Table */}
              <div>
                <h3 className="font-semibold mb-2">Nodes ({nodeCount})</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm table-zebra w-full">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Label</th>
                        <th>Configuration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {graph.nodes.map((node: any) => (
                        <tr key={node.id}>
                          <td className="font-mono text-xs">{node.id.substring(0, 12)}...</td>
                          <td>
                            <span className="badge badge-sm">{node.type}</span>
                          </td>
                          <td className="font-medium">{node.label || '-'}</td>
                          <td className="text-xs">
                            <pre className="bg-base-200 p-1 rounded">
                              {JSON.stringify(node.config, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edges Table */}
              {edgeCount > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Connections ({edgeCount})</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-sm table-zebra w-full">
                      <thead>
                        <tr>
                          <th>From Node</th>
                          <th></th>
                          <th>To Node</th>
                        </tr>
                      </thead>
                      <tbody>
                        {graph.edges.map((edge: any, index: number) => {
                          const fromNode = graph.nodes.find((n: any) => n.id === edge.from);
                          const toNode = graph.nodes.find((n: any) => n.id === edge.to);
                          return (
                            <tr key={index}>
                              <td>
                                <div className="font-medium">{fromNode?.label || fromNode?.type}</div>
                                <div className="text-xs font-mono text-gray-500">
                                  {edge.from.substring(0, 12)}...
                                </div>
                              </td>
                              <td className="text-center">→</td>
                              <td>
                                <div className="font-medium">{toNode?.label || toNode?.type}</div>
                                <div className="text-xs font-mono text-gray-500">
                                  {edge.to.substring(0, 12)}...
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Output Node Info */}
              {graph.output && outputNode && (
                <div className="alert alert-success">
                  <div>
                    <div className="font-semibold">Output Node</div>
                    <div className="text-sm">
                      {outputNode.label || outputNode.type} ({outputNode.type})
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No nodes in graph. Edit the PAM to add nodes.
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      {graph.metadata && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {graph.metadata.baseCurrency && (
                <div>
                  <div className="text-sm font-semibold text-gray-600">Base Currency</div>
                  <div className="text-lg">{graph.metadata.baseCurrency}</div>
                </div>
              )}
              {graph.metadata.baseUnit && (
                <div>
                  <div className="text-sm font-semibold text-gray-600">Base Unit</div>
                  <div className="text-lg">{graph.metadata.baseUnit}</div>
                </div>
              )}
              {graph.metadata.description && (
                <div>
                  <div className="text-sm font-semibold text-gray-600">Description</div>
                  <div className="text-sm">{graph.metadata.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

PAMDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default PAMDetailPage;
