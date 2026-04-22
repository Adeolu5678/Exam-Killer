import { NextRequest } from 'next/server';

import {
  listUserWorkspaces,
  createWorkspace,
  CreateWorkspaceRequestSchema,
} from '@/domains/workspaces';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const workspaces = await listUserWorkspaces(user.uid);
    return apiSuccess({ workspaces });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const body = await request.json();
    const parsed = CreateWorkspaceRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return apiError(parsed.error, { status: 400 });
    }

    const workspace = await createWorkspace(user.uid, parsed.data);
    return apiSuccess(workspace, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}