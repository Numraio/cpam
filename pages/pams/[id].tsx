import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Loading } from '@/components/shared';
import { Button, Tabs } from 'react-daisyui';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import usePAMDetail from '@/hooks/usePAMDetail';
import FormulaPreviewBar from '@/components/pam/FormulaPreviewBar';
import FormulaBuilder from '@/components/pam/FormulaBuilder';

const PAMDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const pamId = id as string;

  const { isLoading, isError, pam, mutate, teamSlug } = usePAMDetail(pamId);

  const [activeTab, setActiveTab] = useState<
    'formula' | 'performance' | 'mapping'
  >('formula');
  const [isSaving, setIsSaving] = useState(false);
  const [formulaType, setFormulaType] = useState<'additive' | 'multiplicative'>(
    'additive'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !pam) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Failed to load PAM. Please try again.</span>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: 'DRAFT' | 'TEST' | 'ACTIVE') => {
    try {
      const response = await fetch(\`/api/teams/\${teamSlug}/pams/\${pamId}/status\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await mutate();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleNameUpdate = async () => {
    if (!editedName.trim() || editedName === pam.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(\`/api/teams/\${teamSlug}/pams/\${pamId}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName }),
      });

      if (response.ok) {
        await mutate();
        setIsEditingName(false);
      } else {
        console.error('Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'badge-success';
      case 'TEST':
        return 'badge-warning';
      case 'DRAFT':
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header and Navigation */}
      <div className="bg-base-100 shadow-sm">
        <div className="p-6 border-b border-base-300">
          <div className="flex items-start justify-between mb-4">
            <Button
              size="sm"
              color="ghost"
              startIcon={<ArrowLeftIcon className="h-4 w-4" />}
              onClick={() => router.push('/pams')}
            >
              Back to PAMs
            </Button>

            <div className="flex gap-2">
              <Button
                size="sm"
                color="ghost"
                startIcon={<QuestionMarkCircleIcon className="h-4 w-4" />}
                onClick={() => {
                  // Open help modal or documentation
                  alert('Formula Builder Help: Learn how to build pricing formulas with nodes and connections.');
                }}
              >
                Help
              </Button>
              <Button
                size="sm"
                color="ghost"
                onClick={() => router.push(\`/pams/\${pamId}/edit\`)}
                startIcon={<PencilIcon className="h-4 w-4" />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                color="primary"
                loading={isSaving}
                startIcon={<CheckIcon className="h-4 w-4" />}
                onClick={async () => {
                  setIsSaving(true);
                  // Save any pending changes
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  setIsSaving(false);
                }}
              >
                Save Draft
              </Button>
            </div>
          </div>

          {/* Title and Status */}
          <div className="flex items-center gap-3 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input input-bordered input-lg font-bold"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameUpdate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameUpdate();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <h1
                className="text-3xl font-bold cursor-pointer hover:text-primary transition"
                onClick={() => {
                  setEditedName(pam.name);
                  setIsEditingName(true);
                }}
              >
                {pam.name}
              </h1>
            )}

            <div className="dropdown dropdown-end">
              <label tabIndex={0} className={\`badge badge-lg cursor-pointer \${getStatusBadgeClass(pam.status)}\`}>
                {pam.status}
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <a onClick={() => handleStatusChange('DRAFT')}>
                    <span className="badge badge-ghost badge-sm">DRAFT</span>
                    <span>Work in progress</span>
                  </a>
                </li>
                <li>
                  <a onClick={() => handleStatusChange('TEST')}>
                    <span className="badge badge-warning badge-sm">TEST</span>
                    <span>Ready for testing</span>
                  </a>
                </li>
                <li>
                  <a onClick={() => handleStatusChange('ACTIVE')}>
                    <span className="badge badge-success badge-sm">ACTIVE</span>
                    <span>Live in production</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {pam.description && (
            <p className="text-gray-600">{pam.description}</p>
          )}

          {/* Tabs */}
          <div className="mt-6">
            <Tabs variant="bordered" size="lg">
              <Tabs.Tab
                active={activeTab === 'formula'}
                onClick={() => setActiveTab('formula')}
              >
                Formula Builder
              </Tabs.Tab>
              <Tabs.Tab
                active={activeTab === 'performance'}
                onClick={() => setActiveTab('performance')}
              >
                Historical Performance
              </Tabs.Tab>
              <Tabs.Tab
                active={activeTab === 'mapping'}
                onClick={() => setActiveTab('mapping')}
              >
                Product Mapping
              </Tabs.Tab>
            </Tabs>
          </div>
        </div>

        {/* Formula Preview Bar - only show on Formula Builder tab */}
        {activeTab === 'formula' && (
          <FormulaPreviewBar
            graph={pam.graph}
            formulaType={formulaType}
            onFormulaTypeChange={setFormulaType}
          />
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'formula' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <FormulaBuilder
                initialGraph={pam.graph}
                onChange={async (newGraph) => {
                  // Auto-save graph changes
                  try {
                    await fetch(`/api/teams/${teamSlug}/pams/${pamId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ graph: newGraph }),
                    });
                    await mutate();
                  } catch (error) {
                    console.error('Failed to save graph:', error);
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Historical Performance</h2>
              <p className="text-gray-600 mb-4">
                Analyze how this formula performed historically
              </p>

              <div className="alert alert-info">
                <span>Historical Performance UI will be implemented in Issue #55</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mapping' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Product Mapping</h2>
              <p className="text-gray-600 mb-4">
                Map products to this pricing mechanism
              </p>

              <div className="alert alert-info">
                <span>Product Mapping UI - future enhancement</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

PAMDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default PAMDetailPage;
