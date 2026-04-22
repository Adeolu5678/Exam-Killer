import { NextRequest } from 'next/server';

import { updateTutorThread, updateTutorThreadRequestSchema } from '@/domains/tutor';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { threadId } = await context.params;
    if (!threadId) {
      throw new ValidationError('Thread ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateTutorThreadRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid thread update payload', {
        issues: parsed.error.issues,
      });
    }

    const thread = await updateTutorThread(threadId, user.uid, parsed.data.title);
    return apiSuccess({ thread });
  } catch (error) {
    return apiError(error);
  }
}

