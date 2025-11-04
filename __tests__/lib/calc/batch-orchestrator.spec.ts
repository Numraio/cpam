/**
 * Tests for Calculation Batch Orchestrator
 *
 * Validates:
 * - Batch creation and queuing
 * - Idempotent execution via inputs hash
 * - Batch lifecycle (QUEUED → RUNNING → COMPLETED/FAILED)
 * - Per-item calculation
 * - Error handling and retry logic
 * - Pagination for large item sets
 *
 * NOTE: These are integration tests that require DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import {
  createCalculationBatch,
  executeCalculationBatch,
  retryFailedBatch,
  getBatchStatus,
  getBatchResults,
  cancelBatch,
} from '@/lib/calc/batch-orchestrator';
import type { PAMGraph } from '@/lib/pam/graph-types';

const prisma = new PrismaClient();

// Test data
const TEST_TENANT_ID = 'test-tenant-calc';
let testTeamId: string;
let testPamId: string;
let testContractId: string;
let testItemIds: string[] = [];

// ============================================================================
// Setup and Teardown
// ============================================================================

beforeAll(async () => {
  // Create test team
  const team = await prisma.team.create({
    data: {
      id: TEST_TENANT_ID,
      name: 'Test Tenant Calc',
      slug: 'test-tenant-calc',
    },
  });
  testTeamId = team.id;

  // Create test contract
  const contract = await prisma.contract.create({
    data: {
      tenantId: testTeamId,
      name: 'Test Contract',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      createdBy: 'test-user',
    },
  });
  testContractId = contract.id;

  // Create test PAM with simple graph
  const pamGraph: PAMGraph = {
    nodes: [
      { id: 'base', type: 'Factor', config: { value: 100 } },
      { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
      { id: 'result', type: 'Combine', config: { operation: 'multiply' } },
    ],
    edges: [
      { from: 'base', to: 'result' },
      { from: 'multiplier', to: 'result' },
    ],
    output: 'result',
  };

  const pam = await prisma.pAM.create({
    data: {
      tenantId: testTeamId,
      name: 'Test PAM',
      description: 'Simple multiplier PAM',
      version: 1,
      graph: pamGraph,
      createdBy: 'test-user',
    },
  });
  testPamId = pam.id;

  // Create test items
  for (let i = 0; i < 5; i++) {
    const item = await prisma.item.create({
      data: {
        tenantId: testTeamId,
        contractId: testContractId,
        sku: `TEST-SKU-${i}`,
        basePrice: 100 + i * 10,
        baseCurrency: 'USD',
        uom: 'MT',
        pamId: testPamId,
      },
    });
    testItemIds.push(item.id);
  }
});

afterAll(async () => {
  // Clean up test data
  await prisma.calcResult.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.calcBatch.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.item.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.pAM.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.contract.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.team.delete({ where: { id: testTeamId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clear calc results before each test
  await prisma.calcResult.deleteMany({ where: { tenantId: testTeamId } });
  await prisma.calcBatch.deleteMany({ where: { tenantId: testTeamId } });
});

// ============================================================================
// Batch Creation Tests
// ============================================================================

describe('createCalculationBatch', () => {
  it('should create a new calculation batch', async () => {
    const result = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    expect(result.batchId).toBeDefined();
    expect(result.status).toBe('QUEUED');
    expect(result.itemsProcessed).toBe(0);
    expect(result.isDuplicate).toBe(false);
    expect(result.inputsHash).toHaveLength(64); // SHA-256
  });

  it('should detect duplicate batch with same inputs', async () => {
    // Create first batch
    const result1 = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    // Execute first batch
    await executeCalculationBatch(prisma, result1.batchId);

    // Create second batch with identical inputs
    const result2 = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    expect(result2.isDuplicate).toBe(true);
    expect(result2.batchId).toBe(result1.batchId);
    expect(result2.status).toBe('COMPLETED');
  });

  it('should create new batch with different inputs', async () => {
    // Create first batch
    const result1 = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    // Create second batch with different date
    const result2 = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-16'), // Different date
      versionPreference: 'FINAL',
    });

    expect(result2.isDuplicate).toBe(false);
    expect(result2.batchId).not.toBe(result1.batchId);
    expect(result2.inputsHash).not.toBe(result1.inputsHash);
  });

  it('should throw error for non-existent PAM', async () => {
    await expect(
      createCalculationBatch(prisma, {
        tenantId: testTeamId,
        pamId: 'non-existent-pam',
        asOfDate: new Date('2024-01-15'),
        versionPreference: 'FINAL',
      })
    ).rejects.toThrow('PAM not found');
  });

  it('should throw error for PAM from different tenant', async () => {
    // Create another tenant's PAM
    const otherTeam = await prisma.team.create({
      data: { name: 'Other Team', slug: 'other-team' },
    });

    const otherPam = await prisma.pAM.create({
      data: {
        tenantId: otherTeam.id,
        name: 'Other PAM',
        version: 1,
        graph: { nodes: [], edges: [], output: 'test' },
        createdBy: 'test-user',
      },
    });

    await expect(
      createCalculationBatch(prisma, {
        tenantId: testTeamId,
        pamId: otherPam.id,
        asOfDate: new Date('2024-01-15'),
        versionPreference: 'FINAL',
      })
    ).rejects.toThrow('does not belong to tenant');

    // Cleanup
    await prisma.pAM.delete({ where: { id: otherPam.id } });
    await prisma.team.delete({ where: { id: otherTeam.id } });
  });
});

// ============================================================================
// Batch Execution Tests
// ============================================================================

describe('executeCalculationBatch', () => {
  it('should execute batch and calculate all items', async () => {
    // Create batch
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    // Execute batch
    const execResult = await executeCalculationBatch(prisma, createResult.batchId);

    expect(execResult.status).toBe('COMPLETED');
    expect(execResult.itemsProcessed).toBe(5);
    expect(execResult.itemsSucceeded).toBe(5);
    expect(execResult.itemsFailed).toBe(0);
    expect(execResult.startedAt).toBeDefined();
    expect(execResult.completedAt).toBeDefined();

    // Verify results were stored
    const results = await prisma.calcResult.findMany({
      where: { batchId: createResult.batchId },
    });

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result.adjustedPrice.toNumber()).toBe(115); // 100 * 1.15
      expect(result.adjustedCurrency).toBe('USD');
    });
  });

  it('should handle pagination for large item sets', async () => {
    // Create batch
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    // Execute with small page size
    const execResult = await executeCalculationBatch(prisma, createResult.batchId, {
      pageSize: 2, // Process 2 items at a time
    });

    expect(execResult.status).toBe('COMPLETED');
    expect(execResult.itemsProcessed).toBe(5);
    expect(execResult.itemsSucceeded).toBe(5);
  });

  it('should continue on error when continueOnError is true', async () => {
    // Create PAM with invalid graph (will cause errors)
    const invalidGraph: PAMGraph = {
      nodes: [
        {
          id: 'series',
          type: 'Factor',
          config: { series: 'NON_EXISTENT_SERIES' }, // Will fail
        },
      ],
      edges: [],
      output: 'series',
    };

    const invalidPam = await prisma.pAM.create({
      data: {
        tenantId: testTeamId,
        name: 'Invalid PAM',
        version: 1,
        graph: invalidGraph,
        createdBy: 'test-user',
      },
    });

    // Link items to invalid PAM
    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: invalidPam.id },
    });

    // Create and execute batch
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: invalidPam.id,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    const execResult = await executeCalculationBatch(prisma, createResult.batchId, {
      continueOnError: true,
    });

    expect(execResult.status).toBe('COMPLETED');
    expect(execResult.itemsFailed).toBe(5);
    expect(execResult.itemsSucceeded).toBe(0);

    // Cleanup
    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: testPamId },
    });
    await prisma.pAM.delete({ where: { id: invalidPam.id } });
  });

  it('should stop on first error when continueOnError is false', async () => {
    // Create PAM with invalid graph
    const invalidGraph: PAMGraph = {
      nodes: [
        {
          id: 'series',
          type: 'Factor',
          config: { series: 'NON_EXISTENT_SERIES' },
        },
      ],
      edges: [],
      output: 'series',
    };

    const invalidPam = await prisma.pAM.create({
      data: {
        tenantId: testTeamId,
        name: 'Invalid PAM',
        version: 1,
        graph: invalidGraph,
        createdBy: 'test-user',
      },
    });

    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: invalidPam.id },
    });

    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: invalidPam.id,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    const execResult = await executeCalculationBatch(prisma, createResult.batchId, {
      continueOnError: false,
    });

    expect(execResult.status).toBe('FAILED');
    expect(execResult.error).toBeDefined();

    // Cleanup
    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: testPamId },
    });
    await prisma.pAM.delete({ where: { id: invalidPam.id } });
  });

  it('should not re-execute completed batch', async () => {
    // Create and execute batch
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await executeCalculationBatch(prisma, createResult.batchId);

    // Try to execute again
    const execResult2 = await executeCalculationBatch(prisma, createResult.batchId);

    expect(execResult2.status).toBe('COMPLETED');
    expect(execResult2.itemsProcessed).toBe(5);
  });
});

// ============================================================================
// Retry Tests
// ============================================================================

describe('retryFailedBatch', () => {
  it('should retry failed batch', async () => {
    // Create batch with invalid graph
    const invalidGraph: PAMGraph = {
      nodes: [
        {
          id: 'series',
          type: 'Factor',
          config: { series: 'NON_EXISTENT_SERIES' },
        },
      ],
      edges: [],
      output: 'series',
    };

    const invalidPam = await prisma.pAM.create({
      data: {
        tenantId: testTeamId,
        name: 'Invalid PAM',
        version: 1,
        graph: invalidGraph,
        createdBy: 'test-user',
      },
    });

    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: invalidPam.id },
    });

    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: invalidPam.id,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    // Execute and fail
    await executeCalculationBatch(prisma, createResult.batchId, {
      continueOnError: false,
    });

    // Verify it's failed
    const status1 = await getBatchStatus(prisma, createResult.batchId);
    expect(status1.status).toBe('FAILED');

    // Retry
    const retryResult = await retryFailedBatch(prisma, createResult.batchId);
    expect(retryResult.status).toBe('FAILED'); // Still fails

    // Cleanup
    await prisma.item.updateMany({
      where: { id: { in: testItemIds } },
      data: { pamId: testPamId },
    });
    await prisma.pAM.delete({ where: { id: invalidPam.id } });
  });

  it('should throw error when retrying non-failed batch', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await expect(retryFailedBatch(prisma, createResult.batchId)).rejects.toThrow(
      'not in FAILED state'
    );
  });
});

// ============================================================================
// Status and Results Tests
// ============================================================================

describe('getBatchStatus', () => {
  it('should return batch status', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    const status = await getBatchStatus(prisma, createResult.batchId);

    expect(status.batchId).toBe(createResult.batchId);
    expect(status.status).toBe('QUEUED');
    expect(status.itemsProcessed).toBe(0);
  });

  it('should update status after execution', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await executeCalculationBatch(prisma, createResult.batchId);

    const status = await getBatchStatus(prisma, createResult.batchId);

    expect(status.status).toBe('COMPLETED');
    expect(status.itemsProcessed).toBe(5);
    expect(status.itemsSucceeded).toBe(5);
  });
});

describe('getBatchResults', () => {
  it('should return paginated results', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await executeCalculationBatch(prisma, createResult.batchId);

    const page1 = await getBatchResults(prisma, createResult.batchId, {
      page: 1,
      pageSize: 2,
    });

    expect(page1.results).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.page).toBe(1);

    const page2 = await getBatchResults(prisma, createResult.batchId, {
      page: 2,
      pageSize: 2,
    });

    expect(page2.results).toHaveLength(2);
    expect(page2.page).toBe(2);
  });
});

// ============================================================================
// Cancel Tests
// ============================================================================

describe('cancelBatch', () => {
  it('should cancel queued batch', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await cancelBatch(prisma, createResult.batchId);

    const status = await getBatchStatus(prisma, createResult.batchId);
    expect(status.status).toBe('FAILED');
    expect(status.error).toBe('Cancelled by user');
  });

  it('should throw error when cancelling completed batch', async () => {
    const createResult = await createCalculationBatch(prisma, {
      tenantId: testTeamId,
      pamId: testPamId,
      asOfDate: new Date('2024-01-15'),
      versionPreference: 'FINAL',
    });

    await executeCalculationBatch(prisma, createResult.batchId);

    await expect(cancelBatch(prisma, createResult.batchId)).rejects.toThrow(
      'Cannot cancel batch in COMPLETED state'
    );
  });
});
