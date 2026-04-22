import { NextRequest } from 'next/server';

import { submitQuiz, submitQuizRequestSchema } from '@/domains/quizzes';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { quizId } = await context.params;
    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = submitQuizRequestSchema.parse(body);
    const result = await submitQuiz(quizId, user.uid, {
      answers: payload.answers,
      timeSpentSeconds: payload.time_spent_seconds,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
