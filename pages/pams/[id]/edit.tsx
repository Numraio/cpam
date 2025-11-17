import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loading } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import GraphBuilder from '@/components/pam/GraphBuilder';
import usePAMDetail from '@/hooks/usePAMDetail';
import PageHeader from '@/components/navigation/PageHeader';

const EditPAMPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading, isError, pam, teamSlug } = usePAMDetail(id as string);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [graph, setGraph] = useState<any>({
    nodes: [],
    edges: [],
    output: '',
    metadata: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form data when PAM loads
  useEffect(() => {
    if (pam) {
      setFormData({
        name: pam.name,
        description: pam.description || '',
      });
      setGraph(pam.graph || {
        nodes: [],
        edges: [],
        output: '',
        metadata: {},
      });
    }
  }, [pam]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      setErrors(['Name is required']);
      return;
    }

    if (graph.nodes.length === 0) {
      setErrors(['Graph must have at least one node']);
      return;
    }

    if (!graph.output) {
      setErrors(['Output node must be set']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch(`/api/teams/${teamSlug}/pams/${pam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          graph,
        }),
      });

      if (response.ok) {
        router.push(`/pams/${pam.id}`);
      } else {
        const error = await response.json();
        setErrors(error.errors || [error.error || 'Failed to update PAM']);
      }
    } catch (error) {
      console.error('Error updating PAM:', error);
      setErrors(['Failed to update PAM. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Edit Price Adjustment Methodology"
        subtitle="Modify the formula graph to calculate adjusted prices"
        sticky
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push(`/pams/${pam.id}`)}
          >
            Back to PAM
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="alert alert-error mb-6">
            <div>
              <div className="font-semibold">Validation Errors:</div>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Standard Oil Price Adjustment"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Graph Builder */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-0">
            <div className="p-4 border-b">
              <h2 className="card-title">Formula Graph</h2>
              <p className="text-sm text-gray-600 mt-1">
                Build your formula by adding nodes and connecting them. Set one node as the output.
              </p>
            </div>
            <div className="p-4" style={{ height: '700px' }}>
              <GraphBuilder initialGraph={graph} onChange={setGraph} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/pams/${pam.id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            leftIcon={<CheckIcon className="h-5 w-5" />}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

EditPAMPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default EditPAMPage;
