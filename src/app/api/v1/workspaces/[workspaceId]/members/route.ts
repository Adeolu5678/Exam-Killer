import { NextRequest } from 'next/server';

import {
  verifyWorkspaceAccess,
  listWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
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
    const access = await verifyWorkspaceAccess(workspaceId, user.uid);
    
    if (!access.exists) {
      throw new ValidationError('Workspace not found');
    }
    if (!access.hasAccess) {
      throw new AuthorizationError('Access denied to this workspace');
    }

    const members = await listWorkspaceMembers(workspaceId, user.uid);
    return apiSuccess({ members });
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
    if (!access.isOwner && access.role !== 'admin') {
      throw new AuthorizationError('Only workspace owner or admins can add members');
    }

    const body = await request.json();
    const { user_id: targetUserId, role = 'member' } = body;

    if (!targetUserId) {
      throw new ValidationError('user_id is required');
    }

    // addWorkspaceMember(workspaceId, inviterId, targetUserId, role)
    const member = await addWorkspaceMember(workspaceId, user.uid, targetUserId, role);
    return apiSuccess(member, { status: 201 });
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
      throw new AuthorizationError('Only workspace owner can update member roles');
    }

    const body = await request.json();
    const { user_id: targetUserId, role } = body;

    if (!targetUserId || !role) {
      throw new ValidationError('user_id and role are required');
    }

    // updateMemberRole(workspaceId, actorUserId, targetUserId, newRole)
    await updateMemberRole(workspaceId, user.uid, targetUserId, role);
    return apiSuccess({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;

    const body = await request.json();
    const { user_id: targetUserId } = body;

    if (!targetUserId) {
      throw new ValidationError('user_id is required');
    }

    // removeWorkspaceMember(workspaceId, actorUserId, targetUserId)
    await removeWorkspaceMember(workspaceId, user.uid, targetUserId);
    return apiSuccess({ removed: true });
  } catch (error) {
    return apiError(error);
  }
}
