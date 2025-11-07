#!/bin/bash
#
# PostgreSQL Backup Script
# Performs full backup with compression and uploads to S3
# Target RPO: 15 minutes (via WAL archiving)
# Target RTO: 4 hours

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${BACKUP_BUCKET}"
S3_PREFIX="postgresql/$(date +%Y/%m/%d)"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_LABEL="cpam_backup_$(date +%Y%m%d_%H%M%S)"

# Logging
LOG_FILE="/var/log/backup/postgresql-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Metrics for Prometheus Pushgateway
push_metric() {
    local metric_name=$1
    local metric_value=$2
    local metric_type=${3:-gauge}

    if [ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]; then
        cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/backup_database"
# TYPE $metric_name $metric_type
$metric_name $metric_value
EOF
    fi
}

# Pre-flight checks
preflight_checks() {
    log "Starting pre-flight checks..."

    # Check disk space
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=10485760  # 10GB in KB

    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        error "Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${REQUIRED_SPACE}KB"
        push_metric "backup_preflight_failed" 1
        exit 1
    fi

    # Check database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        error "Cannot connect to database"
        push_metric "backup_preflight_failed" 1
        exit 1
    fi

    # Check S3 bucket access
    if ! aws s3 ls "s3://$S3_BUCKET/" > /dev/null 2>&1; then
        error "Cannot access S3 bucket: $S3_BUCKET"
        push_metric "backup_preflight_failed" 1
        exit 1
    fi

    log "Pre-flight checks passed"
    push_metric "backup_preflight_failed" 0
}

# Create backup directory
setup_backup_dir() {
    log "Setting up backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
}

# Perform base backup using pg_basebackup
perform_backup() {
    log "Starting PostgreSQL base backup: $BACKUP_LABEL"

    local backup_path="$BACKUP_DIR/$BACKUP_LABEL"
    local start_time=$(date +%s)

    # Perform pg_basebackup
    if pg_basebackup \
        --pgdata="$backup_path" \
        --format=tar \
        --wal-method=stream \
        --gzip \
        --compress=9 \
        --label="$BACKUP_LABEL" \
        --progress \
        --verbose \
        2>&1 | tee -a "$LOG_FILE"; then

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local backup_size=$(du -sb "$backup_path" | awk '{print $1}')

        log "Backup completed successfully in ${duration}s"
        log "Backup size: $(numfmt --to=iec-i --suffix=B $backup_size)"

        push_metric "backup_duration_seconds" "$duration"
        push_metric "backup_size_bytes" "$backup_size"
        push_metric "backup_last_success_timestamp" "$end_time"

        echo "$backup_path"
    else
        error "Backup failed"
        push_metric "backup_failed" 1
        exit 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_path=$1
    log "Uploading backup to S3: s3://$S3_BUCKET/$S3_PREFIX/"

    local start_time=$(date +%s)

    if aws s3 sync \
        "$backup_path" \
        "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_LABEL/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        2>&1 | tee -a "$LOG_FILE"; then

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log "Upload completed in ${duration}s"
        push_metric "backup_upload_duration_seconds" "$duration"
    else
        error "Upload to S3 failed"
        push_metric "backup_upload_failed" 1
        exit 1
    fi
}

# Create backup manifest
create_manifest() {
    local backup_path=$1
    local manifest_file="$backup_path/backup_manifest.json"

    log "Creating backup manifest"

    cat > "$manifest_file" <<EOF
{
  "backup_label": "$BACKUP_LABEL",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database_version": "$(psql "$DATABASE_URL" -t -c 'SELECT version();' | xargs)",
  "database_size_bytes": $(psql "$DATABASE_URL" -t -c "SELECT pg_database_size(current_database());" | xargs),
  "backup_method": "pg_basebackup",
  "compression": "gzip",
  "wal_included": true,
  "backup_type": "full",
  "rpo_target_minutes": 15,
  "rto_target_hours": 4
}
EOF

    log "Manifest created: $manifest_file"
}

# Verify backup integrity
verify_backup() {
    local backup_path=$1
    log "Verifying backup integrity"

    # Check that backup files exist
    if [ ! -f "$backup_path/base.tar.gz" ]; then
        error "Backup file base.tar.gz not found"
        push_metric "backup_verification_failed" 1
        return 1
    fi

    # Verify tar files can be extracted (test mode)
    if tar -tzf "$backup_path/base.tar.gz" > /dev/null 2>&1; then
        log "Backup integrity verified"
        push_metric "backup_verification_failed" 0
        return 0
    else
        error "Backup verification failed - corrupt archive"
        push_metric "backup_verification_failed" 1
        return 1
    fi
}

# Cleanup old local backups
cleanup_local_backups() {
    log "Cleaning up local backups older than $RETENTION_DAYS days"

    find "$BACKUP_DIR" -name "cpam_backup_*" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} \; 2>/dev/null || true

    log "Local cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    if [ "$status" = "success" ]; then
        log "Backup successful: $message"

        # Slack notification
        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"✅ PostgreSQL backup completed successfully\n$message\"}" \
                > /dev/null 2>&1 || true
        fi
    else
        error "Backup failed: $message"

        # PagerDuty alert
        if [ -n "${PAGERDUTY_SERVICE_KEY:-}" ]; then
            curl -X POST https://events.pagerduty.com/v2/enqueue \
                -H 'Content-Type: application/json' \
                -d "{
                    \"routing_key\": \"$PAGERDUTY_SERVICE_KEY\",
                    \"event_action\": \"trigger\",
                    \"payload\": {
                        \"summary\": \"PostgreSQL backup failed\",
                        \"severity\": \"critical\",
                        \"source\": \"$(hostname)\",
                        \"custom_details\": {\"message\": \"$message\"}
                    }
                }" \
                > /dev/null 2>&1 || true
        fi

        # Slack notification
        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"❌ PostgreSQL backup FAILED\n$message\"}" \
                > /dev/null 2>&1 || true
        fi
    fi
}

# Main execution
main() {
    log "===== PostgreSQL Backup Started ====="
    log "Backup label: $BACKUP_LABEL"
    log "Target S3: s3://$S3_BUCKET/$S3_PREFIX/"

    local backup_path

    # Execute backup steps
    preflight_checks
    setup_backup_dir

    if backup_path=$(perform_backup); then
        create_manifest "$backup_path"

        if verify_backup "$backup_path"; then
            upload_to_s3 "$backup_path"
            cleanup_local_backups

            send_notification "success" "Backup: $BACKUP_LABEL\nSize: $(du -sh "$backup_path" | awk '{print $1}')"

            log "===== PostgreSQL Backup Completed Successfully ====="
            push_metric "backup_failed" 0
            exit 0
        else
            send_notification "failure" "Backup verification failed for $BACKUP_LABEL"
            push_metric "backup_failed" 1
            exit 1
        fi
    else
        send_notification "failure" "Backup creation failed"
        push_metric "backup_failed" 1
        exit 1
    fi
}

# Trap errors
trap 'error "Backup script failed at line $LINENO"; push_metric "backup_failed" 1; exit 1' ERR

# Run main function
main "$@"
