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

const QuizSchema = z.object({
  workspaceId: z.string().min(1),
  questionCount: z.number().optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const notebookId = pathSegments[pathSegments.indexOf('notebooks') + 1];

    if (!notebookId) {
      return errorResponse('Notebook ID is required', StatusCodes.BAD_REQUEST);
    }

    const { error } = await parseBodyWithZod(req, QuizSchema);
    if (error) return error;

    const notebook = await getUserNotebookByNlmId(notebookId);
    if (!notebook) {
      return errorResponse('Notebook not found', StatusCodes.NOT_FOUND);
    }
    if (notebook.app_user_id !== userId) {
      return errorResponse('Forbidden', StatusCodes.FORBIDDEN);
    }

    const client = new NlmMcpClient();
    const rawResult = await client.generate(notebook.profile_name, notebookId, 'quiz');

    // Parse quiz questions
    let questions: any[] = [];
    try {
      const json = JSON.parse(rawResult);
      questions = json.questions || json;
    } catch (e) {
      // Basic parser for text output if not JSON
      // This is a placeholder as nlm studio generate --type quiz usually returns JSON or structured text
      // we'll assume JSON for now or return the raw if it's too complex to parse here
      // In a real scenario, we'd have a more robust parser.
      questions = [{ question: 'Raw Output', options: [], answer: rawResult }];
    }

    await incrementUsage(notebook.profile_name, 'query');

    return successResponse({ questions });
  } catch (e: unknown) {
    console.error('NLM Quiz Error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';

    if (message.includes('NLM_QUOTA_EXHAUSTED')) {
      return errorResponse('NLM_QUOTA_EXHAUSTED', 503);
    }

    return errorResponse(`Generation failed: ${message}`, 502);
  }
});
