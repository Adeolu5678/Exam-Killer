import { NextRequest } from 'next/server';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import type { AnalyticsWorkspaceResponse } from '@/shared/types/api';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const workspaceId = new URL(request.url).pathname.split('/')[4];

    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
    if (!workspaceDoc.exists) {
      return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
    }

    const workspaceData = workspaceDoc.data();

    const memberDoc = await db
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (memberDoc.empty && workspaceData?.owner_id !== userId) {
      return errorResponse('Access denied', StatusCodes.FORBIDDEN);
    }

    const progressSnapshot = await db
      .collection('user_progress')
      .where('user_id', '==', userId)
      .where('workspace_id', '==', workspaceId)
      .get();

    let totalStudyTime = 0;
    let totalFlashcards = 0;
    let flashcardsMastered = 0;
    let quizzesCompleted = 0;
    let quizScoreSum = 0;
    let quizCount = 0;
    let examsCompleted = 0;
    let examScoreSum = 0;
    let examCount = 0;
    let lastActivity: string | null = null;

    progressSnapshot.forEach((doc) => {
      const data = doc.data();
      totalStudyTime += data.study_time_minutes || 0;
      totalFlashcards += data.flashcards_reviewed || 0;
      flashcardsMastered += data.flashcards_mastered || 0;
      quizzesCompleted += data.quizzes_completed || 0;
      examsCompleted += data.exams_completed || 0;

      if (data.quiz_score) {
        quizScoreSum += data.quiz_score;
        quizCount++;
      }

      if (data.exam_score) {
        examScoreSum += data.exam_score;
        examCount++;
      }

      if (data.date) {
        const activityDate = formatDate(data.date.toDate());
        if (!lastActivity || activityDate > lastActivity) {
          lastActivity = activityDate;
        }
      }
    });

    const flashcardStatsSnapshot = await db
      .collection('flashcards')
      .where('workspace_id', '==', workspaceId)
      .get();

    let totalWorkspaceFlashcards = 0;
    let masteredCount = 0;

    flashcardStatsSnapshot.forEach((doc) => {
      const data = doc.data();
      totalWorkspaceFlashcards++;
      if (data.difficulty === 5) {
        masteredCount++;
      }
    });

    const workspace: AnalyticsWorkspaceResponse['workspace'] = {
      workspace_id: workspaceId,
      workspace_name: workspaceData?.name || 'Unknown',
      total_study_time_minutes: totalStudyTime,
      total_flashcards_reviewed: totalFlashcards,
      flashcards_mastered: masteredCount || flashcardsMastered,
      quizzes_completed: quizzesCompleted,
      average_quiz_score: quizCount > 0 ? Math.round(quizScoreSum / quizCount) : 0,
      exams_completed: examsCompleted,
      average_exam_score: examCount > 0 ? Math.round(examScoreSum / examCount) : 0,
      last_activity: lastActivity,
    };

    return successResponse({ workspace });
  } catch (error: unknown) {
    console.error('Analytics workspace error:', error);
    return errorResponse('Failed to fetch workspace analytics', StatusCodes.INTERNAL_ERROR);
  }
});
