/**
 * Schema Constraint Tests
 * Tests database-level constraints, FK violations, unique violations, and data integrity
 *
 * NOTE: These tests require a test database. Set TEST_DATABASE_URL in your .env.test file.
 * Run with: npm test -- schema-constraints.spec.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

describe('Database Schema Constraints', () => {
  let testTenant: any;
  let testUser: any;
  let testContract: any;
  let testPAM: any;
  let testIndexSeries: any;

  beforeAll(async () => {
    // Create test tenant (team)
    testTenant = await prisma.team.create({
      data: {
        name: 'Test Tenant',
        slug: `test-tenant-${Date.now()}`,
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        emailVerified: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.contract.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.pAM.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.indexSeries.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.team.delete({ where: { id: testTenant.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('Contract Constraints', () => {
    it('should create a valid contract', async () => {
      testContract = await prisma.contract.create({
        data: {
          tenantId: testTenant.id,
          name: 'Test Contract',
          status: 'DRAFT',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      expect(testContract).toBeTruthy();
      expect(testContract.tenantId).toBe(testTenant.id);
      expect(testContract.status).toBe('DRAFT');
    });

    it('should reject contract with invalid tenant FK', async () => {
      await expect(
        prisma.contract.create({
          data: {
            tenantId: 'invalid-tenant-id',
            name: 'Invalid Contract',
            status: 'DRAFT',
            startDate: new Date(),
            createdBy: testUser.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete contract items when contract is deleted', async () => {
      const contract = await prisma.contract.create({
        data: {
          tenantId: testTenant.id,
          name: 'Cascade Test Contract',
          status: 'DRAFT',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: contract.id,
          sku: 'CASCADE-TEST-SKU',
          name: 'Cascade Test Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      // Delete contract
      await prisma.contract.delete({ where: { id: contract.id } });

      // Item should be cascade deleted
      const deletedItem = await prisma.item.findUnique({
        where: { id: item.id },
      });
      expect(deletedItem).toBeNull();
    });
  });

  describe('Item Constraints', () => {
    it('should create a valid item', async () => {
      const item = await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: testContract.id,
          sku: 'TEST-SKU-001',
          name: 'Test Item',
          basePrice: 123.456789012345, // 12 decimal places
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      expect(item).toBeTruthy();
      expect(item.basePrice.toString()).toContain('123.456789012345');
    });

    it('should enforce unique constraint on (tenantId, contractId, sku)', async () => {
      await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: testContract.id,
          sku: 'UNIQUE-SKU',
          name: 'First Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      // Duplicate SKU in same tenant+contract should fail
      await expect(
        prisma.item.create({
          data: {
            tenantId: testTenant.id,
            contractId: testContract.id,
            sku: 'UNIQUE-SKU',
            name: 'Duplicate Item',
            basePrice: 200.0,
            baseCurrency: 'USD',
            uom: 'MT',
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should allow same SKU in different tenants', async () => {
      const otherTenant = await prisma.team.create({
        data: {
          name: 'Other Tenant',
          slug: `other-tenant-${Date.now()}`,
        },
      });

      const otherContract = await prisma.contract.create({
        data: {
          tenantId: otherTenant.id,
          name: 'Other Contract',
          status: 'DRAFT',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: otherTenant.id,
          contractId: otherContract.id,
          sku: 'UNIQUE-SKU', // Same SKU as above but different tenant
          name: 'Other Tenant Item',
          basePrice: 150.0,
          baseCurrency: 'EUR',
          uom: 'kg',
        },
      });

      expect(item).toBeTruthy();

      // Cleanup
      await prisma.item.deleteMany({ where: { tenantId: otherTenant.id } });
      await prisma.contract.deleteMany({ where: { tenantId: otherTenant.id } });
      await prisma.team.delete({ where: { id: otherTenant.id } });
    });

    it('should set pamId to null when PAM is deleted (SET NULL)', async () => {
      const pam = await prisma.pAM.create({
        data: {
          tenantId: testTenant.id,
          name: 'Test PAM',
          version: 1,
          graph: { nodes: [], edges: [] },
          createdBy: testUser.id,
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: testContract.id,
          sku: 'SET-NULL-TEST',
          name: 'Set Null Test Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
          pamId: pam.id,
        },
      });

      // Delete PAM
      await prisma.pAM.delete({ where: { id: pam.id } });

      // Item should still exist but pamId should be null
      const updatedItem = await prisma.item.findUnique({
        where: { id: item.id },
      });
      expect(updatedItem).toBeTruthy();
      expect(updatedItem?.pamId).toBeNull();

      // Cleanup
      await prisma.item.delete({ where: { id: item.id } });
    });
  });

  describe('PAM Constraints', () => {
    it('should create a valid PAM with graph JSON', async () => {
      testPAM = await prisma.pAM.create({
        data: {
          tenantId: testTenant.id,
          name: 'Test PAM',
          description: 'Test Price Adjustment Mechanism',
          version: 1,
          graph: {
            nodes: [
              { id: 'base', type: 'Factor', config: { value: 100 } },
              { id: 'premium', type: 'Factor', config: { value: 10 } },
            ],
            edges: [{ from: 'base', to: 'premium' }],
            output: 'premium',
          },
          createdBy: testUser.id,
        },
      });

      expect(testPAM).toBeTruthy();
      expect(testPAM.graph).toHaveProperty('nodes');
      expect(testPAM.graph).toHaveProperty('edges');
    });
  });

  describe('IndexSeries Constraints', () => {
    it('should create a valid index series', async () => {
      testIndexSeries = await prisma.indexSeries.create({
        data: {
          tenantId: testTenant.id,
          seriesCode: 'TEST_BRENT',
          name: 'Test Brent Crude',
          provider: 'PLATTS',
          dataType: 'INDEX',
          unit: 'USD/bbl',
          frequency: 'DAILY',
        },
      });

      expect(testIndexSeries).toBeTruthy();
      expect(testIndexSeries.seriesCode).toBe('TEST_BRENT');
    });

    it('should enforce unique constraint on (tenantId, seriesCode)', async () => {
      await expect(
        prisma.indexSeries.create({
          data: {
            tenantId: testTenant.id,
            seriesCode: 'TEST_BRENT', // Duplicate
            name: 'Duplicate Brent',
            provider: 'PLATTS',
            dataType: 'INDEX',
            frequency: 'DAILY',
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('IndexValue Constraints', () => {
    it('should create index values with different version tags', async () => {
      const asOfDate = new Date('2025-01-01');

      const prelim = await prisma.indexValue.create({
        data: {
          tenantId: testTenant.id,
          seriesId: testIndexSeries.id,
          asOfDate,
          value: 75.123456789012,
          versionTag: 'PRELIMINARY',
        },
      });

      const final = await prisma.indexValue.create({
        data: {
          tenantId: testTenant.id,
          seriesId: testIndexSeries.id,
          asOfDate,
          value: 75.5,
          versionTag: 'FINAL',
        },
      });

      expect(prelim.versionTag).toBe('PRELIMINARY');
      expect(final.versionTag).toBe('FINAL');
      expect(prelim.value).not.toEqual(final.value);
    });

    it('should enforce unique constraint on (seriesId, asOfDate, versionTag)', async () => {
      const asOfDate = new Date('2025-01-02');

      await prisma.indexValue.create({
        data: {
          tenantId: testTenant.id,
          seriesId: testIndexSeries.id,
          asOfDate,
          value: 80.0,
          versionTag: 'PRELIMINARY',
        },
      });

      // Duplicate (series, date, version) should fail
      await expect(
        prisma.indexValue.create({
          data: {
            tenantId: testTenant.id,
            seriesId: testIndexSeries.id,
            asOfDate,
            value: 81.0,
            versionTag: 'PRELIMINARY', // Same version
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should handle 12 decimal precision correctly', async () => {
      const asOfDate = new Date('2025-01-03');
      const preciseValue = 123.456789012345;

      const value = await prisma.indexValue.create({
        data: {
          tenantId: testTenant.id,
          seriesId: testIndexSeries.id,
          asOfDate,
          value: preciseValue,
          versionTag: 'FINAL',
        },
      });

      // PostgreSQL DECIMAL(20,12) should preserve 12 decimal places
      expect(value.value.toString()).toContain('123.456789012345');
    });
  });

  describe('CalcBatch Constraints', () => {
    it('should create a valid calc batch', async () => {
      const batch = await prisma.calcBatch.create({
        data: {
          tenantId: testTenant.id,
          pamId: testPAM.id,
          contractId: testContract.id,
          inputsHash: 'abc123def456',
          status: 'QUEUED',
        },
      });

      expect(batch).toBeTruthy();
      expect(batch.status).toBe('QUEUED');
    });

    it('should allow multiple batches with same inputs (idempotency check is application-level)', async () => {
      const inputsHash = 'idempotency-test-hash';

      const batch1 = await prisma.calcBatch.create({
        data: {
          tenantId: testTenant.id,
          pamId: testPAM.id,
          inputsHash,
          status: 'COMPLETED',
        },
      });

      // Same inputsHash is allowed (idempotency handled in app logic, not DB)
      const batch2 = await prisma.calcBatch.create({
        data: {
          tenantId: testTenant.id,
          pamId: testPAM.id,
          inputsHash,
          status: 'QUEUED',
        },
      });

      expect(batch1.inputsHash).toBe(batch2.inputsHash);

      // Cleanup
      await prisma.calcBatch.deleteMany({
        where: { id: { in: [batch1.id, batch2.id] } },
      });
    });
  });

  describe('CalcResult Constraints', () => {
    it('should create calc results with contributions JSON', async () => {
      const batch = await prisma.calcBatch.create({
        data: {
          tenantId: testTenant.id,
          pamId: testPAM.id,
          inputsHash: 'result-test-hash',
          status: 'COMPLETED',
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: testContract.id,
          sku: 'RESULT-TEST-SKU',
          name: 'Result Test Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      const result = await prisma.calcResult.create({
        data: {
          tenantId: testTenant.id,
          batchId: batch.id,
          itemId: item.id,
          adjustedPrice: 125.5,
          adjustedCurrency: 'USD',
          contributions: {
            base: 100.0,
            indexAdjustment: 20.0,
            premium: 5.5,
          },
          effectiveDate: new Date('2025-01-15'),
        },
      });

      expect(result).toBeTruthy();
      expect(result.contributions).toHaveProperty('base');
      expect(result.contributions).toHaveProperty('indexAdjustment');

      // Cleanup
      await prisma.calcResult.delete({ where: { id: result.id } });
      await prisma.item.delete({ where: { id: item.id } });
      await prisma.calcBatch.delete({ where: { id: batch.id } });
    });

    it('should enforce unique constraint on (batchId, itemId, effectiveDate)', async () => {
      const batch = await prisma.calcBatch.create({
        data: {
          tenantId: testTenant.id,
          pamId: testPAM.id,
          inputsHash: 'unique-result-test',
          status: 'COMPLETED',
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: testTenant.id,
          contractId: testContract.id,
          sku: 'UNIQUE-RESULT-SKU',
          name: 'Unique Result Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      const effectiveDate = new Date('2025-01-20');

      await prisma.calcResult.create({
        data: {
          tenantId: testTenant.id,
          batchId: batch.id,
          itemId: item.id,
          adjustedPrice: 120.0,
          adjustedCurrency: 'USD',
          contributions: {},
          effectiveDate,
        },
      });

      // Duplicate (batch, item, date) should fail
      await expect(
        prisma.calcResult.create({
          data: {
            tenantId: testTenant.id,
            batchId: batch.id,
            itemId: item.id,
            adjustedPrice: 130.0,
            adjustedCurrency: 'USD',
            contributions: {},
            effectiveDate,
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // Cleanup
      await prisma.calcResult.deleteMany({ where: { batchId: batch.id } });
      await prisma.item.delete({ where: { id: item.id } });
      await prisma.calcBatch.delete({ where: { id: batch.id } });
    });
  });

  describe('ApprovalEvent Constraints', () => {
    it('should create approval events for different entity types', async () => {
      const contractApproval = await prisma.approvalEvent.create({
        data: {
          tenantId: testTenant.id,
          entityType: 'CONTRACT',
          entityId: testContract.id,
          status: 'PENDING',
        },
      });

      const pamApproval = await prisma.approvalEvent.create({
        data: {
          tenantId: testTenant.id,
          entityType: 'PAM',
          entityId: testPAM.id,
          status: 'APPROVED',
          approvedBy: testUser.id,
          approvedAt: new Date(),
        },
      });

      expect(contractApproval.entityType).toBe('CONTRACT');
      expect(pamApproval.status).toBe('APPROVED');
      expect(pamApproval.approvedBy).toBe(testUser.id);

      // Cleanup
      await prisma.approvalEvent.deleteMany({
        where: { id: { in: [contractApproval.id, pamApproval.id] } },
      });
    });
  });

  describe('AuditLog Constraints', () => {
    it('should create audit logs with changes JSON', async () => {
      const log = await prisma.auditLog.create({
        data: {
          tenantId: testTenant.id,
          userId: testUser.id,
          action: 'UPDATE',
          entityType: 'CONTRACT',
          entityId: testContract.id,
          changes: {
            before: { status: 'DRAFT' },
            after: { status: 'ACTIVE' },
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(log).toBeTruthy();
      expect(log.changes).toHaveProperty('before');
      expect(log.changes).toHaveProperty('after');

      // Cleanup
      await prisma.auditLog.delete({ where: { id: log.id } });
    });
  });

  describe('Cascade Delete Tests', () => {
    it('should cascade delete all CPAM data when tenant is deleted', async () => {
      // Create a disposable tenant with full data
      const disposableTenant = await prisma.team.create({
        data: {
          name: 'Disposable Tenant',
          slug: `disposable-${Date.now()}`,
        },
      });

      const contract = await prisma.contract.create({
        data: {
          tenantId: disposableTenant.id,
          name: 'Cascade Test Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      const item = await prisma.item.create({
        data: {
          tenantId: disposableTenant.id,
          contractId: contract.id,
          sku: 'CASCADE-SKU',
          name: 'Cascade Item',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      const indexSeries = await prisma.indexSeries.create({
        data: {
          tenantId: disposableTenant.id,
          seriesCode: 'CASCADE_TEST',
          name: 'Cascade Test Series',
          provider: 'TEST',
          dataType: 'INDEX',
          frequency: 'DAILY',
        },
      });

      // Delete tenant - should cascade to all related entities
      await prisma.team.delete({ where: { id: disposableTenant.id } });

      // Verify all data is gone
      const deletedContract = await prisma.contract.findUnique({
        where: { id: contract.id },
      });
      const deletedItem = await prisma.item.findUnique({
        where: { id: item.id },
      });
      const deletedSeries = await prisma.indexSeries.findUnique({
        where: { id: indexSeries.id },
      });

      expect(deletedContract).toBeNull();
      expect(deletedItem).toBeNull();
      expect(deletedSeries).toBeNull();
    });
  });
});
