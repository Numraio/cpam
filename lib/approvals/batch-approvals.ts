/**
 * Batch Approval Workflow
 *
 * Manages approval lifecycle for calculation batches:
 * - State machine: PENDING → APPROVED | REJECTED
 * - Approved values are immutable
 * - Override support with reason and audit trail
 * - Server-side transition validation
 */

import type { PrismaClient, ApprovalStatus } from '@prisma/client';
import Decimal from 'decimal.js';

// ============================================================================
// Types
// ============================================================================

export interface ApprovalRequest {
  tenantId: string;
  batchId: string;
  userId: string;
  comments?: string;
}

export interface RejectionRequest {
  tenantId: string;
  batchId: string;
  userId: string;
  reason: string;
}

export interface OverrideRequest {
  tenantId: string;
  batchId: string;
  itemId: string;
  userId: string;
  overridePrice: number;
  reason: string;
}

export interface ApprovalResult {
  approvalId: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  comments?: string;
}

export interface OverrideResult {
  resultId: string;
  itemId: string;
  originalPrice: number;
  overridePrice: number;
  reason: string;
  overriddenBy: string;
  overriddenAt: Date;
}

// ============================================================================
// Approval Workflow
// ============================================================================

/**
 * Creates an approval request for a completed batch
 *
 * @param prisma - Prisma client
 * @param request - Approval request details
 * @returns Approval event
 */
export async function requestBatchApproval(
  prisma: PrismaClient,
  request: ApprovalRequest
): Promise<ApprovalResult> {
  const { tenantId, batchId, userId, comments } = request;

  // Verify batch exists and is completed
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      _count: { select: { results: true } },
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.tenantId !== tenantId) {
    throw new Error(`Batch ${batchId} does not belong to tenant ${tenantId}`);
  }

  if (batch.status !== 'COMPLETED') {
    throw new Error(
      `Batch ${batchId} must be COMPLETED before approval (current: ${batch.status})`
    );
  }

  if (batch._count.results === 0) {
    throw new Error(`Batch ${batchId} has no results to approve`);
  }

  // Check if already has an approval
  const existingApproval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
    },
  });

  if (existingApproval) {
    if (existingApproval.status === 'APPROVED') {
      throw new Error(`Batch ${batchId} is already approved`);
    }
    if (existingApproval.status === 'PENDING') {
      throw new Error(`Batch ${batchId} already has a pending approval`);
    }
  }

  // Create approval event
  const approval = await prisma.approvalEvent.create({
    data: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'PENDING',
      comments,
    },
  });

  // Create audit entry
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'REQUEST_APPROVAL',
      entityType: 'CALC_BATCH',
      entityId: batchId,
      changes: {
        status: 'PENDING',
        comments,
      },
    },
  });

  return {
    approvalId: approval.id,
    status: approval.status,
    comments: approval.comments || undefined,
  };
}

/**
 * Approves a pending batch
 *
 * Once approved, results become immutable (unless overridden).
 *
 * @param prisma - Prisma client
 * @param request - Approval details
 * @returns Approved result
 */
export async function approveBatch(
  prisma: PrismaClient,
  request: ApprovalRequest
): Promise<ApprovalResult> {
  const { tenantId, batchId, userId, comments } = request;

  // Find pending approval
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'PENDING',
    },
  });

  if (!approval) {
    throw new Error(`No pending approval found for batch ${batchId}`);
  }

  // Verify batch still exists and is completed
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch || batch.status !== 'COMPLETED') {
    throw new Error(`Batch ${batchId} is not in COMPLETED state`);
  }

  // Update approval to APPROVED
  const updated = await prisma.approvalEvent.update({
    where: { id: approval.id },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
      comments: comments || approval.comments,
    },
  });

  // Mark all results as approved (immutable)
  await prisma.calcResult.updateMany({
    where: { batchId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: userId,
    },
  });

  // Create audit entry
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'APPROVE',
      entityType: 'CALC_BATCH',
      entityId: batchId,
      changes: {
        status: 'APPROVED',
        approvedBy: userId,
        comments: updated.comments,
      },
    },
  });

  return {
    approvalId: updated.id,
    status: updated.status,
    approvedBy: updated.approvedBy || undefined,
    approvedAt: updated.approvedAt || undefined,
    comments: updated.comments || undefined,
  };
}

/**
 * Rejects a pending batch approval
 *
 * @param prisma - Prisma client
 * @param request - Rejection details
 * @returns Rejection result
 */
export async function rejectBatch(
  prisma: PrismaClient,
  request: RejectionRequest
): Promise<ApprovalResult> {
  const { tenantId, batchId, userId, reason } = request;

  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }

  // Find pending approval
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'PENDING',
    },
  });

  if (!approval) {
    throw new Error(`No pending approval found for batch ${batchId}`);
  }

  // Update approval to REJECTED
  const updated = await prisma.approvalEvent.update({
    where: { id: approval.id },
    data: {
      status: 'REJECTED',
      rejectedBy: userId,
      rejectedAt: new Date(),
      comments: reason,
    },
  });

  // Create audit entry
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'REJECT',
      entityType: 'CALC_BATCH',
      entityId: batchId,
      changes: {
        status: 'REJECTED',
        rejectedBy: userId,
        reason,
      },
    },
  });

  return {
    approvalId: updated.id,
    status: updated.status,
    rejectedBy: updated.rejectedBy || undefined,
    rejectedAt: updated.rejectedAt || undefined,
    comments: updated.comments || undefined,
  };
}

/**
 * Overrides an approved result with a manual price
 *
 * Requires reason and creates audit trail. Original calculated price is preserved.
 *
 * @param prisma - Prisma client
 * @param request - Override details
 * @returns Override result
 */
export async function overrideApprovedPrice(
  prisma: PrismaClient,
  request: OverrideRequest
): Promise<OverrideResult> {
  const { tenantId, batchId, itemId, userId, overridePrice, reason } = request;

  if (!reason || reason.trim().length === 0) {
    throw new Error('Override reason is required');
  }

  // Verify batch is approved
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'APPROVED',
    },
  });

  if (!approval) {
    throw new Error(`Batch ${batchId} is not approved`);
  }

  // Get current result
  const result = await prisma.calcResult.findFirst({
    where: {
      tenantId,
      batchId,
      itemId,
    },
  });

  if (!result) {
    throw new Error(`Result not found for batch ${batchId}, item ${itemId}`);
  }

  if (!result.isApproved) {
    throw new Error(
      `Result for item ${itemId} is not approved (batch must be approved first)`
    );
  }

  const originalPrice = result.adjustedPrice.toNumber();

  // Store original price if not already overridden
  const originalCalculatedPrice = result.originalCalculatedPrice
    ? result.originalCalculatedPrice.toNumber()
    : originalPrice;

  // Update result with override
  const updated = await prisma.calcResult.update({
    where: { id: result.id },
    data: {
      adjustedPrice: new Decimal(overridePrice),
      originalCalculatedPrice: new Decimal(originalCalculatedPrice),
      isOverridden: true,
      overrideReason: reason,
      overriddenBy: userId,
      overriddenAt: new Date(),
    },
  });

  // Create audit entry
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'OVERRIDE',
      entityType: 'CALC_RESULT',
      entityId: result.id,
      changes: {
        itemId,
        originalPrice: originalCalculatedPrice,
        newPrice: overridePrice,
        reason,
      },
    },
  });

  return {
    resultId: updated.id,
    itemId,
    originalPrice: originalCalculatedPrice,
    overridePrice,
    reason,
    overriddenBy: userId,
    overriddenAt: updated.overriddenAt!,
  };
}

/**
 * Gets approval status for a batch
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param batchId - Batch ID
 * @returns Approval status or null if no approval exists
 */
export async function getBatchApprovalStatus(
  prisma: PrismaClient,
  tenantId: string,
  batchId: string
): Promise<ApprovalResult | null> {
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!approval) {
    return null;
  }

  return {
    approvalId: approval.id,
    status: approval.status,
    approvedBy: approval.approvedBy || undefined,
    approvedAt: approval.approvedAt || undefined,
    rejectedBy: approval.rejectedBy || undefined,
    rejectedAt: approval.rejectedAt || undefined,
    comments: approval.comments || undefined,
  };
}

/**
 * Lists all overrides for a batch
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param batchId - Batch ID
 * @returns List of overrides
 */
export async function listBatchOverrides(
  prisma: PrismaClient,
  tenantId: string,
  batchId: string
): Promise<OverrideResult[]> {
  const results = await prisma.calcResult.findMany({
    where: {
      tenantId,
      batchId,
      isOverridden: true,
    },
    orderBy: { overriddenAt: 'desc' },
  });

  return results.map((r) => ({
    resultId: r.id,
    itemId: r.itemId,
    originalPrice: r.originalCalculatedPrice?.toNumber() || 0,
    overridePrice: r.adjustedPrice.toNumber(),
    reason: r.overrideReason || '',
    overriddenBy: r.overriddenBy || '',
    overriddenAt: r.overriddenAt || new Date(),
  }));
}

/**
 * Validates state transition is allowed
 *
 * @param from - Current status
 * @param to - Target status
 * @returns True if transition is valid
 */
export function isValidTransition(
  from: ApprovalStatus | null,
  to: ApprovalStatus
): boolean {
  // Valid transitions:
  // null → PENDING (initial request)
  // PENDING → APPROVED
  // PENDING → REJECTED
  // REJECTED → PENDING (re-request)

  if (from === null && to === 'PENDING') {
    return true;
  }

  if (from === 'PENDING' && (to === 'APPROVED' || to === 'REJECTED')) {
    return true;
  }

  if (from === 'REJECTED' && to === 'PENDING') {
    return true;
  }

  // APPROVED is terminal - cannot transition from APPROVED
  return false;
}
