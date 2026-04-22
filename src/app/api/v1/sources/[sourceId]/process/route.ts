import { NextRequest } from 'next/server';

import {
  enqueueSourceProcessingJob,
  verifySourceAccess,
} from '@/domains/sources';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { sourceId } = await context.params;
    const access = await verifySourceAccess(sourceId, user.uid);

    if (!access.exists || !access.sourceData) {
      throw new ValidationError('Source not found');
    }

    if (!access.isOwner) {
      throw new AuthorizationError('Only source owner can trigger processing');
    }

    const workspaceId = String(access.sourceData.workspace_id || '');
    if (!workspaceId) {
      throw new ValidationError('Source workspace is missing');
    }

    const job = await enqueueSourceProcessingJob({
      sourceId,
      workspaceId,
      userId: user.uid,
      trigger: 'manual',
    });

    return apiSuccess(
      {
        status: 'queued',
        source_id: sourceId,
        job_id: job.jobId,
        deduped: job.deduped,
      },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}
