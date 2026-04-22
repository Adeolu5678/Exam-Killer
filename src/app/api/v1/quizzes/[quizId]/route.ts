import { NextRequest } from 'next/server';

import { deleteQuiz, getQuizDetail } from '@/domains/quizzes';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { quizId } = await context.params;
    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }

    const quiz = await getQuizDetail(quizId, user.uid);
    return apiSuccess({ quiz });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { quizId } = await context.params;
    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }

    await deleteQuiz(quizId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
