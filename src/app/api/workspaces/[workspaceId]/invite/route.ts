import { NextRequest, NextResponse } from 'next/server';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthErrors,
} from '@/shared/lib/api/auth';
import { CreateInviteRequest, CreateInviteResponse } from '@/shared/types/api';

interface RouteParams {
  params: Promise<{
    workspaceId: string;
  }>;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function extractWorkspaceId(request: NextRequest): string {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  return segments[segments.indexOf('workspaces') + 1] || '';
}

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  if (!workspaceId) {
    return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  // Owner only
  if (workspaceData.user_id !== userId) {
    return NextResponse.json(
      { error: 'Access denied. Only the workspace owner can create invites.' },
      { status: StatusCodes.FORBIDDEN },
    );
  }

  const body: CreateInviteRequest = await request.json();
  const { role } = body;

  if (!role || !['admin', 'member'].includes(role)) {
    return errorResponse('Invalid role. Must be admin or member.', StatusCodes.BAD_REQUEST);
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const inviteRef = db.collection('workspace_invites').doc();
  await inviteRef.set({
    workspace_id: workspaceId,
    invite_code: inviteCode,
    role,
    created_by: userId,
    created_at: require('firebase-admin/firestore').Timestamp.now(),
    expires_at: require('firebase-admin/firestore').Timestamp.fromDate(expiresAt),
    uses_count: 0,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/workspace/join?code=${inviteCode}&workspace=${workspaceId}`;

  const response: CreateInviteResponse = {
    invite_code: inviteCode,
    invite_url: inviteUrl,
    expires_at: expiresAt.toISOString(),
  };

  return successResponse(response, StatusCodes.CREATED);
});
