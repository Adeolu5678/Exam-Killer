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

const FlashcardsSchema = z.object({
  workspaceId: z.string().min(1),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const notebookId = pathSegments[pathSegments.indexOf('notebooks') + 1];

    if (!notebookId) {
      return errorResponse('Notebook ID is required', StatusCodes.BAD_REQUEST);
    }

    const { error } = await parseBodyWithZod(req, FlashcardsSchema);
    if (error) return error;

    const notebook = await getUserNotebookByNlmId(notebookId);
    if (!notebook) {
      return errorResponse('Notebook not found', StatusCodes.NOT_FOUND);
    }
    if (notebook.app_user_id !== userId) {
      return errorResponse('Forbidden', StatusCodes.FORBIDDEN);
    }

    const client = new NlmMcpClient();
    const rawResult = await client.generate(notebook.profile_name, notebookId, 'flashcards');

    // Parse flashcards from raw result
    // The pattern requested: each line with "Q:" + "A:" pattern
    const flashcards: Array<{ question: string; answer: string }> = [];

    // Try to parse as JSON first, if CLI returns JSON
    try {
      const json = JSON.parse(rawResult);
      if (Array.isArray(json)) {
        flashcards.push(...json);
      } else if (json.flashcards && Array.isArray(json.flashcards)) {
        flashcards.push(...json.flashcards);
      }
    } catch (e) {
      // Fallback to text parsing
      const lines = rawResult.split('\n');
      let currentQ = '';
      for (const line of lines) {
        const qMatch = line.match(/^Q:\s*(.*)/i);
        const aMatch = line.match(/^A:\s*(.*)/i);

        if (qMatch) {
          currentQ = qMatch[1].trim();
        } else if (aMatch && currentQ) {
          flashcards.push({ question: currentQ, answer: aMatch[1].trim() });
          currentQ = '';
        }
      }
    }

    if (flashcards.length === 0) {
      // One more fallback: simple split by double newline and colon if pattern is slightly different
      const blocks = rawResult.split(/\n\s*\n/);
      for (const block of blocks) {
        const parts = block.split(/\n/);
        if (parts.length >= 2) {
          const q = parts[0].replace(/^Q:\s*/i, '').trim();
          const a = parts[1].replace(/^A:\s*/i, '').trim();
          if (q && a) flashcards.push({ question: q, answer: a });
        }
      }
    }

    await incrementUsage(notebook.profile_name, 'query');

    return successResponse({ flashcards });
  } catch (e: unknown) {
    console.error('NLM Flashcards Error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';

    if (message.includes('NLM_QUOTA_EXHAUSTED')) {
      return errorResponse('NLM_QUOTA_EXHAUSTED', 503);
    }

    return errorResponse(`Generation failed: ${message}`, 502);
  }
});
