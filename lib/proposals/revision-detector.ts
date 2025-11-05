/**
 * Revision Detector
 *
 * Detects when index provider data has been revised after a batch was approved.
 * Creates proposals for credit/debit adjustments without reopening the original batch.
 */

import type { PrismaClient } from '@prisma/client';
import type { VersionTag } from '@prisma/client';
import { computeInputsHash, type BatchInputs } from '../calc/batch-orchestrator';
import type { PAMGraph } from '../pam/types';

// ============================================================================
// Types
// ============================================================================

export interface RevisionDetectionRequest {
  /** Tenant ID */
  tenantId: string;
  /** Original approved batch ID */
  batchId: string;
}

export interface RevisionDetectionResult {
  /** Whether a revision was detected */
  hasRevision: boolean;
  /** Original inputs hash */
  originalInputsHash: string;
  /** New inputs hash (if revision detected) */
  newInputsHash?: string;
  /** Description of what changed */
  revisionDescription?: string;
  /** Revised index series codes */
  revisedSeries?: string[];
}

// ============================================================================
// Revision Detection
// ============================================================================

/**
 * Detects if data revisions have occurred since a batch was approved
 *
 * Compares the original inputs hash with a new hash computed from current data.
 * If they differ, a revision has occurred.
 *
 * @param prisma - Prisma client
 * @param request - Detection request
 * @returns Detection result
 */
export async function detectRevision(
  prisma: PrismaClient,
  request: RevisionDetectionRequest
): Promise<RevisionDetectionResult> {
  const { tenantId, batchId } = request;

  // Fetch original batch
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      pam: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.tenantId !== tenantId) {
    throw new Error('Unauthorized: Batch does not belong to tenant');
  }

  // Get original inputs hash
  const originalInputsHash = batch.inputsHash;

  // Reconstruct original inputs from metadata
  const metadata = batch.metadata as any;
  if (!metadata?.asOfDate || !metadata?.versionPreference) {
    throw new Error('Batch metadata missing asOfDate or versionPreference');
  }

  const asOfDate = new Date(metadata.asOfDate);
  const versionPreference = metadata.versionPreference as VersionTag;

  // Get item IDs (sorted for determinism)
  const itemIds = batch.pam.items.map((item) => item.id).sort();

  // Compute new inputs hash with current data
  const newInputs: BatchInputs = {
    pamGraph: batch.pam.graph as unknown as PAMGraph,
    asOfDate,
    versionPreference,
    itemIds,
  };

  const newInputsHash = computeInputsHash(newInputs);

  // Compare hashes
  const hasRevision = originalInputsHash !== newInputsHash;

  if (!hasRevision) {
    return {
      hasRevision: false,
      originalInputsHash,
    };
  }

  // Revision detected - try to identify what changed
  const revisedSeries = await identifyRevisedSeries(
    prisma,
    tenantId,
    batch.pam.graph as unknown as PAMGraph,
    asOfDate,
    versionPreference
  );

  const revisionDescription = generateRevisionDescription(revisedSeries, asOfDate);

  return {
    hasRevision: true,
    originalInputsHash,
    newInputsHash,
    revisionDescription,
    revisedSeries,
  };
}

/**
 * Identifies which index series have been revised
 *
 * Checks the AuditLog for recent CREATE or UPDATE events on INDEX_VALUE entities.
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param pamGraph - PAM graph
 * @param asOfDate - As-of date
 * @param versionPreference - Version preference
 * @returns Array of revised series codes
 */
async function identifyRevisedSeries(
  prisma: PrismaClient,
  tenantId: string,
  pamGraph: PAMGraph,
  asOfDate: Date,
  versionPreference: VersionTag
): Promise<string[]> {
  // Extract series codes from PAM graph
  const seriesCodes: Set<string> = new Set();

  for (const node of pamGraph.nodes) {
    if (node.type === 'factor' && node.config.series) {
      seriesCodes.add(node.config.series);
    }
  }

  if (seriesCodes.size === 0) {
    return [];
  }

  // Check audit log for recent revisions
  const recentRevisions = await prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType: 'INDEX_VALUE',
      action: {
        in: ['CREATE', 'UPDATE'],
      },
      createdAt: {
        // Check last 7 days
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Extract series codes from revisions
  const revisedSeriesSet: Set<string> = new Set();

  for (const revision of recentRevisions) {
    const metadata = revision.metadata as any;
    if (metadata?.seriesCode && seriesCodes.has(metadata.seriesCode)) {
      revisedSeriesSet.add(metadata.seriesCode);
    }
  }

  return Array.from(revisedSeriesSet);
}

/**
 * Generates human-readable revision description
 */
function generateRevisionDescription(
  revisedSeries: string[],
  asOfDate: Date
): string {
  if (revisedSeries.length === 0) {
    return `Data revision detected for calculations as of ${asOfDate.toISOString().split('T')[0]}`;
  }

  const seriesList = revisedSeries.join(', ');

  if (revisedSeries.length === 1) {
    return `Index provider revised ${seriesList} data for ${asOfDate.toISOString().split('T')[0]}`;
  }

  return `Index provider revised data for ${revisedSeries.length} series (${seriesList}) as of ${asOfDate.toISOString().split('T')[0]}`;
}

/**
 * Checks if a batch has a pending or approved proposal
 *
 * @param prisma - Prisma client
 * @param batchId - Batch ID
 * @returns True if proposal exists
 */
export async function hasExistingProposal(
  prisma: PrismaClient,
  batchId: string
): Promise<boolean> {
  const count = await prisma.proposal.count({
    where: {
      originalBatchId: batchId,
      status: {
        in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'],
      },
    },
  });

  return count > 0;
}
