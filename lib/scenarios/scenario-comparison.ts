/**
 * Scenario Comparison
 *
 * Compare pricing results between scenarios or between a scenario and baseline.
 */

import { prisma } from '@/lib/prisma';
import type { CalcResult } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { getScenarioResults } from './scenario-execution';

export interface ComparisonRow {
  itemId: string;
  itemName: string;
  sku?: string;

  baselinePrice: Decimal | null;
  scenarioPrice: Decimal | null;

  delta: Decimal | null; // scenario - baseline
  deltaPercent: number | null; // (delta / baseline) * 100

  currency: string;
}

export interface ScenarioComparison {
  baselineName: string;
  scenarioName: string;
  rows: ComparisonRow[];

  summary: {
    totalItems: number;
    itemsChanged: number;
    itemsUnchanged: number;
    avgDelta: Decimal;
    maxDelta: Decimal;
    minDelta: Decimal;
    totalDelta: Decimal;
  };
}

/**
 * Compare two scenarios
 */
export async function compareScenarios(
  scenario1Id: string,
  scenario2Id: string
): Promise<ScenarioComparison> {
  // Get results for both scenarios
  const [scenario1, scenario2, results1, results2] = await Promise.all([
    prisma.scenario.findUnique({
      where: { id: scenario1Id },
      select: { name: true },
    }),
    prisma.scenario.findUnique({
      where: { id: scenario2Id },
      select: { name: true },
    }),
    getScenarioResults(scenario1Id),
    getScenarioResults(scenario2Id),
  ]);

  if (!scenario1 || !scenario2) {
    throw new Error('One or both scenarios not found');
  }

  return buildComparison(
    scenario1.name,
    scenario2.name,
    results1,
    results2
  );
}

/**
 * Compare scenario against baseline batch
 */
export async function compareScenarioToBaseline(
  scenarioId: string,
  baselineBatchId: string
): Promise<ScenarioComparison> {
  // Get scenario results
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    select: { name: true },
  });

  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  // Get baseline results
  const baselineBatch = await prisma.calcBatch.findUnique({
    where: { id: baselineBatchId },
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

  if (!baselineBatch) {
    throw new Error(`Baseline batch not found: ${baselineBatchId}`);
  }

  const scenarioResults = await getScenarioResults(scenarioId);

  return buildComparison(
    'Baseline',
    scenario.name,
    baselineBatch.results,
    scenarioResults
  );
}

/**
 * Build comparison from results
 */
function buildComparison(
  baselineName: string,
  scenarioName: string,
  baselineResults: CalcResult[],
  scenarioResults: CalcResult[]
): ScenarioComparison {
  // Index results by itemId
  const baselineMap = new Map<string, CalcResult>();
  const scenarioMap = new Map<string, CalcResult>();

  for (const result of baselineResults) {
    baselineMap.set(result.itemId, result);
  }

  for (const result of scenarioResults) {
    scenarioMap.set(result.itemId, result);
  }

  // Get all unique item IDs
  const allItemIds = new Set([
    ...baselineMap.keys(),
    ...scenarioMap.keys(),
  ]);

  // Build comparison rows
  const rows: ComparisonRow[] = [];
  const deltas: Decimal[] = [];

  for (const itemId of allItemIds) {
    const baseline = baselineMap.get(itemId);
    const scenario = scenarioMap.get(itemId);

    const baselinePrice = baseline
      ? new Decimal(baseline.adjustedPrice.toString())
      : null;
    const scenarioPrice = scenario
      ? new Decimal(scenario.adjustedPrice.toString())
      : null;

    let delta: Decimal | null = null;
    let deltaPercent: number | null = null;

    if (baselinePrice && scenarioPrice) {
      delta = scenarioPrice.minus(baselinePrice);
      deltaPercent = baselinePrice.isZero()
        ? 0
        : delta.dividedBy(baselinePrice).times(100).toNumber();
      deltas.push(delta);
    }

    rows.push({
      itemId,
      itemName: baseline?.item?.name || scenario?.item?.name || 'Unknown',
      sku: baseline?.item?.sku || scenario?.item?.sku,
      baselinePrice,
      scenarioPrice,
      delta,
      deltaPercent,
      currency: baseline?.adjustedCurrency || scenario?.adjustedCurrency || 'USD',
    });
  }

  // Compute summary statistics
  const totalItems = rows.length;
  const itemsChanged = rows.filter((r) => r.delta && !r.delta.isZero()).length;
  const itemsUnchanged = totalItems - itemsChanged;

  const totalDelta = deltas.reduce(
    (sum, d) => sum.plus(d),
    new Decimal(0)
  );
  const avgDelta = deltas.length > 0
    ? totalDelta.dividedBy(deltas.length)
    : new Decimal(0);

  const maxDelta = deltas.length > 0
    ? Decimal.max(...deltas)
    : new Decimal(0);
  const minDelta = deltas.length > 0
    ? Decimal.min(...deltas)
    : new Decimal(0);

  return {
    baselineName,
    scenarioName,
    rows,
    summary: {
      totalItems,
      itemsChanged,
      itemsUnchanged,
      avgDelta,
      maxDelta,
      minDelta,
      totalDelta,
    },
  };
}

/**
 * Export comparison to CSV
 */
export function exportComparisonToCSV(comparison: ScenarioComparison): string {
  const headers = [
    'Item ID',
    'Item Name',
    'SKU',
    `${comparison.baselineName} Price`,
    `${comparison.scenarioName} Price`,
    'Delta',
    'Delta %',
    'Currency',
  ];

  const rows = comparison.rows.map((row) => [
    row.itemId,
    row.itemName,
    row.sku || '',
    row.baselinePrice?.toString() || '',
    row.scenarioPrice?.toString() || '',
    row.delta?.toString() || '',
    row.deltaPercent?.toFixed(2) || '',
    row.currency,
  ]);

  // Add summary row
  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '', '', '']);
  rows.push(['Total Items', comparison.summary.totalItems.toString(), '', '', '', '', '', '']);
  rows.push(['Items Changed', comparison.summary.itemsChanged.toString(), '', '', '', '', '', '']);
  rows.push(['Items Unchanged', comparison.summary.itemsUnchanged.toString(), '', '', '', '', '', '']);
  rows.push(['Total Delta', '', '', '', '', comparison.summary.totalDelta.toString(), '', '']);
  rows.push(['Average Delta', '', '', '', '', comparison.summary.avgDelta.toString(), '', '']);
  rows.push(['Max Delta', '', '', '', '', comparison.summary.maxDelta.toString(), '', '']);
  rows.push(['Min Delta', '', '', '', '', comparison.summary.minDelta.toString(), '', '']);

  // Build CSV
  const csvRows = [headers, ...rows];
  return csvRows.map((row) => row.map(escapeCSV).join(',')).join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
