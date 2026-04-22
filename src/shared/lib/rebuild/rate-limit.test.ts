import { beforeEach, describe, expect, it } from 'vitest';

import { enforceRateLimit, getClientAddressFromHeaders } from './rate-limit';

describe('rebuild rate limit', () => {
  beforeEach(() => {
    globalThis.__examKillerRateLimitStore = new Map();
  });

  it('allows requests within the configured window budget', () => {
    const first = enforceRateLimit('user-a', { windowMs: 1_000, maxRequests: 2, nowMs: 1_000 });
    const second = enforceRateLimit('user-a', { windowMs: 1_000, maxRequests: 2, nowMs: 1_100 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests that exceed the configured budget', () => {
    enforceRateLimit('user-b', { windowMs: 1_000, maxRequests: 1, nowMs: 1_000 });
    const blocked = enforceRateLimit('user-b', { windowMs: 1_000, maxRequests: 1, nowMs: 1_100 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets budget after the window elapses', () => {
    enforceRateLimit('user-c', { windowMs: 1_000, maxRequests: 1, nowMs: 1_000 });
    const allowedAgain = enforceRateLimit('user-c', { windowMs: 1_000, maxRequests: 1, nowMs: 2_001 });

    expect(allowedAgain.allowed).toBe(true);
    expect(allowedAgain.remaining).toBe(0);
  });

  it('extracts client address from request headers', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.5, 10.0.0.1',
    });

    expect(getClientAddressFromHeaders(headers)).toBe('203.0.113.5');
  });
});
