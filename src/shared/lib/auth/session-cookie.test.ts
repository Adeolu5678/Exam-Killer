import { describe, expect, it } from 'vitest';

import { hasValidUnexpiredJwt } from './session-cookie';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function buildToken(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('hasValidUnexpiredJwt', () => {
  it('returns false when cookie is missing', () => {
    expect(hasValidUnexpiredJwt(undefined)).toBe(false);
  });

  it('returns false for malformed tokens', () => {
    expect(hasValidUnexpiredJwt('bad-token')).toBe(false);
  });

  it('returns false when exp claim is missing', () => {
    const token = buildToken({ sub: 'user-1' });
    expect(hasValidUnexpiredJwt(token, 1_700_000_000_000)).toBe(false);
  });

  it('returns false when token is expired', () => {
    const token = buildToken({ exp: 1_700_000_000 });
    expect(hasValidUnexpiredJwt(token, 1_700_000_001_000)).toBe(false);
  });

  it('returns true when token is still valid', () => {
    const token = buildToken({ exp: 1_700_000_010 });
    expect(hasValidUnexpiredJwt(token, 1_700_000_000_000)).toBe(true);
  });
});
