import { NextRequest } from 'next/server';

import { completeStudyPlanItem, completeStudyPlanItemSchema } from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string; planId: string; itemIndex: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, planId, itemIndex } = await context.params;
    if (!workspaceId || !planId || itemIndex === undefined) {
      throw new ValidationError('Workspace ID, plan ID, and item index are required');
    }

    const parsedIndex = Number.parseInt(itemIndex, 10);
    if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
      throw new ValidationError('Invalid item index');
    }

    const body = await request.json().catch(() => ({}));
    const payload = completeStudyPlanItemSchema.parse(body);
    const plan = await completeStudyPlanItem({
      workspaceId,
      planId,
      itemIndex: parsedIndex,
      userId: user.uid,
      completed: payload.completed,
    });
    return apiSuccess({ plan });
  } catch (error) {
    return apiError(error);
  }
}

