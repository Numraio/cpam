/**
 * Rate Limiting Middleware
 *
 * Implements token bucket algorithm for rate limiting API requests.
 * Supports multiple rate limit tiers based on endpoint sensitivity.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getClientIp } from './server-common';

// Rate limit configurations by tier
export const RATE_LIMIT_TIERS = {
  // Strict limits for authentication endpoints (10 requests per 15 minutes)
  auth: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  // Upload/import endpoints (5 requests per hour)
  upload: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Upload rate limit exceeded. Please try again in 1 hour.',
  },

  // Calculation/heavy compute endpoints (20 requests per minute)
  compute: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many calculation requests. Please slow down.',
  },

  // General API endpoints (100 requests per minute)
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'API rate limit exceeded. Please slow down.',
  },

  // Public/unauthenticated endpoints (30 requests per minute)
  public: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded. Please try again later.',
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

// In-memory store for rate limit tracking
// In production, use Redis or similar distributed cache
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Bypass list for internal services
const BYPASS_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  // Add your internal service IPs here
  // process.env.INTERNAL_SERVICE_IP,
]);

// Bypass tokens for internal services
const BYPASS_TOKENS = new Set([
  process.env.INTERNAL_SERVICE_TOKEN,
  process.env.MONITORING_TOKEN,
].filter(Boolean));

/**
 * Check if request should bypass rate limiting
 */
function shouldBypass(req: NextApiRequest): boolean {
  // Check IP bypass
  const clientIp = getClientIp(req);
  if (clientIp && BYPASS_IPS.has(clientIp)) {
    return true;
  }

  // Check token bypass
  const bypassToken = req.headers['x-bypass-token'] as string;
  if (bypassToken && BYPASS_TOKENS.has(bypassToken)) {
    return true;
  }

  // Check internal service header
  const isInternal = req.headers['x-internal-service'] === 'true';
  if (isInternal && process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

/**
 * Get unique identifier for rate limiting
 * Uses IP + User ID for authenticated requests, just IP for unauthenticated
 */
function getRateLimitKey(
  req: NextApiRequest,
  tier: RateLimitTier,
  userId?: string
): string {
  const ip = getClientIp(req) || 'unknown';

  if (userId) {
    return `ratelimit:${tier}:user:${userId}`;
  }

  return `ratelimit:${tier}:ip:${ip}`;
}

/**
 * Clean up expired entries from rate limit store
 * Call periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Check rate limit for a request
 * Returns remaining requests and reset time, or null if limit exceeded
 */
export function checkRateLimit(
  req: NextApiRequest,
  tier: RateLimitTier,
  userId?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  // Check bypass conditions
  if (shouldBypass(req)) {
    return {
      allowed: true,
      remaining: 999999,
      resetTime: Date.now() + 60000,
      limit: 999999,
    };
  }

  const config = RATE_LIMIT_TIERS[tier];
  const key = getRateLimitKey(req, tier, userId);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Rate limit middleware wrapper
 * Usage: export default rateLimit('api')(handler)
 */
export function rateLimit(tier: RateLimitTier) {
  return function middleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Extract user ID from session if available
      const userId = (req as any).session?.user?.id;

      // Check rate limit
      const { allowed, remaining, resetTime, limit } = checkRateLimit(
        req,
        tier,
        userId
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

      // If rate limit exceeded, return 429
      if (!allowed) {
        const config = RATE_LIMIT_TIERS[tier];
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        res.setHeader('Retry-After', retryAfter.toString());

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message,
          retryAfter,
          limit,
          resetTime: Math.ceil(resetTime / 1000),
        });
      }

      // Continue to handler
      return handler(req, res);
    };
  };
}

/**
 * WAF-style pattern detection
 */

// Common attack patterns to detect
const ATTACK_PATTERNS = {
  sqlInjection: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b).*(\bFROM\b|\bWHERE\b)/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE|SELECT)/i,
    /\/\*.*\*\//,  // SQL comments
    /'.*OR.*'.*=/i,
  ],

  xss: [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,  // Event handlers like onclick=
    /<iframe[^>]*>/i,
    /<embed[^>]*>/i,
    /<object[^>]*>/i,
  ],

  pathTraversal: [
    /\.\.[\/\\]/,
    /%2e%2e[\/\\]/i,
    /\.\.[%5c%2f]/i,
  ],

  commandInjection: [
    /[;&|`$()]/,
    /\$\(.*\)/,
    /`.*`/,
  ],
};

export type AttackType = keyof typeof ATTACK_PATTERNS;

/**
 * Detect potential attack patterns in input
 */
export function detectAttackPattern(input: string): AttackType | null {
  for (const [attackType, patterns] of Object.entries(ATTACK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return attackType as AttackType;
      }
    }
  }

  return null;
}

/**
 * WAF middleware to detect and block common attack patterns
 */
export function wafProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip WAF for internal services
    if (shouldBypass(req)) {
      return handler(req, res);
    }

    // Check URL parameters
    const url = new URL(req.url!, `http://${req.headers.host}`);
    for (const [key, value] of url.searchParams.entries()) {
      const attackType = detectAttackPattern(value);
      if (attackType) {
        console.warn(`WAF: Blocked ${attackType} attack in URL param '${key}'`, {
          ip: getClientIp(req),
          url: req.url,
          userAgent: req.headers['user-agent'],
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Potential attack pattern detected',
        });
      }
    }

    // Check request body (if present)
    if (req.body && typeof req.body === 'object') {
      const checkObject = (obj: any, path = ''): AttackType | null => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            const attackType = detectAttackPattern(value);
            if (attackType) {
              console.warn(`WAF: Blocked ${attackType} attack in body field '${currentPath}'`, {
                ip: getClientIp(req),
                url: req.url,
                userAgent: req.headers['user-agent'],
              });
              return attackType;
            }
          } else if (typeof value === 'object' && value !== null) {
            const nestedAttack = checkObject(value, currentPath);
            if (nestedAttack) {
              return nestedAttack;
            }
          }
        }
        return null;
      };

      const attackType = checkObject(req.body);
      if (attackType) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Potential attack pattern detected',
        });
      }
    }

    // Continue to handler
    return handler(req, res);
  };
}

/**
 * Combined middleware: WAF + Rate Limiting
 */
export function protectedRoute(tier: RateLimitTier) {
  return function middleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return wafProtection(rateLimit(tier)(handler));
  };
}
