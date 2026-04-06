function decodeJwtPayload(payloadSegment: string): string {
  const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }

  throw new Error('No base64 decoder available');
}

export function hasValidUnexpiredJwt(
  sessionCookie: string | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!sessionCookie) return false;

  const parts = sessionCookie.split('.');
  if (parts.length !== 3) return false;

  try {
    const payloadJson = decodeJwtPayload(parts[1]);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp > Math.floor(nowMs / 1000);
  } catch {
    return false;
  }
}
