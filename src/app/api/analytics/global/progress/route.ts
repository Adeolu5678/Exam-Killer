import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { ProgressDataPoint } from '@/features/analytics/model/types';

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  const { userId, db } = context;
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('date', '>=', startDate)
      .orderBy('date', 'asc')
      .get();

    const activityMap = new Map<string, ProgressDataPoint>();

    // Initialize map with all dates in range
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const dateStr = d.toISOString().split('T')[0];
      activityMap.set(dateStr, {
        date: dateStr,
        studyMinutes: 0,
        cardsReviewed: 0,
        quizScore: null,
      });
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dateStr = data.date.toDate().toISOString().split('T')[0];

      if (activityMap.has(dateStr)) {
        const point = activityMap.get(dateStr)!;
        point.studyMinutes += data.study_time_minutes || 0;
        point.cardsReviewed += data.flashcards_reviewed || 0;

        if (data.quiz_score) {
          point.quizScore =
            point.quizScore === null
              ? data.quiz_score
              : Math.round((point.quizScore + data.quiz_score) / 2);
        }
      }
    });

    return successResponse(Array.from(activityMap.values()));
  } catch (error: unknown) {
    console.error('Global analytics progress error:', error);
    return errorResponse('Failed to fetch global progress', StatusCodes.INTERNAL_ERROR);
  }
});
