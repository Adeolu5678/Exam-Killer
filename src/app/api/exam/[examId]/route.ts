import { NextRequest } from 'next/server';

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

import {
  withAuth,
  withOwnership,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  return withOwnership(
    async (req: NextRequest, ctx: AuthContext, examDoc: DocumentSnapshot) => {
      const examData = examDoc.data();
      if (!examData) {
        return errorResponse('Exam data missing', StatusCodes.INTERNAL_ERROR);
      }

      const questions =
        (examData.questions as Array<{
          question_id: string;
          question_text: string;
          question_type: string;
          options?: Record<string, string>;
          difficulty: string;
        }>) || [];

      const visibleQuestions = questions.map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        difficulty: q.difficulty,
      }));

      const exam = {
        id: examDoc.id,
        exam_id: examData.exam_id,
        workspace_id: examData.workspace_id,
        title: examData.title,
        question_count: examData.question_count || 0,
        time_limit_minutes: examData.time_limit_minutes || 15,
        status: examData.status || 'in_progress',
        completed: examData.completed || false,
        score: examData.score || null,
        correct_count: examData.correct_count || null,
        time_spent_seconds: examData.time_spent_seconds || null,
        xp_earned: examData.xp_earned || null,
        created_at:
          (examData.created_at as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        completed_at:
          (examData.completed_at as { toDate?: () => Date })?.toDate?.()?.toISOString() || null,
        questions: visibleQuestions,
      };

      return successResponse({ exam });
    },
    async (req: NextRequest, ctx: AuthContext) => {
      const url = new URL(req.url);
      const segments = url.pathname.split('/');
      const examId = segments[segments.length - 1];
      if (!examId) return null;

      const doc = await ctx.db.collection('exams').doc(examId).get();
      return doc.exists ? doc : null;
    },
    (examDoc: DocumentSnapshot) => examDoc.data()?.user_id,
  )(request, context);
});
