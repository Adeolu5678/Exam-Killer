import { describe, expect, it } from 'vitest';

import { createHealthReport, getFoundationReadinessChecks, getLivenessChecks } from './health';

describe('rebuild health helpers', () => {
  it('marks liveness checks healthy by default', () => {
    const report = createHealthReport(getLivenessChecks());

    expect(report.ok).toBe(true);
    expect(report.service).toBe('exam-killer');
    expect(report.checks).toHaveLength(1);
  });

  it('builds readiness checks for the foundation dependencies', () => {
    const checks = getFoundationReadinessChecks();

    expect(checks.map((check) => check.name)).toEqual([
      'firebase-client-config',
      'firebase-admin',
      'firebase-storage-bucket',
    ]);
    expect(checks).toHaveLength(3);
  });
});
