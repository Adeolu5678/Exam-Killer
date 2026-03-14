import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { AggregatedStats } from '@/features/analytics/model/types';

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return errorResponse('User not found', StatusCodes.NOT_FOUND);
    }

    const statsDoc = await db.collection('usage_stats').doc(userId).get();
    const statsData = statsDoc.data();

    let stats: AggregatedStats;

    if (statsData && statsData.total_study_time_minutes !== undefined) {
      stats = {
        totalSessions:
          (statsData.total_quizzes_completed || 0) + (statsData.total_exams_completed || 0),
        cardsReviewed: statsData.total_flashcards_reviewed || 0,
        avgQuizScore:
          statsData.quiz_count > 0
            ? Math.round(statsData.quiz_score_sum / statsData.quiz_count)
            : 0,
        studyStreakDays: userData.current_streak || 0,
        totalStudyMinutes: statsData.total_study_time_minutes || 0,
        flashcardsMastered: statsData.flashcards_mastered || 0,
      };
    } else {
      // Legacy fallback
      const progressSnapshot = await db
        .collection('user_progress')
        .where('user_id', '==', userId)
        .get();

      let totalSessions = 0;
      let cardsReviewed = 0;
      let quizScoreSum = 0;
      let quizCount = 0;
      let totalStudyMinutes = 0;
      let flashcardsMastered = 0;
      let exams_completed = 0;
      let quizzes_completed = 0;

      progressSnapshot.forEach((doc) => {
        const data = doc.data();
        const quizzes = data.quizzes_completed || 0;
        const exams = data.exams_completed || 0;
        quizzes_completed += quizzes;
        exams_completed += exams;
        totalSessions += quizzes + exams;

        cardsReviewed += data.flashcards_reviewed || 0;
        totalStudyMinutes += data.study_time_minutes || 0;
        flashcardsMastered += data.flashcards_mastered || 0;

        if (data.quiz_score) {
          quizScoreSum += data.quiz_score;
          quizCount++;
        }
      });

      stats = {
        totalSessions,
        cardsReviewed,
        avgQuizScore: quizCount > 0 ? Math.round(quizScoreSum / quizCount) : 0,
        studyStreakDays: userData.current_streak || 0,
        totalStudyMinutes,
        flashcardsMastered,
      };

      // Backfill optionally here as well, but dashboard does it already
    }

    return successResponse(stats);
  } catch (error: unknown) {
    console.error('Global analytics stats error:', error);
    return errorResponse('Failed to fetch global stats', StatusCodes.INTERNAL_ERROR);
  }
});
