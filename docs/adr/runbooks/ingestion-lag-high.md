# Runbook: Ingestion Lag High

**Alert:** `IngestionLagCritical` or `IngestionLagElevated`

**Service:** Data Ingestion

**SLO Impact:** Data Freshness (Target: < 1 hour)

## Symptoms

- Market data is stale/outdated
- Users seeing old prices in calculations
- Data timestamp significantly behind current time

## Investigation Steps

### 1. Check Ingestion Lag Metrics

```bash
# Check current lag
# Query: cpam_ingestion_lag_seconds

# Check lag by data source
SELECT source, AVG(EXTRACT(EPOCH FROM (NOW() - asOfDate))) as avg_lag_seconds
FROM IndexValue
WHERE ingestedAt > NOW() - INTERVAL '1 hour'
GROUP BY source;

# Check when lag started
# Review metrics dashboard for lag trend
```

Identify:
- Current lag in seconds/minutes
- Which data sources are lagging
- When the lag started
- Whether lag is growing or stable

### 2. Check Data Provider Status

```bash
# Check external data provider APIs
curl -I https://status.datavendor.com

# Check rate limits
# Review API response headers for rate limit info

# Check recent API errors
SELECT source, error, COUNT(*) as error_count
FROM IngestionLog
WHERE createdAt > NOW() - INTERVAL '1 hour'
  AND error IS NOT NULL
GROUP BY source, error;
```

**Common Issues:**
- Data provider API down → Wait for recovery, use cached data
- Rate limited → Implement backoff, request quota increase
- API format changed → Update parser, fix integration

### 3. Check Ingestion Job Status

```bash
# Check recent ingestion jobs
SELECT status, COUNT(*) as count, AVG(duration) as avg_duration
FROM IngestionJob
WHERE startedAt > NOW() - INTERVAL '2 hours'
GROUP BY status;

# Check for failed jobs
SELECT id, source, error, startedAt
FROM IngestionJob
WHERE status = 'FAILED'
  AND startedAt > NOW() - INTERVAL '1 hour'
ORDER BY startedAt DESC
LIMIT 20;

# Check for stuck jobs
SELECT id, source, startedAt,
       EXTRACT(EPOCH FROM (NOW() - startedAt)) as runtime_seconds
FROM IngestionJob
WHERE status = 'RUNNING'
ORDER BY runtime_seconds DESC;
```

**Common Issues:**
- Jobs failing → Check error logs, fix bug
- Jobs stuck → Kill stuck jobs, investigate deadlock
- Jobs slow → Optimize ingestion performance

### 4. Check Database Performance

```bash
# Check upsert performance
# Query: histogram_quantile(0.95, rate(db_upsert_duration_seconds_bucket[15m]))

# Check for lock contention
SELECT pid, query, wait_event, state
FROM pg_stat_activity
WHERE query LIKE '%IndexValue%'
  AND state != 'idle';

# Check table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename = 'IndexValue';
```

**Common Issues:**
- Slow upserts → Add indexes, batch operations
- Lock contention → Reduce transaction size
- Table bloat → Run VACUUM, consider partitioning

### 5. Check Scheduler

```bash
# Check ingestion schedule
# Verify cron jobs are running

# Check job queue depth
SELECT COUNT(*) as pending_jobs
FROM IngestionJob
WHERE status = 'QUEUED';

# Check job backlog age
SELECT MIN(createdAt) as oldest_pending_job
FROM IngestionJob
WHERE status = 'QUEUED';
```

## Resolution Steps

### Immediate Actions (< 5 minutes)

1. **If data provider is down:**
   ```typescript
   // Fall back to cached data
   // Enable stale-while-revalidate mode
   // Notify users data may be delayed
   ```

2. **If rate limited:**
   ```typescript
   // Implement exponential backoff
   // Reduce ingestion frequency temporarily
   // Request emergency quota increase
   ```

3. **Kill stuck jobs:**
   ```sql
   -- Mark hung jobs as failed
   UPDATE IngestionJob
   SET status = 'FAILED',
       completedAt = NOW(),
       error = 'Job timeout'
   WHERE status = 'RUNNING'
     AND startedAt < NOW() - INTERVAL '30 minutes';
   ```

4. **Scale ingestion workers:**
   ```bash
   # Add more workers for parallel ingestion
   kubectl scale deployment cpam-ingestion --replicas=5
   ```

### Short-term Fixes (< 30 minutes)

1. **Optimize ingestion performance:**
   ```typescript
   // Batch database upserts
   await prisma.indexValue.createMany({
     data: values,
     skipDuplicates: true
   });

   // Parallelize independent fetches
   const results = await Promise.all([
     fetchSource1(),
     fetchSource2(),
     fetchSource3()
   ]);

   // Add connection pooling
   // Cache parsed data
   ```

2. **Implement retry logic:**
   ```typescript
   // Exponential backoff for transient failures
   // Different retry strategies per error type
   // Circuit breaker for failing sources
   ```

3. **Prioritize critical data:**
   ```typescript
   // Ingest frequently-used indices first
   // Batch less critical data
   // Separate high/low priority queues
   ```

4. **Database optimization:**
   ```sql
   -- Add index on asOfDate for lag queries
   CREATE INDEX IF NOT EXISTS idx_indexvalue_asofdate ON IndexValue(asOfDate);

   -- Partition table by date if large
   -- Enable parallel workers
   ```

### Long-term Prevention

1. **Monitoring improvements:**
   - Add per-source lag metrics
   - Alert on ingestion job failures
   - Track API rate limit consumption

2. **Architecture improvements:**
   - Implement streaming ingestion
   - Add message queue (e.g., Kafka)
   - Use change data capture (CDC)
   - Implement delta ingestion

3. **Reliability improvements:**
   - Multiple data providers for critical data
   - Implement data validation
   - Add data quality checks
   - Store raw data for replay

4. **Performance improvements:**
   - Optimize data parsing
   - Use bulk inserts
   - Implement incremental ingestion
   - Add caching layer

## Escalation

- **< 5 minutes:** Attempt immediate fixes
- **5-15 minutes:** Engage data team lead
- **> 15 minutes:** Page on-call engineer
- **> 1 hour lag:** Notify customers, post status update
- **> 2 hours lag:** Emergency response, consider manual data load

## Communication

1. **Internal:**
   - Post in `#incidents` Slack channel
   - Notify data team
   - Update data freshness dashboard

2. **External (if lag > 1 hour):**
   - Update status page
   - Notify affected customers
   - Post ETA for data catch-up

## Post-Incident

1. **Verify resolution:**
   ```bash
   # Check lag back to normal
   # Query: cpam_ingestion_lag_seconds < 3600

   # Check all sources current
   SELECT source,
          MAX(asOfDate) as latest_data,
          MAX(ingestedAt) as latest_ingestion,
          EXTRACT(EPOCH FROM (NOW() - MAX(asOfDate))) as lag_seconds
   FROM IndexValue
   GROUP BY source;
   ```

2. **Verify data quality:**
   ```sql
   -- Check for data gaps
   -- Verify all expected data points exist
   -- Run data validation queries
   ```

3. **Backfill missing data** if needed
4. **Schedule post-mortem** within 48 hours
5. **Update ingestion monitoring** based on findings
6. **Create reliability tickets**

## Related Alerts

- `IngestionFailureRateHigh` - Ingestion jobs failing
- `DataQualityDegraded` - Data quality issues
- `CalcErrorBudgetBurnRate` - May be caused by stale data

## Useful Queries

```promql
# Current ingestion lag
cpam_ingestion_lag_seconds

# Ingestion rate (values/sec)
rate(cpam_ingestion_values_total[5m])

# Ingestion failure rate
rate(ingestion_total{status="failure"}[15m]) /
rate(ingestion_total[15m])

# Lag by source
avg(
  (cpam_ingestion_timestamp - cpam_data_asof_timestamp)
) by (source)
```

```sql
-- Data freshness by source
SELECT source,
       MAX(asOfDate) as latest_data,
       EXTRACT(EPOCH FROM (NOW() - MAX(asOfDate))) as lag_seconds
FROM IndexValue
GROUP BY source
ORDER BY lag_seconds DESC;

-- Ingestion throughput
SELECT DATE_TRUNC('hour', ingestedAt) as hour,
       COUNT(*) as values_ingested,
       COUNT(DISTINCT source) as sources
FROM IndexValue
WHERE ingestedAt > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Failed ingestion jobs
SELECT source, error, COUNT(*) as failures
FROM IngestionJob
WHERE status = 'FAILED'
  AND startedAt > NOW() - INTERVAL '24 hours'
GROUP BY source, error
ORDER BY failures DESC;
```

## Data Freshness Thresholds

| Lag | Severity | Impact |
|-----|----------|--------|
| < 15 min | Normal | No impact |
| 15-60 min | Elevated | Acceptable |
| 1-2 hours | Warning | Calculations may be stale |
| 2-4 hours | High | User experience degraded |
| > 4 hours | Critical | Calculations unreliable |

## Common Root Causes and Solutions

| Root Cause | Detection | Solution |
|------------|-----------|----------|
| Data provider API down | HTTP errors in logs | Use backup provider, cached data |
| Rate limiting | 429 responses | Implement backoff, increase quota |
| Database bottleneck | Slow upserts | Batch operations, add indexes |
| Parser bug | Job failures | Fix parser, add validation |
| Network issues | Timeouts | Add retry logic, increase timeout |
| Data volume spike | Increased runtime | Scale workers, optimize batching |

## References

- [Data Ingestion Architecture](../data-ingestion.md)
- [Data Provider Integration](../data-providers.md)
- [Database Optimization](../database-optimization.md)
- [Data Quality Framework](../data-quality.md)
