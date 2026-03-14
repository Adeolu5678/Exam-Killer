import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import type { UpdateMemberRoleRequest } from '@/shared/types/api';

function extractParams(request: Request): { workspaceId: string; memberId: string } {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const workspaceId = pathParts[pathParts.indexOf('workspaces') + 1] ?? '';
  const memberId = pathParts[pathParts.indexOf('members') + 1] ?? '';
  return { workspaceId, memberId };
}

export const PUT = withAuth(async (request, { db, userId }) => {
  const { workspaceId, memberId } = extractParams(request);

  if (memberId === 'owner') {
    return errorResponse('Cannot change owner role', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  const memberData = memberSnapshot.docs[0]?.data();
  const isOwner = workspaceData.user_id === userId;

  if (!isOwner) {
    return errorResponse(
      'Access denied. Only the owner can change member roles.',
      StatusCodes.FORBIDDEN,
    );
  }

  const targetMemberDoc = await db.collection('workspace_members').doc(memberId).get();

  if (!targetMemberDoc.exists) {
    return errorResponse('Member not found', StatusCodes.NOT_FOUND);
  }

  const targetMemberData = targetMemberDoc.data();

  if (targetMemberData?.role === 'owner') {
    return errorResponse('Cannot change owner role', StatusCodes.BAD_REQUEST);
  }

  const body: UpdateMemberRoleRequest = await request.json();
  const { role } = body;

  if (!role || !['admin', 'member'].includes(role)) {
    return errorResponse('Invalid role. Must be admin or member.', StatusCodes.BAD_REQUEST);
  }

  await db.collection('workspace_members').doc(memberId).update({ role });

  return successResponse({ success: true });
});

export const DELETE = withAuth(async (request, { db, userId }) => {
  const { workspaceId, memberId } = extractParams(request);

  if (memberId === 'owner') {
    return errorResponse('Cannot remove owner', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  const memberData = memberSnapshot.docs[0]?.data();
  const isOwner = workspaceData.user_id === userId;
  const isAdmin = memberData?.role === 'admin';

  if (!isOwner && !isAdmin) {
    return errorResponse(
      'Access denied. Only owners and admins can remove members.',
      StatusCodes.FORBIDDEN,
    );
  }

  const targetMemberDoc = await db.collection('workspace_members').doc(memberId).get();

  if (!targetMemberDoc.exists) {
    return errorResponse('Member not found', StatusCodes.NOT_FOUND);
  }

  const targetMemberData = targetMemberDoc.data();

  if (targetMemberData?.role === 'owner') {
    return errorResponse('Cannot remove owner', StatusCodes.BAD_REQUEST);
  }

  if (isAdmin && targetMemberData?.role === 'admin') {
    return errorResponse('Admins cannot remove other admins', StatusCodes.FORBIDDEN);
  }

  await db.collection('workspace_members').doc(memberId).delete();

  return successResponse({ success: true });
});
