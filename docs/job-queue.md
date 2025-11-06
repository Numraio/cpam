# Job Queue

Background job processing with BullMQ and Redis for async operations.

## Overview

The job queue system handles:
- **Ingestion jobs** - Processing index data uploads
- **Calculation jobs** - Running PAM calculations asynchronously
- **Webhook jobs** - Delivering webhooks with retries
- **Report jobs** - Generating large reports in background

## Features

- ✅ **Automatic retries** - Exponential backoff on failures
- ✅ **Idempotency** - Duplicate jobs prevented via job IDs
- ✅ **Dead letter queue** - Failed jobs after max retries
- ✅ **Metrics** - Queue depth, failure rates, processing times
- ✅ **Concurrency control** - Limit concurrent job processing
- ✅ **Rate limiting** - Prevent queue overload

## Setup

### 1. Install Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using Homebrew (macOS)
brew install redis
brew services start redis
```

### 2. Configure Redis URL

```bash
# .env.local
REDIS_URL=redis://localhost:6379
```

### 3. Start Workers

Workers process jobs in the background.

**Development:**
```bash
# In a separate terminal
npm run workers
```

**Production (with PM2):**
```bash
pm2 start npm --name "workers" -- run workers
pm2 save
```

## Job Types

### Ingestion Jobs

Process index data ingestion.

```typescript
import { enqueueIngestion } from '@/lib/queue/queue';

await enqueueIngestion({
  tenantId: 'tenant-123',
  seriesCode: 'WTI',
  asOfDate: '2024-01-15',
  versionTag: 'final',
  source: 'csv',
  data: indexValues,
});
```

### Calculation Jobs

Run PAM calculations asynchronously.

```typescript
import { enqueueCalculation } from '@/lib/queue/queue';

await enqueueCalculation({
  tenantId: 'tenant-123',
  batchId: 'batch-456',
});
```

### Webhook Jobs

Deliver webhooks with retries.

```typescript
import { enqueueWebhook } from '@/lib/queue/queue';

await enqueueWebhook({
  tenantId: 'tenant-123',
  messageId: 'msg-789',
  eventType: 'calc.batch.completed',
});
```

### Report Jobs

Generate reports in background.

```typescript
import { enqueueReport } from '@/lib/queue/queue';

await enqueueReport({
  tenantId: 'tenant-123',
  reportType: 'price-math',
  batchId: 'batch-456',
  format: 'pdf',
  userId: 'user-789',
});
```

## Job Options

### Priority

Higher priority jobs run first (1-1000, default 0).

```typescript
await enqueueCalculation(data, {
  priority: 100, // High priority
});
```

### Delay

Delay job execution by milliseconds.

```typescript
await enqueueIngestion(data, {
  delay: 60000, // Start in 1 minute
});
```

### Job ID (Idempotency)

Prevent duplicate jobs with same ID.

```typescript
await enqueueCalculation(data, {
  jobId: `calc-${tenantId}-${batchId}`,
});

// Second enqueue with same jobId returns existing job
await enqueueCalculation(data, {
  jobId: `calc-${tenantId}-${batchId}`, // Won't create duplicate
});
```

### Retry Attempts

Override default retry count (default: 3).

```typescript
await enqueueWebhook(data, {
  attempts: 5, // Retry up to 5 times
});
```

## Retry Behavior

Jobs automatically retry on failure with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 5 seconds later
- **Attempt 3**: 25 seconds later
- **Attempt 4**: 125 seconds later
- **...and so on**

### Retry Example

```typescript
// Job fails on first 2 attempts, succeeds on 3rd
async function processJob(job) {
  const attemptNumber = job.attemptsMade + 1;

  if (attemptNumber < 3) {
    throw new Error('Transient error');
  }

  return { success: true };
}
```

## Dead Letter Queue

Jobs that fail after all retry attempts move to failed state.

### Checking Failed Jobs

```typescript
import { getQueue } from '@/lib/queue/queue';

const queue = getQueue('calculation');

// Get failed jobs
const failed = await queue.getFailed();

for (const job of failed) {
  console.log('Failed job:', job.id);
  console.log('Error:', job.failedReason);
  console.log('Attempts:', job.attemptsMade);
}
```

### Retrying Failed Jobs

```typescript
// Retry a specific failed job
const job = await queue.getJob(jobId);
await job.retry();

// Retry all failed jobs in queue
const failed = await queue.getFailed();
for (const job of failed) {
  await job.retry();
}
```

## Job Status

### Check Job Status

```typescript
import { getJobStatus } from '@/lib/queue/queue';

const status = await getJobStatus('calculation', 'calc-tenant-123-batch-456');

console.log(status);
// {
//   state: 'completed',
//   progress: 100,
//   result: { status: 'SUCCESS', timestamp: '...' }
// }
```

### Job States

- `waiting` - In queue, not yet started
- `active` - Currently being processed
- `completed` - Successfully completed
- `failed` - Failed after all retries
- `delayed` - Waiting for delay to elapse

## Queue Metrics

### Get Metrics

```typescript
import { getQueueMetrics, getAllQueueMetrics } from '@/lib/queue/queue';

// Single queue
const metrics = await getQueueMetrics('calculation');
console.log(metrics);
// {
//   waiting: 5,
//   active: 2,
//   completed: 1000,
//   failed: 10,
//   delayed: 0,
//   paused: 0
// }

// All queues
const allMetrics = await getAllQueueMetrics();
```

### API Endpoint

```bash
curl https://your-app.com/api/jobs/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "metrics": {
    "ingestion": {
      "waiting": 3,
      "active": 1,
      "completed": 500,
      "failed": 2
    },
    "calculation": {
      "waiting": 10,
      "active": 2,
      "completed": 2000,
      "failed": 5
    },
    "webhooks": {
      "waiting": 0,
      "active": 0,
      "completed": 5000,
      "failed": 10
    },
    "reports": {
      "waiting": 1,
      "active": 1,
      "completed": 100,
      "failed": 0
    }
  }
}
```

## Worker Management

### Start Workers

```typescript
import { startWorkers } from '@/lib/queue/workers';

startWorkers();
```

### Stop Workers

```typescript
import { stopWorkers } from '@/lib/queue/workers';

await stopWorkers();
```

### Worker Status

```typescript
import { getWorkerStatus } from '@/lib/queue/workers';

const status = getWorkerStatus();
console.log(status);
// [
//   { name: 'ingestion', isRunning: true, isPaused: false },
//   { name: 'calculation', isRunning: true, isPaused: false },
//   ...
// ]
```

## Concurrency Limits

Different queues have different concurrency limits:

- **Ingestion**: 3 concurrent jobs (I/O bound)
- **Calculation**: 2 concurrent jobs (CPU intensive)
- **Webhooks**: 5 concurrent jobs (network bound)
- **Reports**: 2 concurrent jobs (CPU + I/O intensive)

### Custom Concurrency

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('my-queue', processJob, {
  concurrency: 10, // Process up to 10 jobs at once
});
```

## Rate Limiting

Prevent queue overload:

```typescript
const worker = new Worker('my-queue', processJob, {
  limiter: {
    max: 100, // Max 100 jobs
    duration: 60000, // per minute
  },
});
```

## Job Progress

Update job progress during processing:

```typescript
async function processJob(job) {
  await job.updateProgress(0);

  // Step 1
  await doStep1();
  await job.updateProgress(33);

  // Step 2
  await doStep2();
  await job.updateProgress(66);

  // Step 3
  await doStep3();
  await job.updateProgress(100);

  return { success: true };
}
```

## Job Events

Listen to job events:

```typescript
import { getQueueEvents } from '@/lib/queue/queue';

const queueEvents = getQueueEvents('calculation');

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});
```

## Testing

### Unit Tests

```typescript
import { enqueueCalculation, getJobStatus } from '@/lib/queue/queue';

it('enqueues calculation job', async () => {
  const job = await enqueueCalculation({
    tenantId: 'test-tenant',
    batchId: 'test-batch',
  });

  expect(job.id).toBeDefined();
  expect(job.data.batchId).toBe('test-batch');
});
```

### Integration Tests

```typescript
import { enqueueCalculation, getJobStatus } from '@/lib/queue/queue';
import { startWorkers, stopWorkers } from '@/lib/queue/workers';

beforeAll(async () => {
  await startWorkers();
});

afterAll(async () => {
  await stopWorkers();
});

it('processes calculation job', async () => {
  const job = await enqueueCalculation({
    tenantId: 'test-tenant',
    batchId: 'test-batch',
  });

  // Wait for completion
  await job.waitUntilFinished(queueEvents);

  const status = await getJobStatus('calculation', job.id);
  expect(status.state).toBe('completed');
});
```

## Monitoring

### Metrics Dashboard

Monitor queue health:

- Queue depth (waiting jobs)
- Processing rate (jobs/sec)
- Failure rate
- Average processing time
- Worker utilization

### Alerts

Set up alerts for:

- Queue depth > threshold (e.g., 1000)
- Failure rate > threshold (e.g., 5%)
- No jobs processed in X minutes (worker down)
- High memory usage

### Logging

Workers log important events:

```
[Calculation Worker] Processing: calc-tenant-123-batch-456
[Calculation Worker] Completed: calc-tenant-123-batch-456 (2.3s)
[Worker] Job failed: calc-tenant-789-batch-101
```

## Production Deployment

### Docker

```dockerfile
# Dockerfile.workers
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

CMD ["node", "workers.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workers
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workers
  template:
    metadata:
      labels:
        app: workers
    spec:
      containers:
      - name: workers
        image: your-registry/workers:latest
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

### Scaling Workers

**Horizontal Scaling:**
Run multiple worker instances for higher throughput.

```bash
# Run 3 worker instances
pm2 start workers.js -i 3
```

**Vertical Scaling:**
Increase concurrency per worker.

```typescript
const worker = new Worker('calculation', processJob, {
  concurrency: 10, // More concurrent jobs per worker
});
```

## Best Practices

### 1. Use Job IDs for Idempotency

```typescript
// ✅ Good: Deterministic job ID
await enqueueCalculation(data, {
  jobId: `calc-${tenantId}-${batchId}`,
});

// ❌ Bad: No job ID (can create duplicates)
await enqueueCalculation(data);
```

### 2. Set Appropriate Timeouts

```typescript
const worker = new Worker('calculation', processJob, {
  timeout: 300000, // 5 minutes max per job
});
```

### 3. Handle Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await stopWorkers();
  process.exit(0);
});
```

### 4. Monitor Queue Depth

```typescript
setInterval(async () => {
  const metrics = await getAllQueueMetrics();

  for (const [queue, data] of Object.entries(metrics)) {
    if (data.waiting > 1000) {
      console.warn(`Queue ${queue} has ${data.waiting} waiting jobs`);
    }
  }
}, 60000); // Check every minute
```

### 5. Clean Up Old Jobs

```typescript
// Remove completed jobs older than 7 days
await queue.clean(7 * 24 * 3600 * 1000, 1000, 'completed');

// Remove failed jobs older than 30 days
await queue.clean(30 * 24 * 3600 * 1000, 1000, 'failed');
```

## Troubleshooting

### Jobs Not Processing

**Check:**
1. Workers are running (`ps aux | grep node`)
2. Redis is accessible (`redis-cli ping`)
3. No errors in worker logs

### Jobs Failing Repeatedly

**Check:**
1. Error messages in failed jobs
2. Dependencies available (database, APIs)
3. Timeout settings appropriate

### High Queue Depth

**Solutions:**
1. Scale workers horizontally
2. Increase worker concurrency
3. Optimize job processing time
4. Add rate limiting to job submission

## Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Webhooks](./webhooks.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
