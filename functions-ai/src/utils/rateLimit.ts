import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Simple In-Memory Rate Limiting for Cloud Functions
 *
 * Uses function instance memory to track request counts.
 * No Firestore dependency = zero latency overhead.
 *
 * Tradeoffs:
 * - Per-instance only: Different function instances have separate counters
 * - Resets on cold start: Counter resets when instance is recycled
 * - Sufficient for: Low-volume endpoints like account creation
 *
 * For high-accuracy rate limiting, use a distributed store like Redis.
 */

// In-memory cache: key -> { count, resetAt }
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.resetAt) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Check rate limit using in-memory counter
 *
 * @param identifier - Unique identifier (IP, userId, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 * @returns Object with allowed status and remaining count
 */
export function checkRateLimitInMemory(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const cached = rateLimitCache.get(identifier);

  // New window or expired entry
  if (!cached || now > cached.resetAt) {
    rateLimitCache.set(identifier, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowSeconds,
    };
  }

  // Check limit
  if (cached.count >= maxRequests) {
    const resetIn = Math.ceil((cached.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  // Increment count
  cached.count++;
  const resetIn = Math.ceil((cached.resetAt - now) / 1000);

  return {
    allowed: true,
    remaining: maxRequests - cached.count,
    resetIn,
  };
}

/**
 * Enforce rate limit - throws error if limit exceeded
 *
 * @param identifier - Unique identifier (IP, userId, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 * @throws HttpsError if rate limit exceeded
 */
export function enforceRateLimitInMemory(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): void {
  const result = checkRateLimitInMemory(identifier, maxRequests, windowSeconds);

  if (!result.allowed) {
    console.warn('[RATE_LIMIT] Limit exceeded', {
      identifier: identifier.substring(0, 8) + '...',
      resetIn: result.resetIn,
    });

    throw new HttpsError(
      'resource-exhausted',
      `Too many requests. Please try again in ${result.resetIn} seconds.`
    );
  }
}

/**
 * Get client IP from request headers
 * Works with Cloud Run and Firebase Functions
 */
export function getClientIp(request: { rawRequest?: { headers?: Record<string, unknown> } }): string {
  const headers = request.rawRequest?.headers || {};

  // Check common proxy headers
  const forwardedFor = headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    // Take the first IP (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  // Fallback
  return 'unknown';
}
