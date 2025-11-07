# Rate Limiting & WAF Protection

## Overview

CPAM implements comprehensive abuse protection through rate limiting and Web Application Firewall (WAF) capabilities to prevent denial of service attacks, brute force attempts, and common web vulnerabilities.

## Rate Limiting

### Rate Limit Tiers

Different endpoints have different rate limits based on their sensitivity and resource intensity:

| Tier | Max Requests | Window | Use Case |
|------|--------------|--------|----------|
| **auth** | 10 | 15 minutes | Login, password reset, registration |
| **upload** | 5 | 1 hour | File uploads, CSV imports |
| **compute** | 20 | 1 minute | Price calculations, heavy computations |
| **api** | 100 | 1 minute | General API endpoints |
| **public** | 30 | 1 minute | Unauthenticated endpoints |

### How It Works

Rate limiting uses the **token bucket algorithm**:
1. Each user/IP gets a bucket of tokens
2. Each request consumes one token
3. Bucket refills after the time window
4. When bucket is empty, requests are rejected with `429 Too Many Requests`

**Tracking**:
- Authenticated users: Tracked by User ID + IP address
- Unauthenticated users: Tracked by IP address only

### Usage

#### Basic Rate Limiting

```typescript
import { rateLimit } from '@/lib/rateLimit';

// Protect a single endpoint
export default rateLimit('api')(async function handler(req, res) {
  // Your handler code
  res.status(200).json({ success: true });
});
```

#### Combined Protection (WAF + Rate Limiting)

```typescript
import { protectedRoute } from '@/lib/rateLimit';

// Apply both WAF and rate limiting
export default protectedRoute('upload')(async function handler(req, res) {
  // Handle file upload
  const file = req.body;
  // ...
});
```

#### Choosing the Right Tier

**Use `auth` tier** for:
- `/api/auth/signin`
- `/api/auth/signup`
- `/api/auth/reset-password`
- `/api/auth/verify-email`

**Use `upload` tier** for:
- `/api/items/import`
- `/api/index-series/import`
- `/api/reports/generate`
- File upload endpoints

**Use `compute` tier** for:
- `/api/calculations/batch`
- `/api/scenarios/simulate`
- `/api/reports/price-math`
- Heavy computation endpoints

**Use `api` tier** for:
- `/api/items`
- `/api/teams`
- `/api/users`
- Standard CRUD operations

**Use `public` tier** for:
- `/api/health`
- `/api/metrics`
- Public documentation endpoints

### Response Headers

All rate-limited endpoints return these headers:

```http
X-RateLimit-Limit: 100          # Maximum requests allowed
X-RateLimit-Remaining: 87        # Requests remaining in window
X-RateLimit-Reset: 1704672000    # Unix timestamp when limit resets
```

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45                  # Seconds until retry allowed
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704672000

{
  "error": "Rate limit exceeded",
  "message": "API rate limit exceeded. Please slow down.",
  "retryAfter": 45,
  "limit": 100,
  "resetTime": 1704672000
}
```

### Bypass for Internal Services

Internal services can bypass rate limiting using:

**1. IP Allowlist**:
```typescript
// Add to BYPASS_IPS in lib/rateLimit.ts
const BYPASS_IPS = new Set([
  '127.0.0.1',
  '::1',
  '10.0.0.5',  // Internal service IP
]);
```

**2. Bypass Token**:
```bash
# Set environment variable
INTERNAL_SERVICE_TOKEN=your-secret-token

# Include in request headers
curl -H "X-Bypass-Token: your-secret-token" https://api.cpam.com/endpoint
```

**3. Internal Service Header** (development only):
```bash
curl -H "X-Internal-Service: true" http://localhost:3000/api/endpoint
```

## WAF Protection

### Attack Pattern Detection

The WAF detects and blocks common attack patterns:

#### SQL Injection

Blocks patterns like:
- `' OR '1'='1`
- `UNION SELECT password FROM users`
- `DROP TABLE users`
- `; DELETE FROM *`

**Example blocked request**:
```http
GET /api/users?id=1' OR '1'='1
→ 403 Forbidden
```

#### Cross-Site Scripting (XSS)

Blocks patterns like:
- `<script>alert('xss')</script>`
- `javascript:alert(1)`
- `<img onerror="alert(1)" src="x">`
- `<iframe src="evil.com"></iframe>`

**Example blocked request**:
```http
POST /api/items
{
  "name": "<script>alert('xss')</script>"
}
→ 403 Forbidden
```

#### Path Traversal

Blocks patterns like:
- `../../../etc/passwd`
- `..\\..\\windows\\system32`
- `%2e%2e%2f`

**Example blocked request**:
```http
GET /api/files?path=../../etc/passwd
→ 403 Forbidden
```

#### Command Injection

Blocks patterns like:
- `; rm -rf /`
- `$(whoami)`
- `` `cat /etc/passwd` ``

**Example blocked request**:
```http
POST /api/exec
{
  "command": "ping; rm -rf /"
}
→ 403 Forbidden
```

### WAF Middleware

```typescript
import { wafProtection } from '@/lib/rateLimit';

// Apply WAF only (no rate limiting)
export default wafProtection(async function handler(req, res) {
  // Handler code
});
```

### What Gets Checked

The WAF inspects:
1. **URL query parameters** - All query string values
2. **Request body** - All fields (including nested objects)
3. **Headers** - Certain header values (configurable)

**Safe input passes through**:
```typescript
// ✅ Allowed
{ name: "John Doe", email: "john@example.com" }

// ❌ Blocked
{ name: "<script>alert(1)</script>" }
```

### WAF Response

When an attack is detected:

```http
HTTP/1.1 403 Forbidden

{
  "error": "Forbidden",
  "message": "Potential attack pattern detected"
}
```

The WAF also logs warnings for security monitoring:

```javascript
console.warn('WAF: Blocked sqlInjection attack in URL param "id"', {
  ip: '192.168.1.1',
  url: '/api/users?id=1\' OR \'1\'=\'1',
  userAgent: 'Mozilla/5.0...'
});
```

## Configuration

### Environment Variables

```bash
# Bypass token for internal services
INTERNAL_SERVICE_TOKEN=your-secret-token-here

# Monitoring service token
MONITORING_TOKEN=monitoring-token-here
```

### Customizing Rate Limits

Edit `lib/rateLimit.ts` to adjust limits:

```typescript
export const RATE_LIMIT_TIERS = {
  auth: {
    maxRequests: 10,        // Adjust max requests
    windowMs: 15 * 60 * 1000, // Adjust window
    message: 'Custom message',
  },
  // ...
};
```

### Adding Custom Attack Patterns

Extend `ATTACK_PATTERNS` in `lib/rateLimit.ts`:

```typescript
const ATTACK_PATTERNS = {
  // Existing patterns...

  customPattern: [
    /your-regex-here/i,
  ],
};
```

## Monitoring

### Metrics

Track rate limiting metrics:

```typescript
// In lib/metrics.ts
export const rateLimitCounter = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Number of rate limit violations',
  labelNames: ['tier', 'endpoint'],
});

export const wafBlockCounter = new Counter({
  name: 'waf_blocked_total',
  help: 'Number of WAF blocks',
  labelNames: ['attack_type', 'endpoint'],
});
```

### Grafana Dashboard

Monitor rate limiting with these queries:

**Rate Limit Violations**:
```promql
rate(rate_limit_exceeded_total[5m])
```

**WAF Blocks by Attack Type**:
```promql
sum by (attack_type) (rate(waf_blocked_total[5m]))
```

**Top IPs Hitting Rate Limits**:
```promql
topk(10, rate(rate_limit_exceeded_total[1h]))
```

### Alerting

Create alerts for abuse patterns:

```yaml
# monitoring/prometheus-alerts.yaml
- alert: HighRateLimitViolations
  expr: rate(rate_limit_exceeded_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate of rate limit violations"
    description: "{{ $value }} violations/sec in last 5 minutes"

- alert: WAFAttackDetected
  expr: rate(waf_blocked_total[1m]) > 5
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "WAF detecting active attack"
    description: "{{ $value }} attacks/sec detected"
```

## Production Considerations

### Distributed Rate Limiting

The current implementation uses in-memory storage, which works for single-instance deployments but has limitations in distributed systems:

**Upgrade to Redis** for production:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(
  req: NextApiRequest,
  tier: RateLimitTier,
  userId?: string
) {
  const key = getRateLimitKey(req, tier, userId);
  const config = RATE_LIMIT_TIERS[tier];

  // Use Redis INCR with TTL
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
  }

  const ttl = await redis.ttl(key);
  const resetTime = Date.now() + (ttl * 1000);

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetTime,
    limit: config.maxRequests,
  };
}
```

**Why Redis**:
- Shared state across all instances
- Built-in TTL for automatic cleanup
- Atomic operations (INCR)
- Persistence and replication

### CDN Integration

For better DDoS protection, integrate with a CDN/WAF service:

**Cloudflare**:
- Enable "Under Attack" mode for DDoS
- Configure rate limiting rules in dashboard
- Use Cloudflare's WAF managed rulesets

**AWS CloudFront + WAF**:
```terraform
# infrastructure/cloudfront-waf.tf
resource "aws_wafv2_web_acl" "cpam" {
  name  = "cpam-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    action {
      block {}
    }
  }
}
```

**Fastly**:
- Configure rate limiting at edge
- Use VCL for custom WAF rules
- Real-time logging to SIEM

### Geographic Rate Limiting

Implement stricter limits for high-risk regions:

```typescript
const GEO_RATE_LIMITS = {
  'US': { multiplier: 1.0 },
  'EU': { multiplier: 1.0 },
  'default': { multiplier: 0.5 }, // 50% limit for other regions
};

function getGeoMultiplier(req: NextApiRequest): number {
  const country = req.headers['cf-ipcountry'] as string; // Cloudflare
  return GEO_RATE_LIMITS[country]?.multiplier || GEO_RATE_LIMITS.default.multiplier;
}
```

## Troubleshooting

### "Rate limit exceeded" for legitimate users

**Symptom**: Users behind corporate NAT getting rate limited

**Solution**: Increase limits or implement user-based tracking:

```typescript
// Always use user ID for authenticated requests
const userId = req.session?.user?.id;
checkRateLimit(req, 'api', userId); // Tracks by user, not IP
```

### False positive WAF blocks

**Symptom**: Legitimate input blocked by WAF

**Solution**: Refine regex patterns or add exceptions:

```typescript
// Add exceptions for specific endpoints
if (req.url === '/api/items/formula') {
  // Allow mathematical formulas that might look like SQL
  return handler(req, res);
}
```

### Memory leak with in-memory store

**Symptom**: Growing memory usage

**Solution**: Ensure cleanup runs regularly:

```typescript
// Verify cleanup is running
console.log('Rate limit store size:', rateLimitStore.size);

// Force cleanup
cleanupRateLimitStore();
```

Better: **Migrate to Redis** for production.

### Rate limits not working across instances

**Symptom**: Users can exceed limits by hitting different servers

**Solution**: Migrate to distributed rate limiting with Redis (see Production Considerations above).

## Security Best Practices

### 1. Defense in Depth

Rate limiting and WAF are not silver bullets. Also implement:
- Input validation with schemas (Zod, Joi)
- Parameterized queries (Prisma)
- Output encoding
- CSRF protection
- Secure headers (CSP, HSTS)

### 2. Monitor and Alert

Set up alerts for:
- Unusual spike in rate limit violations
- WAF blocks from same IP
- Geographic anomalies
- Attack pattern trends

### 3. Logging

Log all security events:

```typescript
import { auditLog } from '@/lib/audit';

// Log rate limit violations
auditLog.warn('Rate limit exceeded', {
  userId,
  ip: getClientIp(req),
  endpoint: req.url,
  tier,
});

// Log WAF blocks
auditLog.warn('WAF blocked request', {
  ip: getClientIp(req),
  attackType,
  endpoint: req.url,
  payload: sanitize(req.body),
});
```

### 4. Incident Response

When under attack:
1. **Identify**: Check logs for patterns
2. **Block**: Add IPs to firewall/CDN
3. **Tighten**: Temporarily reduce rate limits
4. **Investigate**: Analyze attack vectors
5. **Patch**: Fix any discovered vulnerabilities
6. **Review**: Post-mortem and improvements

### 5. Regular Testing

Test your defenses:

```bash
# Test rate limiting
for i in {1..150}; do curl https://api.cpam.com/endpoint; done

# Test WAF
curl "https://api.cpam.com/users?id=1' OR '1'='1"
```

Expected: Rate limits engage, WAF blocks malicious input.

## Compliance

Rate limiting and WAF support compliance requirements:

**SOC2**:
- **CC6.1**: Logical access controls (rate limiting prevents brute force)
- **CC7.2**: Security monitoring (WAF blocks and alerts)
- **CC7.3**: Security incidents (logs for incident response)

**PCI DSS**:
- **Requirement 6.5**: Secure development (WAF protects against OWASP Top 10)
- **Requirement 8.2.4**: Rate limiting prevents password brute force

**GDPR**:
- **Article 32**: Security measures (protects against data breaches)

## References

- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)

---

**Questions?** Contact security@cpam.example.com

**Document Owner**: Security Team
**Last Updated**: 2024-01-08
**Next Review**: 2024-04-08
