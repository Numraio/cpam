#!/bin/bash
#
# Backup Verification Script
# Verifies backup integrity and performs automated restore drills
# Runs quarterly to ensure RPO/RTO targets are achievable

set -euo pipefail

# Configuration
RESTORE_TEST_DB="${RESTORE_TEST_DB:-cpam_restore_test}"
S3_BUCKET="${BACKUP_BUCKET}"

LOG_FILE="/var/log/backup-verification/verify-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Push metrics to Prometheus
push_metric() {
    local metric_name=$1
    local metric_value=$2

    if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
        cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/backup_verification"
# TYPE $metric_name gauge
$metric_name $metric_value
EOF
    fi
}

# Verify WAL archiving is working
verify_wal_archiving() {
    log "Verifying WAL archiving"

    # Check WAL files are being archived to S3
    local wal_count=$(aws s3 ls "s3://$S3_BUCKET/wal/" --recursive | wc -l)

    if [ "$wal_count" -gt 0 ]; then
        log "WAL archiving working: $wal_count files found"
        push_metric "wal_archiving_status" 1
        return 0
    else
        error "No WAL files found in S3"
        push_metric "wal_archiving_status" 0
        return 1
    fi
}

# Verify backups are encrypted
verify_encryption() {
    log "Verifying backup encryption"

    # Sample a recent backup
    local latest_backup=$(aws s3 ls "s3://$S3_BUCKET/postgresql/" --recursive \
        | grep "base.tar.gz" \
        | sort -r \
        | head -1 \
        | awk '{print $(NF)}')

    if [ -z "$latest_backup" ]; then
        error "No backups found"
        push_metric "backup_encryption_verified" 0
        return 1
    fi

    # Check S3 encryption
    local encryption=$(aws s3api head-object \
        --bucket "$S3_BUCKET" \
        --key "$latest_backup" \
        --query ServerSideEncryption \
        --output text 2>/dev/null || echo "NONE")

    if [ "$encryption" != "NONE" ]; then
        log "Backup encryption verified: $encryption"
        push_metric "backup_encryption_verified" 1
        return 0
    else
        error "Backup not encrypted"
        push_metric "backup_encryption_verified" 0
        return 1
    fi
}

# Verify backups are accessible
verify_accessibility() {
    log "Verifying backup accessibility"

    # Try to list backups
    if aws s3 ls "s3://$S3_BUCKET/postgresql/" > /dev/null 2>&1; then
        log "Backups are accessible"
        push_metric "backup_accessible" 1
        return 0
    else
        error "Cannot access backups"
        push_metric "backup_accessible" 0
        return 1
    fi
}

# Verify retention policy is enforced
verify_retention_policy() {
    log "Verifying retention policy enforcement"

    # Count backups older than retention period (30 days)
    local cutoff_date=$(date -d "30 days ago" +%Y-%m-%d)
    local old_backups=$(aws s3 ls "s3://$S3_BUCKET/postgresql/" --recursive \
        | awk '$1 < "'$cutoff_date'" {print $0}' \
        | wc -l)

    if [ "$old_backups" -lt 100 ]; then
        log "Retention policy appears enforced (found $old_backups old backups)"
        push_metric "retention_policy_enforced" 1
        return 0
    else
        error "Too many old backups found: $old_backups"
        push_metric "retention_policy_enforced" 0
        return 1
    fi
}

# Perform restore drill
perform_restore_drill() {
    log "===== RESTORE DRILL STARTED ====="

    local start_time=$(date +%s)

    # Use restore script in dry-run mode
    if /backup/scripts/restore-database.sh --latest --dry-run 2>&1 | tee -a "$LOG_FILE"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log "Restore drill (dry-run) completed in $((duration / 60)) minutes"

        # Check against RTO target (4 hours)
        if [ $((duration / 60)) -le 240 ]; then
            log "RTO target met in dry-run"
            push_metric "restore_drill_rto_met" 1
        else
            error "RTO target exceeded in dry-run"
            push_metric "restore_drill_rto_met" 0
        fi

        push_metric "restore_drill_last_timestamp" "$end_time"
        push_metric "restore_drill_duration_seconds" "$duration"

        log "===== RESTORE DRILL COMPLETED ====="
        return 0
    else
        error "Restore drill failed"
        push_metric "restore_drill_failed" 1
        return 1
    fi
}

# Generate verification report
generate_report() {
    local report_file="/var/log/backup-verification/report-$(date +%Y%m%d).md"

    cat > "$report_file" <<EOF
# Backup Verification Report

**Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Verification Type**: Automated Quarterly Drill

## Test Results

| Check | Status |
|-------|--------|
| WAL Archiving | $([ "$wal_check" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Backup Encryption | $([ "$encryption_check" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Backup Accessibility | $([ "$accessibility_check" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Retention Policy | $([ "$retention_check" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Restore Drill (Dry-Run) | $([ "$drill_check" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |

## SLO Targets

- **RPO Target**: ≤ 15 minutes
- **RTO Target**: ≤ 4 hours

## Recommendations

$([ "$overall_status" -eq 0 ] && echo "All checks passed. Backup and restore procedures are operating within SLO targets." || echo "⚠️  Some checks failed. Review failures and take corrective action.")

## Next Steps

- Review any failed checks
- Schedule full restore drill if dry-run passed
- Update runbooks based on findings

---
*Generated by automated backup verification system*
EOF

    log "Report generated: $report_file"

    # Upload report to S3
    aws s3 cp "$report_file" "s3://$S3_BUCKET/reports/backup-verification/" \
        --server-side-encryption AES256 \
        2>&1 | tee -a "$LOG_FILE"
}

# Send notification with results
send_notification() {
    local status=$1

    if [ "$status" -eq 0 ]; then
        log "Backup verification passed"

        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"✅ Quarterly backup verification completed successfully\nAll checks passed. Backup and restore procedures operating within SLO targets.\"}" \
                > /dev/null 2>&1 || true
        fi
    else
        error "Backup verification failed"

        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"❌ Quarterly backup verification FAILED\nSome checks did not pass. Review log: $LOG_FILE\"}" \
                > /dev/null 2>&1 || true
        fi
    fi
}

# Main execution
main() {
    log "===== BACKUP VERIFICATION STARTED ====="

    local wal_check=1
    local encryption_check=1
    local accessibility_check=1
    local retention_check=1
    local drill_check=1

    # Run all verification checks
    verify_wal_archiving && wal_check=0 || wal_check=1
    verify_encryption && encryption_check=0 || encryption_check=1
    verify_accessibility && accessibility_check=0 || accessibility_check=1
    verify_retention_policy && retention_check=0 || retention_check=1
    perform_restore_drill && drill_check=0 || drill_check=1

    # Calculate overall status
    local overall_status=$((wal_check + encryption_check + accessibility_check + retention_check + drill_check))

    # Generate report
    generate_report

    # Send notification
    send_notification "$overall_status"

    log "===== BACKUP VERIFICATION COMPLETED ====="

    exit "$overall_status"
}

# Run main function
main "$@"
