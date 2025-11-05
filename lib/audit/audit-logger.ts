/**
 * Audit Logger Service
 *
 * Append-only audit logging with:
 * - Domain event emission
 * - Correlation IDs for related events
 * - PII masking
 * - Immutable storage
 */

import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CALCULATE'
  | 'OVERRIDE'
  | 'EXPORT'
  | 'IMPORT'
  | 'REQUEST_APPROVAL';

export type AuditEntityType =
  | 'CONTRACT'
  | 'ITEM'
  | 'PAM'
  | 'CALC_BATCH'
  | 'CALC_RESULT'
  | 'APPROVAL_EVENT'
  | 'INDEX_SERIES'
  | 'INDEX_VALUE';

export interface AuditContext {
  /** Tenant ID */
  tenantId: string;
  /** User ID performing action */
  userId: string;
  /** IP address (optional) */
  ipAddress?: string;
  /** User agent (optional) */
  userAgent?: string;
  /** Correlation ID to group related events */
  correlationId?: string;
}

export interface AuditEventData {
  /** Action being performed */
  action: AuditAction;
  /** Entity type */
  entityType: AuditEntityType;
  /** Entity ID */
  entityId: string;
  /** Changes (before/after) */
  changes?: any;
  /** Additional metadata */
  metadata?: any;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditQueryOptions {
  /** Tenant ID */
  tenantId: string;
  /** Filter by entity type */
  entityType?: AuditEntityType;
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by action */
  action?: AuditAction;
  /** Filter by user ID */
  userId?: string;
  /** Filter by correlation ID */
  correlationId?: string;
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  pageSize?: number;
}

// ============================================================================
// PII Fields
// ============================================================================

/** Fields that should be masked for PII compliance */
const PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'ssn',
  'taxId',
  'creditCard',
  'password',
  'apiKey',
  'secret',
  'token',
];

// ============================================================================
// Audit Logger
// ============================================================================

/**
 * Logs an audit event (append-only)
 *
 * @param prisma - Prisma client
 * @param context - Audit context (tenant, user, etc.)
 * @param event - Event data
 * @returns Audit log entry
 */
export async function logAuditEvent(
  prisma: PrismaClient,
  context: AuditContext,
  event: AuditEventData
): Promise<AuditLogEntry> {
  const { tenantId, userId, ipAddress, userAgent, correlationId } = context;
  const { action, entityType, entityId, changes, metadata } = event;

  // Mask PII in changes
  const maskedChanges = changes ? maskPII(changes) : undefined;

  // Create audit log entry
  const entry = await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      correlationId,
      changes: maskedChanges,
      metadata,
      ipAddress,
      userAgent,
    },
  });

  return entry as AuditLogEntry;
}

/**
 * Queries audit logs with filtering
 *
 * @param prisma - Prisma client
 * @param options - Query options
 * @returns Paginated audit log entries
 */
export async function queryAuditLogs(
  prisma: PrismaClient,
  options: AuditQueryOptions
): Promise<{
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    tenantId,
    entityType,
    entityId,
    action,
    userId,
    correlationId,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = options;

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = { tenantId };

  if (entityType) {
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  if (correlationId) {
    where.correlationId = correlationId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  // Query
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    entries: entries as AuditLogEntry[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Gets audit trail for a specific entity
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Audit log entries for entity
 */
export async function getEntityAuditTrail(
  prisma: PrismaClient,
  tenantId: string,
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLogEntry[]> {
  const entries = await prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'asc' },
  });

  return entries as AuditLogEntry[];
}

/**
 * Gets all events related by correlation ID
 *
 * Given search by correlation ID, then all related events are returned
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID
 * @param correlationId - Correlation ID
 * @returns All related audit log entries
 */
export async function getRelatedEvents(
  prisma: PrismaClient,
  tenantId: string,
  correlationId: string
): Promise<AuditLogEntry[]> {
  const entries = await prisma.auditLog.findMany({
    where: {
      tenantId,
      correlationId,
    },
    orderBy: { createdAt: 'asc' },
  });

  return entries as AuditLogEntry[];
}

/**
 * Generates a new correlation ID
 *
 * Use this at the start of a workflow to correlate all related events
 *
 * @returns UUID correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

// ============================================================================
// PII Masking
// ============================================================================

/**
 * Masks PII fields in an object (recursive)
 *
 * @param obj - Object to mask
 * @returns Masked copy of object
 */
export function maskPII(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPII(item));
  }

  if (typeof obj === 'object') {
    const masked: any = {};

    for (const key of Object.keys(obj)) {
      if (isPIIField(key)) {
        // Mask the value
        if (typeof obj[key] === 'string') {
          masked[key] = maskString(obj[key]);
        } else {
          masked[key] = '[MASKED]';
        }
      } else {
        // Recursively mask nested objects
        masked[key] = maskPII(obj[key]);
      }
    }

    return masked;
  }

  return obj;
}

/**
 * Checks if a field name indicates PII
 */
function isPIIField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PII_FIELDS.some((piiField) => lowerField.includes(piiField.toLowerCase()));
}

/**
 * Masks a string value (show first 2 and last 2 chars)
 */
function maskString(value: string): string {
  if (!value || value.length <= 4) {
    return '****';
  }

  const first = value.substring(0, 2);
  const last = value.substring(value.length - 2);
  const masked = '*'.repeat(Math.min(value.length - 4, 8));

  return `${first}${masked}${last}`;
}

// ============================================================================
// Domain Event Helpers
// ============================================================================

/**
 * Logs a creation event
 */
export async function logCreate(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  data: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'CREATE',
    entityType,
    entityId,
    changes: { after: data },
  });
}

/**
 * Logs an update event
 */
export async function logUpdate(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  before: any,
  after: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'UPDATE',
    entityType,
    entityId,
    changes: { before, after },
  });
}

/**
 * Logs a deletion event
 */
export async function logDelete(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  data: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'DELETE',
    entityType,
    entityId,
    changes: { before: data },
  });
}

/**
 * Logs an approval event
 *
 * Given an approval, when action completes, then an audit record appears with actor/time/entity
 */
export async function logApproval(
  prisma: PrismaClient,
  context: AuditContext,
  entityId: string,
  comments?: string
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'APPROVE',
    entityType: 'CALC_BATCH',
    entityId,
    metadata: { comments },
  });
}

/**
 * Logs a rejection event
 */
export async function logRejection(
  prisma: PrismaClient,
  context: AuditContext,
  entityId: string,
  reason: string
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'REJECT',
    entityType: 'CALC_BATCH',
    entityId,
    metadata: { reason },
  });
}

/**
 * Logs an override event
 *
 * Given override with reason, then reason persisted and immutable
 */
export async function logOverride(
  prisma: PrismaClient,
  context: AuditContext,
  entityId: string,
  originalPrice: number,
  overridePrice: number,
  reason: string
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'OVERRIDE',
    entityType: 'CALC_RESULT',
    entityId,
    changes: {
      before: { adjustedPrice: originalPrice },
      after: { adjustedPrice: overridePrice },
    },
    metadata: { reason },
  });
}

/**
 * Logs a calculation event
 */
export async function logCalculation(
  prisma: PrismaClient,
  context: AuditContext,
  batchId: string,
  metadata?: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'CALCULATE',
    entityType: 'CALC_BATCH',
    entityId: batchId,
    metadata,
  });
}

/**
 * Logs an export event
 */
export async function logExport(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  metadata?: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'EXPORT',
    entityType,
    entityId,
    metadata,
  });
}

/**
 * Logs an import event
 */
export async function logImport(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: AuditEntityType,
  metadata?: any
): Promise<AuditLogEntry> {
  return logAuditEvent(prisma, context, {
    action: 'IMPORT',
    entityType,
    entityId: 'bulk',
    metadata,
  });
}
