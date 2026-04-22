import { NextRequest } from 'next/server';

import { analyticsDaysQuerySchema, getGlobalAnalyticsSummary } from '@/domains/analytics';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

function parseDays(request: NextRequest): number {
  const params = new URL(request.url).searchParams;
  const raw = params.get('days');
  return analyticsDaysQuerySchema.parse({
    days: raw ? Number.parseInt(raw, 10) : undefined,
  }).days;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const days = parseDays(request);
    const summary = await getGlobalAnalyticsSummary(user.uid, days);
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}

