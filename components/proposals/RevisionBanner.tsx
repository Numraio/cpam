/**
 * Revision Banner
 *
 * Shows alert when data revisions are detected for an approved batch
 */

'use client';

import { useState } from 'react';

export interface RevisionBannerProps {
  /** Batch ID */
  batchId: string;
  /** Revision description */
  revisionDescription: string;
  /** Callback when user clicks "Create Proposal" */
  onCreateProposal: () => void | Promise<void>;
}

export default function RevisionBanner({
  batchId,
  revisionDescription,
  onCreateProposal,
}: RevisionBannerProps) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleCreateProposal = async () => {
    setLoading(true);
    try {
      await onCreateProposal();
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="alert alert-warning shadow-lg mb-4">
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 className="font-bold">Data Revision Detected</h3>
          <div className="text-xs">{revisionDescription}</div>
        </div>
      </div>
      <div className="flex-none">
        <button
          className="btn btn-sm btn-primary"
          onClick={handleCreateProposal}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Proposal'}
        </button>
        <button
          className="btn btn-sm btn-ghost ml-2"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
