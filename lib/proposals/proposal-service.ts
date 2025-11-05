/**
 * Proposal Service
 *
 * Creates and manages credit/debit proposals for price adjustments
 * when index data is revised after approval.
 */

import type { PrismaClient } from '@prisma/client';
import type { ProposalStatus, ProposalType } from '@prisma/client';
import { D, type DecimalValue } from '../calc/decimal';
import {
  createCalculationBatch,
  executeCalculationBatch,
  type BatchCalculationRequest,
} from '../calc/batch-orchestrator';
import { logAuditEvent, generateCorrelationId, type AuditContext } from '../audit/audit-logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateProposalRequest {
  /** Tenant ID */
  tenantId: string;
  /** User ID creating proposal */
  userId: string;
  /** Original approved batch ID */
  originalBatchId: string;
  /** Reason for proposal */
  reason: string;
  /** Revision description (optional) */
  revisionDescription?: string;
}

export interface ProposalDelta {
  /** Item ID */
  itemId: string;
  /** SKU */
  sku: string;
  /** Item name */
  itemName: string;
  /** Original approved price */
  originalPrice: number;
  /** Revised calculated price */
  revisedPrice: number;
  /** Delta (revisedPrice - originalPrice) */
  delta: number;
  /** Currency */
  currency: string;
}

export interface CreateProposalResult {
  /** Proposal ID */
  proposalId: string;
  /** Proposal type (CREDIT or DEBIT) */
  type: ProposalType;
  /** Total delta */
  totalDelta: number;
  /** Delta currency */
  deltaCurrency: string;
  /** Number of affected items */
  affectedItemCount: number;
  /** Deltas for each item */
  deltas: ProposalDelta[];
  /** Proposal batch ID (recalculation) */
  proposalBatchId: string;
}

export interface ReviewProposalRequest {
  /** Tenant ID */
  tenantId: string;
  /** User ID reviewing */
  userId: string;
  /** Proposal ID */
  proposalId: string;
  /** Approve or reject */
  approve: boolean;
  /** Comments */
  comments?: string;
}

export interface ReviewProposalResult {
  /** Proposal ID */
  proposalId: string;
  /** New status */
  status: ProposalStatus;
  /** Reviewed by */
  reviewedBy: string;
  /** Reviewed at */
  reviewedAt: Date;
}

// ============================================================================
// Proposal Service
// ============================================================================

/**
 * Creates a credit/debit proposal for revised data
 *
 * Steps:
 * 1. Fetch original approved batch and results
 * 2. Re-run calculation with current (revised) data
 * 3. Compare original vs revised prices
 * 4. Calculate deltas and determine CREDIT or DEBIT
 * 5. Create Proposal entity
 * 6. Audit log
 *
 * @param prisma - Prisma client
 * @param request - Create proposal request
 * @returns Created proposal
 */
export async function createProposal(
  prisma: PrismaClient,
  request: CreateProposalRequest
): Promise<CreateProposalResult> {
  const { tenantId, userId, originalBatchId, reason, revisionDescription } = request;

  // Generate correlation ID for audit trail
  const correlationId = generateCorrelationId();

  // 1. Fetch original batch and approved results
  const originalBatch = await prisma.calcBatch.findUnique({
    where: { id: originalBatchId },
    include: {
      pam: {
        include: {
          items: true,
        },
      },
      results: {
        where: {
          isApproved: true,
        },
        include: {
          item: true,
        },
      },
    },
  });

  if (!originalBatch) {
    throw new Error(`Batch not found: ${originalBatchId}`);
  }

  if (originalBatch.tenantId !== tenantId) {
    throw new Error('Unauthorized: Batch does not belong to tenant');
  }

  if (originalBatch.results.length === 0) {
    throw new Error('Batch has no approved results');
  }

  // Get metadata
  const metadata = originalBatch.metadata as any;
  if (!metadata?.asOfDate || !metadata?.versionPreference) {
    throw new Error('Batch metadata missing asOfDate or versionPreference');
  }

  const asOfDate = new Date(metadata.asOfDate);
  const versionPreference = metadata.versionPreference;

  // 2. Re-run calculation with current (revised) data
  const recalcRequest: BatchCalculationRequest = {
    tenantId,
    pamId: originalBatch.pamId,
    contractId: originalBatch.contractId || undefined,
    asOfDate,
    versionPreference,
  };

  const batchResult = await createCalculationBatch(prisma, recalcRequest);

  // Execute if not duplicate
  if (!batchResult.isDuplicate) {
    await executeCalculationBatch(prisma, batchResult.batchId);
  }

  const proposalBatchId = batchResult.batchId;

  // Fetch revised results
  const revisedResults = await prisma.calcResult.findMany({
    where: {
      batchId: proposalBatchId,
    },
    include: {
      item: true,
    },
  });

  if (revisedResults.length === 0) {
    throw new Error('Recalculation produced no results');
  }

  // 3. Compare original vs revised prices
  const deltas: ProposalDelta[] = [];
  let totalDelta = D(0);
  const affectedItemIds: string[] = [];

  // Create map of revised results
  const revisedMap = new Map(revisedResults.map((r) => [r.itemId, r]));

  for (const originalResult of originalBatch.results) {
    const revisedResult = revisedMap.get(originalResult.itemId);

    if (!revisedResult) {
      console.warn(`No revised result for item ${originalResult.itemId}`);
      continue;
    }

    const originalPrice = D(originalResult.adjustedPrice.toString());
    const revisedPrice = D(revisedResult.adjustedPrice.toString());
    const delta = revisedPrice.minus(originalPrice);

    // Only include items with non-zero deltas
    if (!delta.isZero()) {
      deltas.push({
        itemId: originalResult.itemId,
        sku: originalResult.item.sku,
        itemName: originalResult.item.name,
        originalPrice: originalPrice.toNumber(),
        revisedPrice: revisedPrice.toNumber(),
        delta: delta.toNumber(),
        currency: originalResult.adjustedCurrency,
      });

      totalDelta = totalDelta.plus(delta);
      affectedItemIds.push(originalResult.itemId);
    }
  }

  if (deltas.length === 0) {
    throw new Error('No price changes detected - no proposal needed');
  }

  // 4. Determine proposal type
  const proposalType: ProposalType = totalDelta.isPositive() ? 'CREDIT' : 'DEBIT';
  const deltaCurrency = originalBatch.results[0].adjustedCurrency;

  // 5. Create Proposal entity
  const proposal = await prisma.proposal.create({
    data: {
      tenantId,
      originalBatchId,
      proposalBatchId,
      type: proposalType,
      status: 'DRAFT',
      reason,
      revisionDescription,
      totalDelta: totalDelta.toDecimalPlaces(12).toFixed(12),
      deltaCurrency,
      affectedItemCount: deltas.length,
      affectedItemIds,
      deltas,
      requestedBy: userId,
    },
  });

  // 6. Audit log
  const auditContext: AuditContext = {
    tenantId,
    userId,
    correlationId,
  };

  await logAuditEvent(prisma, auditContext, {
    action: 'CREATE',
    entityType: 'CALC_BATCH', // Use CALC_BATCH as closest entity type
    entityId: proposal.id,
    metadata: {
      proposalType,
      originalBatchId,
      proposalBatchId,
      totalDelta: totalDelta.toNumber(),
      affectedItemCount: deltas.length,
      reason,
    },
  });

  return {
    proposalId: proposal.id,
    type: proposalType,
    totalDelta: totalDelta.toNumber(),
    deltaCurrency,
    affectedItemCount: deltas.length,
    deltas,
    proposalBatchId,
  };
}

/**
 * Reviews (approves or rejects) a proposal
 *
 * @param prisma - Prisma client
 * @param request - Review request
 * @returns Review result
 */
export async function reviewProposal(
  prisma: PrismaClient,
  request: ReviewProposalRequest
): Promise<ReviewProposalResult> {
  const { tenantId, userId, proposalId, approve, comments } = request;

  // Fetch proposal
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }

  if (proposal.tenantId !== tenantId) {
    throw new Error('Unauthorized: Proposal does not belong to tenant');
  }

  if (proposal.status !== 'DRAFT' && proposal.status !== 'PENDING_REVIEW') {
    throw new Error(`Proposal cannot be reviewed (status: ${proposal.status})`);
  }

  // Update status
  const newStatus: ProposalStatus = approve ? 'APPROVED' : 'REJECTED';

  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status: newStatus,
      reviewedBy: userId,
      reviewedAt: new Date(),
      comments,
    },
  });

  // Audit log
  const auditContext: AuditContext = {
    tenantId,
    userId,
  };

  await logAuditEvent(prisma, auditContext, {
    action: approve ? 'APPROVE' : 'REJECT',
    entityType: 'CALC_BATCH',
    entityId: proposalId,
    metadata: {
      proposalType: proposal.type,
      originalBatchId: proposal.originalBatchId,
      totalDelta: proposal.totalDelta.toNumber(),
      comments,
    },
  });

  return {
    proposalId: updated.id,
    status: updated.status,
    reviewedBy: updated.reviewedBy!,
    reviewedAt: updated.reviewedAt!,
  };
}

/**
 * Fetches a proposal with details
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param proposalId - Proposal ID
 * @returns Proposal or null
 */
export async function getProposal(
  prisma: PrismaClient,
  tenantId: string,
  proposalId: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      originalBatch: {
        include: {
          pam: true,
        },
      },
      proposalBatch: {
        include: {
          results: {
            include: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!proposal) {
    return null;
  }

  if (proposal.tenantId !== tenantId) {
    throw new Error('Unauthorized: Proposal does not belong to tenant');
  }

  return proposal;
}

/**
 * Lists proposals for a tenant
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param status - Optional status filter
 * @returns Proposals
 */
export async function listProposals(
  prisma: PrismaClient,
  tenantId: string,
  status?: ProposalStatus
) {
  return prisma.proposal.findMany({
    where: {
      tenantId,
      ...(status && { status }),
    },
    include: {
      originalBatch: {
        include: {
          pam: true,
        },
      },
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });
}
