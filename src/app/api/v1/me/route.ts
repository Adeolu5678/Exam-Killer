import { getViewerSession } from '@/domains/users/services/viewer-service';

import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';

export async function GET(): Promise<Response> {
  try {
    const session = await getViewerSession();
    return apiSuccess(session);
  } catch (error) {
    return apiError(error instanceof Error ? error : new Error('Failed to resolve session'));
  }
}
