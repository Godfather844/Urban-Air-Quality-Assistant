import type { NextFunction, Request, Response } from 'express';
import { SERVER_CONFIG } from './config.ts';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  maxTrackedIps?: number;
}

/** Applies defensive security headers while preserving iframe preview compatibility. */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

/** Creates a memory-bounded per-IP fixed-window rate limiting middleware. */
export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>();
  const maxTrackedIps = options.maxTrackedIps ?? SERVER_CONFIG.rateLimitMaxTrackedIps;

  function pruneExpiredBuckets(now: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
    while (buckets.size >= maxTrackedIps) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      if (buckets.size >= maxTrackedIps) {
        pruneExpiredBuckets(now);
      }
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
      });
      return;
    }

    current.count += 1;
    next();
  };
}

/** Handles invalid JSON request bodies with a structured 400 error payload. */
export function malformedJsonErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON request body.' });
    return;
  }
  next(err);
}
