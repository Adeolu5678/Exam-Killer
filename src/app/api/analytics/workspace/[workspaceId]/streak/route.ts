import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { StreakDay } from '@/features/analytics/model/types';

async function canAccessWorkspace(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    return false;
  }

  const workspaceData = workspaceDoc.data();
  if (workspaceData?.user_id === userId || workspaceData?.is_public) {
    return true;
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  return !memberSnapshot.empty;
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { userId, db } = context;
  const workspaceId = request.nextUrl.pathname.split('/')[4] ?? '';

  try {
    const hasAccess = await canAccessWorkspace(db, workspaceId, userId);
    if (!hasAccess) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('workspace_id', '==', workspaceId)
      .where('date', '>=', thirtyDaysAgo)
      .get();

    const activityMap = new Map<string, boolean>();
    snapshot.forEach((doc) => {
      const dateStr = doc.data().date?.toDate?.()?.toISOString().split('T')[0];
      if (dateStr) {
        activityMap.set(dateStr, true);
      }
    });

    const streakDays: StreakDay[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i + 1);
      const dateStr = date.toISOString().split('T')[0];
      const hasActivity = activityMap.has(dateStr);

      streakDays.push({
        date: dateStr,
        hasActivity,
        intensityLevel: hasActivity ? 2 : 0,
      });
    }

    return successResponse(streakDays);
  } catch (error: unknown) {
    console.error('Workspace analytics streak error:', error);
    return errorResponse('Failed to fetch workspace streak', StatusCodes.INTERNAL_ERROR);
  }
});
