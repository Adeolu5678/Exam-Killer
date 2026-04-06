import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

import type { AggregatedStats } from '@/features/analytics/model/types';

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

    const progressSnapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('workspace_id', '==', workspaceId)
      .get();

    let totalSessions = 0;
    let cardsReviewed = 0;
    let quizScoreSum = 0;
    let quizCount = 0;
    let totalStudyMinutes = 0;
    let flashcardsMastered = 0;

    progressSnapshot.forEach((doc) => {
      const data = doc.data();
      totalSessions += (data.quizzes_completed || 0) + (data.exams_completed || 0);
      cardsReviewed += data.flashcards_reviewed || 0;
      totalStudyMinutes += data.study_time_minutes || 0;
      flashcardsMastered += data.flashcards_mastered || 0;

      if (typeof data.quiz_score === 'number') {
        quizScoreSum += data.quiz_score;
        quizCount++;
      }
    });

    const stats: AggregatedStats = {
      totalSessions,
      cardsReviewed,
      avgQuizScore: quizCount > 0 ? Math.round(quizScoreSum / quizCount) : 0,
      studyStreakDays: 0,
      totalStudyMinutes,
      flashcardsMastered,
    };

    return successResponse(stats);
  } catch (error: unknown) {
    console.error('Workspace analytics stats error:', error);
    return errorResponse('Failed to fetch workspace analytics', StatusCodes.INTERNAL_ERROR);
  }
});
