/**
 * Queue Infrastructure
 *
 * BullMQ-based job queue with Redis backend
 */

import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import env from '../env';

// ============================================================================
// Redis Connection
// ============================================================================

let redisConnection: Redis | null = null;

/**
 * Gets or creates Redis connection
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = env.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379';
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });
  }

  return redisConnection;
}

// ============================================================================
// Job Types
// ============================================================================

export type JobType =
  | 'ingestion'
  | 'calculation'
  | 'webhook-delivery'
  | 'report-generation';

export interface IngestionJobData {
  tenantId: string;
  seriesCode: string;
  asOfDate: string;
  versionTag: 'prelim' | 'final' | 'revised';
  source: 'csv' | 'api' | 'manual';
  data?: any;
}

export interface CalculationJobData {
  tenantId: string;
  batchId: string;
}

export interface WebhookDeliveryJobData {
  tenantId: string;
  messageId: string;
  eventType: string;
}

export interface ReportGenerationJobData {
  tenantId: string;
  reportType: 'price-math' | 'audit';
  batchId: string;
  format: 'pdf' | 'csv';
  userId: string;
}

export type JobData =
  | IngestionJobData
  | CalculationJobData
  | WebhookDeliveryJobData
  | ReportGenerationJobData;

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAMES = {
  ingestion: 'ingestion',
  calculation: 'calculation',
  webhooks: 'webhooks',
  reports: 'reports',
} as const;

/**
 * Default job options
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5 seconds
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

// ============================================================================
// Queue Instances
// ============================================================================

const queues: Map<string, Queue> = new Map();
const queueEvents: Map<string, QueueEvents> = new Map();

/**
 * Gets or creates a queue
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const connection = getRedisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(name, queue);
  }

  return queues.get(name)!;
}

/**
 * Gets or creates queue events listener
 */
export function getQueueEvents(name: string): QueueEvents {
  if (!queueEvents.has(name)) {
    const connection = getRedisConnection();
    const events = new QueueEvents(name, { connection });
    queueEvents.set(name, events);
  }

  return queueEvents.get(name)!;
}

// ============================================================================
// Job Submission
// ============================================================================

export interface JobOptions {
  /** Priority (1-1000, higher = more priority) */
  priority?: number;

  /** Delay in milliseconds before job starts */
  delay?: number;

  /** Job ID for idempotency */
  jobId?: string;

  /** Number of retry attempts */
  attempts?: number;

  /** Remove job on completion */
  removeOnComplete?: boolean;
}

/**
 * Enqueues an ingestion job
 */
export async function enqueueIngestion(
  data: IngestionJobData,
  options?: JobOptions
): Promise<Job<IngestionJobData>> {
  const queue = getQueue(QUEUE_NAMES.ingestion);

  const jobId = options?.jobId || `ingest-${data.tenantId}-${data.seriesCode}-${data.asOfDate}-${data.versionTag}`;

  return queue.add('process-ingestion', data, {
    ...options,
    jobId,
  });
}

/**
 * Enqueues a calculation job
 */
export async function enqueueCalculation(
  data: CalculationJobData,
  options?: JobOptions
): Promise<Job<CalculationJobData>> {
  const queue = getQueue(QUEUE_NAMES.calculation);

  const jobId = options?.jobId || `calc-${data.tenantId}-${data.batchId}`;

  return queue.add('process-calculation', data, {
    ...options,
    jobId,
  });
}

/**
 * Enqueues a webhook delivery job
 */
export async function enqueueWebhook(
  data: WebhookDeliveryJobData,
  options?: JobOptions
): Promise<Job<WebhookDeliveryJobData>> {
  const queue = getQueue(QUEUE_NAMES.webhooks);

  const jobId = options?.jobId || `webhook-${data.tenantId}-${data.messageId}`;

  return queue.add('deliver-webhook', data, {
    ...options,
    jobId,
  });
}

/**
 * Enqueues a report generation job
 */
export async function enqueueReport(
  data: ReportGenerationJobData,
  options?: JobOptions
): Promise<Job<ReportGenerationJobData>> {
  const queue = getQueue(QUEUE_NAMES.reports);

  const jobId = options?.jobId || `report-${data.tenantId}-${data.batchId}-${data.format}`;

  return queue.add('generate-report', data, {
    ...options,
    jobId,
  });
}

// ============================================================================
// Job Status
// ============================================================================

/**
 * Gets job by ID
 */
export async function getJob(queueName: string, jobId: string): Promise<Job | null> {
  const queue = getQueue(queueName);
  return queue.getJob(jobId);
}

/**
 * Gets job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<{
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress?: number;
  result?: any;
  error?: string;
} | null> {
  const job = await getJob(queueName, jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    state: state as any,
    progress: job.progress as number | undefined,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

// ============================================================================
// Queue Metrics
// ============================================================================

/**
 * Gets queue metrics
 */
export async function getQueueMetrics(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

/**
 * Gets all queue metrics
 */
export async function getAllQueueMetrics(): Promise<
  Record<string, ReturnType<typeof getQueueMetrics> extends Promise<infer T> ? T : never>
> {
  const metrics: any = {};

  for (const queueName of Object.values(QUEUE_NAMES)) {
    metrics[queueName] = await getQueueMetrics(queueName);
  }

  return metrics;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Closes all queues and connections
 */
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }

  for (const events of queueEvents.values()) {
    await events.close();
  }

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }

  queues.clear();
  queueEvents.clear();
}
