import { NextRequest } from 'next/server';

import {
  flashcardReviewHistoryQuerySchema,
  listWorkspaceFlashcardReviewHistory,
} from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

function parseHistoryQuery(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const limit = params.get('limit');
  return flashcardReviewHistoryQuerySchema.parse({
    limit: limit ? Number.parseInt(limit, 10) : undefined,
  });
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

    const query = parseHistoryQuery(request);
    const result = await listWorkspaceFlashcardReviewHistory(workspaceId, user.uid, query.limit);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
