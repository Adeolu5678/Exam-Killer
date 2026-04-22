import { NextRequest } from 'next/server';

import { listTutorMessages } from '@/domains/tutor';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

function parseLimit(request: NextRequest): number {
  const limitValue = new URL(request.url).searchParams.get('limit');
  if (!limitValue) {
    return 200;
  }

  const parsed = Number.parseInt(limitValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
    throw new ValidationError('limit must be between 1 and 500');
  }

  return parsed;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { threadId } = await context.params;
    if (!threadId) {
      throw new ValidationError('Thread ID is required');
    }

    const limit = parseLimit(request);
    const result = await listTutorMessages(threadId, user.uid, limit);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

