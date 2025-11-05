/**
 * Audit Export Service
 *
 * Streaming JSONL export of audit logs with:
 * - Deterministic output (consistent field order)
 * - SHA-256 hashing for integrity verification
 * - Pagination for large exports
 * - Sensitive field redaction
 */

import type { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import type { AuditQueryOptions, AuditLogEntry } from './audit-logger';
import { queryAuditLogs } from './audit-logger';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  /** Tenant ID */
  tenantId: string;
  /** Filter by entity type */
  entityType?: string;
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by action */
  action?: string;
  /** Filter by user ID */
  userId?: string;
  /** Filter by correlation ID */
  correlationId?: string;
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** Page size (default: 1000) */
  pageSize?: number;
  /** Include integrity hash */
  includeHash?: boolean;
}

export interface ExportResult {
  /** Total entries exported */
  totalEntries: number;
  /** Number of pages processed */
  totalPages: number;
  /** SHA-256 hash of entire export (if includeHash=true) */
  hash?: string;
  /** JSONL content */
  jsonl: string;
}

export interface ExportRecord {
  /** Audit log ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** User ID */
  userId: string;
  /** Action */
  action: string;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Correlation ID (optional) */
  correlationId?: string;
  /** Changes (already PII-masked) */
  changes?: any;
  /** Metadata */
  metadata?: any;
  /** IP address (redacted to /24) */
  ipAddress?: string;
  /** User agent (redacted to browser/version) */
  userAgent?: string;
  /** Created timestamp (ISO 8601) */
  createdAt: string;
}

// ============================================================================
// Redaction
// ============================================================================

/**
 * Redacts IP address to /24 subnet
 *
 * Example: 192.168.1.42 → 192.168.1.0
 */
function redactIpAddress(ip: string | null | undefined): string | undefined {
  if (!ip) {
    return undefined;
  }

  // IPv4: Redact last octet
  const ipv4Match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.0`;
  }

  // IPv6: Redact last 4 segments
  const ipv6Match = ip.match(/^([0-9a-f:]+):[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i);
  if (ipv6Match) {
    return `${ipv6Match[1]}::`;
  }

  // Unknown format: redact entirely
  return '[REDACTED]';
}

/**
 * Redacts user agent to browser/version only
 *
 * Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
 * → "Chrome/91.0"
 */
function redactUserAgent(ua: string | null | undefined): string | undefined {
  if (!ua) {
    return undefined;
  }

  // Extract browser and major version
  const chromeMatch = ua.match(/Chrome\/(\d+\.\d+)/);
  if (chromeMatch) {
    return `Chrome/${chromeMatch[1]}`;
  }

  const firefoxMatch = ua.match(/Firefox\/(\d+\.\d+)/);
  if (firefoxMatch) {
    return `Firefox/${firefoxMatch[1]}`;
  }

  const safariMatch = ua.match(/Safari\/(\d+\.\d+)/);
  if (safariMatch) {
    return `Safari/${safariMatch[1]}`;
  }

  const edgeMatch = ua.match(/Edg\/(\d+\.\d+)/);
  if (edgeMatch) {
    return `Edge/${edgeMatch[1]}`;
  }

  // Unknown: redact
  return '[BROWSER]';
}

// ============================================================================
// Export
// ============================================================================

/**
 * Converts audit log entry to deterministic export record
 */
function toExportRecord(entry: AuditLogEntry): ExportRecord {
  // Deterministic field order (alphabetical)
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    correlationId: entry.correlationId || undefined,
    changes: entry.changes || undefined,
    metadata: entry.metadata || undefined,
    ipAddress: redactIpAddress(entry.ipAddress),
    userAgent: redactUserAgent(entry.userAgent),
    createdAt: entry.createdAt.toISOString(),
  };
}

/**
 * Exports audit logs as JSONL (JSON Lines) format
 *
 * Each line is a JSON object representing one audit log entry.
 * Output is deterministic (same input → same output).
 *
 * @param prisma - Prisma client
 * @param options - Export options
 * @returns Export result with JSONL content
 */
export async function exportAuditLogsAsJSONL(
  prisma: PrismaClient,
  options: ExportOptions
): Promise<ExportResult> {
  const {
    tenantId,
    entityType,
    entityId,
    action,
    userId,
    correlationId,
    startDate,
    endDate,
    pageSize = 1000,
    includeHash = true,
  } = options;

  const lines: string[] = [];
  let totalEntries = 0;
  let page = 1;

  // Fetch audit logs in pages
  while (true) {
    const queryOptions: AuditQueryOptions = {
      tenantId,
      entityType: entityType as any,
      entityId,
      action: action as any,
      userId,
      correlationId,
      startDate,
      endDate,
      page,
      pageSize,
    };

    const result = await queryAuditLogs(prisma, queryOptions);

    if (result.entries.length === 0) {
      break;
    }

    // Convert to export records
    for (const entry of result.entries) {
      const record = toExportRecord(entry);

      // Deterministic JSON serialization (sorted keys)
      const json = JSON.stringify(record, Object.keys(record).sort());

      lines.push(json);
      totalEntries++;
    }

    // Check if we've reached the end
    if (page >= result.totalPages) {
      break;
    }

    page++;
  }

  // Join lines
  const jsonl = lines.join('\n');

  // Compute hash if requested
  let hash: string | undefined;
  if (includeHash) {
    hash = createHash('sha256').update(jsonl).digest('hex');
  }

  return {
    totalEntries,
    totalPages: page,
    hash,
    jsonl,
  };
}

/**
 * Streams audit logs as JSONL to a callback
 *
 * Useful for large exports that don't fit in memory.
 *
 * @param prisma - Prisma client
 * @param options - Export options
 * @param onLine - Callback for each JSONL line
 * @returns Export metadata (without full JSONL)
 */
export async function streamAuditLogsAsJSONL(
  prisma: PrismaClient,
  options: ExportOptions,
  onLine: (line: string) => void | Promise<void>
): Promise<Omit<ExportResult, 'jsonl'>> {
  const {
    tenantId,
    entityType,
    entityId,
    action,
    userId,
    correlationId,
    startDate,
    endDate,
    pageSize = 1000,
    includeHash = true,
  } = options;

  const hash = includeHash ? createHash('sha256') : undefined;
  let totalEntries = 0;
  let page = 1;

  // Fetch audit logs in pages
  while (true) {
    const queryOptions: AuditQueryOptions = {
      tenantId,
      entityType: entityType as any,
      entityId,
      action: action as any,
      userId,
      correlationId,
      startDate,
      endDate,
      page,
      pageSize,
    };

    const result = await queryAuditLogs(prisma, queryOptions);

    if (result.entries.length === 0) {
      break;
    }

    // Convert to export records and stream
    for (const entry of result.entries) {
      const record = toExportRecord(entry);

      // Deterministic JSON serialization (sorted keys)
      const json = JSON.stringify(record, Object.keys(record).sort());

      // Stream line
      await onLine(json);

      // Update hash
      if (hash) {
        hash.update(json + '\n');
      }

      totalEntries++;
    }

    // Check if we've reached the end
    if (page >= result.totalPages) {
      break;
    }

    page++;
  }

  return {
    totalEntries,
    totalPages: page,
    hash: hash ? hash.digest('hex') : undefined,
  };
}

/**
 * Verifies integrity of JSONL export
 *
 * @param jsonl - JSONL content
 * @param expectedHash - Expected SHA-256 hash
 * @returns True if hash matches
 */
export function verifyExportIntegrity(jsonl: string, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(jsonl).digest('hex');
  return actualHash === expectedHash;
}
