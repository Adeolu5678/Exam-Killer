import { NextRequest } from 'next/server';

import {
  deleteStudySession,
  getStudySession,
  updateStudySession,
  updateStudySessionSchema,
} from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string; sessionId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, sessionId } = await context.params;
    if (!workspaceId || !sessionId) {
      throw new ValidationError('Workspace ID and session ID are required');
    }

    const session = await getStudySession(workspaceId, sessionId, user.uid);
    return apiSuccess(session);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, sessionId } = await context.params;
    if (!workspaceId || !sessionId) {
      throw new ValidationError('Workspace ID and session ID are required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = updateStudySessionSchema.parse(body);
    const session = await updateStudySession({ workspaceId, sessionId, userId: user.uid, payload });
    return apiSuccess(session);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, sessionId } = await context.params;
    if (!workspaceId || !sessionId) {
      throw new ValidationError('Workspace ID and session ID are required');
    }

    await deleteStudySession(workspaceId, sessionId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

