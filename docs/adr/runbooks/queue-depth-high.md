# Runbook: Queue Depth High

**Alert:** `QueueDepthCritical` or `QueueDepthHigh`

**Service:** Queue / Background Processing

**SLO Impact:** Capacity (Target: < 1000 jobs)

## Symptoms

- Large backlog of calculation jobs
- Users experiencing delays in calculation results
- Queue continuing to grow despite processing

## Investigation Steps

### 1. Check Queue Metrics

```bash
# Check total queue depth
# Query: cpam_queue_depth{status="total"}

# Check queued vs running
# Query: cpam_queue_depth{status="queued"}
# Query: cpam_queue_depth{status="running"}

# Check queue growth rate
# Query: rate(cpam_queue_depth{status="total"}[15m])
```

Identify:
- Total jobs in queue
- How many are actively running
- Rate of queue growth
- How long the queue has been growing

### 2. Check Processing Rate

```bash
# Check completion rate
# Query: rate(cpam_calc_batch_total{status="completed"}[1h]) * 3600

# Check failure rate
# Query: rate(cpam_calc_batch_total{status="failed"}[1h]) * 3600

# Check average runtime
# Query: cpam_calc_duration_seconds
```

**Target:** 100 batches/hour minimum

**Common Issues:**
- Processing rate < job creation rate → Scale workers
- High failure rate → Fix failing calculations
- Long runtimes → Optimize calculation performance

### 3. Check Worker Health

```bash
# Check number of active workers
# Check worker CPU/memory usage
# Check for stuck/hanging jobs

# Query stuck jobs (running > 1 hour)
SELECT id, status, startedAt, userId
FROM CalcBatch
WHERE status = 'RUNNING'
  AND startedAt < NOW() - INTERVAL '1 hour';
```

**Common Issues:**
- Workers crashed → Restart workers
- Jobs hanging → Kill stuck jobs, fix bug
- Workers at capacity → Scale horizontally

### 4. Check for Traffic Spike

```bash
# Check job creation rate
# Query: rate(cpam_calc_batch_total[15m]) * 3600

# Check by tenant
SELECT teamId, COUNT(*) as job_count
FROM CalcBatch
WHERE status IN ('QUEUED', 'RUNNING')
GROUP BY teamId
ORDER BY job_count DESC
LIMIT 10;
```

**Common Issues:**
- Single tenant creating many jobs → Apply rate limiting
- Legitimate traffic spike → Scale workers
- Retry storm → Fix retry logic

### 5. Check Calculation Performance

```bash
# Check runtime by item count
# Query: histogram_quantile(0.95, rate(calc_runtime_seconds_bucket[15m])) by (item_count_bucket)

# Check for slow calculations
SELECT id, itemCount, startedAt,
       EXTRACT(EPOCH FROM (NOW() - startedAt)) as runtime_seconds
FROM CalcBatch
WHERE status = 'RUNNING'
ORDER BY runtime_seconds DESC
LIMIT 10;
```

## Resolution Steps

### Immediate Actions (< 5 minutes)

1. **Scale workers horizontally:**
   ```bash
   # Increase worker replicas
   # Add more background job processors
   # Example for Kubernetes:
   kubectl scale deployment cpam-worker --replicas=10
   ```

2. **Kill stuck jobs:**
   ```sql
   -- Mark hung jobs as failed
   UPDATE CalcBatch
   SET status = 'FAILED',
       completedAt = NOW(),
       error = 'Job timeout - exceeded 1 hour'
   WHERE status = 'RUNNING'
     AND startedAt < NOW() - INTERVAL '1 hour';
   ```

3. **Pause non-critical jobs** (if needed):
   ```bash
   # Pause low-priority tenants temporarily
   # Focus on high-priority/paying customers
   ```

### Short-term Fixes (< 30 minutes)

1. **Optimize calculation performance:**
   - Enable database query caching
   - Batch database operations
   - Parallelize independent calculations
   - Add indexes for calculation queries

2. **Implement priority queue:**
   ```typescript
   // Prioritize by:
   // 1. Paying customers
   // 2. Job size (small jobs first)
   // 3. Job age (FIFO within priority)
   ```

3. **Add rate limiting:**
   ```typescript
   // Limit jobs per tenant per hour
   // Example: 10 jobs/hour for free tier
   //          100 jobs/hour for paid tier
   ```

4. **Increase parallelism:**
   ```typescript
   // Process multiple jobs per worker
   // Use worker pools
   // Implement job batching
   ```

### Long-term Prevention

1. **Auto-scaling:**
   - Implement queue-depth based autoscaling
   - Scale workers when queue > 500
   - Scale down when queue < 100

2. **Performance optimization:**
   - Profile slow calculations
   - Cache intermediate results
   - Use incremental calculations
   - Optimize database queries

3. **Monitoring:**
   - Add queue age metrics
   - Track job wait time
   - Alert on processing rate drops

4. **Capacity planning:**
   - Document job processing capacity
   - Set tenant quota limits
   - Plan for growth

## Escalation

- **< 5 minutes:** Scale workers immediately
- **5-15 minutes:** Engage backend team lead
- **> 15 minutes:** Page on-call engineer
- **> 30 minutes:** Initiate incident call
- **Queue > 10,000:** Emergency response, consider pausing new jobs

## Communication

1. **Internal:**
   - Post in `#incidents` Slack channel
   - Notify affected teams
   - Update capacity planning docs

2. **External (if severe delays):**
   - Update status page
   - Email affected customers
   - Post ETA for queue clearing

## Post-Incident

1. **Verify resolution:**
   ```bash
   # Check queue depth back to normal
   # Query: cpam_queue_depth{status="total"} < 1000

   # Check processing rate recovered
   # Query: rate(cpam_calc_batch_total{status="completed"}[1h]) * 3600 > 100
   ```

2. **Analyze queue metrics:**
   - Review queue depth over time
   - Identify when queue started growing
   - Correlate with other events (deployments, traffic)

3. **Schedule post-mortem** within 48 hours
4. **Update capacity planning** based on findings
5. **Create optimization tickets**

## Related Alerts

- `CalcRuntimeExceeded` - Slow calculation performance
- `QueueProcessingRateLow` - Workers not keeping up
- `CalcErrorBudgetBurnRate` - Calculation failures

## Useful Queries

```promql
# Queue depth by status
cpam_queue_depth

# Queue growth rate (jobs/hour)
rate(cpam_queue_depth{status="total"}[1h]) * 3600

# Processing rate (completions/hour)
rate(cpam_calc_batch_total{status="completed"}[1h]) * 3600

# Failure rate
rate(cpam_calc_batch_total{status="failed"}[1h]) /
rate(cpam_calc_batch_total[1h])

# Average job wait time
avg(
  (cpam_calc_batch_started_timestamp - cpam_calc_batch_created_timestamp)
)

# p95 calculation runtime
histogram_quantile(0.95, rate(calc_runtime_seconds_bucket[15m]))
```

## Queue Depth Thresholds

| Queue Depth | Severity | Action Required |
|-------------|----------|-----------------|
| < 100 | Normal | No action |
| 100-500 | Elevated | Monitor closely |
| 500-1000 | Warning | Prepare to scale |
| 1000-5000 | High | Scale workers immediately |
| > 5000 | Critical | Emergency response |

## Common Root Causes and Solutions

| Root Cause | Detection | Solution |
|------------|-----------|----------|
| Traffic spike | Job creation rate spike | Scale workers, add rate limiting |
| Slow calculations | High p95 runtime | Optimize calculation performance |
| Worker failure | Workers not processing | Restart workers, fix bug |
| Database bottleneck | High DB query latency | Optimize queries, scale DB |
| Single tenant abuse | One tenant dominating queue | Apply rate limits, prioritization |
| Memory leak in worker | Worker memory grows | Restart workers periodically, fix leak |

## References

- [Background Job Architecture](../background-jobs.md)
- [Calculation Performance Guide](../calculation-performance.md)
- [Scaling Guide](../scaling.md)
- [Rate Limiting Strategy](../rate-limiting.md)
