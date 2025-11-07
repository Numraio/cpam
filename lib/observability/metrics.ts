/**
 * Custom Metrics
 *
 * Application-specific metrics for SLO monitoring.
 */

import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram, ObservableGauge } from '@opentelemetry/api';
import { prisma } from '@/lib/prisma';

const meter = metrics.getMeter('cpam-metrics', '1.0.0');

// Counters
let calcBatchCounter: Counter;
let ingestionCounter: Counter;
let apiRequestCounter: Counter;
let apiErrorCounter: Counter;

// Histograms
let calcRuntimeHistogram: Histogram;
let ingestionLagHistogram: Histogram;
let apiLatencyHistogram: Histogram;

// Gauges
let queueDepthGauge: ObservableGauge;
let activeTenantsGauge: ObservableGauge;

/**
 * Initialize custom metrics
 */
export function initializeMetrics(): void {
  // Counters
  calcBatchCounter = meter.createCounter('calc.batch.total', {
    description: 'Total number of calculation batches processed',
  });

  ingestionCounter = meter.createCounter('ingestion.total', {
    description: 'Total number of ingestion operations',
  });

  apiRequestCounter = meter.createCounter('api.requests.total', {
    description: 'Total number of API requests',
  });

  apiErrorCounter = meter.createCounter('api.errors.total', {
    description: 'Total number of API errors',
  });

  // Histograms
  calcRuntimeHistogram = meter.createHistogram('calc.runtime.seconds', {
    description: 'Calculation batch runtime in seconds',
    unit: 's',
  });

  ingestionLagHistogram = meter.createHistogram('ingestion.lag.seconds', {
    description: 'Time between data availability and ingestion',
    unit: 's',
  });

  apiLatencyHistogram = meter.createHistogram('api.latency.seconds', {
    description: 'API request latency in seconds',
    unit: 's',
  });

  // Gauges
  queueDepthGauge = meter.createObservableGauge('queue.depth', {
    description: 'Number of jobs in queue',
  });

  queueDepthGauge.addCallback(async (observableResult) => {
    try {
      // Count QUEUED batches
      const queuedCount = await prisma.calcBatch.count({
        where: { status: 'QUEUED' },
      });

      observableResult.observe(queuedCount);
    } catch (error) {
      console.error('Failed to observe queue depth:', error);
    }
  });

  activeTenantsGauge = meter.createObservableGauge('tenants.active', {
    description: 'Number of active tenants',
  });

  activeTenantsGauge.addCallback(async (observableResult) => {
    try {
      // Count teams with activity in last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeCount = await prisma.team.count({
        where: {
          updatedAt: { gte: oneDayAgo },
        },
      });

      observableResult.observe(activeCount);
    } catch (error) {
      console.error('Failed to observe active tenants:', error);
    }
  });
}

/**
 * Record calculation batch metrics
 */
export function recordCalcBatch(
  status: 'completed' | 'failed',
  durationMs: number,
  tenantId: string,
  itemCount: number
): void {
  calcBatchCounter.add(1, {
    status,
    tenant_id: tenantId,
  });

  calcRuntimeHistogram.record(durationMs / 1000, {
    status,
    tenant_id: tenantId,
    item_count_bucket: getItemCountBucket(itemCount),
  });
}

/**
 * Record ingestion metrics
 */
export function recordIngestion(
  provider: string,
  status: 'success' | 'failure',
  lagSeconds: number,
  fetchedCount: number,
  upsertedCount: number
): void {
  ingestionCounter.add(1, {
    provider,
    status,
  });

  ingestionLagHistogram.record(lagSeconds, {
    provider,
  });

  // Record data quality metrics
  const dataQuality = upsertedCount / fetchedCount;
  meter.createHistogram('ingestion.data_quality').record(dataQuality, {
    provider,
  });
}

/**
 * Record API request metrics
 */
export function recordAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  tenantId?: string
): void {
  apiRequestCounter.add(1, {
    method,
    path,
    status_code: statusCode.toString(),
    ...(tenantId && { tenant_id: tenantId }),
  });

  apiLatencyHistogram.record(durationMs / 1000, {
    method,
    path,
    status_code_class: `${Math.floor(statusCode / 100)}xx`,
  });

  if (statusCode >= 400) {
    apiErrorCounter.add(1, {
      method,
      path,
      status_code: statusCode.toString(),
    });
  }
}

/**
 * Record queue depth for a specific moment
 */
export async function recordQueueDepth(): Promise<number> {
  const queuedCount = await prisma.calcBatch.count({
    where: { status: 'QUEUED' },
  });

  const runningCount = await prisma.calcBatch.count({
    where: { status: 'RUNNING' },
  });

  return queuedCount + runningCount;
}

/**
 * Get item count bucket for bucketing metrics
 */
function getItemCountBucket(count: number): string {
  if (count <= 10) return '1-10';
  if (count <= 100) return '11-100';
  if (count <= 1000) return '101-1000';
  if (count <= 10000) return '1001-10000';
  return '10000+';
}

/**
 * Calculate ingestion lag in seconds
 */
export function calculateIngestionLag(
  dataTimestamp: Date,
  ingestedAt: Date
): number {
  return (ingestedAt.getTime() - dataTimestamp.getTime()) / 1000;
}

/**
 * Check if metrics are properly configured
 */
export function isMetricsEnabled(): boolean {
  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT &&
    process.env.OTEL_EXPORTER_OTLP_METRICS_HEADERS
  );
}
