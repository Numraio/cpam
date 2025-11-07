/**
 * API: Prometheus Metrics Endpoint
 *
 * GET /api/metrics - Prometheus-compatible metrics endpoint
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add auth for metrics endpoint
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    const metrics = await collectMetrics();
    const prometheusFormat = formatPrometheusMetrics(metrics);

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.status(200).send(prometheusFormat);
  } catch (error: any) {
    console.error('Failed to collect metrics:', error);
    return res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
    });
  }
}

/**
 * Collect application metrics
 */
async function collectMetrics() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Queue metrics
  const [queuedBatches, runningBatches] = await Promise.all([
    prisma.calcBatch.count({ where: { status: 'QUEUED' } }),
    prisma.calcBatch.count({ where: { status: 'RUNNING' } }),
  ]);

  // Calculation metrics (last hour)
  const recentBatches = await prisma.calcBatch.findMany({
    where: {
      completedAt: { gte: oneHourAgo },
      status: { in: ['COMPLETED', 'FAILED'] },
    },
    select: {
      status: true,
      startedAt: true,
      completedAt: true,
    },
  });

  const completedCount = recentBatches.filter((b) => b.status === 'COMPLETED').length;
  const failedCount = recentBatches.filter((b) => b.status === 'FAILED').length;

  const avgDuration =
    recentBatches.length > 0
      ? recentBatches.reduce((sum, b) => {
          if (b.startedAt && b.completedAt) {
            return (
              sum +
              (b.completedAt.getTime() - b.startedAt.getTime()) / 1000
            );
          }
          return sum;
        }, 0) / recentBatches.length
      : 0;

  // Ingestion metrics (last hour)
  const recentIngestions = await prisma.indexValue.count({
    where: {
      ingestedAt: { gte: oneHourAgo },
    },
  });

  // Calculate ingestion lag (sample of recent values)
  const recentValues = await prisma.indexValue.findMany({
    where: {
      ingestedAt: { gte: oneHourAgo },
    },
    select: {
      asOfDate: true,
      ingestedAt: true,
    },
    take: 100,
  });

  const avgIngestionLag =
    recentValues.length > 0
      ? recentValues.reduce((sum, v) => {
          const lag = (v.ingestedAt.getTime() - v.asOfDate.getTime()) / 1000;
          return sum + lag;
        }, 0) / recentValues.length
      : 0;

  // Active tenants (last 24 hours)
  const activeTenants = await prisma.team.count({
    where: {
      updatedAt: { gte: oneDayAgo },
    },
  });

  // Total entities
  const [totalTeams, totalItems, totalSeries] = await Promise.all([
    prisma.team.count(),
    prisma.item.count(),
    prisma.indexSeries.count(),
  ]);

  return {
    queue: {
      queued: queuedBatches,
      running: runningBatches,
      total: queuedBatches + runningBatches,
    },
    calculation: {
      completed: completedCount,
      failed: failedCount,
      avg_duration_seconds: avgDuration,
    },
    ingestion: {
      values_ingested: recentIngestions,
      avg_lag_seconds: avgIngestionLag,
    },
    tenants: {
      active: activeTenants,
      total: totalTeams,
    },
    entities: {
      items: totalItems,
      series: totalSeries,
    },
  };
}

/**
 * Format metrics in Prometheus format
 */
function formatPrometheusMetrics(metrics: any): string {
  const lines: string[] = [];

  // Queue metrics
  lines.push('# HELP cpam_queue_depth Number of jobs in queue');
  lines.push('# TYPE cpam_queue_depth gauge');
  lines.push(`cpam_queue_depth{status="queued"} ${metrics.queue.queued}`);
  lines.push(`cpam_queue_depth{status="running"} ${metrics.queue.running}`);
  lines.push(`cpam_queue_depth{status="total"} ${metrics.queue.total}`);

  // Calculation metrics
  lines.push('# HELP cpam_calc_batch_total Total calculation batches');
  lines.push('# TYPE cpam_calc_batch_total counter');
  lines.push(
    `cpam_calc_batch_total{status="completed"} ${metrics.calculation.completed}`
  );
  lines.push(
    `cpam_calc_batch_total{status="failed"} ${metrics.calculation.failed}`
  );

  lines.push(
    '# HELP cpam_calc_duration_seconds Average calculation duration'
  );
  lines.push('# TYPE cpam_calc_duration_seconds gauge');
  lines.push(
    `cpam_calc_duration_seconds ${metrics.calculation.avg_duration_seconds}`
  );

  // Ingestion metrics
  lines.push('# HELP cpam_ingestion_values_total Total values ingested');
  lines.push('# TYPE cpam_ingestion_values_total counter');
  lines.push(
    `cpam_ingestion_values_total ${metrics.ingestion.values_ingested}`
  );

  lines.push('# HELP cpam_ingestion_lag_seconds Ingestion lag in seconds');
  lines.push('# TYPE cpam_ingestion_lag_seconds gauge');
  lines.push(
    `cpam_ingestion_lag_seconds ${metrics.ingestion.avg_lag_seconds}`
  );

  // Tenant metrics
  lines.push('# HELP cpam_tenants_active Active tenants (last 24h)');
  lines.push('# TYPE cpam_tenants_active gauge');
  lines.push(`cpam_tenants_active ${metrics.tenants.active}`);

  lines.push('# HELP cpam_tenants_total Total tenants');
  lines.push('# TYPE cpam_tenants_total gauge');
  lines.push(`cpam_tenants_total ${metrics.tenants.total}`);

  // Entity metrics
  lines.push('# HELP cpam_items_total Total items');
  lines.push('# TYPE cpam_items_total gauge');
  lines.push(`cpam_items_total ${metrics.entities.items}`);

  lines.push('# HELP cpam_series_total Total index series');
  lines.push('# TYPE cpam_series_total gauge');
  lines.push(`cpam_series_total ${metrics.entities.series}`);

  return lines.join('\n') + '\n';
}
