import { NextRequest } from 'next/server';

import {
  createFlashcardRequestSchema,
  flashcardListQuerySchema,
  listWorkspaceFlashcards,
  createWorkspaceFlashcard,
} from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

function parseListQuery(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const limit = params.get('limit');
  const offset = params.get('offset');

  return flashcardListQuerySchema.parse({
    source_id: params.get('source_id') || undefined,
    limit: limit ? Number.parseInt(limit, 10) : undefined,
    offset: offset ? Number.parseInt(offset, 10) : undefined,
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

    const query = parseListQuery(request);
    const result = await listWorkspaceFlashcards(workspaceId, user.uid, {
      sourceId: query.source_id,
      limit: query.limit,
      offset: query.offset,
    });
    return apiSuccess(result);
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
    const payload = createFlashcardRequestSchema.parse(body);

    const flashcard = await createWorkspaceFlashcard({
      workspaceId,
      userId: user.uid,
      payload,
    });

    return apiSuccess({ flashcard }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
