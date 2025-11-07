/**
 * Scenario Service
 *
 * Manage what-if scenarios for pricing calculations.
 * Scenarios allow users to test different inputs without affecting published prices.
 */

import { prisma } from '@/lib/prisma';
import type { Scenario } from '@prisma/client';

export interface ScenarioOverrides {
  itemOverrides?: {
    [itemId: string]: {
      basePrice?: number;
      baseCurrency?: string;
      quantity?: number;
      unit?: string;
      [key: string]: any; // Allow custom overrides
    };
  };
  indexOverrides?: {
    [seriesCode: string]: {
      [date: string]: number; // ISO date string -> value
    };
  };
}

export interface CreateScenarioRequest {
  tenantId: string;
  name: string;
  description?: string;
  pamId: string;
  baselineId?: string; // Optional: compare against this batch
  overrides?: ScenarioOverrides;
  createdBy: string;
}

export interface UpdateScenarioRequest {
  name?: string;
  description?: string;
  overrides?: ScenarioOverrides;
}

/**
 * Create a new scenario
 */
export async function createScenario(
  request: CreateScenarioRequest
): Promise<Scenario> {
  const scenario = await prisma.scenario.create({
    data: {
      tenantId: request.tenantId,
      name: request.name,
      description: request.description,
      pamId: request.pamId,
      baselineId: request.baselineId,
      overrides: request.overrides || {},
      createdBy: request.createdBy,
      published: false, // Scenarios are never published
    },
  });

  return scenario;
}

/**
 * Get scenario by ID
 */
export async function getScenario(
  scenarioId: string
): Promise<Scenario | null> {
  return await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      pam: {
        select: {
          id: true,
          name: true,
          graph: true,
        },
      },
      batches: {
        where: {
          status: 'COMPLETED',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  });
}

/**
 * List scenarios for a tenant
 */
export async function listScenarios(
  tenantId: string,
  pamId?: string
): Promise<Scenario[]> {
  return await prisma.scenario.findMany({
    where: {
      tenantId,
      ...(pamId && { pamId }),
    },
    include: {
      pam: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          batches: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

/**
 * Update scenario
 */
export async function updateScenario(
  scenarioId: string,
  request: UpdateScenarioRequest
): Promise<Scenario> {
  return await prisma.scenario.update({
    where: { id: scenarioId },
    data: {
      ...(request.name !== undefined && { name: request.name }),
      ...(request.description !== undefined && {
        description: request.description,
      }),
      ...(request.overrides !== undefined && { overrides: request.overrides }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete scenario
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  await prisma.scenario.delete({
    where: { id: scenarioId },
  });
}

/**
 * Apply scenario overrides to calculation context
 *
 * This function merges scenario overrides with the base calculation context.
 * The calc engine will use these overrides when fetching data.
 */
export function applyScenarioOverrides(
  baseContext: any,
  overrides: ScenarioOverrides
): any {
  const context = { ...baseContext };

  // Apply item overrides
  if (overrides.itemOverrides) {
    context.itemOverrides = overrides.itemOverrides;
  }

  // Apply index overrides
  if (overrides.indexOverrides) {
    context.indexOverrides = overrides.indexOverrides;
  }

  // Mark as scenario calculation
  context.isScenario = true;

  return context;
}

/**
 * Get scenario overrides for an item
 */
export function getItemOverrides(
  itemId: string,
  overrides: ScenarioOverrides
): Record<string, any> | null {
  return overrides.itemOverrides?.[itemId] || null;
}

/**
 * Get scenario override for an index value
 */
export function getIndexOverride(
  seriesCode: string,
  date: Date,
  overrides: ScenarioOverrides
): number | null {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return overrides.indexOverrides?.[seriesCode]?.[dateStr] || null;
}

/**
 * Clone scenario
 */
export async function cloneScenario(
  scenarioId: string,
  newName: string,
  createdBy: string
): Promise<Scenario> {
  const original = await getScenario(scenarioId);
  if (!original) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  return await createScenario({
    tenantId: original.tenantId,
    name: newName,
    description: original.description
      ? `${original.description} (cloned)`
      : undefined,
    pamId: original.pamId,
    baselineId: original.baselineId,
    overrides: original.overrides as ScenarioOverrides,
    createdBy,
  });
}
