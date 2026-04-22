import { NextRequest } from 'next/server';

import {
  createTutorThread,
  createTutorThreadRequestSchema,
  listTutorThreads,
} from '@/domains/tutor';

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

    const threads = await listTutorThreads(workspaceId, user.uid);
    return apiSuccess({ threads });
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
    const parsed = createTutorThreadRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid tutor thread payload', {
        issues: parsed.error.issues,
      });
    }

    const thread = await createTutorThread({
      workspaceId,
      userId: user.uid,
      title: parsed.data.title,
    });

    return apiSuccess({ thread }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

