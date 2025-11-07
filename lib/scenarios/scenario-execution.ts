/**
 * Scenario Execution
 *
 * Execute calculations with scenario overrides.
 * Scenario calculations are isolated and don't affect published prices.
 */

import { prisma } from '@/lib/prisma';
import type { CalcBatch, CalcResult } from '@prisma/client';
import type { ScenarioOverrides } from './scenario-service';
import { getScenario, applyScenarioOverrides } from './scenario-service';

export interface ExecuteScenarioRequest {
  scenarioId: string;
  asOfDate: Date;
  versionPreference?: 'PRELIMINARY' | 'FINAL' | 'REVISED';
  itemIds?: string[]; // Optional: calculate specific items only
}

export interface ScenarioExecutionResult {
  batchId: string;
  scenarioId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  results?: CalcResult[];
  error?: string;
}

/**
 * Execute scenario calculation
 *
 * This creates a CalcBatch with the scenarioId set and applies overrides.
 */
export async function executeScenario(
  request: ExecuteScenarioRequest
): Promise<ScenarioExecutionResult> {
  // Get scenario
  const scenario = await getScenario(request.scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${request.scenarioId}`);
  }

  // Build calculation context with scenario overrides
  const baseContext = {
    asOfDate: request.asOfDate,
    versionPreference: request.versionPreference || 'FINAL',
    itemIds: request.itemIds,
  };

  const context = applyScenarioOverrides(
    baseContext,
    scenario.overrides as ScenarioOverrides
  );

  // Compute inputs hash (includes scenario ID and overrides)
  const inputsHash = await computeScenarioInputsHash(
    scenario.pamId,
    context,
    scenario.id
  );

  // Check for existing batch
  const existing = await prisma.calcBatch.findFirst({
    where: {
      tenantId: scenario.tenantId,
      scenarioId: scenario.id,
      inputsHash,
      status: {
        in: ['COMPLETED', 'RUNNING'],
      },
    },
    include: {
      results: true,
    },
  });

  if (existing) {
    return {
      batchId: existing.id,
      scenarioId: scenario.id,
      status: existing.status as any,
      results: existing.results,
    };
  }

  // Create new batch for scenario
  const batch = await prisma.calcBatch.create({
    data: {
      tenantId: scenario.tenantId,
      pamId: scenario.pamId,
      scenarioId: scenario.id,
      inputsHash,
      status: 'QUEUED',
      metadata: {
        isScenario: true,
        scenarioName: scenario.name,
        overrides: scenario.overrides,
        ...context,
      },
    },
  });

  // TODO: Queue batch for execution with scenario context
  // This would integrate with the existing calculation orchestrator
  // but pass the scenario overrides through

  return {
    batchId: batch.id,
    scenarioId: scenario.id,
    status: 'QUEUED',
  };
}

/**
 * Get scenario execution results
 */
export async function getScenarioResults(
  scenarioId: string
): Promise<CalcResult[]> {
  // Get latest completed batch for scenario
  const batch = await prisma.calcBatch.findFirst({
    where: {
      scenarioId,
      status: 'COMPLETED',
    },
    orderBy: {
      completedAt: 'desc',
    },
    include: {
      results: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  return batch?.results || [];
}

/**
 * Compute inputs hash for scenario
 *
 * Includes scenario ID and overrides to ensure uniqueness
 */
async function computeScenarioInputsHash(
  pamId: string,
  context: any,
  scenarioId: string
): Promise<string> {
  const crypto = require('crypto');

  // Get PAM graph
  const pam = await prisma.pAM.findUnique({
    where: { id: pamId },
    select: { graph: true },
  });

  if (!pam) {
    throw new Error(`PAM not found: ${pamId}`);
  }

  // Hash inputs including scenario ID and overrides
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(pam.graph));
  hash.update(JSON.stringify(context));
  hash.update(scenarioId);

  return hash.digest('hex');
}

/**
 * Cancel scenario execution
 */
export async function cancelScenarioExecution(
  batchId: string
): Promise<void> {
  await prisma.calcBatch.update({
    where: { id: batchId },
    data: {
      status: 'FAILED',
      error: 'Cancelled by user',
      completedAt: new Date(),
    },
  });
}

/**
 * Check if a batch is a scenario calculation
 */
export function isScenarioBatch(batch: CalcBatch): boolean {
  return batch.scenarioId !== null;
}

/**
 * Get all batches for a scenario
 */
export async function getScenarioBatches(
  scenarioId: string
): Promise<CalcBatch[]> {
  return await prisma.calcBatch.findMany({
    where: { scenarioId },
    orderBy: { createdAt: 'desc' },
    include: {
      results: {
        select: {
          id: true,
          itemId: true,
          adjustedPrice: true,
          adjustedCurrency: true,
        },
      },
    },
  });
}
