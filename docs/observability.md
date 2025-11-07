## Observability

OpenTelemetry-based observability with traces, metrics, and PII-filtered logs.

## Overview

The observability stack provides:

- **Distributed tracing** - Track requests across services
- **Custom metrics** - Monitor SLO indicators (calc runtime, ingestion lag, queue depth)
- **PII filtering** - Automatic removal of sensitive data from logs/traces
- **Prometheus endpoint** - Export metrics for scraping
- **Grafana dashboards** - Pre-built dashboards for monitoring

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Application│─────▶│  OTel SDK    │─────▶│  Collector   │
│   (Traces)   │      │  (Process)   │      │  (Optional)  │
└─────────────┘      └──────────────┘      └──────────────┘
                              │                     │
                              ▼                     ▼
                     ┌──────────────┐      ┌──────────────┐
                     │ PII Filter   │      │  Backend     │
                     │ (Sanitize)   │      │ (Jaeger/etc) │
                     └──────────────┘      └──────────────┘

┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Prometheus │◀─────│ /api/metrics │◀─────│  Metrics     │
│  (Scrape)   │      │  (Export)    │      │  Service     │
└─────────────┘      └──────────────┘      └──────────────┘
        │
        ▼
┌─────────────┐
│   Grafana   │
│ (Visualize) │
└─────────────┘
```

## Environment Variables

```bash
# OpenTelemetry
OTEL_PREFIX=cpam                                    # Metric prefix
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # OTel collector endpoint
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=...            # Metrics endpoint
OTEL_EXPORTER_OTLP_METRICS_HEADERS=...             # Auth headers
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc           # Protocol

# Metrics endpoint (optional auth)
METRICS_TOKEN=your-secret-token                     # Bearer token for /api/metrics
```

## Distributed Tracing

### Trace Calculation

```typescript
import { traceCalculation } from '@/lib/observability/tracer';

const result = await traceCalculation(
  batchId,
  tenantId,
  pamId,
  async () => {
    // Calculation logic
    return await executeCalculationBatch(batch);
  }
);

// Automatically adds span with:
// - calc.batch_id
// - calc.tenant_id
// - calc.pam_id
// - calc.duration_ms
```

### Trace Ingestion

```typescript
import { traceIngestion } from '@/lib/observability/tracer';

const result = await traceIngestion(
  tenantId,
  'OANDA',
  ['EUR_USD', 'GBP_USD'],
  async () => {
    // Ingestion logic
    return await runIngestion(adapter, request);
  }
);

// Automatically adds span with:
// - ingestion.tenant_id
// - ingestion.provider
// - ingestion.series_count
// - ingestion.duration_ms
```

### Trace API Request

```typescript
import { traceAPIRequest } from '@/lib/observability/tracer';

export default async function handler(req, res) {
  return traceAPIRequest(
    req.method,
    req.url,
    tenantId,
    async () => {
      // API logic
      return await processRequest(req);
    }
  );
}

// Automatically adds span with:
// - http.method
// - http.path
// - tenant.id
```

### Custom Spans

```typescript
import { traced, addSpanAttributes, addSpanEvent } from '@/lib/observability/tracer';

await traced(
  'custom.operation',
  async (span) => {
    // Add custom attributes
    span.setAttributes({
      'operation.type': 'batch',
      'operation.size': 1000,
    });

    // Add event
    addSpanEvent('processing.started');

    await doWork();

    addSpanEvent('processing.completed');
  }
);
```

## Custom Metrics

### Initialize Metrics

```typescript
import { initializeMetrics } from '@/lib/observability/metrics';

// Call once at startup
initializeMetrics();
```

### Record Calculation Metrics

```typescript
import { recordCalcBatch } from '@/lib/observability/metrics';

const startTime = Date.now();
// ... execute calculation
const duration = Date.now() - startTime;

recordCalcBatch(
  'completed',          // or 'failed'
  duration,
  tenantId,
  itemCount
);

// Records:
// - calc.batch.total (counter)
// - calc.runtime.seconds (histogram)
```

### Record Ingestion Metrics

```typescript
import { recordIngestion, calculateIngestionLag } from '@/lib/observability/metrics';

const lagSeconds = calculateIngestionLag(
  dataTimestamp,
  ingestedAt
);

recordIngestion(
  'OANDA',
  'success',
  lagSeconds,
  fetchedCount,
  upsertedCount
);

// Records:
// - ingestion.total (counter)
// - ingestion.lag.seconds (histogram)
// - ingestion.data_quality (histogram)
```

### Record API Metrics

```typescript
import { recordAPIRequest } from '@/lib/observability/metrics';

const startTime = Date.now();
// ... handle request
const duration = Date.now() - startTime;

recordAPIRequest(
  req.method,
  req.url,
  res.statusCode,
  duration,
  tenantId
);

// Records:
// - api.requests.total (counter)
// - api.latency.seconds (histogram)
// - api.errors.total (counter, if statusCode >= 400)
```

### Observable Metrics

These metrics are automatically collected:

- **queue.depth** - Number of queued + running batches
- **tenants.active** - Active tenants (last 24h)

## PII Filtering

### Filter String

```typescript
import { filterPII } from '@/lib/observability/pii-filter';

const message = 'User john@example.com logged in from 555-123-4567';
const safe = filterPII(message);

// Result: 'User jo***@example.com logged in from ***-***-****'
```

### Filter Object

```typescript
import { filterPIIFromObject } from '@/lib/observability/pii-filter';

const data = {
  user: {
    email: 'alice@example.com',
    password: 'secret123',
    phone: '555-123-4567',
  },
};

const safe = filterPIIFromObject(data);

// Result:
// {
//   user: {
//     email: 'al***@example.com',
//     password: '[REDACTED]',  // Sensitive field name
//     phone: '***-***-****',
//   }
// }
```

### Safe Logging

```typescript
import { safeLog, safeError } from '@/lib/observability/pii-filter';

// Safe console.log
safeLog('User action', {
  email: 'user@example.com',
  action: 'login',
});

// Safe console.error
safeError('Operation failed', error, {
  user: { email: 'user@example.com' },
});
```

### Sanitize Span Attributes

```typescript
import { sanitizeSpanAttributes } from '@/lib/observability/pii-filter';

const attributes = {
  'user.email': 'test@example.com',
  'user.id': '123',
};

const safe = sanitizeSpanAttributes(attributes);
span.setAttributes(safe);
```

### Sensitive Fields

These field names are automatically redacted:

- `password`, `token`, `secret`
- `apikey`, `api_key`
- `accesstoken`, `access_token`
- `refreshtoken`, `refresh_token`
- `privatekey`, `private_key`
- `ssn`, `social_security`
- `creditcard`, `credit_card`
- `cvv`, `pin`

### Custom Patterns

```typescript
const filtered = filterPII(input, {
  customPatterns: [
    {
      pattern: /ACCT-\d+/g,
      replacement: 'ACCT-*****',
    },
  ],
});
```

## Prometheus Endpoint

### Metrics Endpoint

```bash
GET /api/metrics
```

**Response (Prometheus format):**
```
# HELP cpam_queue_depth Number of jobs in queue
# TYPE cpam_queue_depth gauge
cpam_queue_depth{status="queued"} 10
cpam_queue_depth{status="running"} 5
cpam_queue_depth{status="total"} 15

# HELP cpam_calc_batch_total Total calculation batches
# TYPE cpam_calc_batch_total counter
cpam_calc_batch_total{status="completed"} 1250
cpam_calc_batch_total{status="failed"} 12

# HELP cpam_calc_duration_seconds Average calculation duration
# TYPE cpam_calc_duration_seconds gauge
cpam_calc_duration_seconds 45.2

# HELP cpam_ingestion_lag_seconds Ingestion lag in seconds
# TYPE cpam_ingestion_lag_seconds gauge
cpam_ingestion_lag_seconds 120.5
...
```

### Optional Authentication

```typescript
// In pages/api/metrics.ts, uncomment:
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cpam'
    scrape_interval: 30s
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    # Optional: Add bearer token
    authorization:
      type: Bearer
      credentials: 'your-secret-token'
```

## Grafana Dashboards

### Import Dashboard

1. Open Grafana
2. Go to Dashboards > Import
3. Upload [grafana/dashboards/cpam-overview.json](../grafana/dashboards/cpam-overview.json)
4. Select Prometheus data source

### Dashboard Panels

**1. Queue Depth**
- Shows queued vs running jobs
- Alert fires if queue depth > 1000

**2. Calculation Runtime (p95)**
- 95th and 99th percentile runtimes
- Target: < 5 minutes for 10k items

**3. Ingestion Lag**
- Time between data availability and ingestion
- Alert fires if lag > 1 hour

**4. API Error Rate**
- Error rate vs total request rate
- Monitor for spikes

**5. Active Tenants**
- Number of active tenants (last 24h)

**6. Calculation Success Rate**
- Percentage of successful calculations
- Target: > 99%

### Create Custom Dashboard

```json
{
  "dashboard": {
    "title": "Custom Dashboard",
    "panels": [
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "cpam_queue_depth{status=\"total\"}"
          }
        ]
      }
    ]
  }
}
```

## SLO Monitoring

### Target SLOs

- **Calculation runtime**: < 5 minutes for 10k items (p95)
- **Ingestion lag**: < 1 hour (p95)
- **API availability**: 99.9%
- **API latency**: < 500ms (p95)
- **Calculation success rate**: > 99%

### Alerting Rules

**Queue Depth Alert:**
```yaml
alert: QueueDepthHigh
expr: cpam_queue_depth{status="total"} > 1000
for: 5m
annotations:
  summary: Queue depth exceeds 1000 jobs
  description: Calculation queue has {{ $value }} jobs
```

**Ingestion Lag Alert:**
```yaml
alert: IngestionLagHigh
expr: cpam_ingestion_lag_seconds > 3600
for: 10m
annotations:
  summary: Ingestion lag exceeds 1 hour
  description: Data is {{ $value }}s behind
```

**API Error Rate Alert:**
```yaml
alert: APIErrorRateHigh
expr: rate(api_errors_total[5m]) / rate(api_requests_total[5m]) > 0.01
for: 5m
annotations:
  summary: API error rate exceeds 1%
  description: Error rate is {{ $value }}%
```

## Best Practices

### 1. Always Use Tracing for Critical Paths

```typescript
// ✅ Good: Wrap in trace
await traceCalculation(batchId, tenantId, pamId, async () => {
  return await executeCalculationBatch(batch);
});

// ❌ Bad: No tracing
await executeCalculationBatch(batch);
```

### 2. Record Metrics for All Operations

```typescript
// ✅ Good: Record metrics
const start = Date.now();
await doWork();
recordAPIRequest(method, path, statusCode, Date.now() - start);

// ❌ Bad: No metrics
await doWork();
```

### 3. Filter PII from All Logs

```typescript
// ✅ Good: Use safe logging
safeLog('User action', { email: user.email });

// ❌ Bad: Expose PII
console.log('User action', { email: user.email });
```

### 4. Add Context to Spans

```typescript
// ✅ Good: Rich context
await traced('operation', async (span) => {
  span.setAttributes({
    'operation.type': 'batch',
    'operation.size': 1000,
    'tenant.id': tenantId,
  });
  await doWork();
});

// ❌ Bad: No context
await traced('operation', async () => {
  await doWork();
});
```

### 5. Use Observable Gauges Carefully

```typescript
// ✅ Good: Efficient query
queueDepthGauge.addCallback(async (observableResult) => {
  const count = await prisma.calcBatch.count({
    where: { status: 'QUEUED' },
  });
  observableResult.observe(count);
});

// ❌ Bad: Expensive query on every scrape
queueDepthGauge.addCallback(async (observableResult) => {
  const batches = await prisma.calcBatch.findMany();
  observableResult.observe(batches.length);
});
```

## Troubleshooting

### Traces not appearing

**Cause:** OTel collector not configured

**Solution:**
1. Check `OTEL_EXPORTER_OTLP_ENDPOINT` is set
2. Verify collector is running
3. Check network connectivity

### Metrics not scraping

**Cause:** Prometheus can't reach endpoint

**Solution:**
1. Verify `/api/metrics` returns data
2. Check Prometheus configuration
3. Verify auth token if enabled

### High memory usage

**Cause:** Too many metrics/traces retained

**Solution:**
1. Reduce trace sampling rate
2. Limit metric cardinality (fewer labels)
3. Use metric aggregation

### PII leaking in logs

**Cause:** Not using safe logging

**Solution:**
1. Replace `console.log` with `safeLog`
2. Add custom patterns for domain-specific PII
3. Audit logs regularly

## Testing

See [__tests__/lib/observability/pii-filter.spec.ts](__tests__/lib/observability/pii-filter.spec.ts) for test cases:

- PII masking (email, phone, SSN, credit card)
- Object filtering with nested data
- Sensitive field redaction
- Custom pattern matching

## Related Documentation

- [Job Queue](./job-queue.md) - Queue depth monitoring
- [Data Ingestion](./data-ingestion.md) - Ingestion lag tracking
- [Calculation Orchestrator](./calculation-orchestrator.md) - Calculation runtime tracking

## Future Enhancements

- Log aggregation (ELK/Loki)
- Distributed tracing UI (Jaeger/Zipkin)
- Custom alerting integrations (PagerDuty, Slack)
- Anomaly detection for metrics
- Cost tracking per tenant
- Performance profiling integration
