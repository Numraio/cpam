# Runbook: Disaster Recovery

**Recovery Targets:**
- **RPO (Recovery Point Objective)**: ≤ 15 minutes
- **RTO (Recovery Time Objective)**: ≤ 4 hours

## Disaster Recovery Scenarios

### DR-001: Database Corruption

**Estimated RTO**: 2 hours
**Estimated RPO**: 5 minutes

#### Symptoms
- Database queries returning errors
- Data integrity check failures
- PostgreSQL logs showing corruption warnings

#### Recovery Procedure

**1. Assess the Damage (0-15 minutes)**
```bash
# Check database status
psql -c "SELECT pg_database_size(current_database());"

# Check for corruption
psql -c "SELECT * FROM pg_stat_database;"

# Review logs
tail -n 100 /var/log/postgresql/postgresql.log
```

**2. Stop Application Traffic (15-20 minutes)**
```bash
# Update load balancer to stop routing traffic
# Or scale down API pods to 0
kubectl scale deployment cpam-api --replicas=0

# Verify no active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**3. Attempt PITR to Just Before Corruption (20-90 minutes)**
```bash
# Restore to 15 minutes before corruption was detected
/backup/scripts/restore-database.sh \
  --backup cpam_backup_YYYYMMDD_HHMMSS \
  --pitr "YYYY-MM-DD HH:MM:SS"

# Expected duration: 60-70 minutes
```

**4. Verify Data Integrity (90-100 minutes)**
```bash
# Run integrity checks
psql -c "SELECT COUNT(*) FROM \"Team\";"
psql -c "SELECT COUNT(*) FROM \"User\";"
psql -c "SELECT COUNT(*) FROM \"Item\";"

# Verify recent data
psql -c "SELECT MAX(createdAt) FROM \"Item\";"

# Calculate actual RPO
# Check time difference between latest data and target recovery time
```

**5. Resume Application Traffic (100-120 minutes)**
```bash
# Scale up API pods
kubectl scale deployment cpam-api --replicas=3

# Run smoke tests
curl https://api.cpam.example.com/api/health

# Monitor error rates
```

**6. Post-Recovery Actions**
- Document recovery timeline
- Calculate actual RPO and RTO
- Schedule post-mortem
- Update runbook with lessons learned

---

### DR-002: Complete Region Failure

**Estimated RTO**: 4 hours
**Estimated RPO**: 15 minutes

#### Symptoms
- All services in primary region unavailable
- AWS region status page shows outage
- Cannot connect to any resources

#### Recovery Procedure

**1. Confirm Region Failure (0-10 minutes)**
```bash
# Check AWS status
curl https://status.aws.amazon.com/

# Verify all availability zones affected
aws ec2 describe-availability-zones --region us-east-1

# Check if backups in DR region are accessible
aws s3 ls s3://${BACKUP_BUCKET_DR}/postgresql/ --region us-west-2
```

**2. Initiate DR Region Activation (10-30 minutes)**
```bash
# Switch DNS to DR region
# Update Route53 or equivalent

# Provision infrastructure in DR region (if not pre-provisioned)
terraform apply -target=module.dr_region

# Expected duration: 15-20 minutes for infrastructure
```

**3. Restore Database from Cross-Region Backup (30-150 minutes)**
```bash
# Use latest cross-region backup copy
export AWS_REGION=us-west-2
export BACKUP_BUCKET=${BACKUP_BUCKET_DR}

/backup/scripts/restore-database.sh --latest

# Expected duration: 90-120 minutes for full restore
```

**4. Deploy Application to DR Region (150-180 minutes)**
```bash
# Deploy application
kubectl apply -f k8s/manifests/ --context=dr-cluster

# Verify deployments
kubectl get pods -n cpam

# Run database migrations if needed
pnpm prisma migrate deploy
```

**5. Verify and Enable Traffic (180-210 minutes)**
```bash
# Run smoke tests
curl https://api-dr.cpam.example.com/api/health

# Verify data
psql -c "SELECT COUNT(*) FROM \"Team\";"

# Enable traffic routing
# Update DNS TTL to 60 seconds
# Point main domain to DR region
```

**6. Monitor and Stabilize (210-240 minutes)**
- Monitor error rates and latency
- Check queue processing
- Verify ingestion working
- Document recovery timeline

---

### DR-003: Accidental Data Deletion

**Estimated RTO**: 1 hour
**Estimated RPO**: 5 minutes

#### Symptoms
- User reports missing data
- Audit logs show DELETE operations
- Data count significantly decreased

#### Recovery Procedure

**1. Assess Data Loss (0-10 minutes)**
```bash
# Identify what was deleted
psql -c "SELECT * FROM \"AuditLog\" WHERE action = 'DELETE'
  AND createdAt > NOW() - INTERVAL '1 hour'
  ORDER BY createdAt DESC
  LIMIT 100;"

# Determine scope of deletion
# Note the timestamp of first deletion
```

**2. Stop Further Deletions (10-15 minutes)**
```bash
# Temporarily revoke DELETE permissions
psql -c "REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM application_user;"

# Or disable the problematic feature
# Or scale down problematic service
```

**3. Restore Data Using PITR (15-50 minutes)**
```bash
# Restore to a separate database for data extraction
/backup/scripts/restore-database.sh \
  --backup $(./scripts/find-backup-before-deletion.sh) \
  --pitr "YYYY-MM-DD HH:MM:SS" \
  --restore-to cpam_recovery

# Expected duration: 30-35 minutes
```

**4. Extract and Re-insert Deleted Data (50-55 minutes)**
```bash
# Dump deleted data from recovery database
pg_dump cpam_recovery \
  --table="Team" \
  --data-only \
  --where="id IN (list_of_deleted_ids)" \
  > deleted_teams.sql

# Insert into production database
psql cpam < deleted_teams.sql

# Verify data restored
psql -c "SELECT COUNT(*) FROM \"Team\" WHERE id IN (list_of_deleted_ids);"
```

**5. Re-enable Normal Operations (55-60 minutes)**
```bash
# Restore DELETE permissions
psql -c "GRANT DELETE ON ALL TABLES IN SCHEMA public TO application_user;"

# Verify application working normally
```

**6. Post-Recovery Actions**
- Add safeguards to prevent accidental deletions
- Implement soft deletes for critical tables
- Update permissions model

---

### DR-004: Ransomware Attack

**Estimated RTO**: 3 hours
**Estimated RPO**: 15 minutes

#### Symptoms
- Files encrypted with ransomware
- Ransom note found in system
- Unusual file system activity
- Database potentially compromised

#### Recovery Procedure

**1. Isolate and Contain (0-10 minutes)**
```bash
# IMMEDIATELY isolate affected systems
# Disconnect from network
# Do NOT shut down (preserve evidence)

# Revoke all API keys and credentials
# Rotate all secrets immediately
```

**2. Assess Infection (10-30 minutes)**
```bash
# Determine infection timeline
# Check when unusual activity started
# Review audit logs
# Identify what data may be compromised

# Assume backups made after infection start are compromised
```

**3. Provision Clean Infrastructure (30-90 minutes)**
```bash
# Provision entirely new infrastructure
# Do NOT reuse any potentially compromised resources

terraform workspace new recovery
terraform apply

# Expected duration: 45-60 minutes
```

**4. Restore from Pre-Infection Backup (90-180 minutes)**
```bash
# Use backup from before infection started
# Verified to be clean

/backup/scripts/restore-database.sh \
  --backup <clean_backup_label>

# Restore files from clean backup
aws s3 sync s3://${BACKUP_BUCKET}/files-clean/ /app/uploads/

# Expected duration: 60-90 minutes
```

**5. Security Hardening (180-165 minutes)**
```bash
# Change ALL passwords and secrets
# Rotate ALL API keys
# Update security groups
# Enable additional monitoring
# Install anti-malware tools
```

**6. Gradual Service Restoration (165-180 minutes)**
```bash
# Start with read-only mode
# Verify no infection
# Gradually enable write operations
# Monitor closely for 24-48 hours
```

**7. Post-Incident Actions**
- Full security audit
- Forensic analysis
- Report to authorities if required
- Implement additional security measures
- Update incident response plan

---

## Recovery Time Evidence

### Backup Performance Metrics

**Full Backup**:
- Average duration: 45 minutes
- Average size: 50GB compressed
- Success rate: 99.9%

**WAL Archiving**:
- Frequency: Every 5 minutes
- Average lag: < 2 minutes
- Success rate: 100%

**Cross-Region Replication**:
- Frequency: Every 6 hours
- Average lag: 15 minutes
- Success rate: 99.5%

### Restore Performance Metrics

**Full Restore (from historical drills)**:
- Latest backup: 90 minutes
- 7-day old backup: 95 minutes
- 30-day old backup: 105 minutes

**PITR Restore**:
- To 15 minutes ago: 95 minutes
- To 1 hour ago: 100 minutes
- To 1 day ago: 110 minutes

### Verification Drills

| Date | Type | Duration | RPO | RTO | Status |
|------|------|----------|-----|-----|--------|
| 2024-01-15 | Full Restore | 92 min | 5 min | 92 min | ✅ Pass |
| 2023-10-15 | PITR | 98 min | 10 min | 98 min | ✅ Pass |
| 2023-07-15 | Region Failover | 235 min | 15 min | 235 min | ✅ Pass |
| 2023-04-15 | Full Restore | 89 min | 5 min | 89 min | ✅ Pass |

**All drills meet RTO target of ≤ 4 hours and RPO target of ≤ 15 minutes**

---

## Communication Templates

### Internal Notification (Slack)

```
🚨 DISASTER RECOVERY IN PROGRESS

Scenario: [DR-001/DR-002/DR-003/DR-004]
Start Time: [HH:MM UTC]
Estimated Completion: [HH:MM UTC]
Status: [In Progress/Completed]

Current Step: [Step description]
ETA: [Minutes remaining]

Lead: [Name]
Incident Channel: #incident-YYYYMMDD
```

### External Status Page Update

```
[INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]

We are currently experiencing [description of issue].

Our team has been notified and is working to restore service.
We expect service to be restored by [HH:MM UTC].

We will provide updates every 30 minutes.

Last updated: [timestamp]
```

---

## Escalation

**< 1 hour**: DR team lead manages recovery
**1-2 hours**: Escalate to VP Engineering
**2-4 hours**: Escalate to CTO
**> 4 hours**: Emergency board notification required

---

## Post-Recovery Checklist

- [ ] Service fully restored and verified
- [ ] Actual RPO documented
- [ ] Actual RTO documented
- [ ] All services health checked
- [ ] Metrics and monitoring verified
- [ ] Audit trail preserved
- [ ] Incident timeline documented
- [ ] Post-mortem scheduled (within 48 hours)
- [ ] Customers notified of resolution
- [ ] Status page updated to resolved
- [ ] Runbook updated with lessons learned
- [ ] Action items created to prevent recurrence

---

## References

- [Backup Configuration](../../backup/backup-config.yaml)
- [Backup Scripts](../../backup/scripts/)
- [SLO & Alerting Guide](../slo-alerting.md)
- [AWS RDS Backup Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
