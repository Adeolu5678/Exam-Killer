import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { ProgressDataPoint } from '@/features/analytics/model/types';

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
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);

  try {
    const hasAccess = await canAccessWorkspace(db, workspaceId, userId);
    if (!hasAccess) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('workspace_id', '==', workspaceId)
      .where('date', '>=', startDate)
      .orderBy('date', 'asc')
      .get();

    const activityMap = new Map<string, ProgressDataPoint>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i + 1);
      const dateStr = date.toISOString().split('T')[0];
      activityMap.set(dateStr, {
        date: dateStr,
        studyMinutes: 0,
        cardsReviewed: 0,
        quizScore: null,
      });
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dateStr = data.date?.toDate?.()?.toISOString().split('T')[0];
      if (!dateStr || !activityMap.has(dateStr)) {
        return;
      }

      const point = activityMap.get(dateStr)!;
      point.studyMinutes += data.study_time_minutes || 0;
      point.cardsReviewed += data.flashcards_reviewed || 0;

      if (typeof data.quiz_score === 'number') {
        point.quizScore =
          point.quizScore === null
            ? data.quiz_score
            : Math.round((point.quizScore + data.quiz_score) / 2);
      }
    });

    return successResponse(Array.from(activityMap.values()));
  } catch (error: unknown) {
    console.error('Workspace analytics progress error:', error);
    return errorResponse('Failed to fetch workspace progress', StatusCodes.INTERNAL_ERROR);
  }
});
