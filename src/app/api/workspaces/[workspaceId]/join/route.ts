import { NextRequest } from 'next/server';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { JoinWorkspaceRequest, JoinWorkspaceResponse } from '@/shared/types/api';

function extractWorkspaceId(req: NextRequest): string | null {
  const pathParts = req.nextUrl.pathname.split('/');
  // Path: /api/workspaces/[workspaceId]/join
  if (pathParts.length >= 4 && pathParts[1] === 'api' && pathParts[2] === 'workspaces') {
    return pathParts[3] || null;
  }
  return null;
}

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  if (!workspaceId) {
    return errorResponse('Workspace ID is required', StatusCodes.BAD_REQUEST);
  }

  const body = await parseBody<JoinWorkspaceRequest>(request);
  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { invite_code } = body;

  if (!invite_code) {
    return errorResponse('Invite code is required', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const invitesSnapshot = await db
    .collection('workspace_invites')
    .where('workspace_id', '==', workspaceId)
    .where('invite_code', '==', invite_code.toUpperCase())
    .get();

  if (invitesSnapshot.empty) {
    return errorResponse('Invalid invite code', StatusCodes.BAD_REQUEST);
  }

  const inviteDoc = invitesSnapshot.docs[0];
  const inviteData = inviteDoc.data();

  const now = new Date();
  if (inviteData.expires_at?.toDate?.() < now) {
    return errorResponse('Invite code has expired', StatusCodes.BAD_REQUEST);
  }

  const existingMemberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  if (!existingMemberSnapshot.empty) {
    return errorResponse('You are already a member of this workspace', StatusCodes.BAD_REQUEST);
  }

  const memberRef = db.collection('workspace_members').doc();
  await memberRef.set({
    workspace_id: workspaceId,
    user_id: userId,
    role: inviteData.role || 'member',
    invited_by: inviteData.created_by,
    joined_at: new Date(),
  });

  await inviteDoc.ref.update({
    uses_count: (inviteData.uses_count || 0) + 1,
  });

  const response: JoinWorkspaceResponse = {
    success: true,
    workspace_id: workspaceId,
  };

  return successResponse(response, StatusCodes.OK);
});
