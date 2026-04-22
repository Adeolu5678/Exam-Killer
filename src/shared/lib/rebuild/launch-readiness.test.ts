import { describe, expect, it } from 'vitest';

import { buildLaunchReadinessReport } from './launch-readiness';

describe('launch readiness report', () => {
  it('marks report as launch-safe only when all checklist items pass', async () => {
    const report = await buildLaunchReadinessReport({
      healthReady: true,
      evidence: {
        core_flows_e2e: { passed: true, timestamp: '2026-04-22T00:00:00.000Z' },
        payment_webhook_preview: { passed: true, timestamp: '2026-04-22T00:00:00.000Z' },
        signed_file_access: { passed: true, timestamp: '2026-04-22T00:00:00.000Z' },
      },
      rateLimitsAndQuotasVerified: true,
    });

    expect(report.ok).toBe(true);
    expect(report.checklist).toHaveLength(7);
    expect(report.checklist.every((item) => item.status === 'pass')).toBe(true);
  });

  it('flags manual blockers when preview-only checks are not marked complete', async () => {
    const report = await buildLaunchReadinessReport({
      healthReady: true,
      evidence: {},
      rateLimitsAndQuotasVerified: true,
    });

    expect(report.ok).toBe(false);
    const blockedIds = report.checklist.filter((item) => item.blocked).map((item) => item.id);
    expect(blockedIds).toContain('core-flows-e2e');
    expect(blockedIds).toContain('payment-webhook-preview-tested');
    expect(blockedIds).toContain('signed-file-access-tested');
  });
});
