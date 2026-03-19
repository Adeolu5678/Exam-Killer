import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  StatusCodes,
  successResponse,
  errorResponse,
} from '@/shared/lib/api/auth';
import { getUserNotebookByNlmId, incrementUsage } from '@/shared/lib/notebooklm';
import { NlmMcpClient } from '@/shared/lib/notebooklm/client';

const QuerySchema = z.object({
  prompt: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // 1. Get notebookId from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const notebookId = pathSegments[pathSegments.indexOf('notebooks') + 1];

    if (!notebookId) {
      return errorResponse('Notebook ID is required', StatusCodes.BAD_REQUEST);
    }

    // 2. Parse body
    const { data, error } = await parseBodyWithZod(req, QuerySchema);
    if (error) return error;
    const { prompt } = data!;

    // 3. Verify ownership and get profile_name
    const notebook = await getUserNotebookByNlmId(notebookId);
    if (!notebook) {
      return errorResponse('Notebook not found', StatusCodes.NOT_FOUND);
    }
    if (notebook.app_user_id !== userId) {
      return errorResponse('Forbidden', StatusCodes.FORBIDDEN);
    }

    // 4. Call NLM MCP Client
    const client = new NlmMcpClient();
    const answer = await client.query(notebook.profile_name, notebookId, prompt);

    // 5. Increment usage
    await incrementUsage(notebook.profile_name, 'query');

    return successResponse({ answer });
  } catch (e: unknown) {
    console.error('NLM Query Error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';

    if (message.includes('NLM_QUOTA_EXHAUSTED')) {
      return errorResponse('NLM_QUOTA_EXHAUSTED', 503);
    }

    return errorResponse(`Generation failed: ${message}`, 502);
  }
});
