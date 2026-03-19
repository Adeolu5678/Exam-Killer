import { NextResponse } from 'next/server';

import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  StatusCodes,
  errorResponse,
  successResponse,
} from '@/shared/lib/api/auth';
import {
  selectProfile,
  incrementUsage,
  createUserNotebook,
  getUserNotebook,
} from '@/shared/lib/notebooklm';
import { NlmMcpClient } from '@/shared/lib/notebooklm/client';

const createNotebookSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
});

export const POST = withAuth(async (req, { userId }) => {
  try {
    const { data, error } = await parseBodyWithZod(req, createNotebookSchema);
    if (error) return error;
    if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const { workspaceId, title } = data;

    // 1. Check if notebook already exists for this workspace
    const existing = await getUserNotebook(workspaceId);
    if (existing) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Notebook already exists for this workspace',
          notebook_id: existing.notebook_id,
        },
        { status: 409 },
      );
    }

    // 3. Create notebook using service
    const { NlmService } = await import('@/shared/lib/notebooklm');
    const { notebookId, profileName } = await NlmService.initializeNotebook(
      userId,
      workspaceId,
      title,
    );

    return successResponse(
      { notebook_id: notebookId, profile_name: profileName },
      StatusCodes.CREATED,
    );
  } catch (error: unknown) {
    console.error('POST /api/notebooklm/notebooks error:', error);
    return errorResponse('Internal server error', StatusCodes.INTERNAL_ERROR);
  }
});
export const GET = withAuth(async (req, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return errorResponse('workspaceId is required', StatusCodes.BAD_REQUEST);
    }

    const notebook = await getUserNotebook(workspaceId);
    if (!notebook) {
      return errorResponse('Notebook not found', StatusCodes.NOT_FOUND);
    }

    // Security check: Ensure the notebook belongs to the requesting user
    if (notebook.app_user_id !== userId) {
      return errorResponse('Unauthorized access to notebook', StatusCodes.FORBIDDEN);
    }

    return successResponse({
      notebook_id: notebook.notebook_id,
      profile_name: notebook.profile_name,
      title: notebook.title,
    });
  } catch (error: unknown) {
    console.error('GET /api/notebooklm/notebooks error:', error);
    return errorResponse('Internal server error', StatusCodes.INTERNAL_ERROR);
  }
});
