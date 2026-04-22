import { describe, expect, it } from 'vitest';

import {
  createTutorThreadRequestSchema,
  updateTutorThreadRequestSchema,
  sendTutorMessageRequestSchema,
} from './tutor';

describe('tutor contracts', () => {
  it('validates send message payload with optional thread', () => {
    const result = sendTutorMessageRequestSchema.safeParse({
      thread_id: 'thread_123',
      message: 'Explain the Krebs cycle',
      personality: 'mentor',
      stream: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thread_id).toBe('thread_123');
      expect(result.data.message).toBe('Explain the Krebs cycle');
    }
  });

  it('rejects empty message payload', () => {
    const result = sendTutorMessageRequestSchema.safeParse({
      message: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('validates create thread request', () => {
    const result = createTutorThreadRequestSchema.safeParse({
      title: 'Cellular respiration review',
    });
    expect(result.success).toBe(true);
  });

  it('requires title for update thread request', () => {
    const result = updateTutorThreadRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

