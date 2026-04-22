import { NextRequest } from 'next/server';

import { z } from 'zod';

import { deleteFlashcard, getFlashcardDetail, updateFlashcard } from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ flashcardId: string }>;
}

const updateFlashcardSchema = z.object({
  front: z.string().trim().min(1).max(2000).optional(),
  back: z.string().trim().min(1).max(4000).optional(),
});

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { flashcardId } = await context.params;
    if (!flashcardId) {
      throw new ValidationError('Flashcard ID is required');
    }

    const flashcard = await getFlashcardDetail(flashcardId, user.uid);
    return apiSuccess({ flashcard });
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

    const { flashcardId } = await context.params;
    if (!flashcardId) {
      throw new ValidationError('Flashcard ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = updateFlashcardSchema.parse(body);

    const flashcard = await updateFlashcard({
      flashcardId,
      userId: user.uid,
      payload,
    });

    return apiSuccess({ flashcard });
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

    const { flashcardId } = await context.params;
    if (!flashcardId) {
      throw new ValidationError('Flashcard ID is required');
    }

    await deleteFlashcard(flashcardId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
