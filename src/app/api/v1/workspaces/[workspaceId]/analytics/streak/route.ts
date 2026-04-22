import { NextRequest } from 'next/server';

import { analyticsDaysQuerySchema, getWorkspaceStreak } from '@/domains/analytics';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

function parseDays(request: NextRequest): number {
  const params = new URL(request.url).searchParams;
  const raw = params.get('days');
  return analyticsDaysQuerySchema.parse({
    days: raw ? Number.parseInt(raw, 10) : undefined,
  }).days;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const days = parseDays(request);
    const streak = await getWorkspaceStreak(workspaceId, user.uid, days);
    return apiSuccess(streak);
  } catch (error) {
    return apiError(error);
  }
}

