import { NextRequest } from 'next/server';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import type { AnalyticsActivityResponse } from '@/shared/types/api';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period');
    const period =
      periodParam === 'week' || periodParam === 'month' || periodParam === 'year'
        ? periodParam
        : 'month';

    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('date', '>=', startDate)
      .orderBy('date', 'desc')
      .get();

    const activityMap = new Map<string, AnalyticsActivityResponse['activity'][0]>();

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

    const activity = Array.from(activityMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return successResponse({
      activity,
      period: period as 'week' | 'month' | 'year',
    });
  } catch (error: unknown) {
    console.error('Analytics activity error:', error);
    return errorResponse('Failed to fetch activity data', StatusCodes.INTERNAL_ERROR);
  }
});
