import { NextRequest } from 'next/server';

import {
  verifyWorkspaceAccess,
  getWorkspaceDetail,
  updateWorkspace,
  deleteWorkspace,
  UpdateWorkspaceRequestSchema,
} from '@/domains/workspaces';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    const workspace = await getWorkspaceDetail(workspaceId, user.uid);
    return apiSuccess(workspace);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
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
      throw new AuthorizationError('Only workspace owner can update it');
    }

    const body = await request.json();
    const parsed = UpdateWorkspaceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error, { status: 400 });
    }

    const workspace = await updateWorkspace(workspaceId, user.uid, parsed.data);
    return apiSuccess(workspace);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    await deleteWorkspace(workspaceId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
