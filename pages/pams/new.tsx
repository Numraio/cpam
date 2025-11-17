import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import GraphBuilder from '@/components/pam/GraphBuilder';
import useTeams from '@/hooks/useTeams';
import PageHeader from '@/components/navigation/PageHeader';

const NewPAMPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [graph, setGraph] = useState<any>({
    nodes: [],
    edges: [],
    output: '',
    metadata: {
      description: '',
      baseCurrency: 'USD',
      baseUnit: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
      const response = await fetch(`/api/teams/${teamSlug}/pams`, {
        method: 'POST',
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
        const data = await response.json();
        router.push(`/pams/${data.pam.id}`);
      } else {
        const error = await response.json();
        setErrors(error.errors || [error.error || 'Failed to create PAM']);
      }
    } catch (error) {
      console.error('Error creating PAM:', error);
      setErrors(['Failed to create PAM. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Create Price Adjustment Methodology"
        subtitle="Build a formula graph to calculate adjusted prices"
        sticky
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push('/pams')}
          >
            Back to PAMs
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
            onClick={() => router.push('/pams')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            leftIcon={<CheckIcon className="h-5 w-5" />}
            loading={isSubmitting}
          >
            Create PAM
          </Button>
        </div>
      </form>
    </div>
  );
};

NewPAMPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default NewPAMPage;
