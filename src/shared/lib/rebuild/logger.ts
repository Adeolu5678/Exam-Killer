import type { NextRequest } from 'next/server';

import { AppError, normalizeAppError } from './errors';

type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: error };
}

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export const appLogger = {
  info(message: string, fields?: LogFields): void {
    write('info', message, fields);
  },
  warn(message: string, fields?: LogFields): void {
    write('warn', message, fields);
  },
  error(message: string, error?: unknown, fields?: LogFields): void {
    write('error', message, {
      ...fields,
      error: serializeError(error),
    });
  },
};

export async function withRequestLogging<T>(request: NextRequest, operation: () => Promise<T>): Promise<T> {
  const requestId = request.headers.get('x-request-id') ?? `req_${Date.now().toString(36)}`;
  const startedAt = Date.now();

  try {
    const result = await operation();
    appLogger.info('Request completed', {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    const appError = normalizeAppError(error);
    appLogger.error('Request failed', error, {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
      status: appError.status,
      code: appError.code,
      durationMs: Date.now() - startedAt,
    });
    throw appError;
  }
}
