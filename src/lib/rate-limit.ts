/**
 * 🛡️ LIGHTWEIGHT IN-MEMORY IP RATE LIMITER
 * Protects server-side endpoints from brute-force automated scraping.
 */
type RateLimitInfo = {
  count: number;
  resetTime: number;
};

const ipMap = new Map<string, RateLimitInfo>();

export function rateLimit(
  ip: string, 
  limit: number = 60, 
  windowMs: number = 60000
): { success: boolean; limit: number; remaining: number } {
  const now = Date.now();
  const info = ipMap.get(ip);

  if (!info) {
    ipMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1 };
  }

  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1 };
  }

  if (info.count >= limit) {
    return { success: false, limit, remaining: 0 };
  }

  info.count += 1;
  return { success: true, limit, remaining: limit - info.count };
}

// Periodically prune expired entries to prevent memory leaks
if (typeof global !== 'undefined') {
  const globalAny = global as any;
  if (!globalAny.__rateLimitPruneInterval) {
    globalAny.__rateLimitPruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, info] of ipMap.entries()) {
        if (now > info.resetTime) {
          ipMap.delete(ip);
        }
      }
    }, 300000); // Every 5 minutes
  }
}
