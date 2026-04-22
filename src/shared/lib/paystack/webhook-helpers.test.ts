import { describe, expect, it } from 'vitest';

import {
  buildEventDedupeKey,
  extractPlanFromEvent,
  extractEventTimestampMs,
  extractUserIdFromMetadata,
  extractWebhookReference,
  mapPlanNameToPlan,
  type PaystackWebhookEvent,
} from './webhook-helpers';

function makeEvent(partial: Partial<PaystackWebhookEvent>): PaystackWebhookEvent {
  const { data, ...rest } = partial;

  return {
    event: 'charge.success',
    ...rest,
    data: {
      ...(data ?? {}),
    },
  };
}

describe('paystack webhook helpers', () => {
  it('extracts webhook reference when present', () => {
    const event = makeEvent({ data: { reference: 'ref_123' } });
    expect(extractWebhookReference(event)).toBe('ref_123');
  });

  it('prefers metadata plan when deriving plan', () => {
    const event = makeEvent({ data: { metadata: { plan: 'premium_annual' } } });
    expect(extractPlanFromEvent(event)).toBe('premium_annual');
  });

  it('falls back to subscription plan name mapping', () => {
    const event = makeEvent({
      data: { subscription: { plan: { name: 'Premium Monthly' } } },
    });
    expect(extractPlanFromEvent(event)).toBe('premium_monthly');
  });

  it('extracts metadata userId only when non-empty', () => {
    const event = makeEvent({ data: { metadata: { userId: ' user_1 ' } } });
    expect(extractUserIdFromMetadata(event)).toBe('user_1');
    const missing = makeEvent({ data: { metadata: { userId: '   ' } } });
    expect(extractUserIdFromMetadata(missing)).toBeNull();
  });

  it('generates dedupe key from event and reference', () => {
    const event = makeEvent({ event: 'subscription.created', data: { reference: 'ref_abc' } });
    const key = buildEventDedupeKey(event);
    expect(typeof key).toBe('string');
    expect(key).toBeTruthy();
  });

  it('maps known plan aliases', () => {
    expect(mapPlanNameToPlan('premium')).toBe('premium_monthly');
    expect(mapPlanNameToPlan('premium-annual')).toBe('premium_annual');
    expect(mapPlanNameToPlan('unknown')).toBeNull();
  });

  it('derives timestamp from paid_at and supports unix seconds', () => {
    const withIso = makeEvent({ data: { paid_at: '2026-01-01T00:00:00.000Z' } });
    expect(extractEventTimestampMs(withIso)).toBe(Date.parse('2026-01-01T00:00:00.000Z'));

    const withUnixSeconds = makeEvent({ data: { timestamp: 1_700_000_000 } });
    expect(extractEventTimestampMs(withUnixSeconds)).toBe(1_700_000_000_000);
  });

  it('builds dedupe key from fallback customer code when no reference exists', () => {
    const event = makeEvent({
      event: 'subscription.disabled',
      data: { customer: { customer_code: 'CUS_test_123' } },
    });
    expect(buildEventDedupeKey(event)).toBeTruthy();
  });
});
