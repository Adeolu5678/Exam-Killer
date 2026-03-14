import { NextRequest, NextResponse } from 'next/server';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { WorkspaceMembersResponse, AddMemberRequest } from '@/shared/types/api';

function extractWorkspaceId(req: NextRequest): string {
  const pathParts = req.nextUrl.pathname.split('/');
  return pathParts[pathParts.indexOf('workspaces') + 1] || '';
}

async function verifyWorkspaceAccess(
  db: AuthContext['db'],
  workspaceId: string,
  userId: string,
): Promise<{
  isOwner: boolean;
  isAdmin: boolean;
  workspaceData: { user_id: string; owner_name?: string; created_at?: Date } | null;
}> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return { isOwner: false, isAdmin: false, workspaceData: null };
  }

  const workspaceData = workspaceDoc.data() as {
    user_id: string;
    owner_name?: string;
    created_at?: Date;
  };
  const isOwner = workspaceData.user_id === userId;

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  const memberData = memberSnapshot.docs[0]?.data();
  const isAdmin = memberData?.role === 'admin';

  return { isOwner, isAdmin, workspaceData };
}

export const GET = withAuth(async (request: NextRequest, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const membersSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .get();

  const members: Array<{
    id: string;
    user_id: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
  }> = [];

  for (const doc of membersSnapshot.docs) {
    const memberData = doc.data();
    const userDoc = await db.collection('users').doc(memberData.user_id).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    members.push({
      id: doc.id,
      user_id: memberData.user_id,
      email: userData?.email || '',
      name: userData?.full_name || 'Unknown User',
      role: memberData.role || 'member',
      joined_at: memberData.joined_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  }

  members.unshift({
    id: 'owner',
    user_id: workspaceData.user_id,
    email: '',
    name: workspaceData.owner_name || 'Owner',
    role: 'owner',
    joined_at: workspaceData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  });

  const response: WorkspaceMembersResponse = { members };
  return successResponse(response);
});

export const POST = withAuth(async (request: NextRequest, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  const { isOwner, isAdmin, workspaceData } = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!workspaceData) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  if (!isOwner && !isAdmin) {
    return errorResponse(
      'Access denied. Only owners and admins can add members.',
      StatusCodes.FORBIDDEN,
    );
  }

  const body = await parseBody<AddMemberRequest>(request);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { email, role } = body;

  if (!email) {
    return errorResponse('Email is required', StatusCodes.BAD_REQUEST);
  }

  if (role && !['admin', 'member'].includes(role)) {
    return errorResponse('Invalid role. Must be admin or member.', StatusCodes.BAD_REQUEST);
  }

  const usersSnapshot = await db
    .collection('users')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return errorResponse('User not found with this email', StatusCodes.NOT_FOUND);
  }

  const targetUserDoc = usersSnapshot.docs[0];
  const targetUserData = targetUserDoc.data();
  const targetUserId = targetUserDoc.id;

  const existingMemberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', targetUserId)
    .get();

  if (!existingMemberSnapshot.empty) {
    return errorResponse('User is already a member of this workspace', StatusCodes.BAD_REQUEST);
  }

  const memberRef = db.collection('workspace_members').doc();
  await memberRef.set({
    workspace_id: workspaceId,
    user_id: targetUserId,
    role: role || 'member',
    invited_by: userId,
    joined_at: new Date(),
  });

  return successResponse({ success: true, member_id: memberRef.id }, StatusCodes.CREATED);
});
