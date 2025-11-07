# CI/CD Pipeline Security

## Overview

This document describes the security hardening implemented in the CPAM CI/CD pipeline, including automated security scans, deployment gates, and manual approval processes.

## Pipeline Architecture

The CI/CD pipeline consists of multiple stages with security gates at each level:

```
┌─────────────┐
│  Security   │ ← Snyk + Trivy scans (fail fast)
│   Scanning  │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Build &   │ ← Lint, format, type check, tests
│    Test     │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Staging   │ ← Auto deploy, migrations first
│ Deployment  │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Manual    │ ← Requires approval
│  Approval   │
└──────┬──────┘
       │
       v
┌─────────────┐
│ Production  │ ← Migrations verified, health checks
│ Deployment  │
└─────────────┘
```

## Security Scanning

### Software Composition Analysis (SCA)

**Tool**: Snyk

**Purpose**: Scans npm dependencies for known vulnerabilities

**Configuration**:
- Threshold: HIGH and CRITICAL vulnerabilities
- Behavior: Fails pipeline if vulnerabilities found
- Runs: On every push and pull request

**Setup**:
1. Sign up for Snyk: https://snyk.io
2. Generate API token in Snyk dashboard
3. Add token to GitHub secrets as `SNYK_TOKEN`
4. Pipeline will automatically use it

**Handling Findings**:
- **Critical/High**: Must be fixed before merge
- **Medium/Low**: Fix in subsequent PR or accept risk
- **False positives**: Can be ignored in Snyk dashboard

**Example Output**:
```
✗ High severity vulnerability found in lodash@4.17.19
  Path: lodash > lodash
  Fix: Upgrade to lodash@4.17.21
  More info: https://snyk.io/vuln/SNYK-JS-LODASH-...
```

### Container/Filesystem Scanning

**Tool**: Trivy (Aqua Security)

**Purpose**: Scans the entire filesystem for vulnerabilities in dependencies, OS packages, and misconfigurations

**Configuration**:
- Severity: CRITICAL and HIGH
- Format: SARIF (uploaded to GitHub Security)
- Behavior: Fails pipeline if vulnerabilities found
- Runs: On every push and pull request

**What It Scans**:
- npm dependencies (package-lock.json)
- Container images (if present)
- Infrastructure as Code (Terraform, etc.)
- Security misconfigurations

**Viewing Results**:
1. Go to repository "Security" tab
2. Click "Code scanning alerts"
3. View Trivy findings with severity and remediation

**Handling Findings**:
- **Critical**: Block deployment, fix immediately
- **High**: Fix before merge or document exception
- **False positives**: Suppress in GitHub Security UI

## Deployment Pipeline

### Staging Deployment

**Trigger**: Automatic on merge to `main` branch

**Steps**:
1. Check for pending database migrations
2. Run migrations against staging database
3. Deploy application to staging environment
4. Run smoke tests to verify deployment
5. Save migration status for production gate

**Environment**: `staging`
- URL: https://staging.cpam.example.com
- Database: Staging PostgreSQL instance
- No manual approval required

**Migration Safety**:
- Migrations are tested in staging first
- If migrations fail, deployment stops
- Production deployment cannot proceed until staging succeeds

### Production Deployment

**Trigger**: Automatic after staging succeeds (requires manual approval)

**Steps**:
1. Verify staging migrations were successful
2. Wait for manual approval from designated reviewers
3. Run migrations against production database
4. Deploy application to production environment
5. Run health checks to verify deployment
6. Send notification (Slack/PagerDuty)

**Environment**: `production`
- URL: https://cpam.example.com
- Database: Production PostgreSQL instance
- **Manual approval required**

**Manual Approval**:
- Required reviewers: Engineering Manager, CTO, or designated approver
- Approval via GitHub UI
- Can be rejected with reason
- Timeout: 7 days (after which deployment is cancelled)

## GitHub Environment Configuration

### Setting Up Environments

Environments must be configured in GitHub repository settings:

**Navigate to**: Settings → Environments → New Environment

### Staging Environment

1. Name: `staging`
2. Environment URL: `https://staging.cpam.example.com`
3. Deployment branches: `main` only
4. Required reviewers: None (auto-deploy)
5. Wait timer: None
6. Environment secrets:
   - `DATABASE_URL`: Staging database connection string
   - `DEPLOYMENT_TOKEN`: Token for deployment service

### Production Environment

1. Name: `production`
2. Environment URL: `https://cpam.example.com`
3. Deployment branches: `main` only
4. **Required reviewers**: Add engineering managers/CTO (at least 1)
5. Wait timer: Optional (e.g., 5 minutes after staging)
6. Environment secrets:
   - `DATABASE_URL`: Production database connection string
   - `DEPLOYMENT_TOKEN`: Token for deployment service

**Required Reviewers**:
- Add at least 1-2 reviewers
- Reviewers receive notification when deployment is ready
- Must explicitly approve before deployment proceeds

## Required GitHub Secrets

### Repository Secrets

Navigate to: Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `SNYK_TOKEN` | Snyk API token for vulnerability scanning | Snyk dashboard → Settings → API token |

### Environment Secrets

Set separately for `staging` and `production` environments:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DEPLOYMENT_TOKEN` | Token for deployment service (Vercel, AWS, etc.) | Varies by platform |

## Migration Safety

### How It Works

1. **Staging First**: Migrations always run in staging before production
2. **Verification**: Production deployment verifies staging migrations succeeded
3. **Rollback**: If production migration fails, deployment stops (app not updated)
4. **Testing**: Each migration is tested in staging with realistic data

### Migration Best Practices

**Do**:
- ✅ Test migrations locally first
- ✅ Use reversible migrations when possible
- ✅ Back up production database before migrations
- ✅ Test with production-like data volumes in staging
- ✅ Monitor application logs during deployment

**Don't**:
- ❌ Make breaking schema changes without versioning
- ❌ Delete columns without deprecation period
- ❌ Rename tables without backward compatibility
- ❌ Add NOT NULL constraints without defaults
- ❌ Skip testing in staging

### Example Migration Flow

```
Developer creates migration:
  npx prisma migrate dev --name add_user_preferences

PR created and merged to main:
  ↓
Security scan passes
  ↓
Tests pass
  ↓
Staging deployment:
  - Run migration in staging DB
  - Deploy app to staging
  - Run smoke tests
  ✓ Success
  ↓
Production deployment (awaiting approval):
  - Engineering manager reviews changes
  - Approves deployment
  ↓
  - Verify staging migration succeeded
  - Run same migration in production DB
  - Deploy app to production
  - Health check passes
  ✓ Success
```

## Security Scan Failures

### When Pipeline Fails

The pipeline will fail and block deployment if:
1. High/Critical vulnerabilities found by Snyk or Trivy
2. Tests fail
3. Lint/format checks fail
4. Type errors
5. Staging deployment fails
6. Migrations fail

### Responding to Vulnerabilities

**Step 1: Review Finding**
- Check GitHub Actions logs for details
- Review vulnerability description and CVSS score
- Determine if it affects your code path

**Step 2: Remediate**
- Update vulnerable dependency: `npm update package-name`
- If no fix available, consider alternative package
- Document risk acceptance if cannot fix immediately

**Step 3: Verify Fix**
- Run security scan locally: `npm audit`
- Create PR with fix
- Verify pipeline passes

**Step 4: Exception Process** (if fix not available)
1. Document vulnerability in GitHub issue
2. Assess actual risk to CPAM (exploitability, exposure)
3. Implement compensating controls if needed
4. Get approval from security team
5. Add Snyk ignore with expiration date
6. Schedule fix when patch available

### Example: Handling CVE

```bash
# Vulnerability found in transitive dependency
✗ CVE-2024-1234: Prototype Pollution in lodash
  Severity: High (CVSS 7.5)
  Affected: lodash@4.17.19 (via express@4.18.0)
  Fix: Upgrade express to 4.18.2

# Fix it
npm update express

# Verify fix
npm audit
# 0 vulnerabilities

# Commit and push
git commit -m "fix(deps): upgrade express to resolve CVE-2024-1234"
git push
```

## Manual Approval Process

### For Approvers

When a production deployment is ready:

1. **Notification**: Receive email/notification from GitHub
2. **Review**:
   - Check what changes are being deployed
   - Review staging deployment results
   - Verify smoke tests passed
   - Check migration impact (if any)
3. **Decision**:
   - **Approve**: Click "Review deployments" → Select "production" → "Approve and deploy"
   - **Reject**: Click "Reject" and provide reason

**What to Check**:
- [ ] All tests passing in staging?
- [ ] Migrations successful in staging?
- [ ] No critical bugs reported in staging?
- [ ] Rollback plan in place?
- [ ] Customer-facing changes communicated?
- [ ] Off-hours maintenance window if needed?

### For Developers

After merging to `main`:

1. **Monitor Staging**: Watch GitHub Actions for staging deployment
2. **Test Staging**: Manually verify changes in staging environment
3. **Request Approval**: Ping approver in Slack if urgent
4. **Monitor Production**: Watch deployment and health checks after approval

**If Approval Delayed**:
- Deployment will wait up to 7 days
- After 7 days, deployment is automatically cancelled
- Merge another commit to `main` to trigger new deployment

## Monitoring and Alerts

### GitHub Actions Notifications

Configure notifications: GitHub Settings → Notifications → Actions

**Recommended Settings**:
- ✅ Failed workflows on main branch
- ✅ Deployment requires approval
- ❌ Successful workflows (too noisy)

### Integration with Slack

Add GitHub Actions app to Slack:
1. Install "GitHub" app in Slack workspace
2. In Slack channel: `/github subscribe owner/repo deployments`
3. Receive notifications for:
   - Staging deployments
   - Production approval requests
   - Production deployments
   - Failures

### Security Alerts

Configure in: Settings → Security & analysis → Dependabot alerts

**Enable**:
- ✅ Dependabot alerts
- ✅ Dependabot security updates (auto-create PRs for vulnerabilities)
- ✅ Code scanning alerts (Trivy integration)

## Troubleshooting

### "Snyk token not configured"

**Error**: `SNYK_TOKEN secret not found`

**Solution**:
1. Go to https://snyk.io and sign up
2. Generate API token in account settings
3. Add to GitHub: Settings → Secrets → New secret
4. Name: `SNYK_TOKEN`, Value: your token
5. Re-run workflow

### "Trivy scan failed"

**Error**: Trivy found vulnerabilities

**Solution**:
1. Check GitHub Security tab for details
2. Update affected dependencies
3. If false positive, suppress in Security UI
4. Re-run workflow

### "Deployment waiting for approval"

**Status**: Production deployment shows "Waiting"

**This is normal**: Manual approval required for production

**Solution**:
1. Ensure you're an approved reviewer
2. Go to Actions → Select workflow run
3. Click "Review deployments"
4. Approve production environment
5. Deployment will continue

### "Migration failed in staging"

**Error**: Database migration failed

**Solution**:
1. Check migration SQL for errors
2. Test migration locally: `npx prisma migrate dev`
3. Check staging database state
4. Rollback if needed: `npx prisma migrate resolve --rolled-back <migration>`
5. Fix migration and create new PR
6. **Do not bypass** - migrations must succeed in staging first

## Best Practices

### For Developers

1. **Run security scans locally** before pushing:
   ```bash
   npm audit
   npm audit fix
   ```

2. **Test migrations locally** before committing:
   ```bash
   npx prisma migrate dev
   npx prisma migrate reset # test fresh migration
   ```

3. **Monitor pipeline** after pushing:
   - Check GitHub Actions for failures
   - Fix issues promptly
   - Don't leave broken builds

4. **Review security findings** seriously:
   - Don't ignore vulnerability warnings
   - Fix or document risk acceptance
   - Update dependencies regularly

### For Reviewers/Approvers

1. **Review thoroughly** before approving production:
   - Check change log
   - Verify tests passed
   - Test in staging if possible

2. **Approve promptly** during business hours:
   - Deployments shouldn't wait days
   - Coordinate with team for urgent deploys

3. **Reject with reason** if concerns:
   - Explain what needs to be addressed
   - Tag relevant developers

4. **Emergency process** for critical fixes:
   - Can approve immediately if needed
   - Document decision post-deployment

## Security Scanning Schedule

Beyond CI/CD pipeline, maintain ongoing security practices:

### Daily (Automated)
- Dependabot checks for new vulnerabilities
- Snyk monitors project dependencies
- Trivy scheduled scans (if configured)

### Weekly
- Review Dependabot PRs and merge security updates
- Check GitHub Security tab for new alerts

### Monthly
- Review all medium/low severity findings
- Update dependencies to latest stable versions
- Review and update suppressed/ignored vulnerabilities

### Quarterly
- Full dependency audit and cleanup
- Review and rotate deployment tokens/secrets
- Update security scanning tools

## Compliance

This CI/CD hardening supports the following compliance requirements:

**SOC2 Controls**:
- **CC8.1**: Change management with testing and approval
- **CC7.1**: Vulnerability detection through automated scanning
- **CC7.2**: Security monitoring and incident response
- **CC6.6**: Logical and physical access controls (deployment approval)

**Evidence for Auditors**:
- GitHub Actions logs (change history with approvals)
- Security scan results (vulnerability management)
- Deployment approval records (segregation of duties)
- Migration gating logs (change control)

**Documentation**: [docs/compliance.md](../docs/compliance.md)

## Metrics and Reporting

Track these metrics for continuous improvement:

### Deployment Metrics
- Deployment frequency
- Lead time (commit to production)
- Change failure rate
- Mean time to recovery (MTTR)

### Security Metrics
- Critical vulnerabilities detected
- Mean time to remediate (MTTR) by severity
- False positive rate
- Scan coverage

**Dashboard**: Can be built using GitHub API + Grafana

## Future Enhancements

Planned improvements to CI/CD security:

### Short-term (Q1 2024)
- [ ] SAST (Static Application Security Testing) with Semgrep
- [ ] Secret scanning in commits
- [ ] Deployment notifications to Slack/PagerDuty
- [ ] Automatic rollback on health check failure

### Medium-term (Q2-Q3 2024)
- [ ] Canary deployments (gradual rollout)
- [ ] Feature flags for safer deployments
- [ ] Automated performance testing in staging
- [ ] Security scorecard tracking

### Long-term (Q4 2024+)
- [ ] GitOps with ArgoCD
- [ ] Policy-as-code with OPA
- [ ] Chaos engineering in staging
- [ ] Supply chain security (SLSA)

## References

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Snyk Documentation](https://docs.snyk.io/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Database Migration Best Practices](https://www.prisma.io/docs/guides/migrate)

## Questions?

For questions about the CI/CD pipeline:
- **Technical issues**: Create GitHub issue with `area/ci` label
- **Security concerns**: Email security@cpam.example.com
- **Urgent deployment**: Ping #engineering in Slack

---

**Document Owner**: DevOps/Platform Team
**Last Updated**: 2024-01-08
**Next Review**: 2024-04-08
