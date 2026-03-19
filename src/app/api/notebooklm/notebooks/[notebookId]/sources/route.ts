import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  StatusCodes,
  errorResponse,
  successResponse,
} from '@/shared/lib/api/auth';
import { getUserNotebook, incrementUsage } from '@/shared/lib/notebooklm';
import { NlmMcpClient } from '@/shared/lib/notebooklm/client';

const addSourceSchema = z.object({
  workspaceId: z.string().min(1),
  sourceType: z.enum(['url', 'youtube', 'gdrive']),
  value: z.string().min(1),
});

/**
 * Helper to extract notebookId from URL
 * URL pattern: /api/notebooklm/notebooks/[notebookId]/sources
 */
function extractNotebookId(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[4] || null;
}

export const POST = withAuth(async (req, { userId }) => {
  try {
    const notebookId = extractNotebookId(req);
    if (!notebookId) {
      return errorResponse('Notebook ID required', StatusCodes.BAD_REQUEST);
    }

    const { data, error } = await parseBodyWithZod(req, addSourceSchema);
    if (error) return error;
    if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const { workspaceId, sourceType, value } = data;

    // 1. Verify ownership and existence
    const userNotebook = await getUserNotebook(workspaceId);
    if (!userNotebook) {
      return errorResponse('Notebook mapping not found', StatusCodes.NOT_FOUND);
    }

    if (userNotebook.app_user_id !== userId) {
      return errorResponse('Forbidden', StatusCodes.FORBIDDEN);
    }

    if (userNotebook.notebook_id !== notebookId) {
      return errorResponse('Notebook ID mismatch', StatusCodes.BAD_REQUEST);
    }

    // 2. Add source via NLM Client
    const nlmClient = new NlmMcpClient();
    try {
      await nlmClient.addSource(userNotebook.profile_name, notebookId, sourceType, value);
    } catch (err: any) {
      console.error('NLM Add Source Error:', err);
      return errorResponse('Failed to add source to NotebookLM', 502);
    }

    // 3. Update usage
    await incrementUsage(userNotebook.profile_name, 'query');

    return successResponse({ success: true });
  } catch (error: unknown) {
    console.error('POST /api/notebooklm/notebooks/[notebookId]/sources error:', error);
    return errorResponse('Internal server error', StatusCodes.INTERNAL_ERROR);
  }
});
