#!/bin/bash
#
# SOC2 Evidence Collection Script
# Automates collection of audit evidence for SOC2 compliance

set -euo pipefail

# Configuration
EVIDENCE_DIR="${EVIDENCE_DIR:-/var/compliance/evidence}"
AUDIT_PERIOD_START="${AUDIT_PERIOD_START:-$(date -d '1 year ago' +%Y-%m-%d)}"
AUDIT_PERIOD_END="${AUDIT_PERIOD_END:-$(date +%Y-%m-%d)}"
REPORT_DATE=$(date +%Y%m%d)

# Logging
LOG_FILE="/var/log/compliance/evidence-collection-${REPORT_DATE}.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Create evidence directory structure
setup_evidence_dirs() {
    log "Setting up evidence directory structure..."

    mkdir -p "$EVIDENCE_DIR"/{
        access-reviews,
        backup-logs,
        board-meetings,
        change-logs,
        code-reviews,
        control-attestations,
        deployments,
        incidents,
        internal-reviews,
        pen-tests,
        restore-drills,
        risk-assessments,
        security-scans,
        training-records,
        vulnerability-patching
    }

    log "Evidence directory structure created at $EVIDENCE_DIR"
}

# Collect Git evidence
collect_git_evidence() {
    log "Collecting Git evidence..."

    local git_evidence="$EVIDENCE_DIR/change-logs/git-history-${REPORT_DATE}.txt"

    {
        echo "=== Git Commit History ==="
        echo "Audit Period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END"
        echo ""

        git log \
            --since="$AUDIT_PERIOD_START" \
            --until="$AUDIT_PERIOD_END" \
            --pretty=format:"%h - %an <%ae> - %ad - %s" \
            --date=iso \
            --all

        echo ""
        echo ""
        echo "=== Commit Statistics ==="
        git log \
            --since="$AUDIT_PERIOD_START" \
            --until="$AUDIT_PERIOD_END" \
            --pretty=format:"%an" \
            --all \
            | sort | uniq -c | sort -rn

    } > "$git_evidence"

    log "Git evidence collected: $git_evidence"
}

# Collect deployment evidence
collect_deployment_evidence() {
    log "Collecting deployment evidence..."

    local deploy_evidence="$EVIDENCE_DIR/deployments/deployments-${REPORT_DATE}.txt"

    {
        echo "=== Deployment History ==="
        echo "Audit Period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END"
        echo ""

        # Extract deployment tags
        git tag -l --format='%(refname:short) - %(creatordate:iso) - %(subject)' \
            | awk -v start="$AUDIT_PERIOD_START" -v end="$AUDIT_PERIOD_END" '
                $3 >= start && $3 <= end {print}
            '

    } > "$deploy_evidence"

    log "Deployment evidence collected: $deploy_evidence"
}

# Collect backup evidence
collect_backup_evidence() {
    log "Collecting backup evidence..."

    local backup_evidence="$EVIDENCE_DIR/backup-logs/backup-summary-${REPORT_DATE}.txt"

    {
        echo "=== Backup Evidence ==="
        echo "Report Date: $REPORT_DATE"
        echo ""

        echo "=== Daily Backups (Last 30 Days) ==="
        find /var/log/backup -name "postgresql-*.log" -mtime -30 \
            -exec sh -c 'echo "File: {}"; grep -E "(Backup completed|Backup failed)" {} | tail -1; echo ""' \;

        echo ""
        echo "=== Backup Verification Logs (Last 90 Days) ==="
        find /var/log/backup-verification -name "verify-*.log" -mtime -90 \
            -exec sh -c 'echo "File: {}"; grep -E "(PASS|FAIL)" {} | tail -5; echo ""' \;

        echo ""
        echo "=== Restore Drill Reports ==="
        if [ -d "/var/log/backup-verification" ]; then
            find /var/log/backup-verification -name "report-*.md" -mtime -90 \
                -exec cat {} \;
        fi

    } > "$backup_evidence"

    log "Backup evidence collected: $backup_evidence"
}

# Collect security scan evidence
collect_security_scan_evidence() {
    log "Collecting security scan evidence..."

    local scan_evidence="$EVIDENCE_DIR/security-scans/scan-results-${REPORT_DATE}.txt"

    {
        echo "=== Security Scan Evidence ==="
        echo "Report Date: $REPORT_DATE"
        echo ""

        echo "=== Dependency Vulnerabilities (npm audit) ==="
        npm audit --json 2>/dev/null | jq -r '.vulnerabilities | to_entries[] | "\(.key): \(.value.severity) - \(.value.via[0].title)"' || echo "No vulnerabilities found"

        echo ""
        echo "=== GitHub Security Alerts ==="
        if command -v gh &> /dev/null; then
            gh api /repos/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/dependabot/alerts \
                2>/dev/null | jq -r '.[] | "\(.number): \(.security_advisory.severity) - \(.security_advisory.summary)"' \
                || echo "No alerts found"
        fi

    } > "$scan_evidence"

    log "Security scan evidence collected: $scan_evidence"
}

# Collect monitoring evidence
collect_monitoring_evidence() {
    log "Collecting monitoring evidence..."

    local monitoring_evidence="$EVIDENCE_DIR/monitoring/uptime-report-${REPORT_DATE}.txt"

    {
        echo "=== Monitoring Evidence ==="
        echo "Audit Period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END"
        echo ""

        echo "=== SLO Compliance ==="
        echo "Target: 99.9% availability"
        echo ""

        # Query Prometheus for availability metrics (requires Prometheus API)
        if [ -n "${PROMETHEUS_URL:-}" ]; then
            curl -s "${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(up[30d])" \
                | jq -r '.data.result[0].value[1]' \
                | awk '{printf "Actual: %.3f%%\n", $1 * 100}'
        else
            echo "Prometheus URL not configured"
        fi

        echo ""
        echo "=== Critical Incidents ==="
        if [ -d "/var/log/incidents" ]; then
            find /var/log/incidents -name "incident-*.md" \
                -newermt "$AUDIT_PERIOD_START" ! -newermt "$AUDIT_PERIOD_END" \
                -exec echo "Incident: {}" \; \
                -exec grep -E "^##|Status:" {} \;
        fi

    } > "$monitoring_evidence"

    log "Monitoring evidence collected: $monitoring_evidence"
}

# Collect access review evidence
collect_access_review_evidence() {
    log "Collecting access review evidence..."

    local access_evidence="$EVIDENCE_DIR/access-reviews/access-review-${REPORT_DATE}.txt"

    {
        echo "=== Access Review Evidence ==="
        echo "Review Date: $REPORT_DATE"
        echo ""

        echo "=== User Accounts ==="
        psql "$DATABASE_URL" -c "
            SELECT id, email, role, \"createdAt\", \"emailVerified\", \"inviteAccepted\"
            FROM \"User\"
            WHERE \"deletedAt\" IS NULL
            ORDER BY role, email;
        " 2>/dev/null || echo "Database not accessible"

        echo ""
        echo "=== Team Memberships ==="
        psql "$DATABASE_URL" -c "
            SELECT u.email, t.name, tm.role, tm.\"createdAt\"
            FROM \"TeamMember\" tm
            JOIN \"User\" u ON tm.\"userId\" = u.id
            JOIN \"Team\" t ON tm.\"teamId\" = t.id
            WHERE u.\"deletedAt\" IS NULL
            ORDER BY t.name, u.email;
        " 2>/dev/null || echo "Database not accessible"

    } > "$access_evidence"

    log "Access review evidence collected: $access_evidence"
}

# Collect code review evidence
collect_code_review_evidence() {
    log "Collecting code review evidence..."

    local review_evidence="$EVIDENCE_DIR/code-reviews/reviews-${REPORT_DATE}.txt"

    {
        echo "=== Code Review Evidence ==="
        echo "Audit Period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END"
        echo ""

        # GitHub PR reviews
        if command -v gh &> /dev/null; then
            echo "=== Pull Request Reviews ==="
            gh pr list --state all --limit 100 --json number,title,author,reviewDecision,createdAt,mergedAt \
                --jq ".[] | select(.createdAt >= \"$AUDIT_PERIOD_START\" and .createdAt <= \"$AUDIT_PERIOD_END\") | \"PR #\(.number): \(.title) by \(.author.login) - Review: \(.reviewDecision // \"PENDING\") - Merged: \(.mergedAt // \"Not merged\")\"" \
                2>/dev/null || echo "GitHub CLI not configured"
        fi

    } > "$review_evidence"

    log "Code review evidence collected: $review_evidence"
}

# Generate evidence manifest
generate_manifest() {
    log "Generating evidence manifest..."

    local manifest="$EVIDENCE_DIR/manifest-${REPORT_DATE}.yaml"

    cat > "$manifest" <<EOF
evidence_collection_report:
  report_date: ${REPORT_DATE}
  audit_period:
    start: ${AUDIT_PERIOD_START}
    end: ${AUDIT_PERIOD_END}
  evidence_location: ${EVIDENCE_DIR}

  collected_evidence:
    - category: "Change Management"
      files:
        - "change-logs/git-history-${REPORT_DATE}.txt"
        - "deployments/deployments-${REPORT_DATE}.txt"
        - "code-reviews/reviews-${REPORT_DATE}.txt"
      automation: true

    - category: "Availability & DR"
      files:
        - "backup-logs/backup-summary-${REPORT_DATE}.txt"
        - "monitoring/uptime-report-${REPORT_DATE}.txt"
      automation: true
      related_documents:
        - "docs/disaster-recovery.md"
        - "docs/slo-alerting.md"

    - category: "Security"
      files:
        - "security-scans/scan-results-${REPORT_DATE}.txt"
        - "access-reviews/access-review-${REPORT_DATE}.txt"
      automation: true
      related_documents:
        - "compliance/soc2-control-matrix.yaml"

    - category: "Access Control"
      files:
        - "access-reviews/access-review-${REPORT_DATE}.txt"
      automation: true
      related_code:
        - "lib/authz.ts"
        - "lib/nextAuth.ts"

  manual_evidence_required:
    - category: "Organizational Controls"
      evidence:
        - "Board meeting minutes (quarterly)"
        - "Code of Conduct acknowledgments"
        - "Employee training records"
      owner: "People Ops"

    - category: "Risk Management"
      evidence:
        - "Annual risk assessment"
        - "Risk treatment plans"
      owner: "CISO"

    - category: "Third-Party Management"
      evidence:
        - "Vendor security assessments"
        - "Penetration test reports"
      owner: "Security Team"

  next_steps:
    - "Review collected evidence for completeness"
    - "Gather manual evidence items"
    - "Prepare evidence package for auditor"
    - "Schedule evidence review meeting"
EOF

    log "Evidence manifest generated: $manifest"
}

# Create evidence package
create_evidence_package() {
    log "Creating evidence package..."

    local package_file="/tmp/soc2-evidence-${REPORT_DATE}.tar.gz"

    tar -czf "$package_file" \
        -C "$(dirname "$EVIDENCE_DIR")" \
        "$(basename "$EVIDENCE_DIR")" \
        2>&1 | tee -a "$LOG_FILE"

    log "Evidence package created: $package_file"
    log "Package size: $(du -h "$package_file" | cut -f1)"
}

# Main execution
main() {
    log "===== SOC2 Evidence Collection Started ====="
    log "Audit period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END"

    setup_evidence_dirs
    collect_git_evidence
    collect_deployment_evidence
    collect_backup_evidence
    collect_security_scan_evidence
    collect_monitoring_evidence
    collect_access_review_evidence
    collect_code_review_evidence
    generate_manifest
    create_evidence_package

    log "===== SOC2 Evidence Collection Completed Successfully ====="
    log "Evidence location: $EVIDENCE_DIR"
    log "Review manifest at: $EVIDENCE_DIR/manifest-${REPORT_DATE}.yaml"

    # Send notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ SOC2 evidence collection completed\nAudit period: $AUDIT_PERIOD_START to $AUDIT_PERIOD_END\nReview manifest: $EVIDENCE_DIR/manifest-${REPORT_DATE}.yaml\"}" \
            > /dev/null 2>&1 || true
    fi

    exit 0
}

# Run main function
main "$@"
