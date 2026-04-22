import { NextRequest } from 'next/server';

import { getWorkspaceStats } from '@/domains/analytics';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const stats = await getWorkspaceStats(workspaceId, user.uid);
    return apiSuccess(stats);
  } catch (error) {
    return apiError(error);
  }
}

