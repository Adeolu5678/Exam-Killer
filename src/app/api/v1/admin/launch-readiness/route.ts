import { requireAdminUserId } from '@/shared/lib/rebuild/admin-access';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { buildLaunchReadinessReport } from '@/shared/lib/rebuild/launch-readiness';

export async function GET(): Promise<Response> {
  try {
    await requireAdminUserId();
    const report = await buildLaunchReadinessReport();
    return apiSuccess(report);
  } catch (error) {
    return apiError(error);
  }
}
