import { headers } from 'next/headers';

import type { RequestContextMeta } from './contracts';

function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getRequestContextMeta(): Promise<RequestContextMeta> {
  const headerStore = await headers();
  const requestId =
    headerStore.get('x-request-id') ??
    headerStore.get('x-vercel-id') ??
    headerStore.get('x-correlation-id') ??
    createRequestId();

  return {
    requestId,
    path: headerStore.get('x-request-path') ?? '',
    method: headerStore.get('x-request-method') ?? '',
  };
}
