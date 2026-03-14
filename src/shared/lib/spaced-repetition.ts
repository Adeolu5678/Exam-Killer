/**
 * Result of a review calculation containing the next review date and updated flashcard parameters.
 */
export interface ReviewResult {
  nextReviewDate: Date;
  newInterval: number;
  newEaseFactor: number;
  newRepetitions: number;
}

/**
 * Initial flashcard data for a new card.
 */
export interface FlashcardData {
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review: Date;
}

/**
 * Rating labels for the SM-2 algorithm.
 * - 0-2: Fail/hard (incorrect response)
 * - 3: Good (correct with difficulty)
 * - 4-5: Easy (correct with hesitation or perfect)
 */
export const RATING_LABELS: Record<number, string> = {
  0: 'Complete blackout',
  1: 'Incorrect, but remembered upon seeing answer',
  2: 'Incorrect, but answer seemed easy to recall',
  3: 'Correct with serious difficulty',
  4: 'Correct after hesitation',
  5: 'Perfect response',
};

/**
 * Calculates the next review date and updated parameters using the SM-2 algorithm.
 *
 * The SM-2 algorithm is a spaced repetition algorithm that schedules reviews at optimal
 * intervals to maximize long-term retention. It adjusts the interval and ease factor
 * based on how well the user remembered the card.
 *
 * Algorithm details:
 * - If rating >= 3 (correct response):
 *   - First repetition: interval = 1 day
 *   - Second repetition: interval = 6 days
 *   - Subsequent: interval = previous_interval * ease_factor
 * - If rating < 3 (incorrect response):
 *   - Reset repetitions to 0
 *   - Reset interval to 1 day
 *
 * Ease factor adjustment:
 * - New EF = old EF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
 * - EF is capped at minimum 1.3
 *
 * @param rating - User's self-assessed rating (0-5)
 * @param currentInterval - Current interval in days
 * @param currentEaseFactor - Current ease factor (starts at 2.5)
 * @param currentRepetitions - Number of successful repetitions
 * @returns ReviewResult with next review date and updated parameters
 */
export function calculateNextReview(
  rating: number,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number,
): ReviewResult {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (rating >= 3) {
    if (currentRepetitions === 0) {
      newInterval = 1;
    } else if (currentRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }
    newRepetitions = currentRepetitions + 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = Math.max(
    1.3,
    currentEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)),
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    nextReviewDate,
    newInterval,
    newEaseFactor,
    newRepetitions,
  };
}

/**
 * Returns initial flashcard data for a new card.
 *
 * @returns FlashcardData with default values:
 *   - interval: 0 (not yet reviewed)
 *   - ease_factor: 2.5 (standard starting value for SM-2)
 *   - repetitions: 0 (no successful reviews yet)
 *   - next_review: current date (due immediately)
 */
export function getInitialFlashcardData(): FlashcardData {
  return {
    interval: 0,
    ease_factor: 2.5,
    repetitions: 0,
    next_review: new Date(),
  };
}

/**
 * Generic flashcard interface for filtering.
 */
export interface Flashcard {
  next_review: Date;
  [key: string]: unknown;
}

/**
 * Filters flashcards that are due for review.
 *
 * A flashcard is due if its next_review date is on or before the current time.
 *
 * @param flashcards - Array of flashcards with next_review dates
 * @returns Array of flashcards that are due for review
 */
export function getDueFlashcards(flashcards: Flashcard[]): Flashcard[] {
  const now = new Date();
  return flashcards.filter((card) => new Date(card.next_review) <= now);
}
