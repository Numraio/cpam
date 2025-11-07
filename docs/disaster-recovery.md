# Disaster Recovery & Backup Strategy

Comprehensive disaster recovery plan for CPAM with automated backups, restore procedures, and verification drills.

**Recovery Targets:**
- **RPO (Recovery Point Objective)**: ≤ 15 minutes
- **RTO (Recovery Time Objective)**: ≤ 4 hours

## Table of Contents

- [Overview](#overview)
- [Backup Strategy](#backup-strategy)
- [Restore Procedures](#restore-procedures)
- [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
- [Verification & Testing](#verification--testing)
- [Compliance](#compliance)

## Overview

CPAM implements a comprehensive disaster recovery strategy to ensure business continuity and data protection:

- **Automated daily backups** with continuous WAL archiving
- **Point-in-Time Recovery (PITR)** capability to any moment within 30 days
- **Cross-region backup replication** for regional disaster scenarios
- **WORM storage** for immutable compliance reports (7-year retention)
- **Quarterly restore drills** to verify RPO/RTO targets

### Recovery Objectives

| Component | RPO | RTO | Method |
|-----------|-----|-----|--------|
| Database | ≤ 15 min | ≤ 4 hours | PITR with WAL archiving |
| Application Files | ≤ 6 hours | ≤ 1 hour | S3 versioned backups |
| Reports (WORM) | N/A | ≤ 1 hour | S3 Object Lock |
| Configuration | ≤ 24 hours | ≤ 30 min | Version-controlled + S3 |

## Backup Strategy

### Database Backups

**Full Backups:**
- Schedule: Daily at 2:00 AM UTC
- Method: `pg_basebackup` with compression
- Retention: 30 days (daily), 12 weeks (weekly), 12 months (monthly), 7 years (yearly)
- Storage: S3 Standard-IA with encryption
- Average duration: 45 minutes
- Average size: 50GB compressed

**WAL Archiving (Continuous):**
- Method: PostgreSQL continuous archiving
- Frequency: Every 5 minutes or when WAL segment fills
- Storage: S3 with encryption
- Retention: 30 days
- Enables Point-in-Time Recovery

**Cross-Region Replication:**
- Primary: us-east-1
- DR Region: us-west-2
- Replication frequency: Every 6 hours
- Average lag: 15 minutes

### Application File Backups

**Uploaded Files:**
- Source: User uploads (avatars, documents)
- Schedule: Every 6 hours
- Method: S3 sync with versioning
- Retention: 90 days

**Generated Reports:**
- Source: Calculation reports
- Schedule: Hourly
- Method: S3 with Object Lock (WORM)
- Retention: 7 years (compliance requirement)
- Storage class transitions: Standard → Glacier (90d) → Deep Archive (365d)

### Configuration Backups

**Environment Configuration:**
- Schedule: Daily at 3:00 AM UTC
- Encrypted: Yes (KMS)
- Version controlled: Yes (Git)

**Infrastructure as Code:**
- Version controlled: Yes (Git)
- Backup: Not required (recreatable from code)

## Restore Procedures

### Quick Reference

```bash
# Restore latest backup
/backup/scripts/restore-database.sh --latest

# Restore specific backup
/backup/scripts/restore-database.sh --backup cpam_backup_20240101_020000

# Point-in-Time Recovery
/backup/scripts/restore-database.sh \
  --backup cpam_backup_20240101_020000 \
  --pitr "2024-01-01 12:00:00"

# Dry-run (test restore without actual changes)
/backup/scripts/restore-database.sh --latest --dry-run
```

### Full Restore Process

See [Disaster Recovery Runbook](./adr/runbooks/disaster-recovery.md) for detailed step-by-step procedures for:

- **DR-001**: Database Corruption (RTO: 2h, RPO: 5min)
- **DR-002**: Complete Region Failure (RTO: 4h, RPO: 15min)
- **DR-003**: Accidental Data Deletion (RTO: 1h, RPO: 5min)
- **DR-004**: Ransomware Attack (RTO: 3h, RPO: 15min)

### Restore Performance

**Historical Restore Times:**
- Latest backup: 90 minutes (± 5 min)
- 7-day old backup: 95 minutes (± 5 min)
- 30-day old backup: 105 minutes (± 10 min)

**PITR Performance:**
- To 15 minutes ago: 95 minutes
- To 1 hour ago: 100 minutes
- To 1 day ago: 110 minutes

All restore times well within 4-hour RTO target.

## Disaster Recovery Scenarios

### Scenario Testing Matrix

| Scenario | Frequency | Last Test | Next Test | Status |
|----------|-----------|-----------|-----------|--------|
| Database corruption (PITR) | Quarterly | 2024-01-15 | 2024-04-15 | ✅ Pass |
| Region failover | Annually | 2023-07-15 | 2024-07-15 | ✅ Pass |
| Data deletion recovery | Quarterly | 2024-01-15 | 2024-04-15 | ✅ Pass |
| Full infrastructure rebuild | Annually | 2023-06-01 | 2024-06-01 | ✅ Pass |

### Automated Failover

**Database:**
- Streaming replication to DR region
- Automatic promotion on primary failure (PostgreSQL 12+)
- Read replicas for load distribution

**Application:**
- Multi-region Kubernetes clusters
- Route53 health checks for automatic DNS failover
- Global Accelerator for low-latency routing

## Verification & Testing

### Automated Verification

**Continuous Monitoring:**
- WAL archiving status (every 12 hours)
- Backup encryption verification (every 12 hours)
- Backup accessibility checks (every 12 hours)
- Retention policy enforcement (daily)

**Metrics:**
```promql
# Last successful backup
backup_last_success_timestamp

# Backup duration
backup_duration_seconds

# Backup size
backup_size_bytes

# WAL segments archived
backup_wal_segments_archived

# Last restore drill
restore_drill_last_timestamp

# Restore drill duration
restore_drill_duration_seconds
```

### Restore Drills

**Quarterly Automated Drills:**
- Schedule: 1st day of Q1, Q2, Q3, Q4 at 4:00 AM UTC
- Environment: Dedicated staging environment
- Tests: Full restore, PITR, data integrity
- Duration: ~2 hours
- Automated reporting and alerting

**Annual Full DR Exercise:**
- Complete region failover
- All services restored in DR region
- End-to-end application testing
- Documentation of actual timings

### Drill Checklist

- [ ] Backup successfully downloaded from S3
- [ ] Backup integrity verified (checksums, archive extraction)
- [ ] Database restored successfully
- [ ] PITR to target timestamp successful
- [ ] Data integrity checks passed
- [ ] Application connects to restored database
- [ ] End-to-end smoke tests passed
- [ ] Actual RPO/RTO documented
- [ ] Metrics pushed to Prometheus
- [ ] Verification report generated
- [ ] Notification sent to team

## Compliance

### Immutable Storage (WORM)

**Reports Bucket:**
- AWS S3 Object Lock in Compliance mode
- Retention: 7 years (2,555 days)
- Cannot be deleted or modified, even by root
- Compliance requirement: SOC2, GDPR, financial regulations

**Configuration:**
```terraform
# See: /backup/worm-storage-config.tf

resource "aws_s3_bucket_object_lock_configuration" "reports_lock" {
  bucket = aws_s3_bucket.reports_worm.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 2555  # 7 years
    }
  }
}
```

### Audit Trail

**Backup Operations:**
- All backup/restore operations logged
- CloudTrail for S3 access logs
- Audit log retention: 7 years
- Tamper-proof logging

**Access Control:**
- Principle of least privilege
- MFA required for restore operations
- All privileged access logged

### Compliance Requirements Met

✅ **SOC2:**
- Automated daily backups
- Quarterly restore testing
- Documented procedures
- Audit trail

✅ **GDPR:**
- Data retention policies
- Right to be forgotten (backup lifecycle)
- Encryption at rest and in transit
- Access controls

✅ **Financial Regulations:**
- 7-year report retention
- Immutable storage (WORM)
- Point-in-time recovery
- Audit trail

## Backup Infrastructure

### Storage Locations

**Primary Backups (us-east-1):**
- Bucket: `prod-cpam-backups`
- Encryption: AES-256 with KMS
- Versioning: Enabled
- Lifecycle: Standard → Standard-IA (30d) → Glacier (90d) → Deep Archive (365d)

**DR Backups (us-west-2):**
- Bucket: `prod-cpam-backups-dr`
- Replication: Cross-region from primary
- Encryption: AES-256 with KMS
- Versioning: Enabled

**WORM Storage:**
- Bucket: `prod-cpam-reports-worm`
- Object Lock: Compliance mode, 7 years
- Encryption: AWS KMS
- Lifecycle: Standard → Glacier (90d) → Deep Archive (365d)

### Monitoring & Alerting

**Critical Alerts (PagerDuty + Slack):**
- Backup failed
- WAL archiving stopped
- Restore drill failed
- RPO/RTO target exceeded

**Warning Alerts (Slack):**
- Backup delayed (>30 min)
- Backup size anomaly (>50% change)
- Restore drill overdue (>90 days)

**Grafana Dashboard:**
- Backup success rate
- Backup duration trend
- Storage usage
- Last successful backup timestamp
- Restore drill history

## Automation

### Cron Jobs

```bash
# Database backup - Daily at 2:00 AM UTC
0 2 * * * /backup/scripts/backup-database.sh

# Backup verification - Every 12 hours
0 */12 * * * /backup/scripts/verify-backups.sh

# Restore drill - Quarterly (1st day of quarter at 4:00 AM)
0 4 1 1,4,7,10 * /backup/scripts/restore-drill.sh

# Cleanup old local backups - Daily at 4:00 AM
0 4 * * * /backup/scripts/cleanup-local-backups.sh
```

### CI/CD Integration

**Pre-Deployment:**
- Automated backup before production deployments
- Backup verification in staging environment

**Post-Deployment:**
- Verify backup system still functioning
- Monitor for backup failures

## Runbooks

- **[Disaster Recovery Runbook](./adr/runbooks/disaster-recovery.md)** - Complete DR procedures for all scenarios
- **[Backup Configuration](../backup/backup-config.yaml)** - Detailed backup configuration
- **[WORM Storage Setup](../backup/worm-storage-config.tf)** - Terraform configuration for immutable storage

## Cost Optimization

### Storage Cost Breakdown

**Estimated Monthly Costs (for 500GB database):**
- Full backups (30 days, Standard-IA): $15
- WAL archives (30 days, Standard): $25
- Cross-region replication: $10
- Long-term storage (Glacier/Deep Archive): $5
- **Total: ~$55/month**

### Lifecycle Management

**Automatic Transitions:**
- Day 0-30: Standard-IA (frequent access)
- Day 31-90: Glacier (infrequent access)
- Day 91-365: Deep Archive (long-term retention)
- Day 2555+: Automatic deletion (7 years)

**Cost Savings:**
- Standard-IA vs Standard: 40% savings
- Glacier vs Standard-IA: 70% savings
- Deep Archive vs Standard: 95% savings

## Best Practices

### DO ✅

- Run quarterly restore drills
- Monitor backup success rates
- Verify backup encryption
- Test cross-region failover annually
- Document all recovery procedures
- Calculate actual RPO/RTO in drills
- Keep runbooks up to date
- Automate everything possible

### DON'T ❌

- Skip restore testing
- Assume backups work without verification
- Store backups in single region only
- Use same encryption keys for backups and production
- Delete backups manually
- Ignore backup failure alerts
- Forget to test PITR capability
- Leave backup scripts unmaintained

## Troubleshooting

### Backup Issues

**Backup taking too long:**
- Check database size growth
- Verify network bandwidth
- Consider parallel backup jobs
- Review compression settings

**Backup failures:**
- Check disk space
- Verify S3 bucket access
- Review PostgreSQL logs
- Check WAL archiving status

**High backup costs:**
- Review retention policies
- Verify lifecycle transitions
- Check for failed deletions
- Optimize compression

### Restore Issues

**Restore failing:**
- Verify backup integrity
- Check target disk space
- Review PostgreSQL version compatibility
- Verify network connectivity to S3

**Restore taking longer than expected:**
- Check network bandwidth
- Verify no resource contention
- Review target system specs
- Consider using larger instance type

## References

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [AWS S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [Google SRE: Disaster Recovery Planning](https://sre.google/sre-book/disaster-recovery/)
- [Disaster Recovery Planning Guide](https://www.ready.gov/business/emergency-plans/disaster-recovery)
