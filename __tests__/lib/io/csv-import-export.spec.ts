/**
 * CSV Import/Export Tests
 *
 * Tests for CSV import with validation and export functionality
 */

import { PrismaClient } from '@prisma/client';
import {
  importContracts,
  importItems,
  importPAMs,
  validateCSV,
} from '@/lib/io/csv-import';
import {
  exportApprovedPrices,
  exportContracts,
  exportItems,
  exportPAMs,
} from '@/lib/io/csv-export';
import { approveBatch } from '@/lib/approvals/batch-approvals';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

describe('CSV Import/Export', () => {
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    // Create test tenant
    const tenant = await prisma.team.create({
      data: {
        name: 'Test Tenant - CSV',
        slug: `test-csv-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `csv-test-${Date.now()}@example.com`,
        teamId: tenantId,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.calcResult.deleteMany({ where: { tenantId } });
    await prisma.calcBatch.deleteMany({ where: { tenantId } });
    await prisma.item.deleteMany({ where: { tenantId } });
    await prisma.contract.deleteMany({ where: { tenantId } });
    await prisma.pAM.deleteMany({ where: { tenantId } });
    await prisma.approvalEvent.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { teamId: tenantId } });
    await prisma.team.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  describe('Contract Import', () => {
    const validCSV = `name,status,startDate,endDate,counterparty,description
"Test Contract 1",ACTIVE,2024-01-01,2024-12-31,"Acme Corp","Test contract"
"Test Contract 2",DRAFT,2024-01-01,,"Beta Inc","Another test"`;

    it('should import valid contracts', async () => {
      const result = await importContracts(prisma, validCSV, {
        tenantId,
        userId,
      });

      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.createdIds).toHaveLength(2);
    });

    it('should validate contracts in dry-run mode', async () => {
      const result = await importContracts(prisma, validCSV, {
        tenantId,
        userId,
        dryRun: true,
      });

      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.createdIds).toHaveLength(0); // No IDs in dry-run
      expect(result.isDryRun).toBe(true);
    });

    it('Given a malformed row, then importer reports row number and reason without stopping whole file', async () => {
      const malformedCSV = `name,status,startDate,endDate,counterparty,description
"Valid Contract",ACTIVE,2024-01-01,2024-12-31,"Acme","Valid"
"",ACTIVE,2024-01-01,2024-12-31,"Beta","Missing name"
"Another Valid",DRAFT,2024-01-01,,"Gamma","Valid after error"`;

      const result = await importContracts(prisma, malformedCSV, {
        tenantId,
        userId,
        dryRun: true,
      });

      expect(result.totalRows).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);

      // Check error details
      const error = result.errors[0];
      expect(error.row).toBe(3); // Row 3 (1-indexed, including header)
      expect(error.message).toContain('name');
      expect(error.field).toBe('name');
    });

    it('should report invalid status', async () => {
      const invalidCSV = `name,status,startDate,endDate,counterparty,description
"Test",INVALID_STATUS,2024-01-01,,"Acme","Test"`;

      const result = await importContracts(prisma, invalidCSV, {
        tenantId,
        userId,
        dryRun: true,
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('Status');
    });

    it('should report invalid date format', async () => {
      const invalidCSV = `name,status,startDate,endDate,counterparty,description
"Test",ACTIVE,01-01-2024,,"Acme","Invalid date format"`;

      const result = await importContracts(prisma, invalidCSV, {
        tenantId,
        userId,
        dryRun: true,
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('YYYY-MM-DD');
    });
  });

  describe('Item Import', () => {
    beforeAll(async () => {
      // Create contract and PAM for items
      await prisma.contract.create({
        data: {
          tenantId,
          name: 'Import Test Contract',
          status: 'ACTIVE',
          startDate: new Date('2024-01-01'),
          createdBy: userId,
        },
      });

      await prisma.pAM.create({
        data: {
          tenantId,
          name: 'Import Test PAM',
          graph: { nodes: [], edges: [], output: '' },
          createdBy: userId,
        },
      });
    });

    const validCSV = `contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Import Test Contract","Import Test PAM","SKU-001","Test Item 1",100.50,USD,EA,"Test item"
"Import Test Contract","Import Test PAM","SKU-002","Test Item 2",200.75,EUR,KG,"Another item"`;

    it('should import valid items', async () => {
      const result = await importItems(prisma, validCSV, {
        tenantId,
        userId,
      });

      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.createdIds).toHaveLength(2);
    });

    it('should report missing contract', async () => {
      const invalidCSV = `contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Nonexistent Contract","Import Test PAM","SKU-003","Item",100,USD,EA,"Test"`;

      const result = await importItems(prisma, invalidCSV, {
        tenantId,
        userId,
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('Contract not found');
    });

    it('should report missing PAM', async () => {
      const invalidCSV = `contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Import Test Contract","Nonexistent PAM","SKU-004","Item",100,USD,EA,"Test"`;

      const result = await importItems(prisma, invalidCSV, {
        tenantId,
        userId,
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('PAM not found');
    });

    it('should report invalid price format', async () => {
      const invalidCSV = `contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Import Test Contract","Import Test PAM","SKU-005","Item",not-a-number,USD,EA,"Test"`;

      const result = await importItems(prisma, invalidCSV, {
        tenantId,
        userId,
        dryRun: true,
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('number');
    });
  });

  describe('PAM Import', () => {
    const validCSV = `name,description,status
"Test PAM 1","First test PAM",ACTIVE
"Test PAM 2","Second test PAM",DRAFT`;

    it('should import valid PAMs', async () => {
      const result = await importPAMs(prisma, validCSV, {
        tenantId,
        userId,
      });

      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.createdIds).toHaveLength(2);
    });

    it('should create PAMs with empty graphs', async () => {
      const pams = await prisma.pAM.findMany({
        where: {
          tenantId,
          name: { in: ['Test PAM 1', 'Test PAM 2'] },
        },
      });

      pams.forEach((pam) => {
        const graph = pam.graph as any;
        expect(graph.nodes).toEqual([]);
        expect(graph.edges).toEqual([]);
      });
    });
  });

  describe('Contract Export', () => {
    it('should export contracts to CSV', async () => {
      const csv = await exportContracts(prisma, { tenantId });

      expect(csv).toContain('name,status,startDate');
      expect(csv).toContain('Import Test Contract');
      expect(csv).toContain('ACTIVE');
    });
  });

  describe('Item Export', () => {
    it('should export items to CSV', async () => {
      const csv = await exportItems(prisma, { tenantId });

      expect(csv).toContain('contractName,pamName,sku');
      expect(csv).toContain('SKU-001');
      expect(csv).toContain('SKU-002');
      expect(csv).toContain('100.50');
    });
  });

  describe('PAM Export', () => {
    it('should export PAMs to CSV', async () => {
      const csv = await exportPAMs(prisma, { tenantId });

      expect(csv).toContain('name,description,status');
      expect(csv).toContain('Test PAM 1');
      expect(csv).toContain('Test PAM 2');
    });
  });

  describe('Approved Prices Export', () => {
    let batchId: string;
    let itemId: string;

    beforeAll(async () => {
      // Create item
      const contract = await prisma.contract.findFirst({
        where: { tenantId, name: 'Import Test Contract' },
      });

      const pam = await prisma.pAM.findFirst({
        where: { tenantId, name: 'Import Test PAM' },
      });

      const item = await prisma.item.create({
        data: {
          tenantId,
          contractId: contract!.id,
          pamId: pam!.id,
          sku: 'EXPORT-SKU',
          name: 'Export Test Item',
          basePrice: new Decimal(100),
          baseCurrency: 'USD',
          uom: 'EA',
        },
      });
      itemId = item.id;

      // Create batch and result
      const batch = await prisma.calcBatch.create({
        data: {
          tenantId,
          pamId: pam!.id,
          inputsHash: 'export-test',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      batchId = batch.id;

      await prisma.calcResult.create({
        data: {
          tenantId,
          batchId,
          itemId,
          adjustedPrice: new Decimal(115),
          adjustedCurrency: 'USD',
          contributions: {},
          effectiveDate: new Date(),
        },
      });

      // Request and approve
      await prisma.approvalEvent.create({
        data: {
          tenantId,
          entityType: 'CALC_BATCH',
          entityId: batchId,
          status: 'PENDING',
        },
      });

      await approveBatch(prisma, {
        tenantId,
        batchId,
        userId,
      });
    });

    it('Given approved batch, then export includes required columns & values', async () => {
      const csv = await exportApprovedPrices(prisma, batchId, { tenantId });

      expect(csv).toContain('sku,itemName,contractName');
      expect(csv).toContain('EXPORT-SKU');
      expect(csv).toContain('Export Test Item');
      expect(csv).toContain('Import Test Contract');
      expect(csv).toContain('100.00'); // Base price
      expect(csv).toContain('115.00'); // Adjusted price
      expect(csv).toContain('USD');
      expect(csv).toContain('Import Test PAM');
    });

    it('should fail if batch is not approved', async () => {
      const unapprovedBatch = await prisma.calcBatch.create({
        data: {
          tenantId,
          pamId: (await prisma.pAM.findFirst({ where: { tenantId } }))!.id,
          inputsHash: 'unapproved',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await expect(
        exportApprovedPrices(prisma, unapprovedBatch.id, { tenantId })
      ).rejects.toThrow('is not approved');

      await prisma.calcBatch.delete({ where: { id: unapprovedBatch.id } });
    });
  });

  describe('Validation Helper', () => {
    it('should validate CSV without importing', async () => {
      const csv = `name,status,startDate,endDate,counterparty,description
"Validation Test",ACTIVE,2024-01-01,,"Test","Test"`;

      const result = await validateCSV(prisma, csv, 'contracts', {
        tenantId,
        userId,
      });

      expect(result.isDryRun).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.createdIds).toHaveLength(0);
    });
  });

  describe('Acceptance Tests', () => {
    it('Given a malformed row, then importer reports row number and reason without stopping whole file', async () => {
      const csv = `name,status,startDate,endDate,counterparty,description
"Valid 1",ACTIVE,2024-01-01,,"A","Valid"
"",ACTIVE,2024-01-01,,"B","Invalid - missing name"
"Valid 2",DRAFT,2024-01-01,,"C","Valid"
"Valid 3",INVALID,2024-01-01,,"D","Invalid - bad status"`;

      const result = await importContracts(prisma, csv, {
        tenantId,
        userId,
        dryRun: true,
      });

      // Should process all 4 rows
      expect(result.totalRows).toBe(4);
      // 2 should succeed
      expect(result.successCount).toBe(2);
      // 2 should fail
      expect(result.errorCount).toBe(2);
      // Should have 2 error records
      expect(result.errors).toHaveLength(2);

      // Check first error (row 3 - missing name)
      expect(result.errors[0].row).toBe(3);
      expect(result.errors[0].message).toContain('name');

      // Check second error (row 5 - invalid status)
      expect(result.errors[1].row).toBe(5);
      expect(result.errors[1].message).toContain('Status');
    });

    it('Given approved batch, then export includes required columns & values', async () => {
      // Already tested above - verifies acceptance criteria
      const batch = await prisma.calcBatch.findFirst({
        where: { tenantId, status: 'COMPLETED' },
        include: { results: true },
      });

      if (batch && batch.results.length > 0) {
        const csv = await exportApprovedPrices(prisma, batch.id, { tenantId });

        // Required columns
        expect(csv).toContain('sku');
        expect(csv).toContain('basePrice');
        expect(csv).toContain('adjustedPrice');
        expect(csv).toContain('approvedBy');
        expect(csv).toContain('approvedAt');

        // Values present
        expect(csv).toMatch(/\d+\.\d{2}/); // Decimal prices
      }
    });
  });
});
