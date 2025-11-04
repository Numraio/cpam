/**
 * Tenant Isolation Tests
 * Tests Prisma middleware for automatic tenant scoping and cross-tenant access prevention
 *
 * NOTE: These tests require a test database. Set TEST_DATABASE_URL in your .env.test file.
 */

import { PrismaClient } from '@prisma/client';
import {
  getTenantPrisma,
  getSystemPrisma,
  bypassTenantScope,
  getTenantIdFromSlug,
} from '@/lib/prisma-tenant';

const systemPrisma = getSystemPrisma();

describe('Tenant Isolation via Prisma Middleware', () => {
  let tenantA: any;
  let tenantB: any;
  let tenantAPrisma: PrismaClient;
  let tenantBPrisma: PrismaClient;
  let testUser: any;

  beforeAll(async () => {
    // Create test tenants
    tenantA = await systemPrisma.team.create({
      data: {
        name: 'Tenant A',
        slug: `tenant-a-${Date.now()}`,
      },
    });

    tenantB = await systemPrisma.team.create({
      data: {
        name: 'Tenant B',
        slug: `tenant-b-${Date.now()}`,
      },
    });

    // Create test user
    testUser = await systemPrisma.user.create({
      data: {
        name: 'Test User',
        email: `tenant-test-${Date.now()}@example.com`,
        emailVerified: new Date(),
      },
    });

    // Get tenant-scoped clients
    tenantAPrisma = getTenantPrisma(tenantA.id);
    tenantBPrisma = getTenantPrisma(tenantB.id);
  });

  afterAll(async () => {
    // Cleanup all data
    await systemPrisma.contract.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await systemPrisma.pAM.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await systemPrisma.indexSeries.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await systemPrisma.team.deleteMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });
    await systemPrisma.user.delete({ where: { id: testUser.id } });

    await tenantAPrisma.$disconnect();
    await tenantBPrisma.$disconnect();
    await systemPrisma.$disconnect();
  });

  describe('Contract Tenant Isolation', () => {
    let contractA: any;
    let contractB: any;

    beforeAll(async () => {
      // Create contracts in each tenant using system Prisma
      contractA = await systemPrisma.contract.create({
        data: {
          tenantId: tenantA.id,
          name: 'Tenant A Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      contractB = await systemPrisma.contract.create({
        data: {
          tenantId: tenantB.id,
          name: 'Tenant B Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });
    });

    it('should only return contracts for Tenant A when using Tenant A Prisma', async () => {
      const contracts = await tenantAPrisma.contract.findMany();

      expect(contracts).toHaveLength(1);
      expect(contracts[0].id).toBe(contractA.id);
      expect(contracts[0].name).toBe('Tenant A Contract');
    });

    it('should only return contracts for Tenant B when using Tenant B Prisma', async () => {
      const contracts = await tenantBPrisma.contract.findMany();

      expect(contracts).toHaveLength(1);
      expect(contracts[0].id).toBe(contractB.id);
      expect(contracts[0].name).toBe('Tenant B Contract');
    });

    it('should not find Tenant B contract when querying as Tenant A', async () => {
      const contract = await tenantAPrisma.contract.findUnique({
        where: { id: contractB.id },
      });

      expect(contract).toBeNull();
    });

    it('should not find Tenant A contract when querying as Tenant B', async () => {
      const contract = await tenantBPrisma.contract.findUnique({
        where: { id: contractA.id },
      });

      expect(contract).toBeNull();
    });

    it('should automatically inject tenantId when creating contract', async () => {
      const newContract = await tenantAPrisma.contract.create({
        data: {
          name: 'Auto-scoped Contract',
          status: 'DRAFT',
          startDate: new Date(),
          createdBy: testUser.id,
          // Note: tenantId is NOT provided - should be auto-injected
        },
      });

      expect(newContract.tenantId).toBe(tenantA.id);

      // Verify Tenant B cannot see it
      const contracts = await tenantBPrisma.contract.findMany({
        where: { id: newContract.id },
      });
      expect(contracts).toHaveLength(0);

      // Cleanup
      await systemPrisma.contract.delete({ where: { id: newContract.id } });
    });

    it('should prevent updating contracts from other tenants', async () => {
      // Try to update Tenant B's contract using Tenant A's Prisma
      const result = await tenantAPrisma.contract.updateMany({
        where: { id: contractB.id },
        data: { name: 'Hacked Name' },
      });

      // Should affect 0 records (filtered by tenantId)
      expect(result.count).toBe(0);

      // Verify Tenant B's contract is unchanged
      const contractCheck = await systemPrisma.contract.findUnique({
        where: { id: contractB.id },
      });
      expect(contractCheck?.name).toBe('Tenant B Contract');
    });

    it('should prevent deleting contracts from other tenants', async () => {
      // Try to delete Tenant B's contract using Tenant A's Prisma
      const result = await tenantAPrisma.contract.deleteMany({
        where: { id: contractB.id },
      });

      // Should affect 0 records
      expect(result.count).toBe(0);

      // Verify Tenant B's contract still exists
      const contractCheck = await systemPrisma.contract.findUnique({
        where: { id: contractB.id },
      });
      expect(contractCheck).toBeTruthy();
    });
  });

  describe('Item Tenant Isolation', () => {
    let contractA: any;
    let contractB: any;
    let itemA: any;
    let itemB: any;

    beforeAll(async () => {
      // Create contracts
      contractA = await systemPrisma.contract.create({
        data: {
          tenantId: tenantA.id,
          name: 'Contract A',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      contractB = await systemPrisma.contract.create({
        data: {
          tenantId: tenantB.id,
          name: 'Contract B',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      // Create items
      itemA = await systemPrisma.item.create({
        data: {
          tenantId: tenantA.id,
          contractId: contractA.id,
          sku: 'ITEM-A-SKU',
          name: 'Item A',
          basePrice: 100.0,
          baseCurrency: 'USD',
          uom: 'MT',
        },
      });

      itemB = await systemPrisma.item.create({
        data: {
          tenantId: tenantB.id,
          contractId: contractB.id,
          sku: 'ITEM-B-SKU',
          name: 'Item B',
          basePrice: 200.0,
          baseCurrency: 'EUR',
          uom: 'kg',
        },
      });
    });

    afterAll(async () => {
      await systemPrisma.item.deleteMany({
        where: { id: { in: [itemA.id, itemB.id] } },
      });
      await systemPrisma.contract.deleteMany({
        where: { id: { in: [contractA.id, contractB.id] } },
      });
    });

    it('should isolate items by tenant', async () => {
      const itemsA = await tenantAPrisma.item.findMany();
      const itemsB = await tenantBPrisma.item.findMany();

      expect(itemsA).toHaveLength(1);
      expect(itemsA[0].sku).toBe('ITEM-A-SKU');

      expect(itemsB).toHaveLength(1);
      expect(itemsB[0].sku).toBe('ITEM-B-SKU');
    });

    it('should not allow cross-tenant item access', async () => {
      const itemA_via_B = await tenantBPrisma.item.findUnique({
        where: { id: itemA.id },
      });
      const itemB_via_A = await tenantAPrisma.item.findUnique({
        where: { id: itemB.id },
      });

      expect(itemA_via_B).toBeNull();
      expect(itemB_via_A).toBeNull();
    });

    it('should enforce tenant scoping on complex queries', async () => {
      // Query with where clause - should still enforce tenant scope
      const items = await tenantAPrisma.item.findMany({
        where: {
          basePrice: { gte: 50 },
        },
      });

      // Should only return Tenant A's items
      expect(items).toHaveLength(1);
      expect(items.every((item) => item.tenantId === tenantA.id)).toBe(true);
    });

    it('should enforce tenant scoping on aggregations', async () => {
      const count = await tenantAPrisma.item.count();
      expect(count).toBe(1);

      const aggregate = await tenantAPrisma.item.aggregate({
        _avg: { basePrice: true },
        _count: true,
      });

      expect(aggregate._count).toBe(1);
      expect(Number(aggregate._avg.basePrice)).toBeCloseTo(100.0);
    });
  });

  describe('IndexSeries and IndexValue Isolation', () => {
    let seriesA: any;
    let seriesB: any;

    beforeAll(async () => {
      seriesA = await systemPrisma.indexSeries.create({
        data: {
          tenantId: tenantA.id,
          seriesCode: 'TENANT_A_BRENT',
          name: 'Tenant A Brent',
          provider: 'PLATTS',
          dataType: 'INDEX',
          frequency: 'DAILY',
        },
      });

      seriesB = await systemPrisma.indexSeries.create({
        data: {
          tenantId: tenantB.id,
          seriesCode: 'TENANT_B_BRENT',
          name: 'Tenant B Brent',
          provider: 'PLATTS',
          dataType: 'INDEX',
          frequency: 'DAILY',
        },
      });
    });

    afterAll(async () => {
      await systemPrisma.indexSeries.deleteMany({
        where: { id: { in: [seriesA.id, seriesB.id] } },
      });
    });

    it('should isolate index series by tenant', async () => {
      const seriesListA = await tenantAPrisma.indexSeries.findMany();
      const seriesListB = await tenantBPrisma.indexSeries.findMany();

      expect(seriesListA).toHaveLength(1);
      expect(seriesListA[0].seriesCode).toBe('TENANT_A_BRENT');

      expect(seriesListB).toHaveLength(1);
      expect(seriesListB[0].seriesCode).toBe('TENANT_B_BRENT');
    });

    it('should isolate index values by tenant', async () => {
      // Add index values
      await systemPrisma.indexValue.createMany({
        data: [
          {
            tenantId: tenantA.id,
            seriesId: seriesA.id,
            asOfDate: new Date('2025-01-01'),
            value: 75.5,
            versionTag: 'FINAL',
          },
          {
            tenantId: tenantB.id,
            seriesId: seriesB.id,
            asOfDate: new Date('2025-01-01'),
            value: 80.0,
            versionTag: 'FINAL',
          },
        ],
      });

      const valuesA = await tenantAPrisma.indexValue.findMany();
      const valuesB = await tenantBPrisma.indexValue.findMany();

      expect(valuesA).toHaveLength(1);
      expect(Number(valuesA[0].value)).toBeCloseTo(75.5);

      expect(valuesB).toHaveLength(1);
      expect(Number(valuesB[0].value)).toBeCloseTo(80.0);

      // Cleanup
      await systemPrisma.indexValue.deleteMany({
        where: { seriesId: { in: [seriesA.id, seriesB.id] } },
      });
    });
  });

  describe('Bypass Mechanism for System Operations', () => {
    it('should allow bypassing tenant scope for system operations', async () => {
      // Create test data in both tenants
      const contractA = await systemPrisma.contract.create({
        data: {
          tenantId: tenantA.id,
          name: 'Bypass Test A',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      const contractB = await systemPrisma.contract.create({
        data: {
          tenantId: tenantB.id,
          name: 'Bypass Test B',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      // Query with bypass should see both tenants
      const allContracts = await tenantAPrisma.contract.findMany({
        ...bypassTenantScope(),
      });

      // Should see contracts from multiple tenants
      expect(allContracts.length).toBeGreaterThanOrEqual(2);
      const contractIds = allContracts.map((c) => c.id);
      expect(contractIds).toContain(contractA.id);
      expect(contractIds).toContain(contractB.id);

      // Cleanup
      await systemPrisma.contract.deleteMany({
        where: { id: { in: [contractA.id, contractB.id] } },
      });
    });
  });

  describe('Tenant ID Extraction Helpers', () => {
    it('should extract tenantId from slug', async () => {
      const tenantId = await getTenantIdFromSlug(tenantA.slug);
      expect(tenantId).toBe(tenantA.id);
    });

    it('should return null for non-existent slug', async () => {
      const tenantId = await getTenantIdFromSlug('non-existent-slug');
      expect(tenantId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when creating tenant Prisma without tenantId', () => {
      expect(() => getTenantPrisma('')).toThrow('tenantId is required');
    });
  });

  describe('CreateMany Tenant Injection', () => {
    it('should inject tenantId into createMany operations', async () => {
      const contractA = await systemPrisma.contract.create({
        data: {
          tenantId: tenantA.id,
          name: 'CreateMany Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          createdBy: testUser.id,
        },
      });

      // Create multiple items without specifying tenantId
      await tenantAPrisma.item.createMany({
        data: [
          {
            contractId: contractA.id,
            sku: 'BATCH-SKU-1',
            name: 'Batch Item 1',
            basePrice: 100.0,
            baseCurrency: 'USD',
            uom: 'MT',
          },
          {
            contractId: contractA.id,
            sku: 'BATCH-SKU-2',
            name: 'Batch Item 2',
            basePrice: 200.0,
            baseCurrency: 'USD',
            uom: 'MT',
          },
        ],
      });

      // Verify items were created with correct tenantId
      const items = await systemPrisma.item.findMany({
        where: { contractId: contractA.id },
      });

      expect(items).toHaveLength(2);
      expect(items.every((item) => item.tenantId === tenantA.id)).toBe(true);

      // Verify Tenant B cannot see these items
      const itemsViaB = await tenantBPrisma.item.findMany({
        where: { contractId: contractA.id },
      });
      expect(itemsViaB).toHaveLength(0);

      // Cleanup
      await systemPrisma.item.deleteMany({
        where: { contractId: contractA.id },
      });
      await systemPrisma.contract.delete({ where: { id: contractA.id } });
    });
  });

  describe('Upsert Operations', () => {
    it('should enforce tenant scoping on upsert operations', async () => {
      const seriesCode = `UPSERT_TEST_${Date.now()}`;

      // Create initial series via Tenant A
      const series = await tenantAPrisma.indexSeries.upsert({
        where: {
          tenantId_seriesCode: {
            tenantId: tenantA.id,
            seriesCode,
          },
        },
        create: {
          seriesCode,
          name: 'Upsert Test',
          provider: 'TEST',
          dataType: 'INDEX',
          frequency: 'DAILY',
        },
        update: {
          name: 'Updated Name',
        },
      });

      expect(series.tenantId).toBe(tenantA.id);

      // Tenant B should not be able to see or update it
      const seriesViaB = await tenantBPrisma.indexSeries.findFirst({
        where: { seriesCode },
      });
      expect(seriesViaB).toBeNull();

      // Cleanup
      await systemPrisma.indexSeries.delete({ where: { id: series.id } });
    });
  });
});
