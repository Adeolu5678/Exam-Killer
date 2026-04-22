import { NextRequest } from 'next/server';

import {
  listQuizAttempts,
  quizAttemptHistoryQuerySchema,
  submitQuiz,
  submitQuizRequestSchema,
} from '@/domains/quizzes';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

function parseHistoryQuery(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const limit = params.get('limit');
  return quizAttemptHistoryQuerySchema.parse({
    limit: limit ? Number.parseInt(limit, 10) : undefined,
  });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { quizId } = await context.params;
    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }

    const query = parseHistoryQuery(request);
    const attempts = await listQuizAttempts(quizId, user.uid, query.limit);
    return apiSuccess(attempts);
  } catch (error) {
    return apiError(error);
  }
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
    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
