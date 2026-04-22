import { NextRequest } from 'next/server';

import { createExam, createExamSchema, listWorkspaceExams } from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const result = await listWorkspaceExams(workspaceId, user.uid);
    return apiSuccess(result.exams);
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

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = createExamSchema.parse(body);
    const exam = await createExam({ workspaceId, userId: user.uid, payload });
    return apiSuccess(exam, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

