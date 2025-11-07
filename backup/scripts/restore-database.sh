#!/bin/bash
#
# PostgreSQL Restore Script
# Restores database from S3 backup or performs Point-in-Time Recovery (PITR)
# Target RTO: 4 hours

set -euo pipefail

# Configuration
RESTORE_DIR="${RESTORE_DIR:-/var/restore/postgresql}"
S3_BUCKET="${BACKUP_BUCKET}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"

# Logging
LOG_FILE="/var/log/restore/postgresql-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Restore PostgreSQL database from backup

OPTIONS:
    -b, --backup LABEL      Backup label to restore (e.g., cpam_backup_20240101_020000)
    -t, --pitr TIMESTAMP    Point-in-time recovery target (ISO 8601 format)
    -l, --latest            Restore latest backup
    -d, --dry-run           Perform dry-run without actual restore
    -h, --help              Show this help message

EXAMPLES:
    # Restore latest backup
    $0 --latest

    # Restore specific backup
    $0 --backup cpam_backup_20240101_020000

    # Point-in-time recovery to specific timestamp
    $0 --backup cpam_backup_20240101_020000 --pitr "2024-01-01 12:00:00"

    # Dry-run restore
    $0 --latest --dry-run

EOF
    exit 1
}

# Parse command line arguments
parse_args() {
    BACKUP_LABEL=""
    PITR_TARGET=""
    USE_LATEST=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--backup)
                BACKUP_LABEL="$2"
                shift 2
                ;;
            -t|--pitr)
                PITR_TARGET="$2"
                shift 2
                ;;
            -l|--latest)
                USE_LATEST=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                error "Unknown option: $1"
                usage
                ;;
        esac
    done

    if [ "$USE_LATEST" = false ] && [ -z "$BACKUP_LABEL" ]; then
        error "Either --latest or --backup must be specified"
        usage
    fi
}

# Find latest backup in S3
find_latest_backup() {
    log "Finding latest backup in S3..."

    local latest=$(aws s3 ls "s3://$S3_BUCKET/postgresql/" --recursive \
        | grep "backup_manifest.json" \
        | sort -r \
        | head -1 \
        | awk '{print $(NF)}')

    if [ -z "$latest" ]; then
        error "No backups found in S3"
        exit 1
    fi

    # Extract backup label from path
    BACKUP_LABEL=$(echo "$latest" | sed -E 's|.*/([^/]+)/backup_manifest.json|\1|')
    log "Latest backup found: $BACKUP_LABEL"
}

# Download backup from S3
download_backup() {
    log "Downloading backup from S3: $BACKUP_LABEL"

    local s3_path="s3://$S3_BUCKET/postgresql"
    local backup_path="$RESTORE_DIR/$BACKUP_LABEL"

    mkdir -p "$backup_path"

    # Find the backup in S3 (search all date-prefixed paths)
    local s3_backup_location=$(aws s3 ls "$s3_path/" --recursive \
        | grep "$BACKUP_LABEL/backup_manifest.json" \
        | awk '{print $(NF)}' \
        | head -1)

    if [ -z "$s3_backup_location" ]; then
        error "Backup not found in S3: $BACKUP_LABEL"
        exit 1
    fi

    local s3_backup_dir=$(dirname "$s3_backup_location")

    log "Downloading from: s3://$S3_BUCKET/$s3_backup_dir/"

    if aws s3 sync \
        "s3://$S3_BUCKET/$s3_backup_dir/" \
        "$backup_path/" \
        2>&1 | tee -a "$LOG_FILE"; then
        log "Download completed"
        echo "$backup_path"
    else
        error "Download failed"
        exit 1
    fi
}

# Verify backup before restore
verify_backup_before_restore() {
    local backup_path=$1
    log "Verifying backup before restore"

    # Check manifest exists
    if [ ! -f "$backup_path/backup_manifest.json" ]; then
        error "Backup manifest not found"
        exit 1
    fi

    # Check base backup exists
    if [ ! -f "$backup_path/base.tar.gz" ]; then
        error "Base backup file not found"
        exit 1
    fi

    # Verify archive integrity
    if ! tar -tzf "$backup_path/base.tar.gz" > /dev/null 2>&1; then
        error "Backup archive is corrupt"
        exit 1
    fi

    log "Backup verification passed"
}

# Stop PostgreSQL service
stop_postgresql() {
    log "Stopping PostgreSQL service"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would stop PostgreSQL"
        return 0
    fi

    # Try systemctl first
    if command -v systemctl &> /dev/null; then
        systemctl stop postgresql || true
    else
        # Try pg_ctl
        su - postgres -c "pg_ctl stop -D $PGDATA -m fast" || true
    fi

    # Wait for PostgreSQL to stop
    local timeout=30
    while pgrep -x postgres > /dev/null && [ $timeout -gt 0 ]; do
        sleep 1
        ((timeout--))
    done

    if pgrep -x postgres > /dev/null; then
        error "Failed to stop PostgreSQL"
        exit 1
    fi

    log "PostgreSQL stopped"
}

# Backup existing data directory
backup_existing_data() {
    log "Backing up existing PGDATA directory"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would backup $PGDATA to ${PGDATA}.backup.$(date +%Y%m%d_%H%M%S)"
        return 0
    fi

    if [ -d "$PGDATA" ]; then
        local backup_name="${PGDATA}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$PGDATA" "$backup_name"
        log "Existing data backed up to: $backup_name"
    fi
}

# Restore base backup
restore_base_backup() {
    local backup_path=$1
    log "Restoring base backup to $PGDATA"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would restore $backup_path/base.tar.gz to $PGDATA"
        return 0
    fi

    mkdir -p "$PGDATA"
    chown postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"

    # Extract base backup
    if tar -xzf "$backup_path/base.tar.gz" -C "$PGDATA"; then
        log "Base backup restored"
    else
        error "Failed to extract base backup"
        exit 1
    fi

    # Extract WAL files if present
    if [ -f "$backup_path/pg_wal.tar.gz" ]; then
        log "Restoring WAL files"
        mkdir -p "$PGDATA/pg_wal"
        tar -xzf "$backup_path/pg_wal.tar.gz" -C "$PGDATA/pg_wal"
    fi
}

# Configure Point-in-Time Recovery
configure_pitr() {
    log "Configuring Point-in-Time Recovery"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would configure PITR to: ${PITR_TARGET:-latest}"
        return 0
    fi

    # Create recovery.conf or recovery.signal (PostgreSQL 12+)
    local pg_version=$(su - postgres -c "postgres --version" | grep -oE '[0-9]+\.[0-9]+' | head -1 | cut -d. -f1)

    if [ "$pg_version" -ge 12 ]; then
        # PostgreSQL 12+: Use recovery.signal and postgresql.conf
        touch "$PGDATA/recovery.signal"

        cat >> "$PGDATA/postgresql.auto.conf" <<EOF
restore_command = 'aws s3 cp s3://$S3_BUCKET/wal/%f %p'
recovery_target_timeline = 'latest'
EOF

        if [ -n "$PITR_TARGET" ]; then
            cat >> "$PGDATA/postgresql.auto.conf" <<EOF
recovery_target_time = '$PITR_TARGET'
recovery_target_action = 'promote'
EOF
        fi
    else
        # PostgreSQL 11 and earlier: Use recovery.conf
        cat > "$PGDATA/recovery.conf" <<EOF
restore_command = 'aws s3 cp s3://$S3_BUCKET/wal/%f %p'
recovery_target_timeline = 'latest'
EOF

        if [ -n "$PITR_TARGET" ]; then
            cat >> "$PGDATA/recovery.conf" <<EOF
recovery_target_time = '$PITR_TARGET'
recovery_target_action = 'promote'
EOF
        fi
    fi

    chown postgres:postgres "$PGDATA"/*
    log "PITR configured"
}

# Start PostgreSQL and monitor recovery
start_and_monitor_recovery() {
    log "Starting PostgreSQL for recovery"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would start PostgreSQL and monitor recovery"
        return 0
    fi

    # Start PostgreSQL
    if command -v systemctl &> /dev/null; then
        systemctl start postgresql
    else
        su - postgres -c "pg_ctl start -D $PGDATA"
    fi

    log "PostgreSQL started, monitoring recovery..."

    # Monitor recovery progress
    local timeout=3600  # 1 hour timeout
    while [ $timeout -gt 0 ]; do
        if su - postgres -c "psql -c 'SELECT pg_is_in_recovery();'" 2>/dev/null | grep -q "f"; then
            log "Recovery completed successfully"
            return 0
        fi

        sleep 5
        ((timeout-=5))

        # Show progress
        if [ $((timeout % 60)) -eq 0 ]; then
            log "Recovery in progress... ($((timeout/60)) minutes remaining)"
        fi
    done

    error "Recovery timeout exceeded"
    exit 1
}

# Verify restore
verify_restore() {
    log "Verifying restore"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would verify restore"
        return 0
    fi

    # Check database is accepting connections
    if ! su - postgres -c "psql -c 'SELECT 1;'" > /dev/null 2>&1; then
        error "Database not accepting connections"
        exit 1
    fi

    # Check data integrity
    local table_count=$(su - postgres -c "psql -t -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';'" | xargs)
    log "Tables found: $table_count"

    if [ "$table_count" -eq 0 ]; then
        error "No tables found after restore"
        exit 1
    fi

    # Run basic integrity checks
    su - postgres -c "psql -c 'SELECT COUNT(*) FROM \"Team\";'" | tee -a "$LOG_FILE"
    su - postgres -c "psql -c 'SELECT COUNT(*) FROM \"User\";'" | tee -a "$LOG_FILE"

    log "Restore verification passed"
}

# Calculate restore metrics
calculate_metrics() {
    local start_time=$1
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "Restore completed in $((duration / 60)) minutes $((duration % 60)) seconds"

    # Calculate RPO (data loss)
    if [ -n "$PITR_TARGET" ]; then
        local target_epoch=$(date -d "$PITR_TARGET" +%s)
        local rpo_seconds=$((end_time - target_epoch))
        log "RPO (data loss): $((rpo_seconds / 60)) minutes"
    fi

    # Calculate RTO (downtime)
    log "RTO (restore time): $((duration / 60)) minutes"

    # Verify against targets
    if [ $((duration / 60)) -gt 240 ]; then
        error "RTO target exceeded (4 hours)"
    else
        log "RTO target met (< 4 hours)"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    if [ "$status" = "success" ]; then
        log "Restore successful: $message"

        if [ -n "${SLACK_WEBHOOK_URL:-}" ] && [ "$DRY_RUN" = false ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"✅ PostgreSQL restore completed successfully\n$message\"}" \
                > /dev/null 2>&1 || true
        fi
    else
        error "Restore failed: $message"

        if [ -n "${PAGERDUTY_SERVICE_KEY:-}" ] && [ "$DRY_RUN" = false ]; then
            curl -X POST https://events.pagerduty.com/v2/enqueue \
                -H 'Content-Type: application/json' \
                -d "{
                    \"routing_key\": \"$PAGERDUTY_SERVICE_KEY\",
                    \"event_action\": \"trigger\",
                    \"payload\": {
                        \"summary\": \"PostgreSQL restore failed\",
                        \"severity\": \"critical\",
                        \"source\": \"$(hostname)\",
                        \"custom_details\": {\"message\": \"$message\"}
                    }
                }" \
                > /dev/null 2>&1 || true
        fi
    fi
}

# Main execution
main() {
    parse_args "$@"

    log "===== PostgreSQL Restore Started ====="
    log "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"

    local start_time=$(date +%s)
    local backup_path

    # Execute restore steps
    if [ "$USE_LATEST" = true ]; then
        find_latest_backup
    fi

    log "Restoring backup: $BACKUP_LABEL"
    [ -n "$PITR_TARGET" ] && log "PITR target: $PITR_TARGET"

    backup_path=$(download_backup)
    verify_backup_before_restore "$backup_path"

    if [ "$DRY_RUN" = false ]; then
        stop_postgresql
        backup_existing_data
    fi

    restore_base_backup "$backup_path"

    if [ -n "$PITR_TARGET" ] || [ "$DRY_RUN" = true ]; then
        configure_pitr
    fi

    if [ "$DRY_RUN" = false ]; then
        start_and_monitor_recovery
        verify_restore
    fi

    calculate_metrics "$start_time"

    send_notification "success" "Backup: $BACKUP_LABEL\n$([ -n "$PITR_TARGET" ] && echo "PITR: $PITR_TARGET" || echo "Full restore")\nMode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"

    log "===== PostgreSQL Restore Completed Successfully ====="
    exit 0
}

# Trap errors
trap 'error "Restore script failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
