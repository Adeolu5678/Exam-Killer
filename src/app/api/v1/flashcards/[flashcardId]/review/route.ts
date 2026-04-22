import { NextRequest } from 'next/server';

import { reviewFlashcard, reviewFlashcardRequestSchema } from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ flashcardId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
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
    const payload = reviewFlashcardRequestSchema.parse(body);
    const rating = payload.rating ?? payload.quality;
    if (rating === undefined) {
      throw new ValidationError('Rating is required');
    }

    const result = await reviewFlashcard({
      flashcardId,
      userId: user.uid,
      rating,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
