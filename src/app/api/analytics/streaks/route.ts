import { NextRequest } from 'next/server';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import type { AnalyticsStreaksResponse } from '@/shared/types/api';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const today = getStartOfDay(new Date());
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

    const streak: AnalyticsStreaksResponse['streak'] = {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_study_date: lastStudyDate,
      streak_dates: Array.from(studyDates),
      today_completed: studyDates.has(formatDate(today)),
    };

    return successResponse({ streak });
  } catch (error: unknown) {
    console.error('Analytics streaks error:', error);
    return errorResponse('Failed to fetch streak data', StatusCodes.INTERNAL_ERROR);
  }
});
