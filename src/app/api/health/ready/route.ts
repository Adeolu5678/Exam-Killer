import { createHealthReport, getFoundationReadinessChecks } from '@/shared/lib/rebuild';
import { apiSuccess } from '@/shared/lib/rebuild/api/responses';

export async function GET(): Promise<Response> {
  const report = createHealthReport(getFoundationReadinessChecks());
  return apiSuccess(report, {
    status: report.ok ? 200 : 503,
    meta: {
      endpoint: 'health-ready',
    },
  });
}
