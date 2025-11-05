/**
 * Tests for Audit Export Service
 */

import { PrismaClient } from '@prisma/client';
import {
  exportAuditLogsAsJSONL,
  streamAuditLogsAsJSONL,
  verifyExportIntegrity,
  type ExportOptions,
} from '@/lib/audit/audit-export';
import {
  logAuditEvent,
  logApproval,
  generateCorrelationId,
  type AuditContext,
} from '@/lib/audit/audit-logger';

const prisma = new PrismaClient();

const tenantId = 'test-tenant-export';
const userId = 'test-user-export';

beforeAll(async () => {
  // Clean up
  await prisma.auditLog.deleteMany({ where: { tenantId } });
});

afterAll(async () => {
  // Clean up
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.$disconnect();
});

describe('Audit Export - Basic', () => {
  it('exports empty audit log as empty JSONL', async () => {
    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: 'empty-tenant',
    });

    expect(result.totalEntries).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.jsonl).toBe('');
  });

  it('exports single audit entry as JSONL', async () => {
    const context: AuditContext = {
      tenantId,
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'export-test-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId,
    });

    expect(result.totalEntries).toBe(1);
    expect(result.jsonl).toContain('"action":"CREATE"');
    expect(result.jsonl).toContain('"entityType":"CONTRACT"');
    expect(result.jsonl).toContain('"entityId":"export-test-1"');
  });

  it('exports multiple audit entries as JSONL (one per line)', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-multi',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'export-test-2',
    });

    await logAuditEvent(prisma, context, {
      action: 'UPDATE',
      entityType: 'CONTRACT',
      entityId: 'export-test-2',
    });

    await logAuditEvent(prisma, context, {
      action: 'APPROVE',
      entityType: 'CONTRACT',
      entityId: 'export-test-2',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    expect(result.totalEntries).toBe(3);

    const lines = result.jsonl.split('\n');
    expect(lines.length).toBe(3);

    // Each line should be valid JSON
    lines.forEach((line) => {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty('action');
      expect(parsed).toHaveProperty('entityType');
      expect(parsed).toHaveProperty('entityId');
    });
  });
});

describe('Audit Export - Filtering', () => {
  beforeAll(async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-filter',
      userId,
    };

    // Create diverse audit entries
    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'filter-contract-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'ITEM',
      entityId: 'filter-item-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'APPROVE',
      entityType: 'CALC_BATCH',
      entityId: 'filter-batch-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'APPROVE',
      entityType: 'CALC_BATCH',
      entityId: 'filter-batch-2',
    });
  });

  it('filters by entity type', async () => {
    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: tenantId + '-filter',
      entityType: 'CALC_BATCH',
    });

    expect(result.totalEntries).toBe(2);

    const lines = result.jsonl.split('\n');
    lines.forEach((line) => {
      const parsed = JSON.parse(line);
      expect(parsed.entityType).toBe('CALC_BATCH');
    });
  });

  it('filters by action', async () => {
    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: tenantId + '-filter',
      action: 'CREATE',
    });

    expect(result.totalEntries).toBe(2);

    const lines = result.jsonl.split('\n');
    lines.forEach((line) => {
      const parsed = JSON.parse(line);
      expect(parsed.action).toBe('CREATE');
    });
  });

  it('filters by entity ID', async () => {
    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: tenantId + '-filter',
      entityId: 'filter-contract-1',
    });

    expect(result.totalEntries).toBe(1);

    const parsed = JSON.parse(result.jsonl);
    expect(parsed.entityId).toBe('filter-contract-1');
  });
});

describe('Audit Export - Determinism', () => {
  it('produces identical output for same input (determinism)', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-determinism',
      userId,
    };

    // Create audit entries
    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'determinism-test-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'APPROVE',
      entityType: 'CALC_BATCH',
      entityId: 'determinism-test-2',
    });

    // Export twice
    const result1 = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    const result2 = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    // Should be identical
    expect(result1.jsonl).toBe(result2.jsonl);
    expect(result1.hash).toBe(result2.hash);
    expect(result1.totalEntries).toBe(result2.totalEntries);
  });

  it('produces consistent field order (alphabetical)', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-field-order',
      userId,
      ipAddress: '192.168.1.1',
      correlationId: generateCorrelationId(),
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'field-order-test',
      metadata: { foo: 'bar' },
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    const parsed = JSON.parse(result.jsonl);

    // Field order should be: action, changes, correlationId, createdAt, entityId, entityType, id, ipAddress, metadata, tenantId, userAgent, userId
    const keys = Object.keys(parsed);
    const expectedOrder = [
      'action',
      'changes',
      'correlationId',
      'createdAt',
      'entityId',
      'entityType',
      'id',
      'ipAddress',
      'metadata',
      'tenantId',
      'userAgent',
      'userId',
    ];

    // Should be sorted alphabetically
    expect(keys).toEqual(expectedOrder.sort());
  });
});

describe('Audit Export - Hashing', () => {
  it('includes SHA-256 hash when includeHash=true', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-hash',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'hash-test-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      includeHash: true,
    });

    expect(result.hash).toBeDefined();
    expect(result.hash).toHaveLength(64); // SHA-256 hex length
  });

  it('omits hash when includeHash=false', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-no-hash',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'no-hash-test-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      includeHash: false,
    });

    expect(result.hash).toBeUndefined();
  });

  it('verifies export integrity with correct hash', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-verify',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'verify-test-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      includeHash: true,
    });

    const isValid = verifyExportIntegrity(result.jsonl, result.hash!);
    expect(isValid).toBe(true);
  });

  it('detects tampering with incorrect hash', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-tamper',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'tamper-test-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      includeHash: true,
    });

    // Tamper with content
    const tamperedJsonl = result.jsonl.replace('CREATE', 'DELETE');

    const isValid = verifyExportIntegrity(tamperedJsonl, result.hash!);
    expect(isValid).toBe(false);
  });
});

describe('Audit Export - Redaction', () => {
  it('redacts IP address to /24 subnet', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-ip-redact',
      userId,
      ipAddress: '192.168.1.42',
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'ip-redact-test',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    const parsed = JSON.parse(result.jsonl);
    expect(parsed.ipAddress).toBe('192.168.1.0');
  });

  it('redacts user agent to browser/version', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-ua-redact',
      userId,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'ua-redact-test',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
    });

    const parsed = JSON.parse(result.jsonl);
    expect(parsed.userAgent).toBe('Chrome/91.0');
  });
});

describe('Audit Export - Correlation IDs', () => {
  it('includes correlation IDs in export', async () => {
    const correlationId = generateCorrelationId();
    const context: AuditContext = {
      tenantId: tenantId + '-correlation',
      userId,
      correlationId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CALC_BATCH',
      entityId: 'correlation-batch-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'CALCULATE',
      entityType: 'CALC_BATCH',
      entityId: 'correlation-batch-1',
    });

    await logAuditEvent(prisma, context, {
      action: 'APPROVE',
      entityType: 'CALC_BATCH',
      entityId: 'correlation-batch-1',
    });

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      correlationId,
    });

    expect(result.totalEntries).toBe(3);

    const lines = result.jsonl.split('\n');
    lines.forEach((line) => {
      const parsed = JSON.parse(line);
      expect(parsed.correlationId).toBe(correlationId);
    });
  });
});

describe('Audit Export - Pagination', () => {
  it('handles large exports with pagination', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-pagination',
      userId,
    };

    // Create 250 entries (to test pagination with pageSize=100)
    for (let i = 0; i < 250; i++) {
      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CONTRACT',
        entityId: `pagination-test-${i}`,
      });
    }

    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      pageSize: 100,
    });

    expect(result.totalEntries).toBe(250);
    expect(result.totalPages).toBe(3); // 100 + 100 + 50

    const lines = result.jsonl.split('\n');
    expect(lines.length).toBe(250);
  });
});

describe('Audit Export - Streaming', () => {
  it('streams audit logs line by line', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-streaming',
      userId,
    };

    // Create 10 entries
    for (let i = 0; i < 10; i++) {
      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CONTRACT',
        entityId: `streaming-test-${i}`,
      });
    }

    const lines: string[] = [];

    const result = await streamAuditLogsAsJSONL(
      prisma,
      {
        tenantId: context.tenantId,
      },
      (line) => {
        lines.push(line);
      }
    );

    expect(result.totalEntries).toBe(10);
    expect(lines.length).toBe(10);

    // Each line should be valid JSON
    lines.forEach((line) => {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty('action');
    });
  });

  it('computes hash during streaming', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-streaming-hash',
      userId,
    };

    await logAuditEvent(prisma, context, {
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: 'streaming-hash-test',
    });

    const lines: string[] = [];

    const result = await streamAuditLogsAsJSONL(
      prisma,
      {
        tenantId: context.tenantId,
        includeHash: true,
      },
      (line) => {
        lines.push(line);
      }
    );

    expect(result.hash).toBeDefined();
    expect(result.hash).toHaveLength(64);
  });
});

describe('Audit Export - Acceptance Tests', () => {
  it('Given an approval, then JSONL contains matching record with consistent fields on repeated export', async () => {
    const context: AuditContext = {
      tenantId: tenantId + '-acceptance',
      userId,
    };

    // Log approval
    const entry = await logApproval(prisma, context, 'acceptance-batch-1', 'Approved for testing');

    // Export twice
    const export1 = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      entityId: 'acceptance-batch-1',
    });

    const export2 = await exportAuditLogsAsJSONL(prisma, {
      tenantId: context.tenantId,
      entityId: 'acceptance-batch-1',
    });

    // Should be identical (deterministic)
    expect(export1.jsonl).toBe(export2.jsonl);
    expect(export1.hash).toBe(export2.hash);

    // Verify content
    const parsed = JSON.parse(export1.jsonl);
    expect(parsed.id).toBe(entry.id);
    expect(parsed.action).toBe('APPROVE');
    expect(parsed.entityType).toBe('CALC_BATCH');
    expect(parsed.entityId).toBe('acceptance-batch-1');
    expect(parsed.userId).toBe(userId);
    expect(parsed.tenantId).toBe(context.tenantId);

    // Consistent field order (alphabetical)
    const keys = Object.keys(parsed);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });
});
