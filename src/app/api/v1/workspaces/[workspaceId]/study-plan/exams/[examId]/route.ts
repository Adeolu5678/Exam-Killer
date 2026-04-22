import { NextRequest } from 'next/server';

import { deleteExam, updateExam, updateExamSchema } from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string; examId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, examId } = await context.params;
    if (!workspaceId || !examId) {
      throw new ValidationError('Workspace ID and exam ID are required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = updateExamSchema.parse(body);
    const exam = await updateExam({ workspaceId, examId, userId: user.uid, payload });
    return apiSuccess(exam);
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

    const { workspaceId, examId } = await context.params;
    if (!workspaceId || !examId) {
      throw new ValidationError('Workspace ID and exam ID are required');
    }

    await deleteExam(workspaceId, examId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

