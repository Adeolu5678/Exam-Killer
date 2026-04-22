import { describe, expect, it, vi } from 'vitest';

import { appLogger } from './logger';

describe('rebuild logger', () => {
  it('serializes info logs as structured JSON', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    appLogger.info('Request completed', { requestId: 'req_123', path: '/api/health' });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const firstCall = infoSpy.mock.calls[0]?.[0];
    expect(typeof firstCall).toBe('string');
    expect(firstCall).toContain('Request completed');
    expect(firstCall).toContain('req_123');

    infoSpy.mockRestore();
  });

  it('serializes error logs with an error payload', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    appLogger.error('Request failed', new Error('boom'), { requestId: 'req_456' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const firstCall = errorSpy.mock.calls[0]?.[0];
    expect(typeof firstCall).toBe('string');
    expect(firstCall).toContain('Request failed');
    expect(firstCall).toContain('boom');
    expect(firstCall).toContain('req_456');

    errorSpy.mockRestore();
  });
});
