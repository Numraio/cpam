# Runbook: Service Down

**Alert:** `ServiceDown`

**Service:** Any (API, Workers, Database, etc.)

**SLO Impact:** Availability (All services)

## Symptoms

- Service is unreachable
- Health checks failing
- Prometheus `up` metric = 0
- Complete service outage

## Investigation Steps

### 1. Identify Affected Service

```bash
# Check which service is down
# Query: up == 0

# Check service logs
kubectl logs -l app=cpam-api --tail=100

# Check service status
kubectl get pods -l app=cpam-api
```

Identify:
- Which service is down (API, worker, database, etc.)
- When service went down
- Whether it's a single instance or all instances
- Any recent deployments or changes

### 2. Check Infrastructure

```bash
# Check Kubernetes pod status
kubectl get pods -n cpam

# Check node status
kubectl get nodes

# Check resource quotas
kubectl describe resourcequota -n cpam

# Check events
kubectl get events -n cpam --sort-by='.lastTimestamp'
```

**Common Issues:**
- Pod crash looping → Check logs for error
- Node failure → Pods rescheduling
- Resource limits exceeded → Scale up resources
- Image pull failure → Check container registry

### 3. Check Recent Deployments

```bash
# Check recent deployments
kubectl rollout history deployment/cpam-api

# Check git history
git log --since="2 hours ago" --oneline

# Check CI/CD pipeline
# Review recent build/deploy logs
```

**Action:** If deployment within last 30 minutes, consider immediate rollback.

### 4. Check Service Logs

```bash
# Check application logs
kubectl logs -l app=cpam-api --tail=200

# Check for errors
kubectl logs -l app=cpam-api | grep -i error

# Check startup logs
kubectl logs -l app=cpam-api --since=15m
```

**Look for:**
- Uncaught exceptions
- Startup errors
- Database connection failures
- Out of memory errors
- Configuration errors

### 5. Check Dependencies

```bash
# Check database status
kubectl get pods -l app=postgres

# Check Redis status
kubectl get pods -l app=redis

# Check external services
curl -I https://api.stripe.com/healthcheck
```

**Common Issues:**
- Database unavailable → Restart database
- Redis connection timeout → Check network
- External service outage → Implement fallback

### 6. Check Resource Usage

```bash
# Check memory usage
kubectl top pods -n cpam

# Check CPU usage
kubectl top nodes

# Check disk space
kubectl exec -it <pod-name> -- df -h
```

**Common Issues:**
- Out of memory → Increase memory limit
- CPU throttling → Increase CPU limit
- Disk full → Clean up logs, increase disk

## Resolution Steps

### Immediate Actions (< 2 minutes)

1. **If recent deployment:**
   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/cpam-api

   # Check rollback status
   kubectl rollout status deployment/cpam-api
   ```

2. **If pod crashed:**
   ```bash
   # Restart deployment
   kubectl rollout restart deployment/cpam-api

   # Force delete if stuck
   kubectl delete pod <pod-name> --grace-period=0 --force
   ```

3. **If resource exhaustion:**
   ```bash
   # Scale horizontally
   kubectl scale deployment cpam-api --replicas=5

   # Increase resource limits (temporary)
   kubectl set resources deployment cpam-api --limits=memory=2Gi
   ```

4. **If database connection issue:**
   ```bash
   # Restart database connection pool
   # Or restart application to reset connections
   kubectl rollout restart deployment/cpam-api
   ```

### Short-term Fixes (< 15 minutes)

1. **Fix configuration:**
   ```bash
   # Update ConfigMap
   kubectl edit configmap cpam-config

   # Restart to pick up changes
   kubectl rollout restart deployment/cpam-api
   ```

2. **Fix resource limits:**
   ```yaml
   # Update deployment with appropriate limits
   resources:
     requests:
       memory: "512Mi"
       cpu: "500m"
     limits:
       memory: "2Gi"
       cpu: "2000m"
   ```

3. **Scale up:**
   ```bash
   # Add more replicas for redundancy
   kubectl scale deployment cpam-api --replicas=3
   ```

4. **Fix health checks:**
   ```yaml
   # Adjust probes if too aggressive
   livenessProbe:
     httpGet:
       path: /health
       port: 3000
     initialDelaySeconds: 30
     periodSeconds: 10
     timeoutSeconds: 5
     failureThreshold: 3
   ```

### Long-term Prevention

1. **Reliability improvements:**
   - Add liveness and readiness probes
   - Implement graceful shutdown
   - Add circuit breakers
   - Implement retry logic with backoff

2. **Monitoring improvements:**
   - Add more detailed health checks
   - Monitor service dependencies
   - Alert on pod restarts
   - Track error rates

3. **Infrastructure improvements:**
   - Use pod disruption budgets
   - Implement auto-scaling
   - Add pod anti-affinity rules
   - Use multiple availability zones

4. **Testing improvements:**
   - Add integration tests
   - Test failure scenarios
   - Chaos engineering
   - Load testing

## Escalation

- **< 2 minutes:** Attempt immediate fixes (rollback/restart)
- **2-5 minutes:** Page on-call engineer
- **> 5 minutes:** Initiate emergency incident call
- **> 10 minutes:** Engage CTO, notify customers

## Communication

1. **Internal:**
   - Post in `#incidents` immediately
   - Update incident tracker
   - Notify all engineering teams

2. **External:**
   - Update status page within 5 minutes
   - Post incident update every 10 minutes
   - Notify customers via email if > 10 min outage

**Status Page Template:**
```
[INVESTIGATING] We are currently experiencing issues with [Service].
We are investigating the root cause and working to restore service.
Updates will be posted every 10 minutes.

Last update: [timestamp]
```

## Post-Incident

1. **Verify service health:**
   ```bash
   # Check all pods running
   kubectl get pods -n cpam

   # Check metrics restored
   # Query: up == 1

   # Check error rates normal
   # Query: rate(api_errors_total[5m])

   # Verify end-to-end functionality
   # Run smoke tests
   ```

2. **Check for data loss:**
   - Verify database integrity
   - Check for incomplete transactions
   - Review any data corruption

3. **Schedule post-mortem** within 24 hours (REQUIRED for service down)
4. **Document timeline** and root cause
5. **Create action items** to prevent recurrence
6. **Update runbook** with new information

## Related Alerts

- `APIErrorBudgetBurnRate` - May precede service down
- `DatabaseConnectionPoolExhausted` - Database issues
- `HighErrorRate` - May indicate partial outage

## Useful Commands

```bash
# Check service health
kubectl get pods -n cpam -l app=cpam-api

# Get recent logs
kubectl logs -l app=cpam-api --tail=100 --timestamps

# Check events
kubectl get events -n cpam --sort-by='.lastTimestamp' | tail -20

# Check resource usage
kubectl top pods -n cpam

# Describe pod
kubectl describe pod <pod-name> -n cpam

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/sh

# View rollout history
kubectl rollout history deployment/cpam-api

# Rollback deployment
kubectl rollout undo deployment/cpam-api

# Scale deployment
kubectl scale deployment cpam-api --replicas=3

# Get pod YAML
kubectl get pod <pod-name> -o yaml
```

## Service Health Check Endpoints

| Service | Health Check URL | Expected Response |
|---------|------------------|-------------------|
| API | `GET /api/health` | 200 OK |
| Metrics | `GET /api/metrics` | 200 OK |
| Database | `SELECT 1` | 1 row |

## Common Root Causes and Solutions

| Root Cause | Detection | Solution |
|------------|-----------|----------|
| Bad deployment | Recent deployment in logs | Rollback deployment |
| Out of memory | OOMKilled in pod status | Increase memory limit |
| Database connection failure | Connection errors in logs | Restart service, check DB |
| Configuration error | Config validation errors | Fix config, restart |
| Node failure | Node NotReady status | Pods reschedule automatically |
| Image pull failure | ImagePullBackOff status | Fix registry credentials |
| Health check too aggressive | CrashLoopBackOff, healthy logs | Adjust probe settings |
| Dependency failure | Errors calling external service | Implement fallback |

## Critical Next Steps After Service Restored

1. ✅ Verify service fully operational
2. ✅ Check error rates returned to normal
3. ✅ Verify data integrity
4. ✅ Update status page to resolved
5. ✅ Notify customers of resolution
6. ✅ Document incident timeline
7. ✅ Schedule post-mortem within 24h
8. ✅ Create prevention action items

## References

- [Incident Response Process](../incident-response.md)
- [Deployment Guide](../deployment.md)
- [Health Check Implementation](../health-checks.md)
- [Kubernetes Operations Guide](../kubernetes-ops.md)
