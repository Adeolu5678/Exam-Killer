import { NextRequest } from 'next/server';

import { createStudySession, createStudySessionSchema, listWorkspaceStudySessions } from '@/domains/study-plan';

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

    const result = await listWorkspaceStudySessions(workspaceId, user.uid);
    return apiSuccess(result.sessions);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = createStudySessionSchema.parse(body);
    const session = await createStudySession({ workspaceId, userId: user.uid, payload });
    return apiSuccess(session, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

