import { createHealthReport, getLivenessChecks } from '@/shared/lib/rebuild';
import { apiSuccess } from '@/shared/lib/rebuild/api/responses';

export async function GET(): Promise<Response> {
  const report = createHealthReport(getLivenessChecks());
  return apiSuccess(report, {
    status: report.ok ? 200 : 503,
    meta: {
      endpoint: 'health-live',
    },
  });
}
