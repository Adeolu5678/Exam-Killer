import { NextRequest } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import type { AnalyticsDashboardResponse, StreakData, ActivityData } from '@/shared/types/api';

function calculateLevel(xp: number): { level: number; xpToNext: number } {
  const levels = [
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000,
    13600, 15300, 17100, 19000, 21000,
  ];

  let level = 1;
  let xpToNext = levels[1] - xp;

  for (let i = 1; i < levels.length; i++) {
    if (xp >= levels[i - 1] && xp < levels[i]) {
      level = i;
      xpToNext = levels[i] - xp;
      break;
    } else if (xp >= levels[levels.length - 1]) {
      level = levels.length;
      xpToNext = 0;
    }
  }

  return { level, xpToNext };
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getStreakData(db: Firestore, userId: string, today: Date): Promise<StreakData> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  const currentStreak = userData?.current_streak || 0;
  const longestStreak = userData?.longest_streak || 0;
  const lastStudyDate = userData?.last_study_date
    ? formatDate(userData.last_study_date.toDate())
    : null;

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const progressSnapshot = await db
    .collection('user_progress')
    .where('user_id', '==', userId)
    .where('date', '>=', thirtyDaysAgo)
    .get();

  const studyDates = new Set<string>();
  progressSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.date) {
      studyDates.add(formatDate(data.date.toDate()));
    }
  });

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_study_date: lastStudyDate,
    streak_dates: Array.from(studyDates),
    today_completed: studyDates.has(formatDate(today)),
  };
}

async function getActivityData(
  db: Firestore,
  userId: string,
  days: number,
): Promise<{ recent_activity: ActivityData[]; weekly_activity: ActivityData[] }> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  const snapshot = await db
    .collection('user_progress')
    .where('user_id', '==', userId)
    .where('date', '>=', startDate)
    .orderBy('date', 'desc')
    .get();

  const activityMap = new Map<string, ActivityData>();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const dateStr = formatDate(data.date.toDate());

    if (!activityMap.has(dateStr)) {
      activityMap.set(dateStr, {
        date: dateStr,
        study_time_minutes: 0,
        flashcards_reviewed: 0,
        quizzes_completed: 0,
        exams_completed: 0,
        xp_earned: 0,
      });
    }

    const activity = activityMap.get(dateStr)!;
    activity.study_time_minutes += data.study_time_minutes || 0;
    activity.flashcards_reviewed += data.flashcards_reviewed || 0;
    activity.quizzes_completed += data.quizzes_completed || 0;
    activity.exams_completed += data.exams_completed || 0;
    activity.xp_earned += data.xp_earned || 0;
  });

  const allActivity = Array.from(activityMap.values());
  const recent_activity = allActivity.slice(0, 7);
  const weekly_activity = allActivity.slice(0, 7);

  return { recent_activity, weekly_activity };
}

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const today = new Date();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return errorResponse('User not found', StatusCodes.NOT_FOUND);
    }

    const totalXp = userData.total_xp || 0;
    const { level, xpToNext } = calculateLevel(totalXp);

    // FETCH FROM SUMMARY DOCUMENT
    const statsDoc = await db.collection('usage_stats').doc(userId).get();
    const statsData = statsDoc.data();

    let stats;

    // If statsData exists and has the new aggregated fields, use them
    if (statsData && statsData.total_study_time_minutes !== undefined) {
      const weekStart = getStartOfWeek(today);
      const todayStart = getStartOfDay(today);

      // We still need a small scan for "this week" and "today" study time
      // because they are rolling windows.
      // BUT we only scan the last 7 days of user_progress, which is O(1) [fixed size].
      const recentProgressSnapshot = await db
        .collection('user_progress')
        .where('user_id', '==', userId)
        .where('date', '>=', weekStart)
        .get();

      let weekStudyTime = 0;
      let todayStudyTime = 0;

      recentProgressSnapshot.forEach((doc) => {
        const data = doc.data();
        const progressDate = data.date.toDate();
        weekStudyTime += data.study_time_minutes || 0;
        if (progressDate >= todayStart) {
          todayStudyTime += data.study_time_minutes || 0;
        }
      });

      stats = {
        total_study_time_minutes: statsData.total_study_time_minutes || 0,
        study_time_this_week: weekStudyTime,
        study_time_today: todayStudyTime,
        total_flashcards_reviewed: statsData.total_flashcards_reviewed || 0,
        total_quizzes_completed: statsData.total_quizzes_completed || 0,
        total_exams_completed: statsData.total_exams_completed || 0,
        average_quiz_score:
          statsData.quiz_count > 0
            ? Math.round(statsData.quiz_score_sum / statsData.quiz_count)
            : 0,
        average_exam_score:
          statsData.exam_count > 0
            ? Math.round(statsData.exam_score_sum / statsData.exam_count)
            : 0,
        current_streak: userData.current_streak || 0,
        longest_streak: userData.longest_streak || 0,
        total_xp: totalXp,
        level,
        xp_to_next_level: xpToNext,
      };
    } else {
      // FALLBACK: One-time calculation for cold-start (Legacy users)
      // This is the expensive O(N) query we want to avoid long-term
      const allProgressSnapshot = await db
        .collection('user_progress')
        .where('user_id', '==', userId)
        .get();

      let totalStudyTime = 0;
      let totalFlashcards = 0;
      let totalQuizzes = 0;
      let totalExams = 0;
      let quizScoreSum = 0;
      let quizCount = 0;
      let examScoreSum = 0;
      let examCount = 0;

      const weekStart = getStartOfWeek(today);
      const todayStart = getStartOfDay(today);

      let weekStudyTime = 0;
      let todayStudyTime = 0;

      allProgressSnapshot.forEach((doc) => {
        const data = doc.data();
        totalStudyTime += data.study_time_minutes || 0;
        totalFlashcards += data.flashcards_reviewed || 0;
        totalQuizzes += data.quizzes_completed || 0;
        totalExams += data.exams_completed || 0;

        if (data.quiz_score) {
          quizScoreSum += data.quiz_score;
          quizCount++;
        }

        if (data.exam_score) {
          examScoreSum += data.exam_score;
          examCount++;
        }

        if (data.date) {
          const progressDate = data.date.toDate();
          if (progressDate >= weekStart) {
            weekStudyTime += data.study_time_minutes || 0;
          }
          if (progressDate >= todayStart) {
            todayStudyTime += data.study_time_minutes || 0;
          }
        }
      });

      stats = {
        total_study_time_minutes: totalStudyTime,
        study_time_this_week: weekStudyTime,
        study_time_today: todayStudyTime,
        total_flashcards_reviewed: totalFlashcards,
        total_quizzes_completed: totalQuizzes,
        total_exams_completed: totalExams,
        average_quiz_score: quizCount > 0 ? Math.round(quizScoreSum / quizCount) : 0,
        average_exam_score: examCount > 0 ? Math.round(examScoreSum / examCount) : 0,
        current_streak: userData.current_streak || 0,
        longest_streak: userData.longest_streak || 0,
        total_xp: totalXp,
        level,
        xp_to_next_level: xpToNext,
      };

      // BACKFILL the stats summary document so next time is fast
      try {
        await db
          .collection('usage_stats')
          .doc(userId)
          .set(
            {
              total_study_time_minutes: totalStudyTime,
              total_flashcards_reviewed: totalFlashcards,
              total_quizzes_completed: totalQuizzes,
              total_exams_completed: totalExams,
              quiz_score_sum: quizScoreSum,
              quiz_count: quizCount,
              exam_score_sum: examScoreSum,
              exam_count: examCount,
              last_updated: require('firebase-admin/firestore').Timestamp.now(),
            },
            { merge: true },
          );
      } catch (backfillError) {
        console.error('Failed to backfill stats summary:', backfillError);
      }
    }

    const streak = await getStreakData(db, userId, today);
    const activityData = await getActivityData(db, userId, 30);

    const response = {
      stats,
      streak,
      recent_activity: activityData.recent_activity,
      weekly_activity: activityData.weekly_activity,
    };

    return successResponse(response as AnalyticsDashboardResponse);
  } catch (error: unknown) {
    console.error('Analytics dashboard error:', error);
    return errorResponse('Failed to fetch analytics', StatusCodes.INTERNAL_ERROR);
  }
});
