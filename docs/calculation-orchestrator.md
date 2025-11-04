# Calculation Orchestrator Documentation

This document describes the batch calculation orchestrator that runs PAM graphs across contract items.

## Table of Contents

- [Overview](#overview)
- [Batch Lifecycle](#batch-lifecycle)
- [Idempotency](#idempotency)
- [Creating Batches](#creating-batches)
- [Executing Batches](#executing-batches)
- [Error Handling](#error-handling)
- [Monitoring and Status](#monitoring-and-status)
- [Examples](#examples)
- [Performance Considerations](#performance-considerations)

## Overview

The calculation orchestrator provides:

- **Batch calculation**: Calculate adjusted prices for multiple items in one batch
- **Idempotent execution**: Identical inputs produce identical results (no duplicates)
- **State machine**: QUEUED → RUNNING → COMPLETED/FAILED
- **Pagination**: Memory-efficient processing of large item sets
- **Error handling**: Continue on error or fail fast
- **Retry logic**: Retry failed batches
- **Result storage**: Per-item results with contributions waterfall

## Batch Lifecycle

```
┌─────────┐    executeCalculationBatch()    ┌─────────┐
│ QUEUED  │ ──────────────────────────────> │ RUNNING │
└─────────┘                                  └─────────┘
                                                  │
                              ┌───────────────────┴──────────────────┐
                              │                                       │
                              ▼                                       ▼
                        ┌───────────┐                           ┌────────┐
                        │ COMPLETED │                           │ FAILED │
                        └───────────┘                           └────────┘
                                                                      │
                                                                      │ retryFailedBatch()
                                                                      ▼
                                                                ┌─────────┐
                                                                │ QUEUED  │
                                                                └─────────┘
```

### States

| State | Description |
|-------|-------------|
| `QUEUED` | Batch created, waiting for execution |
| `RUNNING` | Batch currently executing |
| `COMPLETED` | All items successfully calculated |
| `FAILED` | Batch failed (stopped on error) |

## Idempotency

The orchestrator ensures idempotent execution using an **inputs hash**:

```typescript
inputsHash = SHA256({
  pamGraph: hashExecutionInputs(graph, context),
  asOfDate: '2024-01-15T00:00:00Z',
  versionPreference: 'FINAL',
  itemIds: ['item-1', 'item-2', 'item-3'].sort()
})
```

### Duplicate Detection

When creating a batch, the orchestrator:

1. Computes inputs hash from PAM graph + as-of date + version + items
2. Checks for existing batch with same hash in COMPLETED or RUNNING state
3. If found, returns existing batch (no duplicate created)
4. If not found, creates new batch

**Example**:

```typescript
// First batch
const batch1 = await createCalculationBatch(prisma, {
  tenantId: 'acme',
  pamId: 'pam-123',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
});
// batch1.isDuplicate = false

await executeCalculationBatch(prisma, batch1.batchId);

// Second batch with identical inputs
const batch2 = await createCalculationBatch(prisma, {
  tenantId: 'acme',
  pamId: 'pam-123',
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
});
// batch2.isDuplicate = true
// batch2.batchId === batch1.batchId
```

## Creating Batches

### createCalculationBatch

Creates a new calculation batch or returns existing if duplicate.

```typescript
import { PrismaClient } from '@prisma/client';
import { createCalculationBatch } from '@/lib/calc/batch-orchestrator';

const prisma = new PrismaClient();

const result = await createCalculationBatch(prisma, {
  tenantId: 'acme-corp',
  pamId: 'pam-uuid',
  contractId: 'contract-uuid', // Optional: specific contract
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  metadata: {
    triggeredBy: 'user@example.com',
    reason: 'Monthly price update',
  },
});

console.log(result);
// {
//   batchId: 'batch-uuid',
//   status: 'QUEUED',
//   itemsProcessed: 0,
//   itemsSucceeded: 0,
//   itemsFailed: 0,
//   startedAt: null,
//   completedAt: null,
//   inputsHash: 'abc123...',
//   isDuplicate: false
// }
```

**Parameters**:
- `tenantId`: Tenant ID
- `pamId`: PAM ID to execute
- `contractId`: Optional contract ID (if omitted, calculates all items for PAM)
- `asOfDate`: Reference date for calculation
- `versionPreference`: Version preference (PRELIMINARY/FINAL/REVISED)
- `metadata`: Optional metadata object

**Returns**:
- `BatchCalculationResult`: Batch info with duplicate detection

## Executing Batches

### executeCalculationBatch

Executes a queued batch.

```typescript
const result = await executeCalculationBatch(prisma, batchId, {
  pageSize: 100, // Items per page (default: 100)
  continueOnError: true, // Continue if item fails (default: true)
});

console.log(result);
// {
//   batchId: 'batch-uuid',
//   status: 'COMPLETED',
//   itemsProcessed: 500,
//   itemsSucceeded: 495,
//   itemsFailed: 5,
//   startedAt: Date,
//   completedAt: Date,
//   inputsHash: 'abc123...',
//   isDuplicate: false
// }
```

**Options**:
- `pageSize`: Number of items to process per page (default: 100)
- `continueOnError`: Continue processing if item fails (default: true)

### Execution Flow

1. **Validation**: Check batch exists and is QUEUED/FAILED
2. **State transition**: QUEUED → RUNNING
3. **Item processing**:
   - Fetch items in pages
   - Execute PAM graph for each item
   - Store CalcResult for successful items
   - Track errors for failed items
4. **State transition**: RUNNING → COMPLETED/FAILED
5. **Result**: Return batch statistics

## Error Handling

### Continue on Error

When `continueOnError: true` (default):

```typescript
const result = await executeCalculationBatch(prisma, batchId, {
  continueOnError: true,
});

// Batch completes even if some items fail
// result.itemsFailed = 5
// result.itemsSucceeded = 495
// result.status = 'COMPLETED'
```

### Fail Fast

When `continueOnError: false`:

```typescript
const result = await executeCalculationBatch(prisma, batchId, {
  continueOnError: false,
});

// Batch fails on first error
// result.status = 'FAILED'
// result.error = 'No value found for series...'
```

### Retry Failed Batch

```typescript
// Retry failed batch
const retryResult = await retryFailedBatch(prisma, batchId);

// Batch is reset to QUEUED and executed again
// Only retries items that don't have results yet
```

## Monitoring and Status

### getBatchStatus

Get current batch status.

```typescript
const status = await getBatchStatus(prisma, batchId);

console.log(status);
// {
//   batchId: 'batch-uuid',
//   status: 'RUNNING',
//   itemsProcessed: 250,
//   itemsSucceeded: 245,
//   itemsFailed: 5,
//   startedAt: Date,
//   completedAt: null,
//   inputsHash: 'abc123...',
//   isDuplicate: false
// }
```

### getBatchResults

Get paginated calculation results.

```typescript
const results = await getBatchResults(prisma, batchId, {
  page: 1,
  pageSize: 50,
});

console.log(results);
// {
//   results: [
//     {
//       id: 'result-uuid',
//       itemId: 'item-uuid',
//       adjustedPrice: 115.50,
//       adjustedCurrency: 'USD',
//       contributions: { base: 100, multiplier: 1.15 },
//       effectiveDate: Date,
//       item: {
//         sku: 'WIDGET-001',
//         basePrice: 100,
//         baseCurrency: 'USD',
//       }
//     },
//     // ... 49 more results
//   ],
//   total: 500,
//   page: 1,
//   pageSize: 50,
//   totalPages: 10
// }
```

### Cancel Batch

Cancel a queued or running batch.

```typescript
await cancelBatch(prisma, batchId);

// Batch marked as FAILED with error: 'Cancelled by user'
```

## Examples

### Example 1: Simple Batch Calculation

```typescript
import { PrismaClient } from '@prisma/client';
import {
  createCalculationBatch,
  executeCalculationBatch,
  getBatchResults,
} from '@/lib/calc/batch-orchestrator';

const prisma = new PrismaClient();

async function calculateMonthlyPrices() {
  // 1. Create batch
  const batch = await createCalculationBatch(prisma, {
    tenantId: 'acme-corp',
    pamId: 'monthly-pam',
    asOfDate: new Date('2024-01-01'),
    versionPreference: 'FINAL',
    metadata: {
      triggeredBy: 'cron-job',
      reason: 'Monthly price calculation',
    },
  });

  if (batch.isDuplicate) {
    console.log('Batch already calculated, using existing results');
    return batch.batchId;
  }

  // 2. Execute batch
  console.log(`Executing batch ${batch.batchId}...`);
  const result = await executeCalculationBatch(prisma, batch.batchId);

  console.log(`Completed: ${result.itemsSucceeded} succeeded, ${result.itemsFailed} failed`);

  // 3. Fetch results
  const results = await getBatchResults(prisma, batch.batchId, {
    page: 1,
    pageSize: 100,
  });

  console.log(`Total results: ${results.total}`);

  return batch.batchId;
}

await calculateMonthlyPrices();
await prisma.$disconnect();
```

### Example 2: Batch with Error Handling

```typescript
async function calculateWithRetry(pamId: string, maxRetries = 3) {
  let batch = await createCalculationBatch(prisma, {
    tenantId: 'acme-corp',
    pamId,
    asOfDate: new Date(),
    versionPreference: 'FINAL',
  });

  if (batch.isDuplicate) {
    return batch;
  }

  let retries = 0;
  while (retries < maxRetries) {
    const result = await executeCalculationBatch(prisma, batch.batchId, {
      continueOnError: false, // Fail fast
    });

    if (result.status === 'COMPLETED') {
      return result;
    }

    // Failed - retry
    console.log(`Batch failed: ${result.error}. Retrying (${retries + 1}/${maxRetries})...`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
    batch = await retryFailedBatch(prisma, batch.batchId);
    retries++;
  }

  throw new Error(`Batch failed after ${maxRetries} retries`);
}
```

### Example 3: Progress Monitoring

```typescript
async function monitorBatchProgress(batchId: string) {
  let status = await getBatchStatus(prisma, batchId);

  while (status.status === 'RUNNING') {
    const progress = (status.itemsProcessed / (status.itemsProcessed + status.itemsFailed)) * 100;
    console.log(`Progress: ${progress.toFixed(1)}% (${status.itemsProcessed} items)`);

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Refresh status
    status = await getBatchStatus(prisma, batchId);
  }

  console.log(`Batch ${status.status}`);
  return status;
}

// Execute and monitor
const batch = await createCalculationBatch(prisma, { /* ... */ });
await executeCalculationBatch(prisma, batch.batchId);
await monitorBatchProgress(batch.batchId);
```

### Example 4: Contract-Specific Calculation

```typescript
// Calculate for specific contract only
const batch = await createCalculationBatch(prisma, {
  tenantId: 'acme-corp',
  pamId: 'pam-uuid',
  contractId: 'contract-uuid', // Specific contract
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
});

await executeCalculationBatch(prisma, batch.batchId);
```

### Example 5: Bulk Processing with Pagination

```typescript
async function processBulkItems(pamId: string, pageSize = 500) {
  const batch = await createCalculationBatch(prisma, {
    tenantId: 'acme-corp',
    pamId,
    asOfDate: new Date(),
    versionPreference: 'FINAL',
  });

  // Execute with large page size for performance
  const result = await executeCalculationBatch(prisma, batch.batchId, {
    pageSize, // Process 500 items per page
    continueOnError: true,
  });

  if (result.itemsFailed > 0) {
    console.warn(`${result.itemsFailed} items failed`);

    // Fetch failed items (they won't have results)
    const allResults = await getBatchResults(prisma, batch.batchId, {
      pageSize: 1000,
    });

    console.log(`Successfully calculated: ${allResults.total} items`);
  }

  return result;
}
```

### Example 6: Idempotent API Endpoint

```typescript
// pages/api/calculations/[pamId]/run.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createCalculationBatch, executeCalculationBatch } from '@/lib/calc/batch-orchestrator';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pamId } = req.query;
  const { asOfDate, versionPreference = 'FINAL' } = req.body;

  try {
    // Create batch (idempotent)
    const batch = await createCalculationBatch(prisma, {
      tenantId: req.session.user.tenantId,
      pamId: pamId as string,
      asOfDate: new Date(asOfDate),
      versionPreference,
      metadata: {
        triggeredBy: req.session.user.email,
        userAgent: req.headers['user-agent'],
      },
    });

    if (batch.isDuplicate) {
      // Already calculated
      return res.status(200).json({
        message: 'Calculation already exists',
        batchId: batch.batchId,
        status: batch.status,
      });
    }

    // Execute in background (don't await)
    executeCalculationBatch(prisma, batch.batchId).catch((error) => {
      console.error('Batch execution failed:', error);
    });

    return res.status(202).json({
      message: 'Calculation queued',
      batchId: batch.batchId,
      status: 'QUEUED',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

## Performance Considerations

### Batch Size

| Items | Recommended Page Size | Estimated Time |
|-------|----------------------|----------------|
| <100 | 50 | <5s |
| 100-1000 | 100 | <30s |
| 1000-10000 | 500 | <5min |
| >10000 | 1000 | <30min |

### Optimization Tips

1. **Use appropriate page size**: Larger pages = fewer database round trips
2. **Enable continueOnError**: Don't fail entire batch for single item errors
3. **Async execution**: Queue batch and execute in background
4. **Monitor progress**: Use getBatchStatus() to track long-running batches
5. **Leverage idempotency**: Re-running identical batches is instant (no duplicate work)

### Database Indexes

The schema includes optimized indexes:

```sql
-- Batch lookups
CREATE INDEX idx_calcbatch_tenant ON CalcBatch(tenantId);
CREATE INDEX idx_calcbatch_pam ON CalcBatch(pamId);
CREATE INDEX idx_calcbatch_status ON CalcBatch(status);
CREATE INDEX idx_calcbatch_inputs_hash ON CalcBatch(inputsHash);

-- Result lookups
CREATE INDEX idx_calcresult_tenant ON CalcResult(tenantId);
CREATE INDEX idx_calcresult_batch ON CalcResult(batchId);
CREATE INDEX idx_calcresult_item ON CalcResult(itemId);
```

### Memory Usage

Memory usage per batch:
- **Metadata**: ~1KB per batch
- **Results**: ~0.5KB per item result
- **In-flight items**: pageSize × 2KB (graph execution)

**Example**: 10,000 items with pageSize=100:
- Peak memory: ~200KB (100 items × 2KB)
- Total storage: ~5MB (10,000 × 0.5KB)

## Error Messages

### Common Errors

**PAM not found**:
```
PAM not found: pam-uuid
```
**Fix**: Verify PAM exists and belongs to tenant

**No items found**:
```
No items found for PAM pam-uuid
```
**Fix**: Ensure PAM has linked items with optional contractId filter

**Batch already completed**:
```
Batch batch-uuid is already COMPLETED
```
**Info**: This is expected - batch won't re-execute

**Cannot cancel completed batch**:
```
Cannot cancel batch in COMPLETED state
```
**Fix**: Only QUEUED or RUNNING batches can be cancelled

## Related Documentation

- [PAM Graph Execution](./graph-execution.md) - How graphs are executed
- [Timeseries API](./timeseries-api.md) - Series data fetching
- [Data Model ERD](./database/ERD.md) - CalcBatch and CalcResult schema

## Future Enhancements

**Job Queue Integration** (Issue #7):
- Queue batches to background workers
- Distributed processing across multiple workers
- Priority queues for urgent calculations

**Approval Workflow** (Issue #24):
- Batch approval before implementation
- Lock calculated prices
- Override mechanism

**Contributions Waterfall** (Issue #23):
- Detailed factor contribution analysis
- Waterfall chart visualization
- Export to CSV/PDF

**Batch Partitioning**:
- Automatic partitioning for >10k items
- Parallel execution of partitions
- Progress aggregation
