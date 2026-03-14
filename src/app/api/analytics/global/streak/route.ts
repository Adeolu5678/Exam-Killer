import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { StreakDay } from '@/features/analytics/model/types';

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('date', '>=', thirtyDaysAgo)
      .get();

    const activityMap = new Map<string, boolean>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date) {
        activityMap.set(data.date.toDate().toISOString().split('T')[0], true);
      }
    });

    const streakDays: StreakDay[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i + 1);
      const dateStr = d.toISOString().split('T')[0];
      const active = activityMap.has(dateStr);

      streakDays.push({
        date: dateStr,
        hasActivity: active,
        intensityLevel: active ? 2 : 0, // Simplified intensity
      });
    }

    return successResponse(streakDays);
  } catch (error: unknown) {
    console.error('Global analytics streak error:', error);
    return errorResponse('Failed to fetch global streak', StatusCodes.INTERNAL_ERROR);
  }
});
