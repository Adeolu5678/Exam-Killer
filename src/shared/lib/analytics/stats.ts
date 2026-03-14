import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface UserStatsUpdate {
  study_time_minutes?: number;
  flashcards_reviewed?: number;
  quizzes_completed?: number;
  exams_completed?: number;
  flashcards_mastered?: number;
  quiz_score?: number;
  exam_score?: number;
  xp_earned?: number;
}

/**
 * Updates the centralized usage_stats document for a user.
 * This document is used for quick analytics and usage limiting.
 */
export async function updateUserStats(
  db: Firestore,
  userId: string,
  update: UserStatsUpdate,
): Promise<void> {
  const statsRef = db.collection('usage_stats').doc(userId);

  const incrementData: Record<string, any> = {
    last_updated: Timestamp.now(),
  };

  if (update.study_time_minutes) {
    incrementData.total_study_time_minutes = FieldValue.increment(update.study_time_minutes);
  }
  if (update.flashcards_reviewed) {
    incrementData.total_flashcards_reviewed = FieldValue.increment(update.flashcards_reviewed);
  }
  if (update.quizzes_completed) {
    incrementData.total_quizzes_completed = FieldValue.increment(update.quizzes_completed);
  }
  if (update.exams_completed) {
    incrementData.total_exams_completed = FieldValue.increment(update.exams_completed);
  }
  if (update.flashcards_mastered) {
    incrementData.flashcards_mastered = FieldValue.increment(update.flashcards_mastered);
  }

  if (update.quiz_score !== undefined) {
    incrementData.quiz_score_sum = FieldValue.increment(update.quiz_score);
    incrementData.quiz_count = FieldValue.increment(1);
  }

  if (update.exam_score !== undefined) {
    incrementData.exam_score_sum = FieldValue.increment(update.exam_score);
    incrementData.exam_count = FieldValue.increment(1);
  }

  await statsRef.set(incrementData, { merge: true });

  // Also update the daily progress for the activity chart
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const progressRef = db.collection('user_progress').doc(`${userId}_${dateStr}`);

  await progressRef.set(
    {
      user_id: userId,
      date: Timestamp.fromDate(new Date(dateStr)),
      study_time_minutes: FieldValue.increment(update.study_time_minutes || 0),
      flashcards_reviewed: FieldValue.increment(update.flashcards_reviewed || 0),
      quizzes_completed: FieldValue.increment(update.quizzes_completed || 0),
      exams_completed: FieldValue.increment(update.exams_completed || 0),
      flashcards_mastered: FieldValue.increment(update.flashcards_mastered || 0),
      xp_earned: FieldValue.increment(update.xp_earned || 0),
      // For specific scores, we might want to store the latest or average for the day
      // For simplicity, we'll just increment if needed or keep existing logic
      last_updated: Timestamp.now(),
    },
    { merge: true },
  );
}
