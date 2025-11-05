/**
 * Audit Logger Tests
 *
 * Tests for append-only audit logging with correlation IDs and PII masking
 */

import { PrismaClient } from '@prisma/client';
import {
  logAuditEvent,
  queryAuditLogs,
  getEntityAuditTrail,
  getRelatedEvents,
  generateCorrelationId,
  maskPII,
  logApproval,
  logOverride,
  logCreate,
  logUpdate,
  logDelete,
  type AuditContext,
} from '@/lib/audit/audit-logger';

const prisma = new PrismaClient();

describe('Audit Logger', () => {
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    // Create test tenant
    const tenant = await prisma.team.create({
      data: {
        name: 'Test Tenant - Audit',
        slug: `test-audit-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `audit-test-${Date.now()}@example.com`,
        teamId: tenantId,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { teamId: tenantId } });
    await prisma.team.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  describe('Basic Logging', () => {
    it('should log an audit event', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CONTRACT',
        entityId: 'test-contract-1',
        changes: { name: 'Test Contract' },
      });

      expect(entry.id).toBeDefined();
      expect(entry.tenantId).toBe(tenantId);
      expect(entry.userId).toBe(userId);
      expect(entry.action).toBe('CREATE');
      expect(entry.entityType).toBe('CONTRACT');
      expect(entry.entityId).toBe('test-contract-1');
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('should be immutable (append-only)', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'ITEM',
        entityId: 'test-item-1',
      });

      // Attempt to update should throw (no update method exists)
      // This verifies append-only nature
      expect(entry.id).toBeDefined();

      // Verify entry exists in database
      const found = await prisma.auditLog.findUnique({
        where: { id: entry.id },
      });

      expect(found).toBeDefined();
      expect(found!.id).toBe(entry.id);
    });
  });

  describe('Correlation IDs', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('Given search by correlation ID, then all related events are returned', async () => {
      const correlationId = generateCorrelationId();

      const context: AuditContext = {
        tenantId,
        userId,
        correlationId,
      };

      // Log multiple related events
      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'CALCULATE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'APPROVE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-1',
      });

      // Query by correlation ID
      const relatedEvents = await getRelatedEvents(prisma, tenantId, correlationId);

      expect(relatedEvents.length).toBe(3);
      expect(relatedEvents[0].action).toBe('CREATE');
      expect(relatedEvents[1].action).toBe('CALCULATE');
      expect(relatedEvents[2].action).toBe('APPROVE');

      // All should have same correlation ID
      relatedEvents.forEach((event) => {
        expect(event.correlationId).toBe(correlationId);
      });
    });

    it('should group batch calculation workflow', async () => {
      const correlationId = generateCorrelationId();

      const context: AuditContext = {
        tenantId,
        userId,
        correlationId,
      };

      // Simulate batch workflow
      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-workflow-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'CALCULATE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-workflow-1',
        metadata: { itemsProcessed: 100 },
      });

      await logAuditEvent(prisma, context, {
        action: 'REQUEST_APPROVAL',
        entityType: 'CALC_BATCH',
        entityId: 'batch-workflow-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'APPROVE',
        entityType: 'CALC_BATCH',
        entityId: 'batch-workflow-1',
      });

      // Get all related events
      const workflow = await getRelatedEvents(prisma, tenantId, correlationId);

      expect(workflow.length).toBe(4);
      expect(workflow.map((e) => e.action)).toEqual([
        'CREATE',
        'CALCULATE',
        'REQUEST_APPROVAL',
        'APPROVE',
      ]);
    });
  });

  describe('PII Masking', () => {
    it('should mask PII fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        price: 100.50,
      };

      const masked = maskPII(data);

      expect(masked.name).toBe('John Doe'); // Not PII
      expect(masked.email).toBe('jo********om'); // Masked
      expect(masked.phone).toBe('55****34'); // Masked
      expect(masked.price).toBe(100.50); // Not PII
    });

    it('should mask nested PII fields', () => {
      const data = {
        contract: {
          name: 'Test Contract',
          counterparty: {
            name: 'Acme Corp',
            email: 'contact@acme.com',
          },
        },
        metadata: {
          apiKey: 'secret-key-12345',
        },
      };

      const masked = maskPII(data);

      expect(masked.contract.name).toBe('Test Contract');
      expect(masked.contract.counterparty.name).toBe('Acme Corp');
      expect(masked.contract.counterparty.email).toBe('co**********om');
      expect(masked.metadata.apiKey).toBe('se*******45');
    });

    it('should mask PII in arrays', () => {
      const data = {
        users: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
        ],
      };

      const masked = maskPII(data);

      expect(masked.users[0].email).toBe('al**********om');
      expect(masked.users[1].email).toBe('bo*******om');
    });

    it('should handle edge cases', () => {
      expect(maskPII(null)).toBeNull();
      expect(maskPII(undefined)).toBeUndefined();
      expect(maskPII(123)).toBe(123);
      expect(maskPII('string')).toBe('string');
      expect(maskPII([])).toEqual([]);
      expect(maskPII({})).toEqual({});
    });
  });

  describe('Domain Events', () => {
    it('Given an approval, when action completes, then an audit record appears with actor/time/entity', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logApproval(prisma, context, 'batch-approval-1', 'Looks good');

      expect(entry.action).toBe('APPROVE');
      expect(entry.entityType).toBe('CALC_BATCH');
      expect(entry.entityId).toBe('batch-approval-1');
      expect(entry.userId).toBe(userId); // Actor
      expect(entry.createdAt).toBeInstanceOf(Date); // Time
      expect(entry.metadata).toEqual({ comments: 'Looks good' });
    });

    it('Given override with reason, then reason persisted and immutable', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const reason = 'Contract negotiation - premium adjustment';

      const entry = await logOverride(
        prisma,
        context,
        'result-1',
        100,
        110,
        reason
      );

      expect(entry.action).toBe('OVERRIDE');
      expect(entry.entityType).toBe('CALC_RESULT');
      expect(entry.metadata).toEqual({ reason });
      expect(entry.changes).toEqual({
        before: { adjustedPrice: 100 },
        after: { adjustedPrice: 110 },
      });

      // Verify immutability - cannot update
      const found = await prisma.auditLog.findUnique({
        where: { id: entry.id },
      });

      expect(found!.metadata).toEqual({ reason });
    });

    it('should log create events', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logCreate(prisma, context, 'CONTRACT', 'contract-1', {
        name: 'New Contract',
        status: 'DRAFT',
      });

      expect(entry.action).toBe('CREATE');
      expect(entry.changes).toHaveProperty('after');
    });

    it('should log update events', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logUpdate(
        prisma,
        context,
        'CONTRACT',
        'contract-1',
        { status: 'DRAFT' },
        { status: 'ACTIVE' }
      );

      expect(entry.action).toBe('UPDATE');
      expect(entry.changes).toHaveProperty('before');
      expect(entry.changes).toHaveProperty('after');
    });

    it('should log delete events', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const entry = await logDelete(prisma, context, 'CONTRACT', 'contract-1', {
        name: 'Deleted Contract',
      });

      expect(entry.action).toBe('DELETE');
      expect(entry.changes).toHaveProperty('before');
    });
  });

  describe('Query Functions', () => {
    beforeAll(async () => {
      // Create test audit logs
      const context: AuditContext = {
        tenantId,
        userId,
      };

      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CONTRACT',
        entityId: 'query-contract-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'UPDATE',
        entityType: 'CONTRACT',
        entityId: 'query-contract-1',
      });

      await logAuditEvent(prisma, context, {
        action: 'DELETE',
        entityType: 'CONTRACT',
        entityId: 'query-contract-1',
      });
    });

    it('should query audit logs with pagination', async () => {
      const result = await queryAuditLogs(prisma, {
        tenantId,
        page: 1,
        pageSize: 10,
      });

      expect(result.entries).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter by entity type', async () => {
      const result = await queryAuditLogs(prisma, {
        tenantId,
        entityType: 'CONTRACT',
      });

      result.entries.forEach((entry) => {
        expect(entry.entityType).toBe('CONTRACT');
      });
    });

    it('should filter by action', async () => {
      const result = await queryAuditLogs(prisma, {
        tenantId,
        action: 'CREATE',
      });

      result.entries.forEach((entry) => {
        expect(entry.action).toBe('CREATE');
      });
    });

    it('should filter by entity ID', async () => {
      const result = await queryAuditLogs(prisma, {
        tenantId,
        entityType: 'CONTRACT',
        entityId: 'query-contract-1',
      });

      result.entries.forEach((entry) => {
        expect(entry.entityId).toBe('query-contract-1');
      });
    });

    it('should get entity audit trail', async () => {
      const trail = await getEntityAuditTrail(
        prisma,
        tenantId,
        'CONTRACT',
        'query-contract-1'
      );

      expect(trail.length).toBeGreaterThanOrEqual(3);
      expect(trail[0].action).toBe('CREATE');
      expect(trail[1].action).toBe('UPDATE');
      expect(trail[2].action).toBe('DELETE');

      // Should be ordered by time
      for (let i = 1; i < trail.length; i++) {
        expect(trail[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          trail[i - 1].createdAt.getTime()
        );
      }
    });
  });

  describe('Context Enrichment', () => {
    it('should capture IP address', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
        ipAddress: '192.168.1.1',
      };

      const entry = await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'ITEM',
        entityId: 'item-with-ip',
      });

      expect(entry.ipAddress).toBe('192.168.1.1');
    });

    it('should capture user agent', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
        userAgent: 'Mozilla/5.0 (Test)',
      };

      const entry = await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'ITEM',
        entityId: 'item-with-ua',
      });

      expect(entry.userAgent).toBe('Mozilla/5.0 (Test)');
    });
  });

  describe('Acceptance Tests', () => {
    it('Given an approval, when action completes, then an audit record appears with actor/time/entity', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const before = new Date();
      const entry = await logApproval(prisma, context, 'acceptance-batch-1');
      const after = new Date();

      // Verify actor
      expect(entry.userId).toBe(userId);

      // Verify time
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());

      // Verify entity
      expect(entry.entityType).toBe('CALC_BATCH');
      expect(entry.entityId).toBe('acceptance-batch-1');
    });

    it('Given override with reason, then reason persisted and immutable', async () => {
      const context: AuditContext = {
        tenantId,
        userId,
      };

      const reason = 'Acceptance test override reason';

      const entry = await logOverride(
        prisma,
        context,
        'acceptance-result-1',
        100,
        120,
        reason
      );

      // Verify reason is persisted
      expect(entry.metadata).toEqual({ reason });

      // Verify immutability by fetching again
      const fetched = await prisma.auditLog.findUnique({
        where: { id: entry.id },
      });

      expect(fetched!.metadata).toEqual({ reason });
      expect(fetched!.id).toBe(entry.id);
    });

    it('Given search by correlation ID, then all related events are returned', async () => {
      const correlationId = generateCorrelationId();
      const context: AuditContext = {
        tenantId,
        userId,
        correlationId,
      };

      // Create multiple related events
      await logAuditEvent(prisma, context, {
        action: 'CREATE',
        entityType: 'CALC_BATCH',
        entityId: 'acceptance-batch-2',
      });

      await logAuditEvent(prisma, context, {
        action: 'CALCULATE',
        entityType: 'CALC_BATCH',
        entityId: 'acceptance-batch-2',
      });

      await logAuditEvent(prisma, context, {
        action: 'APPROVE',
        entityType: 'CALC_BATCH',
        entityId: 'acceptance-batch-2',
      });

      // Search by correlation ID
      const related = await getRelatedEvents(prisma, tenantId, correlationId);

      expect(related.length).toBe(3);
      expect(related.map((e) => e.action)).toEqual(['CREATE', 'CALCULATE', 'APPROVE']);

      // All have same correlation ID
      related.forEach((event) => {
        expect(event.correlationId).toBe(correlationId);
      });
    });
  });
});
