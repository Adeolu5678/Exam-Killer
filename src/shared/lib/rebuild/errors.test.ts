import { describe, expect, it } from 'vitest';

import {
  AppError,
  ValidationError,
  normalizeAppError,
} from './errors';

describe('rebuild errors', () => {
  it('preserves app errors', () => {
    const error = new ValidationError('Bad input', { field: 'email' });
    const normalized = normalizeAppError(error);

    expect(normalized).toBe(error);
    expect(normalized.status).toBe(400);
    expect(normalized.code).toBe('VALIDATION_ERROR');
  });

  it('hides generic internal error messages from unknown errors', () => {
    const normalized = normalizeAppError(new Error('Sensitive failure'));

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.status).toBe(500);
    expect(normalized.code).toBe('INTERNAL_SERVER_ERROR');
    expect(normalized.expose).toBe(false);
  });
});
