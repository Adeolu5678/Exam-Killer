import { NextRequest } from 'next/server';

import { clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { withRequestLogging } from '@/shared/lib/rebuild/logger';

export async function POST(request: NextRequest): Promise<Response> {
  return withRequestLogging(request, async () => {
    try {
      await clearSessionCookie();
      return apiSuccess({ success: true });
    } catch (error) {
      return apiError(error instanceof Error ? error : new Error('Failed to clear session'));
    }
  });
}
