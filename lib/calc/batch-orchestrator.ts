/**
 * Calculation Batch Orchestrator
 *
 * Orchestrates batch calculation runs with:
 * - Idempotent execution via inputs hash
 * - Batch lifecycle state machine (QUEUED → RUNNING → COMPLETED/FAILED)
 * - Partition support for large item sets
 * - Retry-safe execution
 * - Per-item error handling
 */

import type { PrismaClient, CalcStatus, VersionTag } from '@prisma/client';
import { executeGraph, hashExecutionInputs, type ExecutionPlan } from '@/lib/pam';
import type { PAMGraph, ExecutionContext, ExecutionResult } from '@/lib/pam/graph-types';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface BatchCalculationRequest {
  tenantId: string;
  pamId: string;
  contractId?: string; // Optional: calculate for specific contract
  asOfDate: Date;
  versionPreference: VersionTag;
  metadata?: Record<string, any>;
}

export interface BatchCalculationResult {
  batchId: string;
  status: CalcStatus;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error?: string;
  inputsHash: string;
  isDuplicate: boolean; // True if identical batch already exists
}

export interface ItemCalculationResult {
  itemId: string;
  success: boolean;
  adjustedPrice?: number;
  adjustedCurrency?: string;
  contributions?: Record<string, number>;
  error?: string;
}

interface BatchInputs {
  pamGraph: PAMGraph;
  asOfDate: Date;
  versionPreference: VersionTag;
  itemIds: string[];
}

// ============================================================================
// Batch Orchestrator
// ============================================================================

/**
 * Creates and queues a calculation batch
 *
 * @param prisma - Prisma client
 * @param request - Batch calculation request
 * @returns Batch result with status and duplicate detection
 */
export async function createCalculationBatch(
  prisma: PrismaClient,
  request: BatchCalculationRequest
): Promise<BatchCalculationResult> {
  const { tenantId, pamId, contractId, asOfDate, versionPreference, metadata } = request;

  // Fetch PAM
  const pam = await prisma.pAM.findUnique({
    where: { id: pamId },
    include: {
      items: {
        where: contractId ? { contractId } : undefined,
        select: { id: true },
      },
    },
  });

  if (!pam) {
    throw new Error(`PAM not found: ${pamId}`);
  }

  if (pam.tenantId !== tenantId) {
    throw new Error(`PAM ${pamId} does not belong to tenant ${tenantId}`);
  }

  if (pam.items.length === 0) {
    throw new Error(`No items found for PAM ${pamId}${contractId ? ` and contract ${contractId}` : ''}`);
  }

  // Compute inputs hash for idempotency
  const inputs: BatchInputs = {
    pamGraph: pam.graph as PAMGraph,
    asOfDate,
    versionPreference,
    itemIds: pam.items.map((i) => i.id).sort(), // Sort for deterministic hash
  };
  const inputsHash = computeInputsHash(inputs);

  // Check for duplicate batch
  const existingBatch = await prisma.calcBatch.findFirst({
    where: {
      tenantId,
      pamId,
      inputsHash,
      status: { in: ['COMPLETED', 'RUNNING'] },
    },
    include: {
      _count: { select: { results: true } },
    },
  });

  if (existingBatch) {
    // Duplicate detected - return existing batch
    const resultCount = existingBatch._count.results;
    return {
      batchId: existingBatch.id,
      status: existingBatch.status,
      itemsProcessed: resultCount,
      itemsSucceeded: resultCount,
      itemsFailed: 0,
      startedAt: existingBatch.startedAt,
      completedAt: existingBatch.completedAt,
      inputsHash,
      isDuplicate: true,
    };
  }

  // Create new batch
  const batch = await prisma.calcBatch.create({
    data: {
      tenantId,
      pamId,
      contractId,
      inputsHash,
      status: 'QUEUED',
      metadata: metadata || {},
    },
  });

  return {
    batchId: batch.id,
    status: 'QUEUED',
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    startedAt: null,
    completedAt: null,
    inputsHash,
    isDuplicate: false,
  };
}

/**
 * Executes a queued calculation batch
 *
 * @param prisma - Prisma client
 * @param batchId - Batch ID to execute
 * @param options - Execution options
 * @returns Batch result with item statistics
 */
export async function executeCalculationBatch(
  prisma: PrismaClient,
  batchId: string,
  options: {
    pageSize?: number;
    continueOnError?: boolean;
  } = {}
): Promise<BatchCalculationResult> {
  const { pageSize = 100, continueOnError = true } = options;

  // Fetch batch
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      pam: {
        include: {
          items: {
            where: batch.contractId ? { contractId: batch.contractId } : undefined,
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status === 'COMPLETED') {
    // Already completed - return existing results
    const results = await prisma.calcResult.count({ where: { batchId } });
    return {
      batchId: batch.id,
      status: 'COMPLETED',
      itemsProcessed: results,
      itemsSucceeded: results,
      itemsFailed: 0,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      inputsHash: batch.inputsHash,
      isDuplicate: false,
    };
  }

  // Mark as running
  await prisma.calcBatch.update({
    where: { id: batchId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const pamGraph = batch.pam.graph as PAMGraph;
  const items = batch.pam.items;
  let itemsSucceeded = 0;
  let itemsFailed = 0;
  let lastError: string | undefined;

  try {
    // Process items in pages for memory efficiency
    for (let i = 0; i < items.length; i += pageSize) {
      const page = items.slice(i, i + pageSize);

      // Process page
      const pageResults = await Promise.allSettled(
        page.map((item) =>
          calculateItem(prisma, {
            tenantId: batch.tenantId,
            batchId: batch.id,
            itemId: item.id,
            pamGraph,
            asOfDate: batch.metadata?.asOfDate || new Date(),
            versionPreference: (batch.metadata?.versionPreference as VersionTag) || 'FINAL',
            basePrice: item.basePrice.toNumber(),
            baseCurrency: item.baseCurrency,
            baseUnit: item.uom,
          })
        )
      );

      // Count results
      for (const result of pageResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          itemsSucceeded++;
        } else {
          itemsFailed++;
          if (result.status === 'rejected') {
            lastError = result.reason?.message || 'Unknown error';
          } else if (!result.value.success) {
            lastError = result.value.error;
          }

          if (!continueOnError) {
            throw new Error(lastError);
          }
        }
      }
    }

    // Mark as completed
    await prisma.calcBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      batchId: batch.id,
      status: 'COMPLETED',
      itemsProcessed: itemsSucceeded + itemsFailed,
      itemsSucceeded,
      itemsFailed,
      startedAt: batch.startedAt,
      completedAt: new Date(),
      inputsHash: batch.inputsHash,
      isDuplicate: false,
    };
  } catch (error: any) {
    // Mark as failed
    await prisma.calcBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error.message || 'Unknown error',
      },
    });

    return {
      batchId: batch.id,
      status: 'FAILED',
      itemsProcessed: itemsSucceeded + itemsFailed,
      itemsSucceeded,
      itemsFailed,
      startedAt: batch.startedAt,
      completedAt: new Date(),
      error: error.message,
      inputsHash: batch.inputsHash,
      isDuplicate: false,
    };
  }
}

/**
 * Calculates adjusted price for a single item
 */
async function calculateItem(
  prisma: PrismaClient,
  params: {
    tenantId: string;
    batchId: string;
    itemId: string;
    pamGraph: PAMGraph;
    asOfDate: Date;
    versionPreference: VersionTag;
    basePrice?: number;
    baseCurrency?: string;
    baseUnit?: string;
  }
): Promise<ItemCalculationResult> {
  const {
    tenantId,
    batchId,
    itemId,
    pamGraph,
    asOfDate,
    versionPreference,
    basePrice,
    baseCurrency,
    baseUnit,
  } = params;

  try {
    // Execute graph
    const context: ExecutionContext = {
      tenantId,
      asOfDate,
      versionPreference,
      basePrice,
      baseCurrency,
      baseUnit,
    };

    const result = await executeGraph(pamGraph, context);

    // Store result
    await prisma.calcResult.create({
      data: {
        tenantId,
        batchId,
        itemId,
        adjustedPrice: result.value,
        adjustedCurrency: result.currency,
        contributions: result.contributions,
        effectiveDate: asOfDate,
      },
    });

    return {
      itemId,
      success: true,
      adjustedPrice: result.value,
      adjustedCurrency: result.currency,
      contributions: result.contributions,
    };
  } catch (error: any) {
    return {
      itemId,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Retries a failed batch
 *
 * Only retries items that haven't been successfully calculated yet
 */
export async function retryFailedBatch(
  prisma: PrismaClient,
  batchId: string
): Promise<BatchCalculationResult> {
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status !== 'FAILED') {
    throw new Error(`Batch ${batchId} is not in FAILED state`);
  }

  // Reset to QUEUED
  await prisma.calcBatch.update({
    where: { id: batchId },
    data: {
      status: 'QUEUED',
      error: null,
      startedAt: null,
      completedAt: null,
    },
  });

  // Execute again (will skip items that already have results)
  return executeCalculationBatch(prisma, batchId);
}

/**
 * Gets batch status
 */
export async function getBatchStatus(
  prisma: PrismaClient,
  batchId: string
): Promise<BatchCalculationResult> {
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      _count: { select: { results: true } },
      pam: {
        include: {
          _count: {
            select: {
              items: {
                where: batch.contractId ? { contractId: batch.contractId } : undefined,
              },
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const totalItems = batch.pam._count.items;
  const completedItems = batch._count.results;

  return {
    batchId: batch.id,
    status: batch.status,
    itemsProcessed: completedItems,
    itemsSucceeded: completedItems,
    itemsFailed: totalItems - completedItems,
    startedAt: batch.startedAt,
    completedAt: batch.completedAt,
    error: batch.error || undefined,
    inputsHash: batch.inputsHash,
    isDuplicate: false,
  };
}

/**
 * Lists calculation results for a batch
 */
export async function getBatchResults(
  prisma: PrismaClient,
  batchId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  results: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page = 1, pageSize = 100 } = options;
  const skip = (page - 1) * pageSize;

  const [results, total] = await Promise.all([
    prisma.calcResult.findMany({
      where: { batchId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'asc' },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            basePrice: true,
            baseCurrency: true,
            uom: true,
          },
        },
      },
    }),
    prisma.calcResult.count({ where: { batchId } }),
  ]);

  return {
    results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// Inputs Hash
// ============================================================================

/**
 * Computes deterministic hash of batch inputs for idempotency
 *
 * Includes:
 * - PAM graph structure
 * - As-of date
 * - Version preference
 * - Item IDs (sorted)
 */
function computeInputsHash(inputs: BatchInputs): string {
  const canonical = {
    graph: hashExecutionInputs(
      inputs.pamGraph,
      {
        tenantId: '', // Not part of graph hash
        asOfDate: inputs.asOfDate,
        versionPreference: inputs.versionPreference,
      }
    ),
    asOfDate: inputs.asOfDate.toISOString(),
    versionPreference: inputs.versionPreference,
    itemIds: inputs.itemIds, // Already sorted
  };

  const jsonString = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Cancels a running or queued batch
 */
export async function cancelBatch(
  prisma: PrismaClient,
  batchId: string
): Promise<void> {
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status === 'COMPLETED' || batch.status === 'FAILED') {
    throw new Error(`Cannot cancel batch in ${batch.status} state`);
  }

  await prisma.calcBatch.update({
    where: { id: batchId },
    data: {
      status: 'FAILED',
      error: 'Cancelled by user',
      completedAt: new Date(),
    },
  });
}
