import { NextRequest } from 'next/server';

import { getStudyPlan, updateStudyPlan, updateStudyPlanSchema } from '@/domains/study-plan';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string; planId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, planId } = await context.params;
    if (!workspaceId || !planId) {
      throw new ValidationError('Workspace ID and plan ID are required');
    }

    const plan = await getStudyPlan(workspaceId, planId, user.uid);
    return apiSuccess({ plan });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId, planId } = await context.params;
    if (!workspaceId || !planId) {
      throw new ValidationError('Workspace ID and plan ID are required');
    }

    const body = await request.json().catch(() => ({}));
    const payload = updateStudyPlanSchema.parse(body);
    const plan = await updateStudyPlan({ workspaceId, planId, userId: user.uid, payload });
    return apiSuccess({ plan });
  } catch (error) {
    return apiError(error);
  }
}

