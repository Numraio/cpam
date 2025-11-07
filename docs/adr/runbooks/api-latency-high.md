# Runbook: API High Latency

**Alert:** `APILatencyHigh` or `APILatencyElevated`

**Service:** API

**SLO Impact:** Latency (Target: p95 < 500ms)

## Symptoms

- API requests taking longer than expected
- Users experiencing slow page loads
- Timeout errors in client applications

## Investigation Steps

### 1. Check Latency Breakdown

```bash
# Check p95 latency by endpoint
# Query: histogram_quantile(0.95, rate(api_latency_seconds_bucket[5m])) by (method, path)

# Check p99 latency
# Query: histogram_quantile(0.99, rate(api_latency_seconds_bucket[5m]))
```

Identify:
- Which endpoints are slow
- Whether all endpoints are affected or just specific ones
- Latency trend over time

### 2. Check Database Query Performance

```bash
# Check database query latency
# Query: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) by (query_type)

# Check slow queries
# Look for queries > 1 second
```

**Common Issues:**
- Missing indexes → Add indexes for frequently queried fields
- N+1 queries → Use eager loading or batch queries
- Full table scans → Optimize query with WHERE clauses
- Lock contention → Check for long-running transactions

### 3. Check External API Calls

```bash
# Check external API latency
# Query: histogram_quantile(0.95, rate(external_api_duration_seconds_bucket[5m])) by (service)
```

**Common Issues:**
- Stripe API slow → Check Stripe status
- Data provider slow → Implement caching or fallback
- No timeouts set → Add request timeouts

### 4. Check Resource Utilization

```bash
# CPU usage
# Query: rate(process_cpu_seconds_total[5m])

# Memory usage
# Query: process_resident_memory_bytes

# Garbage collection time
# Query: nodejs_gc_duration_seconds{quantile="0.99"}
```

**Common Issues:**
- High CPU → Scale horizontally or optimize hot paths
- Memory pressure → Check for memory leaks, add caching
- GC pauses → Tune GC settings or reduce allocation rate

### 5. Check Network and Load Balancer

```bash
# Check network latency
# Check load balancer metrics

# Check connection pool
# Query: db_connection_pool_size
```

## Resolution Steps

### Immediate Actions (< 5 minutes)

1. **If specific endpoint is slow:**
   ```bash
   # Add caching for the endpoint
   # Increase cache TTL temporarily
   # Disable expensive features temporarily
   ```

2. **If database queries are slow:**
   ```bash
   # Kill long-running queries
   SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '5 minutes';

   # Scale database read replicas
   # Enable query caching
   ```

3. **If external API is slow:**
   ```bash
   # Increase request timeout
   # Enable circuit breaker
   # Fall back to cached data
   ```

### Short-term Fixes (< 30 minutes)

1. **Database optimization:**
   - Add missing indexes
   - Rewrite N+1 queries with joins/eager loading
   - Enable connection pooling
   - Add query result caching

2. **Application optimization:**
   - Add response caching (Redis)
   - Implement lazy loading for heavy resources
   - Optimize serialization (use streaming)
   - Add HTTP compression

3. **Scaling:**
   - Scale API service horizontally
   - Scale database read replicas
   - Add CDN for static assets

### Long-term Prevention

1. **Performance testing:**
   - Add load tests to CI/CD
   - Set performance budgets
   - Monitor performance trends

2. **Monitoring:**
   - Add distributed tracing (already implemented)
   - Add per-query metrics
   - Set up synthetic monitoring

3. **Architecture:**
   - Implement async processing for heavy operations
   - Add read-through caching layer
   - Consider GraphQL DataLoader for batch queries

## Escalation

- **< 5 minutes:** Attempt immediate fixes
- **5-15 minutes:** Engage backend team lead
- **> 15 minutes:** Page on-call engineer
- **> 30 minutes:** Initiate incident call

## Communication

1. **Internal:**
   - Post in `#incidents` Slack channel
   - Update incident tracker
   - Notify affected teams

2. **External (if severe):**
   - Update status page
   - Post incident update

## Post-Incident

1. **Verify resolution:**
   ```promql
   # Check p95 latency back to normal
   histogram_quantile(0.95, rate(api_latency_seconds_bucket[5m])) < 0.5

   # Check p99 latency
   histogram_quantile(0.99, rate(api_latency_seconds_bucket[5m])) < 1.0
   ```

2. **Review distributed traces** for the incident period
3. **Schedule post-mortem** within 48 hours
4. **Create performance optimization tickets**
5. **Update runbook** with findings

## Related Alerts

- `APIErrorBudgetBurnRate` - May be caused by timeouts
- `DatabaseConnectionPoolExhausted` - Database bottleneck
- `CalcRuntimeExceeded` - Calculation performance issues

## Useful Queries

```promql
# p95 latency by endpoint
histogram_quantile(0.95,
  sum(rate(api_latency_seconds_bucket[5m])) by (le, method, path)
)

# p99 latency
histogram_quantile(0.99, rate(api_latency_seconds_bucket[5m]))

# Slow request count (> 1s)
sum(rate(api_latency_seconds_bucket{le="1.0"}[5m]))

# Latency breakdown by service
histogram_quantile(0.95,
  sum(rate(api_latency_seconds_bucket[5m])) by (le, service)
)

# Database query latency
histogram_quantile(0.95,
  sum(rate(db_query_duration_seconds_bucket[5m])) by (le, query_type)
)
```

## Common Root Causes and Solutions

| Root Cause | Detection | Solution |
|------------|-----------|----------|
| Missing database index | `EXPLAIN ANALYZE` shows seq scan | Add index on filtered/joined columns |
| N+1 queries | Log shows many similar queries | Use eager loading or batching |
| External API timeout | External API metrics show high latency | Add timeout, circuit breaker, caching |
| Memory leak | Memory usage grows over time | Find leak with heap profiler, fix |
| CPU bottleneck | CPU usage near 100% | Scale horizontally or optimize hot path |
| Large response payload | Network metrics show high transfer time | Add pagination, compress response |

## References

- [Database Optimization Guide](../database-optimization.md)
- [Caching Strategy](../caching-strategy.md)
- [Performance Testing Guide](../performance-testing.md)
- [Distributed Tracing](../observability.md#distributed-tracing)
