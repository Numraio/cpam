/**
 * Job Queue Workers
 *
 * Background workers that process queued jobs
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './queue';
import type {
  IngestionJobData,
  CalculationJobData,
  WebhookDeliveryJobData,
  ReportGenerationJobData,
} from './queue';
import { prisma } from '../prisma';

// ============================================================================
// Worker Configuration
// ============================================================================

const WORKER_OPTIONS = {
  connection: getRedisConnection(),
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // per second
  },
};

// ============================================================================
// Job Processors
// ============================================================================

/**
 * Processes ingestion jobs
 */
async function processIngestionJob(job: Job<IngestionJobData>): Promise<any> {
  const { tenantId, seriesCode, asOfDate, versionTag, source, data } = job.data;

  console.log(`[Ingestion Worker] Processing: ${job.id}`, {
    tenantId,
    seriesCode,
    asOfDate,
    versionTag,
  });

  // Update progress
  await job.updateProgress(10);

  // TODO: Implement actual ingestion logic
  // This is a placeholder that simulates ingestion

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await job.updateProgress(50);

  // Example: Store index values
  // await storeIndexValues(tenantId, seriesCode, asOfDate, versionTag, data);

  await job.updateProgress(100);

  console.log(`[Ingestion Worker] Completed: ${job.id}`);

  return {
    status: 'SUCCESS',
    recordCount: data?.length || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Processes calculation jobs
 */
async function processCalculationJob(job: Job<CalculationJobData>): Promise<any> {
  const { tenantId, batchId } = job.data;

  console.log(`[Calculation Worker] Processing: ${job.id}`, {
    tenantId,
    batchId,
  });

  await job.updateProgress(10);

  // TODO: Implement actual calculation logic
  // This would call the calculation orchestrator

  // Example:
  // const result = await executeCalculationBatch(prisma, batchId);

  await job.updateProgress(50);

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await job.updateProgress(100);

  console.log(`[Calculation Worker] Completed: ${job.id}`);

  return {
    status: 'COMPLETED',
    batchId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Processes webhook delivery jobs
 */
async function processWebhookJob(job: Job<WebhookDeliveryJobData>): Promise<any> {
  const { tenantId, messageId, eventType } = job.data;

  console.log(`[Webhook Worker] Processing: ${job.id}`, {
    tenantId,
    messageId,
    eventType,
  });

  // TODO: Implement webhook delivery
  // This would call the webhook service

  // Example:
  // await deliverWebhook(tenantId, messageId);

  console.log(`[Webhook Worker] Completed: ${job.id}`);

  return {
    status: 'DELIVERED',
    messageId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Processes report generation jobs
 */
async function processReportJob(job: Job<ReportGenerationJobData>): Promise<any> {
  const { tenantId, reportType, batchId, format, userId } = job.data;

  console.log(`[Report Worker] Processing: ${job.id}`, {
    tenantId,
    reportType,
    batchId,
    format,
  });

  await job.updateProgress(25);

  // TODO: Implement report generation
  // This would call the report service

  await job.updateProgress(75);

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 1500));

  await job.updateProgress(100);

  console.log(`[Report Worker] Completed: ${job.id}`);

  return {
    status: 'GENERATED',
    reportType,
    format,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Workers
// ============================================================================

const workers: Worker[] = [];

/**
 * Starts all workers
 */
export function startWorkers(): void {
  console.log('[Workers] Starting background workers...');

  // Ingestion worker
  const ingestionWorker = new Worker(
    'ingestion',
    async (job) => processIngestionJob(job as Job<IngestionJobData>),
    {
      ...WORKER_OPTIONS,
      concurrency: 3, // Limit ingestion concurrency
    }
  );

  // Calculation worker
  const calculationWorker = new Worker(
    'calculation',
    async (job) => processCalculationJob(job as Job<CalculationJobData>),
    {
      ...WORKER_OPTIONS,
      concurrency: 2, // Calculations are heavy, limit concurrency
    }
  );

  // Webhook worker
  const webhookWorker = new Worker(
    'webhooks',
    async (job) => processWebhookJob(job as Job<WebhookDeliveryJobData>),
    WORKER_OPTIONS
  );

  // Report worker
  const reportWorker = new Worker(
    'reports',
    async (job) => processReportJob(job as Job<ReportGenerationJobData>),
    {
      ...WORKER_OPTIONS,
      concurrency: 2,
    }
  );

  // Store workers
  workers.push(ingestionWorker, calculationWorker, webhookWorker, reportWorker);

  // Setup event handlers
  for (const worker of workers) {
    worker.on('completed', (job) => {
      console.log(`[Worker] Job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job failed: ${job?.id}`, err);
    });

    worker.on('error', (err) => {
      console.error('[Worker] Error:', err);
    });
  }

  console.log('[Workers] All workers started');
}

/**
 * Stops all workers
 */
export async function stopWorkers(): Promise<void> {
  console.log('[Workers] Stopping workers...');

  for (const worker of workers.length) {
    await workers[worker].close();
  }

  workers.length = 0;

  console.log('[Workers] All workers stopped');
}

/**
 * Gets worker status
 */
export function getWorkerStatus(): {
  name: string;
  isRunning: boolean;
  isPaused: boolean;
}[] {
  return workers.map((worker) => ({
    name: worker.name,
    isRunning: worker.isRunning(),
    isPaused: worker.isPaused(),
  }));
}
