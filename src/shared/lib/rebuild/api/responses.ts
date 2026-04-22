import { NextResponse } from 'next/server';

import type { ApiEnvelope } from './contracts';
import { getRequestContextMeta } from './request-context';
import { normalizeAppError } from '../errors';

function withDefaultMeta(meta: Record<string, unknown> | undefined, requestId: string): Record<string, unknown> {
  return {
    requestId,
    ...meta,
  };
}

export async function apiSuccess<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  const context = await getRequestContextMeta();
  const body: ApiEnvelope<T> = {
    success: true,
    data,
    meta: withDefaultMeta(init?.meta, context.requestId),
  };

  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      'x-request-id': context.requestId,
    },
  });
}

export async function apiError(
  error: unknown,
  init?: { status?: number; meta?: Record<string, unknown> },
) {
  const context = await getRequestContextMeta();

  const appError = normalizeAppError(error);

  const body: ApiEnvelope<never> = {
    success: false,
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : 'Internal server error',
      details: appError.expose ? appError.details : undefined,
    },
    meta: withDefaultMeta(init?.meta, context.requestId),
  };

  return NextResponse.json(body, {
    status: init?.status ?? appError.status,
    headers: {
      'x-request-id': context.requestId,
    },
  });
}
