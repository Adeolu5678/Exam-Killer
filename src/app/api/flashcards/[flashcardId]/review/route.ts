import { NextRequest } from 'next/server';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { calculateNextReview } from '@/shared/lib/spaced-repetition';

interface ReviewBody {
  rating: number;
}

interface FlashcardData {
  user_id: string;
  front?: string;
  back?: string;
  tags?: string[];
  interval?: number;
  ease_factor?: number;
  repetitions?: number;
  review_count?: number;
  difficulty?: number;
  next_review?: Date;
  last_review?: Date;
}

function extractFlashcardId(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/\/flashcards\/([^\/]+)\/review/);
  return match?.[1] ?? null;
}

export const POST = withAuth(async (request, { db, userId }) => {
  const flashcardId = extractFlashcardId(request);

  if (!flashcardId) {
    return errorResponse('Flashcard ID is required', StatusCodes.BAD_REQUEST);
  }

  const body = await parseBody<ReviewBody>(request);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { rating } = body;

  if (rating === undefined || rating < 0 || rating > 5) {
    return errorResponse('Rating must be between 0 and 5', StatusCodes.BAD_REQUEST);
  }

  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    return errorResponse('Flashcard not found', StatusCodes.NOT_FOUND);
  }

  const flashcardData = flashcardDoc.data() as FlashcardData;

  if (!flashcardData) {
    return errorResponse('Flashcard not found', StatusCodes.NOT_FOUND);
  }

  if (flashcardData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const currentInterval = flashcardData.interval ?? 0;
  const currentEaseFactor = flashcardData.ease_factor ?? 2.5;
  const currentRepetitions = flashcardData.repetitions ?? 0;

  const result = calculateNextReview(
    rating,
    currentInterval,
    currentEaseFactor,
    currentRepetitions,
  );

  const updatedFlashcard = {
    interval: result.newInterval,
    ease_factor: result.newEaseFactor,
    repetitions: result.newRepetitions,
    next_review: result.nextReviewDate,
    review_count: (flashcardData.review_count ?? 0) + 1,
    last_review: new Date(),
    difficulty: rating,
  };

  await db.collection('flashcards').doc(flashcardId).update(updatedFlashcard);

  // Update centralized stats
  const { updateUserStats } = await import('@/shared/lib/analytics/stats');
  await updateUserStats(db, userId, {
    flashcards_reviewed: 1,
    flashcards_mastered: rating >= 4 ? 1 : 0,
    xp_earned: 5, // Base XP for review
    study_time_minutes: 1, // Assume 1 minute for review for simplicity
  });

  const updatedDoc = await db.collection('flashcards').doc(flashcardId).get();
  const updatedData = updatedDoc.data() as FlashcardData | undefined;

  return successResponse({
    flashcard: {
      id: flashcardId,
      front: updatedData?.front ?? '',
      back: updatedData?.back ?? '',
      tags: updatedData?.tags ?? [],
      difficulty: updatedData?.difficulty ?? rating,
      ease_factor: updatedData?.ease_factor ?? result.newEaseFactor,
      interval: updatedData?.interval ?? result.newInterval,
      next_review:
        (updatedData?.next_review as unknown as { toDate?: () => Date })
          ?.toDate?.()
          ?.toISOString() ?? result.nextReviewDate.toISOString(),
    },
  });
});
