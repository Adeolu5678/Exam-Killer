import { NextRequest } from 'next/server';

import { generateFlashcardsRequestSchema, generateWorkspaceFlashcards } from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
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
    const payload = generateFlashcardsRequestSchema.parse(body);

    const result = await generateWorkspaceFlashcards({
      workspaceId,
      userId: user.uid,
      sourceIds: payload.source_ids,
      count: payload.count,
      topics: payload.topics,
    });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
