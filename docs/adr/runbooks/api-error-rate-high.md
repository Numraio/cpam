# Runbook: API High Error Rate

**Alert:** `APIErrorBudgetBurnRateCritical` or `APIErrorBudgetBurnRateWarning`

**Service:** API

**SLO Impact:** Availability (Target: 99.9%)

## Symptoms

- High rate of 5xx errors across API endpoints
- Error budget burning faster than sustainable rate
- Users experiencing failed requests

## Investigation Steps

### 1. Check Alert Context

```bash
# View alert details in AlertManager
# Check which endpoints are affected
```

Look for:
- Specific endpoints with high error rates
- Time the errors started
- Rate of error budget consumption

### 2. Check Recent Deployments

```bash
# Check recent git deployments
git log --since="2 hours ago" --oneline

# Check if rollback is needed
```

**Action:** If deployment within last hour, consider immediate rollback.

### 3. Check Application Logs

```bash
# View recent error logs
# Filter by severity=error, last 15 minutes
```

Look for:
- Stack traces indicating root cause
- Database connection errors
- External API timeout errors
- Authentication/authorization failures

### 4. Check Database Health

```bash
# Check database connection pool
# Query: db_connection_errors_total

# Check query performance
# Query: db_query_duration_seconds{quantile="0.95"}
```

**Common Issues:**
- Connection pool exhausted → Scale database connections
- Slow queries → Check for missing indexes
- Database unavailable → Check database status

### 5. Check External Dependencies

```bash
# Check Stripe API status
curl -I https://status.stripe.com

# Check other external services
```

**Action:** If external service is down, implement circuit breaker or graceful degradation.

### 6. Check Resource Utilization

```bash
# CPU usage
# Query: process_cpu_seconds_total

# Memory usage
# Query: process_resident_memory_bytes

# Request rate
# Query: rate(api_requests_total[5m])
```

**Common Issues:**
- High CPU → Scale horizontally
- Memory leak → Restart service, investigate leak
- Traffic spike → Scale up, check for DDoS

## Resolution Steps

### Immediate Actions (< 5 minutes)

1. **If recent deployment:**
   ```bash
   # Rollback to previous version
   git revert HEAD
   # Deploy previous version
   ```

2. **If database issues:**
   ```bash
   # Increase connection pool size (temporary)
   # Kill long-running queries
   # Scale database if needed
   ```

3. **If resource exhaustion:**
   ```bash
   # Scale API service horizontally
   # Add more replicas/instances
   ```

### Short-term Fixes (< 30 minutes)

1. **Implement circuit breaker** for failing external dependencies
2. **Add rate limiting** if traffic spike
3. **Optimize hot path** queries if database bottleneck
4. **Add caching** for expensive operations

### Long-term Prevention

1. **Add integration tests** for the failing scenario
2. **Implement chaos engineering** to test failure modes
3. **Add monitoring** for the root cause metric
4. **Update runbook** with lessons learned

## Escalation

- **< 5 minutes:** Attempt immediate fixes
- **5-15 minutes:** Engage backend team lead
- **> 15 minutes:** Page on-call engineer + CTO
- **> 30 minutes:** Initiate incident call, update status page

## Communication

1. **Internal:**
   - Post in `#incidents` Slack channel
   - Update incident tracking system
   - Notify affected teams

2. **External (if customer-facing):**
   - Update status page: https://status.example.com
   - Post incident update every 30 minutes
   - Send post-mortem after resolution

## Post-Incident

1. **Verify resolution:**
   ```bash
   # Check error rate returned to normal
   # Query: rate(api_errors_total[5m])

   # Check error budget recovered
   # Query: 1 - (sum(rate(api_errors_total[1h])) / sum(rate(api_requests_total[1h])))
   ```

2. **Schedule post-mortem** within 48 hours
3. **Document timeline** and root cause
4. **Create action items** to prevent recurrence
5. **Update runbook** if new information discovered

## Related Alerts

- `HighErrorRate` - Generic high error rate
- `ServiceDown` - Complete service outage
- `DatabaseConnectionPoolExhausted` - Database connection issues

## Useful Queries

```promql
# Overall error rate
sum(rate(api_errors_total[5m])) / sum(rate(api_requests_total[5m]))

# Error rate by endpoint
sum(rate(api_errors_total[5m])) by (method, path) / sum(rate(api_requests_total[5m])) by (method, path)

# Error rate by status code
sum(rate(api_requests_total{status_code=~"5.."}[5m])) by (status_code)

# Error budget remaining
1 - (
  sum(rate(api_errors_total[30d])) /
  sum(rate(api_requests_total[30d]))
) / (1 - 0.999)
```

## References

- [API Service Architecture](../api-architecture.md)
- [Database Scaling Guide](../database-scaling.md)
- [Incident Response Process](../incident-response.md)
