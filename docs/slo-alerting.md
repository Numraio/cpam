# SLO & Alerting Guide

Comprehensive guide to Service Level Objectives, error budgets, alerting, and incident response for CPAM.

## Table of Contents

- [Overview](#overview)
- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
- [Error Budgets](#error-budgets)
- [Alerting Strategy](#alerting-strategy)
- [Runbooks](#runbooks)
- [Synthetic Monitoring](#synthetic-monitoring)
- [Health Checks](#health-checks)
- [Grafana Dashboards](#grafana-dashboards)
- [Incident Response](#incident-response)
- [Post-Mortem Process](#post-mortem-process)

## Overview

CPAM uses a data-driven approach to reliability based on Service Level Objectives (SLOs), error budgets, and multi-window burn-rate alerting. This approach balances reliability with velocity by quantifying acceptable risk.

### Key Principles

1. **SLOs over SLAs** - Internal targets based on user experience, not legal contracts
2. **Error budgets** - Acceptable amount of unreliability to enable innovation
3. **Burn-rate alerting** - Alert on rate of error budget consumption, not absolute thresholds
4. **Actionable alerts** - Every alert has a runbook and requires action
5. **Continuous improvement** - Regular SLO reviews and post-mortems

## Service Level Objectives (SLOs)

### API Service

**Availability SLO: 99.9%**
- **Measurement**: Success rate of API requests (non-5xx responses)
- **Window**: 30-day rolling window
- **Error budget**: 43.2 minutes of downtime per month
- **Measurement query**:
  ```promql
  1 - (sum(rate(api_errors_total[30d])) / sum(rate(api_requests_total[30d])))
  ```

**Latency SLO: p95 < 500ms**
- **Measurement**: 95th percentile response time for API requests
- **Window**: 30-day rolling window
- **Measurement query**:
  ```promql
  histogram_quantile(0.95, sum(rate(api_latency_seconds_bucket[5m])) by (le))
  ```

### Calculation Service

**Availability SLO: 99.5%**
- **Measurement**: Success rate of calculation batches
- **Window**: 30-day rolling window
- **Error budget**: 3.6 hours of failures per month
- **Measurement query**:
  ```promql
  sum(rate(cpam_calc_batch_total{status="completed"}[30d])) / sum(rate(cpam_calc_batch_total[30d]))
  ```

**Performance SLO: p95 < 5 minutes (for 10k items)**
- **Measurement**: 95th percentile calculation runtime
- **Window**: 30-day rolling window
- **Measurement query**:
  ```promql
  histogram_quantile(0.95, sum(rate(calc_runtime_seconds_bucket{item_count_bucket="1001-10000"}[15m])) by (le))
  ```

### Ingestion Service

**Data Freshness SLO: < 1 hour lag**
- **Measurement**: Time between data asOfDate and ingestedAt
- **Window**: 30-day rolling window
- **Error budget**: Data can be >1 hour stale for 3.6 hours/month
- **Measurement query**:
  ```promql
  cpam_ingestion_lag_seconds
  ```

**Availability SLO: 99.9%**
- **Measurement**: Success rate of ingestion operations
- **Window**: 30-day rolling window
- **Measurement query**:
  ```promql
  1 - (sum(rate(ingestion_total{status="failure"}[30d])) / sum(rate(ingestion_total[30d])))
  ```

### Queue Service

**Capacity SLO: < 1000 jobs in queue**
- **Measurement**: Total jobs queued
- **Window**: 30-day rolling window
- **Error budget**: Queue can exceed 1000 for 3.6 hours/month
- **Measurement query**:
  ```promql
  cpam_queue_depth{status="total"}
  ```

**Processing Rate SLO: > 100 batches/hour**
- **Measurement**: Completion rate
- **Window**: 1-hour rolling window
- **Measurement query**:
  ```promql
  rate(cpam_calc_batch_total{status="completed"}[1h]) * 3600
  ```

### Platform Composite SLO

**Overall SLO: 99.9%**
- **Calculation**: Weighted average of service SLOs
  - API Availability: 50% weight
  - Calculation Success: 30% weight
  - Data Freshness: 20% weight

**Measurement query**:
```promql
(
  0.5 * (1 - (sum(rate(api_errors_total[30d])) / sum(rate(api_requests_total[30d])))) +
  0.3 * (sum(rate(cpam_calc_batch_total{status="completed"}[30d])) / sum(rate(cpam_calc_batch_total[30d]))) +
  0.2 * (1 - clamp_max(cpam_ingestion_lag_seconds / 3600, 1))
)
```

## Error Budgets

### What is an Error Budget?

An error budget is the maximum amount of unreliability allowed within the SLO target. It's calculated as:

```
Error Budget = 1 - SLO Target
```

For a 99.9% availability SLO over 30 days:
```
Error Budget = 1 - 0.999 = 0.001 = 0.1%
Time Budget = 30 days * 0.001 = 43.2 minutes
```

### Error Budget Policy

**100-75% Budget Remaining:**
- Status: **Healthy**
- Action: Normal development velocity
- Deployments: Unrestricted
- Focus: Feature development

**75-50% Budget Remaining:**
- Status: **Attention Required**
- Action: Increase monitoring
- Deployments: Add extra caution
- Focus: Balance features with reliability

**50-25% Budget Remaining:**
- Status: **Warning**
- Action: Reliability reviews required
- Deployments: Restrict to critical fixes
- Focus: Primarily reliability improvements

**<25% Budget Remaining:**
- Status: **Critical**
- Action: Feature freeze
- Deployments: Only emergency fixes
- Focus: Exclusively reliability improvements

**Budget Exhausted (0%):**
- Status: **Emergency**
- Action: Complete feature freeze
- Deployments: Only incident response
- Focus: Restore SLO compliance

### Burn Rate

Burn rate measures how fast you're consuming your error budget:

```
Burn Rate = Error Rate / Error Budget
```

**Burn Rate Thresholds:**
- **14.4x burn rate** = Consuming 1% of monthly budget per hour (critical)
- **6x burn rate** = Consuming 5% of monthly budget in 6 hours (warning)
- **1x burn rate** = Consuming 10% of monthly budget in 3 days (info)

## Alerting Strategy

### Multi-Window Burn-Rate Alerting

We use Google SRE's multi-window burn-rate alerting methodology:

| Severity | Short Window | Long Window | Burn Rate | Budget Impact | Alert After |
|----------|--------------|-------------|-----------|---------------|-------------|
| Critical | 1h | 5m | 14.4x | 1% in 1h | 2 minutes |
| Warning | 6h | 30m | 6x | 5% in 6h | 15 minutes |
| Info | 3d | 6h | 1x | 10% in 3d | 1 hour |

### Alert Severity Levels

**Critical (Page immediately)**
- Service completely down
- Fast error budget burn (>14.4x)
- User-facing outage
- Response time: < 5 minutes
- Escalation: Page on-call engineer

**Warning (Notify team)**
- Moderate error budget burn (>6x)
- Performance degradation
- Non-critical service issues
- Response time: < 30 minutes
- Escalation: Slack notification, no page

**Info (Track and monitor)**
- Slow error budget burn (>1x)
- Capacity approaching limits
- Non-urgent issues
- Response time: Next business day
- Escalation: Dashboard visibility only

### Alert Configuration

Alerts are defined in:
- `/monitoring/prometheus-alerts.yaml` - Prometheus alerting rules
- `/monitoring/alertmanager.yaml` - AlertManager routing and receivers

### Alert Routing

**PagerDuty** (Critical only):
- Service down
- Fast error budget burn
- Database failures
- Critical SLO violations

**Slack Channels**:
- `#cpam-incidents` - Critical alerts
- `#cpam-alerts` - Warning alerts
- `#api-team-alerts` - API-specific alerts
- `#calc-team-alerts` - Calculation-specific alerts
- `#data-team-alerts` - Data/ingestion alerts
- `#ops-team-alerts` - Operations alerts

## Runbooks

Runbooks provide step-by-step incident response procedures. Located in `/docs/adr/runbooks/`:

### Available Runbooks

1. **[API Error Rate High](./adr/runbooks/api-error-rate-high.md)**
   - Alert: `APIErrorBudgetBurnRateCritical`
   - Covers: High 5xx error rates, error budget burning

2. **[API Latency High](./adr/runbooks/api-latency-high.md)**
   - Alert: `APILatencyHigh`
   - Covers: Slow API responses, timeout issues

3. **[Queue Depth High](./adr/runbooks/queue-depth-high.md)**
   - Alert: `QueueDepthCritical`
   - Covers: Job queue backlog, processing delays

4. **[Ingestion Lag High](./adr/runbooks/ingestion-lag-high.md)**
   - Alert: `IngestionLagCritical`
   - Covers: Stale data, ingestion failures

5. **[Service Down](./adr/runbooks/service-down.md)**
   - Alert: `ServiceDown`
   - Covers: Complete service outages

### Runbook Structure

Each runbook follows this structure:
1. **Symptoms** - What the user experiences
2. **Investigation Steps** - How to diagnose the issue
3. **Resolution Steps** - How to fix the issue (immediate, short-term, long-term)
4. **Escalation** - When and how to escalate
5. **Communication** - Internal and external communication
6. **Post-Incident** - Verification and follow-up

## Synthetic Monitoring

Synthetic monitoring proactively tests system health from an external perspective.

### Blackbox Exporter

Configuration: `/monitoring/synthetic-checks.yaml`

**Health Checks:**
- `GET /api/health` - Every 30 seconds
- `GET /api/metrics` - Every 60 seconds

**Endpoint Checks:**
- `GET /api/items` - Every 60 seconds (authenticated)
- `GET /api/calculations` - Every 60 seconds (authenticated)
- `GET /api/scenarios` - Every 60 seconds (authenticated)

**SSL Certificate Checks:**
- Certificate expiry monitoring - Every hour
- Alerts 30 days before expiration

**DNS Checks:**
- DNS resolution for all domains - Every 30 seconds

### End-to-End Tests

**CronJob Schedule**: Every 15 minutes

**Test Scenarios:**
1. User login
2. List items
3. Create calculation
4. Check metrics endpoint

**Metrics**: Published to Prometheus Pushgateway
- `e2e_test_success{test="login"}` - 0 or 1
- `e2e_test_success{test="list_items"}` - 0 or 1
- `e2e_test_success{test="create_calculation"}` - 0 or 1
- `e2e_test_success{test="metrics"}` - 0 or 1

**Alerts**:
- `E2ETestsFailing` - Test failing for 15+ minutes
- `E2ETestsNotRunning` - No metrics for 30+ minutes

## Health Checks

### API Endpoint

**URL**: `GET /api/health`

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.2.3",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database responding in 15ms",
      "responseTime": 15
    },
    "memory": {
      "status": "pass",
      "message": "Heap: 50MB / 100MB (50.0%)",
      "details": {
        "heapUsed": 50,
        "heapTotal": 100,
        "heapUsagePercent": "50.0"
      }
    }
  }
}
```

**Status Codes**:
- `200` - Healthy or degraded
- `503` - Unhealthy (service unavailable)

**Status Values**:
- `healthy` - All checks passing
- `degraded` - Some checks warning
- `unhealthy` - Some checks failing

### Detailed Health Check

**URL**: `GET /api/health?detailed=true`

Includes additional operational metrics:
```json
{
  "details": {
    "queueDepth": 150,
    "lastIngestion": "2024-01-01T11:55:00.000Z"
  }
}
```

### Health Check Thresholds

**Database Response Time**:
- < 100ms: `pass`
- 100-500ms: `warn`
- > 500ms: `fail`

**Memory Usage**:
- < 80%: `pass`
- 80-90%: `warn`
- > 90%: `fail`

## Grafana Dashboards

### SLO Dashboard

**Location**: `/grafana/dashboards/slo-dashboard.json`

**Panels**:
1. API Availability SLO (99.9%)
2. API Error Budget Remaining
3. API Latency p95 (Target: <500ms)
4. Calculation Success Rate (Target: 99.5%)
5. API Error Budget Burn Rate (1h, 6h, 3d)
6. API Availability Over Time
7. Ingestion Lag (Target: <1 hour)
8. Queue Depth (Target: <1000)
9. Calculation Runtime p95 (Target: <5min)
10. Platform SLO (Composite)
11. Error Budget Time Remaining (API)
12. SLO Status Summary (Table)
13. Active Incidents
14. Recent Alert History

**Refresh Rate**: 30 seconds

**Time Range**: Last 30 days (configurable)

### CPAM Overview Dashboard

**Location**: `/grafana/dashboards/cpam-overview.json`

**Panels**:
- Queue Depth
- Calculation Runtime (p95)
- Ingestion Lag
- API Error Rate
- Active Tenants
- Calculation Success Rate

## Incident Response

### Incident Severity

**Severity 1 (Critical)**
- Complete service outage
- Data loss or corruption
- Security breach
- **Response Time**: < 5 minutes
- **Escalation**: Immediate page to on-call + CTO

**Severity 2 (High)**
- Partial service outage
- Major feature broken
- SLO at risk (fast burn rate)
- **Response Time**: < 15 minutes
- **Escalation**: Page on-call engineer

**Severity 3 (Medium)**
- Performance degradation
- Non-critical feature broken
- SLO warning (moderate burn rate)
- **Response Time**: < 30 minutes
- **Escalation**: Notify team in Slack

**Severity 4 (Low)**
- Minor issues
- Cosmetic bugs
- Info-level alerts
- **Response Time**: Next business day
- **Escalation**: Track in issue tracker

### Incident Response Process

**1. Detection (0-2 minutes)**
- Alert fires in AlertManager
- On-call engineer paged via PagerDuty
- Alert posted in `#cpam-incidents`

**2. Acknowledgment (2-5 minutes)**
- On-call engineer acknowledges alert
- Reviews runbook
- Posts initial status in Slack

**3. Investigation (5-15 minutes)**
- Follow runbook investigation steps
- Check logs, metrics, traces
- Identify root cause

**4. Resolution (15-30 minutes)**
- Apply immediate fixes (rollback, restart, scale)
- Verify fix with metrics
- Monitor for stability

**5. Communication**
- **Internal**: Update `#cpam-incidents` every 15 minutes
- **External**: Update status page for Sev 1/2
- Post all-clear when resolved

**6. Post-Incident (Within 48 hours)**
- Schedule post-mortem
- Document timeline
- Create action items
- Update runbooks

### Status Page Updates

**Investigating**:
```
We are currently investigating issues with [Service].
We will provide updates every 15 minutes.
```

**Identified**:
```
We have identified the issue: [Brief description].
We are working on a fix.
```

**Monitoring**:
```
A fix has been applied. We are monitoring the situation.
```

**Resolved**:
```
The issue has been resolved. All services are operational.
We will post a detailed post-mortem within 48 hours.
```

## Post-Mortem Process

### When to Write a Post-Mortem

**Required**:
- Any Severity 1 or 2 incident
- Service down for >5 minutes
- Data loss or corruption
- Security incident
- Error budget >10% consumed in single incident

**Optional**:
- Severity 3 incidents with lessons learned
- Near-misses that could have been severe
- Recurring issues

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date**: YYYY-MM-DD
**Severity**: [1-4]
**Duration**: [X minutes]
**Impact**: [Description of user impact]
**Error Budget Consumed**: [X%]

## Summary
[2-3 sentence summary of what happened]

## Timeline
- **HH:MM** - [Event]
- **HH:MM** - [Event]
- **HH:MM** - [Resolved]

## Root Cause
[Detailed technical explanation]

## Impact
- Users affected: [Number/percentage]
- Services affected: [List]
- Revenue impact: [If applicable]
- Error budget consumed: [X%]

## What Went Well
- [Positive aspects of response]

## What Went Wrong
- [Issues in detection, response, or resolution]

## Action Items
1. [Action] - Owner: [Name] - Due: [Date]
2. [Action] - Owner: [Name] - Due: [Date]

## Lessons Learned
[Key takeaways]
```

### Post-Mortem Review

1. **Schedule**: Within 48 hours of incident resolution
2. **Attendees**: Incident responders + relevant teams
3. **Duration**: 60 minutes
4. **Facilitator**: Engineering manager or SRE
5. **Output**: Document + action items tracked in GitHub

### Follow-Up

- Post-mortem shared with entire engineering team
- Action items tracked in GitHub issues
- Runbooks updated based on learnings
- SLO review if budget significantly impacted

## Best Practices

### DO

✅ Define SLOs based on user experience
✅ Use error budgets to balance reliability and velocity
✅ Alert on burn rate, not absolute thresholds
✅ Write actionable runbooks for every critical alert
✅ Conduct blameless post-mortems
✅ Review and adjust SLOs quarterly
✅ Use synthetic monitoring to detect issues early
✅ Track error budget consumption in dashboards

### DON'T

❌ Set SLOs based on current performance
❌ Alert on everything (causes alert fatigue)
❌ Write alerts without runbooks
❌ Skip post-mortems for "small" incidents
❌ Blame individuals in post-mortems
❌ Set SLOs too high (100% is impossible)
❌ Ignore error budget exhaustion
❌ Page for non-urgent issues

## References

- [Google SRE Book - Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus Alerting Best Practices](https://prometheus.io/docs/practices/alerting/)
- [The Art of Monitoring](https://artofmonitoring.com/)
