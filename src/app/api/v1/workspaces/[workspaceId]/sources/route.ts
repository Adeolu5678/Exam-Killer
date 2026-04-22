import { NextRequest } from 'next/server';

import {
  listWorkspaceSources,
  uploadSource,
  enqueueSourceProcessingJob,
} from '@/domains/sources';
import { verifyWorkspaceAccess } from '@/domains/workspaces';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const result = await listWorkspaceSources(workspaceId, user.uid, { page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;

    const access = await verifyWorkspaceAccess(workspaceId, user.uid);
    if (!access.exists) {
      throw new ValidationError('Workspace not found');
    }
    if (!access.isOwner) {
      throw new AuthorizationError('Only workspace owner can upload sources');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new ValidationError('No file provided');
    }

    const result = await uploadSource({
      workspaceId,
      userId: user.uid,
      file,
    });

    const job = await enqueueSourceProcessingJob({
      sourceId: result.sourceId,
      workspaceId,
      userId: user.uid,
      trigger: 'upload',
    });

    return apiSuccess({
      source: {
        id: result.sourceId,
        workspace_id: workspaceId,
        user_id: user.uid,
        type: result.sourceType,
        file_name: result.fileName,
        file_size_bytes: result.fileSize,
        processed: false,
        chunk_count: 0,
        embedding_status: 'pending',
        created_at: new Date().toISOString(),
      },
      job: {
        id: job.jobId,
        deduped: job.deduped,
        status: 'queued',
      },
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
