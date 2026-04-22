import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface UserStatsUpdate {
  workspace_id?: string;
  study_time_minutes?: number;
  flashcards_reviewed?: number;
  quizzes_completed?: number;
  exams_completed?: number;
  sessions_completed?: number;
  flashcards_mastered?: number;
  quiz_score?: number;
  exam_score?: number;
  xp_earned?: number;
}

interface UserRecord {
  current_streak?: number;
  longest_streak?: number;
  last_study_date?: Timestamp | Date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDate(value: Timestamp | Date | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
}

function hasActivity(update: UserStatsUpdate): boolean {
  return (
    (update.study_time_minutes || 0) > 0 ||
    (update.flashcards_reviewed || 0) > 0 ||
    (update.quizzes_completed || 0) > 0 ||
    (update.exams_completed || 0) > 0 ||
    (update.sessions_completed || 0) > 0 ||
    (update.xp_earned || 0) > 0
  );
}

function toIncrementData(update: UserStatsUpdate): Record<string, unknown> {
  const incrementData: Record<string, unknown> = {
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
  if (update.sessions_completed) {
    incrementData.total_sessions_completed = FieldValue.increment(update.sessions_completed);
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

  return incrementData;
}

async function updateUserStreak(db: Firestore, userId: string): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDate(today);

  await db.runTransaction(async (tx) => {
    const userSnapshot = await tx.get(userRef);
    if (!userSnapshot.exists) {
      return;
    }

    const userData = userSnapshot.data() as UserRecord | undefined;
    if (!userData) {
      return;
    }

    const lastStudyDate = toDate(userData.last_study_date);
    const lastStudyKey = lastStudyDate ? formatDate(lastStudyDate) : null;
    if (lastStudyKey === todayKey) {
      tx.update(userRef, { updated_at: Timestamp.now() });
      return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);

    const currentStreak = typeof userData.current_streak === 'number' ? userData.current_streak : 0;
    const nextStreak = lastStudyKey === yesterdayKey ? currentStreak + 1 : 1;
    const longestStreak = Math.max(
      nextStreak,
      typeof userData.longest_streak === 'number' ? userData.longest_streak : 0,
    );

    tx.update(userRef, {
      current_streak: nextStreak,
      longest_streak: longestStreak,
      last_study_date: Timestamp.fromDate(today),
      updated_at: Timestamp.now(),
    });
  });
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
  const incrementData = toIncrementData(update);
  await statsRef.set(incrementData, { merge: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = formatDate(today);
  const dateTimestamp = Timestamp.fromDate(today);

  const progressRef = db.collection('user_progress').doc(`${userId}_${dateStr}`);

  await progressRef.set(
    {
      user_id: userId,
      date: dateTimestamp,
      study_time_minutes: FieldValue.increment(update.study_time_minutes || 0),
      flashcards_reviewed: FieldValue.increment(update.flashcards_reviewed || 0),
      quizzes_completed: FieldValue.increment(update.quizzes_completed || 0),
      exams_completed: FieldValue.increment(update.exams_completed || 0),
      sessions_completed: FieldValue.increment(update.sessions_completed || 0),
      flashcards_mastered: FieldValue.increment(update.flashcards_mastered || 0),
      ...(update.quiz_score !== undefined ? { quiz_score: update.quiz_score } : {}),
      xp_earned: FieldValue.increment(update.xp_earned || 0),
      last_updated: Timestamp.now(),
    },
    { merge: true },
  );

  if (update.workspace_id) {
    const workspaceStatsRef = db.collection('workspace_usage_stats').doc(`${userId}_${update.workspace_id}`);
    await workspaceStatsRef.set(
      {
        ...incrementData,
        user_id: userId,
        workspace_id: update.workspace_id,
      },
      { merge: true },
    );

    const workspaceProgressRef = db
      .collection('user_workspace_progress')
      .doc(`${userId}_${update.workspace_id}_${dateStr}`);

    await workspaceProgressRef.set(
      {
        user_id: userId,
        workspace_id: update.workspace_id,
        date: dateTimestamp,
        study_time_minutes: FieldValue.increment(update.study_time_minutes || 0),
        flashcards_reviewed: FieldValue.increment(update.flashcards_reviewed || 0),
        quizzes_completed: FieldValue.increment(update.quizzes_completed || 0),
        exams_completed: FieldValue.increment(update.exams_completed || 0),
        sessions_completed: FieldValue.increment(update.sessions_completed || 0),
        flashcards_mastered: FieldValue.increment(update.flashcards_mastered || 0),
        ...(update.quiz_score !== undefined ? { quiz_score: update.quiz_score } : {}),
        xp_earned: FieldValue.increment(update.xp_earned || 0),
        last_updated: Timestamp.now(),
      },
      { merge: true },
    );
  }

  if (hasActivity(update)) {
    await updateUserStreak(db, userId);
  }
}
