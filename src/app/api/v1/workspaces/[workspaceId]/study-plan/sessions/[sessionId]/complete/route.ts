import { NextRequest } from 'next/server';

import { completeStudySession } from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string; sessionId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, sessionId } = await context.params;
    if (!workspaceId || !sessionId) {
      throw new ValidationError('Workspace ID and session ID are required');
    }

    const session = await completeStudySession(workspaceId, sessionId, user.uid);
    return apiSuccess(session);
  } catch (error) {
    return apiError(error);
  }
}

