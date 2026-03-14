import { NextRequest } from 'next/server';

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';

// Extract quizId from URL path
function extractQuizId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

// Helper to verify quiz access
async function verifyQuizAccess(
  db: Firestore,
  quizId: string,
  userId: string,
): Promise<{ quiz: DocumentSnapshot; quizData: Record<string, unknown> } | null> {
  const quizDoc = await db.collection('quizzes').doc(quizId).get();

  if (!quizDoc.exists) {
    return null;
  }

  const quizData = quizDoc.data();

  if (!quizData || quizData.user_id !== userId) {
    return null;
  }

  return { quiz: quizDoc, quizData };
}

export const GET = withAuth(async (request, { db, userId }) => {
  const quizId = extractQuizId(request);

  const access = await verifyQuizAccess(db, quizId, userId);

  if (!access) {
    return errorResponse('Quiz not found', StatusCodes.NOT_FOUND);
  }

  const { quizData } = access;
  const questions = (quizData.questions || []) as Array<{
    question_id: string;
    question_text: string;
    question_type: string;
    options?: Record<string, string>;
    difficulty: string;
  }>;
  const visibleQuestions = questions.map((q) => ({
    question_id: q.question_id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    difficulty: q.difficulty,
  }));

  const quiz = {
    id: access.quiz.id,
    quiz_id: quizData.quiz_id,
    workspace_id: quizData.workspace_id,
    source_id: quizData.source_id || null,
    total_questions: quizData.total_questions || 0,
    completed: quizData.completed || false,
    score: quizData.score || null,
    correct_count: quizData.correct_count || null,
    time_spent_seconds: quizData.time_spent_seconds || null,
    created_at:
      (quizData.created_at as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString() ||
      new Date().toISOString(),
    completed_at:
      (quizData.completed_at as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString() ||
      null,
    questions: visibleQuestions,
  };

  return successResponse({ quiz });
});
