interface FixedWindowRateLimitOptions {
  windowMs: number;
  maxRequests: number;
  nowMs?: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface FixedWindowRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

declare global {
  var __examKillerRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function getRateLimitStore(): Map<string, RateLimitBucket> {
  if (!globalThis.__examKillerRateLimitStore) {
    globalThis.__examKillerRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalThis.__examKillerRateLimitStore;
}

function pruneExpiredBuckets(store: Map<string, RateLimitBucket>, nowMs: number): void {
  if (store.size < 10_000) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= nowMs) {
      store.delete(key);
    }
  }
}

export function enforceRateLimit(
  key: string,
  options: FixedWindowRateLimitOptions,
): FixedWindowRateLimitResult {
  const windowMs = Math.max(1_000, Math.trunc(options.windowMs));
  const maxRequests = Math.max(1, Math.trunc(options.maxRequests));
  const nowMs = options.nowMs ?? Date.now();
  const store = getRateLimitStore();

  pruneExpiredBuckets(store, nowMs);

  const current = store.get(key);
  const bucket =
    current && current.resetAt > nowMs
      ? current
      : {
          count: 0,
          resetAt: nowMs + windowMs,
        };

  if (bucket.count >= maxRequests) {
    const retryAfterMs = Math.max(0, bucket.resetAt - nowMs);
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  bucket.count += 1;
  store.set(key, bucket);

  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  };
}

export function getClientAddressFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for'),
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const client = value.split(',')[0]?.trim();
    if (client) {
      return client;
    }
  }

  return null;
}
