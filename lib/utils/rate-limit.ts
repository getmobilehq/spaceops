/**
 * In-memory sliding window rate limiter.
 * Suitable for single-instance deployments (Netlify).
 * For horizontal scaling, migrate to Redis.
 */

type Entry = { count: number; resetAt: number };
const store = new Map<string, Map<string, Entry>>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  identifier: string,
  limiterKey: string,
  config: RateLimitConfig
): RateLimitResult {
  if (!store.has(limiterKey)) store.set(limiterKey, new Map());
  const limiter = store.get(limiterKey)!;
  const now = Date.now();
  const entry = limiter.get(identifier);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    limiter.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

export function rateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}

/** Clear all rate limit state — for testing only */
export function clearRateLimitStore(): void {
  store.clear();
}
