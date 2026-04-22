import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly expose: boolean;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    expose?: boolean;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.expose = options.expose ?? true;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super({ code: 'AUTHENTICATION_REQUIRED', message, status: 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super({ code: 'FORBIDDEN', message, status: 403 });
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string = 'Server configuration error') {
    super({ code: 'CONFIGURATION_ERROR', message, status: 500, expose: false });
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Invalid request', details?: Record<string, unknown>) {
    super({ code: 'VALIDATION_ERROR', message, status: 400, details });
  }
}

export function normalizeAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError('Invalid request', {
      issues: error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      status: 500,
      expose: false,
    });
  }

  return new AppError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    status: 500,
    expose: false,
  });
}
