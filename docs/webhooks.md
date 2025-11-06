# Webhooks

Signed webhook notifications for domain events with automatic retries and idempotency.

## Overview

The webhook system uses [Svix](https://www.svix.com/) to deliver signed webhooks for key domain events:
- **Ingestion completed** - Index data ingestion finished
- **Calc batch completed** - Calculation batch finished (success or failure)
- **Calc batch approved** - Batch approved by user
- **Calc batch rejected** - Batch rejected by user

## Features

- ✅ **Signed webhooks** - HMAC signatures for authenticity verification
- ✅ **Automatic retries** - Exponential backoff on delivery failures
- ✅ **Idempotency** - Duplicate deliveries prevented via idempotency keys
- ✅ **Versioned events** - Schema version `v1` for backward compatibility
- ✅ **Per-tenant endpoints** - Each tenant manages their own webhook endpoints
- ✅ **Event filtering** - Subscribe to specific event types

## Event Types

### `ingestion.completed`
Fired when index data ingestion completes.

**Payload:**
```json
{
  "version": "v1",
  "type": "ingestion.completed",
  "eventId": "evt_1234567890_abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "tenantId": "tenant-123",
  "data": {
    "ingestionId": "ingest-456",
    "seriesCode": "WTI",
    "asOfDate": "2024-01-15",
    "versionTag": "final",
    "recordCount": 1000,
    "status": "SUCCESS"
  }
}
```

### `calc.batch.completed`
Fired when a calculation batch completes (success or failure).

**Payload:**
```json
{
  "version": "v1",
  "type": "calc.batch.completed",
  "eventId": "evt_1234567890_def456",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "tenantId": "tenant-123",
  "data": {
    "batchId": "batch-789",
    "pamId": "pam-101",
    "pamName": "Q4 PAM",
    "asOfDate": "2024-01-15",
    "status": "COMPLETED",
    "itemCount": 100,
    "executionTimeMs": 5000
  }
}
```

### `calc.batch.approved`
Fired when a batch is approved by a user.

**Payload:**
```json
{
  "version": "v1",
  "type": "calc.batch.approved",
  "eventId": "evt_1234567890_ghi789",
  "timestamp": "2024-01-15T11:00:00.000Z",
  "tenantId": "tenant-123",
  "data": {
    "batchId": "batch-789",
    "pamId": "pam-101",
    "pamName": "Q4 PAM",
    "asOfDate": "2024-01-15",
    "approvedBy": "user-123",
    "approvedAt": "2024-01-15T11:00:00.000Z",
    "itemCount": 100,
    "overrideCount": 5
  }
}
```

### `calc.batch.rejected`
Fired when a batch is rejected by a user.

**Payload:**
```json
{
  "version": "v1",
  "type": "calc.batch.rejected",
  "eventId": "evt_1234567890_jkl012",
  "timestamp": "2024-01-15T11:05:00.000Z",
  "tenantId": "tenant-123",
  "data": {
    "batchId": "batch-789",
    "pamId": "pam-101",
    "pamName": "Q4 PAM",
    "asOfDate": "2024-01-15",
    "rejectedBy": "user-456",
    "rejectedAt": "2024-01-15T11:05:00.000Z",
    "reason": "Pricing looks incorrect"
  }
}
```

## Setup

### 1. Configure Svix API Key

Set the `SVIX_API_KEY` environment variable:

```bash
# .env.local
SVIX_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
```

Get your API key from [Svix Dashboard](https://dashboard.svix.com/).

### 2. Create Webhook Endpoint

**Via API:**
```bash
curl -X POST https://your-app.com/api/webhooks/endpoints \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks",
    "eventTypes": [
      "calc.batch.completed",
      "calc.batch.approved"
    ],
    "description": "Production webhook"
  }'
```

**Response:**
```json
{
  "endpoint": {
    "id": "ep_1234567890",
    "url": "https://your-server.com/webhooks",
    "eventTypes": ["calc.batch.completed", "calc.batch.approved"],
    "enabled": true,
    "description": "Production webhook"
  }
}
```

### 3. Get Signing Secret

```bash
curl https://your-app.com/api/webhooks/endpoints/ep_1234567890/secret \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "secret": "whsec_xxxxxxxxxxxxxxxxxxxxx"
}
```

Save this secret securely - you'll need it to verify webhook signatures.

## Receiving Webhooks

### Basic Webhook Receiver

```typescript
import { verifyWebhookSignature } from '@/lib/webhooks/webhook-service';
import type { WebhookEvent } from '@/lib/webhooks/events';

export default async function handler(req, res) {
  // 1. Get the raw body (required for signature verification)
  const rawBody = JSON.stringify(req.body);

  // 2. Get Svix headers
  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  // 3. Verify signature
  const secret = process.env.WEBHOOK_SECRET!;
  const isValid = verifyWebhookSignature(rawBody, headers, secret);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 4. Process event
  const event: WebhookEvent = req.body;

  console.log('Received webhook:', event.type, event.eventId);

  switch (event.type) {
    case 'calc.batch.completed':
      await handleCalcCompleted(event.data);
      break;

    case 'calc.batch.approved':
      await handleCalcApproved(event.data);
      break;

    // ... other event types
  }

  // 5. Return 200 OK to acknowledge receipt
  return res.status(200).json({ received: true });
}
```

### Idempotency Handling

Use the `eventId` to prevent duplicate processing:

```typescript
const processedEvents = new Set<string>();

export default async function handler(req, res) {
  const event: WebhookEvent = req.body;

  // Check if already processed
  if (processedEvents.has(event.eventId)) {
    console.log('Duplicate event, ignoring:', event.eventId);
    return res.status(200).json({ received: true });
  }

  // Process event
  await processEvent(event);

  // Mark as processed
  processedEvents.add(event.eventId);

  return res.status(200).json({ received: true });
}
```

### Database-Backed Idempotency

For production, use a database:

```typescript
export default async function handler(req, res) {
  const event: WebhookEvent = req.body;

  // Check if already processed
  const existing = await prisma.processedWebhook.findUnique({
    where: { eventId: event.eventId },
  });

  if (existing) {
    return res.status(200).json({ received: true });
  }

  // Process event in transaction
  await prisma.$transaction(async (tx) => {
    // Process event
    await processEvent(event, tx);

    // Mark as processed
    await tx.processedWebhook.create({
      data: {
        eventId: event.eventId,
        eventType: event.type,
        processedAt: new Date(),
      },
    });
  });

  return res.status(200).json({ received: true });
}
```

## API Reference

### Create Webhook Endpoint

```
POST /api/webhooks/endpoints
```

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Body:**
```json
{
  "url": "https://your-server.com/webhooks",
  "eventTypes": ["calc.batch.completed", "calc.batch.approved"],
  "description": "Production webhook"
}
```

**Response:**
```json
{
  "endpoint": {
    "id": "ep_1234567890",
    "url": "https://your-server.com/webhooks",
    "eventTypes": ["calc.batch.completed", "calc.batch.approved"],
    "enabled": true,
    "description": "Production webhook"
  }
}
```

### List Webhook Endpoints

```
GET /api/webhooks/endpoints
```

**Response:**
```json
{
  "endpoints": [
    {
      "id": "ep_1234567890",
      "url": "https://your-server.com/webhooks",
      "eventTypes": ["calc.batch.completed"],
      "enabled": true,
      "description": "Production webhook"
    }
  ]
}
```

### Update Webhook Endpoint

```
PATCH /api/webhooks/endpoints/:id
```

**Body:**
```json
{
  "url": "https://new-server.com/webhooks",
  "eventTypes": ["calc.batch.completed", "calc.batch.approved", "calc.batch.rejected"],
  "enabled": true,
  "description": "Updated webhook"
}
```

### Delete Webhook Endpoint

```
DELETE /api/webhooks/endpoints/:id
```

### Get Endpoint Secret

```
GET /api/webhooks/endpoints/:id/secret
```

**Response:**
```json
{
  "secret": "whsec_xxxxxxxxxxxxxxxxxxxxx"
}
```

## Programmatic Usage

### Emitting Webhooks

```typescript
import { deliverWebhookSafe, buildCalcBatchCompletedEvent } from '@/lib/webhooks';

// After calculation completes
const event = buildCalcBatchCompletedEvent(tenantId, {
  batchId: batch.id,
  pamId: batch.pamId,
  pamName: batch.pam.name,
  asOfDate: batch.asOfDate.toISOString(),
  status: 'COMPLETED',
  itemCount: batch.results.length,
  executionTimeMs: executionTime,
});

const result = await deliverWebhookSafe(tenantId, event);

if (!result.success) {
  console.error('Webhook delivery failed:', result.error);
}
```

### Event Builders

```typescript
import {
  buildIngestionCompletedEvent,
  buildCalcBatchCompletedEvent,
  buildCalcBatchApprovedEvent,
  buildCalcBatchRejectedEvent,
} from '@/lib/webhooks/events';

// Ingestion completed
const ingestEvent = buildIngestionCompletedEvent(tenantId, {
  ingestionId: 'ingest-123',
  seriesCode: 'WTI',
  asOfDate: '2024-01-15',
  versionTag: 'final',
  recordCount: 1000,
  status: 'SUCCESS',
});

// Calc batch completed
const calcEvent = buildCalcBatchCompletedEvent(tenantId, {
  batchId: 'batch-456',
  pamId: 'pam-789',
  pamName: 'Q4 PAM',
  asOfDate: '2024-01-15',
  status: 'COMPLETED',
  itemCount: 100,
  executionTimeMs: 5000,
});

// Batch approved
const approvedEvent = buildCalcBatchApprovedEvent(tenantId, {
  batchId: 'batch-456',
  pamId: 'pam-789',
  pamName: 'Q4 PAM',
  asOfDate: '2024-01-15',
  approvedBy: 'user-123',
  approvedAt: new Date().toISOString(),
  itemCount: 100,
  overrideCount: 5,
});
```

## Retry Behavior

Svix automatically retries failed deliveries with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 5 seconds later
- **Attempt 3**: 5 minutes later
- **Attempt 4**: 30 minutes later
- **Attempt 5**: 2 hours later
- **Attempt 6**: 5 hours later
- **Attempt 7**: 10 hours later
- **Attempt 8**: 10 hours later (final)

Your endpoint should return:
- **200-299**: Success (no retry)
- **400-499**: Client error (no retry, except 429)
- **500-599**: Server error (will retry)

## Signature Verification

### Manual Verification

If not using the `verifyWebhookSignature` utility:

```typescript
import { Svix } from 'svix';

const wh = new Svix.Webhook(secret);

try {
  wh.verify(payload, headers);
  // Signature valid
} catch (err) {
  // Signature invalid
}
```

### Headers

Svix includes three headers for verification:
- `svix-id`: Message ID
- `svix-timestamp`: Unix timestamp
- `svix-signature`: HMAC signature (may include multiple versions separated by spaces)

## Testing

### Local Testing with Svix Play

1. Go to [Svix Play](https://play.svix.com/)
2. Create a test endpoint
3. Send test webhooks
4. Verify signature verification works

### ngrok for Local Development

```bash
# Start ngrok
ngrok http 3000

# Use ngrok URL as webhook endpoint
https://abc123.ngrok.io/api/webhooks/receiver
```

### Testing Webhook Delivery

```typescript
import { deliverWebhook, buildCalcBatchCompletedEvent } from '@/lib/webhooks';

// Create test event
const event = buildCalcBatchCompletedEvent('tenant-test', {
  batchId: 'batch-test',
  pamId: 'pam-test',
  pamName: 'Test PAM',
  asOfDate: '2024-01-15',
  status: 'COMPLETED',
  itemCount: 10,
  executionTimeMs: 1000,
});

// Deliver webhook
const messageId = await deliverWebhook('tenant-test', event);
console.log('Delivered:', messageId);
```

## Best Practices

### 1. Return 200 Quickly

Process webhooks asynchronously:

```typescript
export default async function handler(req, res) {
  const event: WebhookEvent = req.body;

  // Verify signature first
  if (!verifyWebhookSignature(...)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Queue for background processing
  await queue.enqueue(event);

  // Return 200 immediately
  return res.status(200).json({ received: true });
}
```

### 2. Handle Idempotency

Always check `eventId` to prevent duplicate processing.

### 3. Log Webhook Receipts

```typescript
console.log('Webhook received:', {
  eventId: event.eventId,
  type: event.type,
  timestamp: event.timestamp,
});
```

### 4. Monitor Webhook Failures

Set up alerts for repeated delivery failures.

### 5. Rotate Secrets Regularly

Rotate webhook secrets every 90 days for security.

## Troubleshooting

### Webhooks not being delivered

**Check:**
1. Endpoint URL is accessible from internet
2. Endpoint returns 200 status code
3. No firewall blocking Svix IPs

### Signature verification failing

**Check:**
1. Using correct secret for endpoint
2. Verifying raw body (not parsed JSON)
3. All three Svix headers present

### Duplicate webhook processing

**Solution:** Implement idempotency using `eventId`

## Security

- ✅ **Always verify signatures** - Reject webhooks with invalid signatures
- ✅ **Use HTTPS** - Webhook endpoints must use HTTPS in production
- ✅ **Rotate secrets** - Rotate webhook secrets regularly
- ✅ **Rate limiting** - Implement rate limiting on webhook receiver
- ✅ **Timeout protection** - Set timeouts on webhook processing

## Related Documentation

- [Svix Documentation](https://docs.svix.com/)
- [Event Types](./events.md)
- [Audit Logging](./audit-logging.md)
