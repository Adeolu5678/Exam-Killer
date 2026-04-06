import { NextRequest, NextResponse } from 'next/server';

import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { getChatCompletion, streamChatCompletion } from '@/shared/lib/openai/client';
import { createTutorConversationPrompt } from '@/shared/lib/openai/prompts';
import {
  retrieveContext,
  formatContextForPrompt,
  RetrievedChunk,
} from '@/shared/lib/rag/retriever';
import { TutorPersonality } from '@/shared/types/database';

const VALID_PERSONALITIES = [
  'mentor',
  'drill',
  'peer',
  'professor',
  'storyteller',
  'coach',
] as const;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const TutorChatRequestSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  message: z.string().min(1, 'Message is required'),
  personality: z.enum(VALID_PERSONALITIES).optional(),
  personalityId: z.enum(VALID_PERSONALITIES).optional(),
  customInstructions: z.string().optional(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
  history: z.array(ChatMessageSchema).optional(),
  stream: z.boolean().optional(),
});

type TutorChatRequest = z.infer<typeof TutorChatRequestSchema>;

function getWorkspaceIdFromRequest(request: NextRequest): string | null {
  return new URL(request.url).searchParams.get('workspaceId');
}

interface Source {
  sourceId: string;
  page?: number;
  label: string;
  filename: string;
}

interface TutorChatResponse {
  success: boolean;
  response: string;
  sources: Source[];
}

async function getWorkspaceForUser(
  db: AuthContext['db'],
  workspaceId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) return null;

  const workspace = workspaceDoc.data();
  if (!workspace) return null;

  if (workspace.user_id === userId || workspace.is_public === true) {
    return { id: workspaceDoc.id, ...workspace };
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    return null;
  }

  return { id: workspaceDoc.id, ...workspace };
}

async function buildCitationSources(
  db: AuthContext['db'],
  retrievedChunks: RetrievedChunk[],
): Promise<Source[]> {
  if (retrievedChunks.length === 0) {
    return [];
  }

  const uniqueSourceIds = Array.from(new Set(retrievedChunks.map((chunk) => chunk.sourceId)));
  const filenameMap = new Map<string, string>();

  await Promise.all(
    uniqueSourceIds.map(async (sourceId) => {
      const sourceDoc = await db.collection('sources').doc(sourceId).get();
      const sourceData = sourceDoc.data();
      filenameMap.set(sourceId, sourceData?.file_name || `Source ${sourceId}`);
    }),
  );

  return retrievedChunks.map((chunk) => ({
    sourceId: chunk.sourceId,
    page: chunk.pageNumber,
    filename: filenameMap.get(chunk.sourceId) || `Source ${chunk.sourceId}`,
    label:
      chunk.pageNumber !== undefined ? `Page ${chunk.pageNumber}` : `Chunk ${chunk.chunkIndex + 1}`,
  }));
}

function normalizeStoredSources(
  rawSources: Array<Record<string, unknown>> | undefined,
): Source[] | undefined {
  if (!rawSources || rawSources.length === 0) {
    return undefined;
  }

  return rawSources.map((source) => ({
    sourceId: String(source.sourceId ?? source.id ?? ''),
    page:
      typeof source.page === 'number'
        ? source.page
        : typeof source.pageNumber === 'number'
          ? source.pageNumber
          : undefined,
    filename: String(source.filename ?? source.file_name ?? source.sourceId ?? 'Source'),
    label:
      typeof source.label === 'string'
        ? source.label
        : typeof source.page === 'number' || typeof source.pageNumber === 'number'
          ? `Page ${source.page ?? source.pageNumber}`
          : 'Reference',
  }));
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  try {
    const { data: body, error } = await parseBodyWithZod(request, TutorChatRequestSchema);

    if (error) return error;
    if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const workspace = await getWorkspaceForUser(db, body.workspaceId, userId);
    if (!workspace) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const { getUserSubscription, consumeAiQueryQuota } = await import('@/shared/lib/paystack/db');
    const { getPlanDetails, getEffectivePlan } = await import('@/shared/lib/paystack/subscription');
    const subscription = await getUserSubscription(userId);
    const effectivePlan = getEffectivePlan(subscription);
    const requestedPersonality: TutorPersonality =
      (body.personalityId ?? body.personality) &&
      VALID_PERSONALITIES.includes(body.personalityId ?? body.personality!)
        ? (body.personalityId ?? body.personality)!
        : 'mentor';
    const allowedPersonalities = getPlanDetails(effectivePlan).features.tutorPersonalities;

    if (!allowedPersonalities.includes(requestedPersonality)) {
      return errorResponse(
        'This tutor personality requires a Premium subscription.',
        StatusCodes.FORBIDDEN,
        { upgradeRequired: effectivePlan === 'free' },
      );
    }

    const retrievedChunks = await retrieveContext(body.message, {
      workspaceId: body.workspaceId,
      topK: 10,
      minScore: 0.0,
    });
    const sources = await buildCitationSources(db, retrievedChunks);
    const promptContext = formatContextForPrompt(retrievedChunks, 4000);
    const prompt = createTutorConversationPrompt(
      requestedPersonality,
      body.customInstructions,
      body.conversationHistory || body.history || [],
      body.message,
      promptContext || undefined,
    );

    const aiQuota = await consumeAiQueryQuota(userId);
    if (!aiQuota.allowed) {
      return errorResponse(
        'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
        StatusCodes.FORBIDDEN,
        { upgradeRequired: aiQuota.limit <= 5 },
      );
    }

    if (body.stream) {
      const citationsBase64 = Buffer.from(JSON.stringify(sources)).toString('base64');

      try {
        const aiStream = await streamChatCompletion(prompt.messages, {
          temperature: 0.7,
          maxTokens: 4096,
        });

        const reader = aiStream.getReader();
        const encoder = new TextEncoder();
        let assembled = '';

        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                controller.enqueue(value);

                try {
                  assembled += new TextDecoder().decode(value, { stream: true });
                } catch {
                  // ignore decode errors for streamed chunks
                }
              }

              controller.enqueue(encoder.encode(`[CITATIONS]:${citationsBase64}`));
              controller.close();

              db.collection('tutor_messages')
                .add({
                  workspace_id: body.workspaceId,
                  user_id: userId,
                  role: 'assistant',
                  content: assembled,
                  sources,
                  created_at: Timestamp.now(),
                })
                .catch(() => undefined);
            } catch (streamError) {
              controller.error(streamError);
            }
          },
        });

        db.collection('tutor_messages')
          .add({
            workspace_id: body.workspaceId,
            user_id: userId,
            role: 'user',
            content: body.message,
            created_at: Timestamp.now(),
          })
          .catch(() => undefined);

        return new NextResponse(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch (err) {
        console.warn('Gemini streaming failed, falling back to non-stream:', err);

        let aiText: string;

        try {
          aiText = await getChatCompletion(prompt.messages, {
            temperature: 0.7,
            maxTokens: 4096,
            mockType: 'tutor',
          });
        } catch (gbErr) {
          const msg = gbErr instanceof Error ? gbErr.message : String(gbErr);
          console.warn('getChatCompletion failed during fallback:', msg);

          if (/\b429\b|rate limit|quota|too many requests/i.test(msg)) {
            const { getMockTutorResponse } = await import('@/shared/lib/openai/mock-data');
            aiText = getMockTutorResponse();
          } else {
            throw gbErr;
          }
        }

        db.collection('tutor_messages')
          .add({
            workspace_id: body.workspaceId,
            user_id: userId,
            role: 'user',
            content: body.message,
            created_at: Timestamp.now(),
          })
          .catch(() => undefined);

        db.collection('tutor_messages')
          .add({
            workspace_id: body.workspaceId,
            user_id: userId,
            role: 'assistant',
            content: aiText,
            sources,
            created_at: Timestamp.now(),
          })
          .catch(() => undefined);

        const encoder = new TextEncoder();
        const citationsBase64 = Buffer.from(JSON.stringify(sources)).toString('base64');
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const chunkSize = 256;
              for (let i = 0; i < aiText.length; i += chunkSize) {
                controller.enqueue(encoder.encode(aiText.slice(i, i + chunkSize)));
                await new Promise((r) => setTimeout(r, 5));
              }

              controller.enqueue(encoder.encode(`[CITATIONS]:${citationsBase64}`));
              controller.close();
            } catch (streamError) {
              controller.error(streamError);
            }
          },
        });

        return new NextResponse(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
    }

    const aiResponse = await getChatCompletion(prompt.messages, {
      temperature: 0.7,
      maxTokens: 4096,
      mockType: 'tutor',
    });

    try {
      await db.collection('tutor_messages').add({
        workspace_id: body.workspaceId,
        user_id: userId,
        role: 'user',
        content: body.message,
        created_at: Timestamp.now(),
      });

      await db.collection('tutor_messages').add({
        workspace_id: body.workspaceId,
        user_id: userId,
        role: 'assistant',
        content: aiResponse,
        sources,
        created_at: Timestamp.now(),
      });
    } catch (persistError) {
      console.warn('Failed to persist tutor messages:', persistError);
    }

    const response: TutorChatResponse = {
      success: true,
      response: aiResponse,
      sources,
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Error in tutor chat:', error);
    return errorResponse(
      'An error occurred while processing your request. Please try again.',
      StatusCodes.INTERNAL_ERROR,
    );
  }
});

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  const workspaceId = getWorkspaceIdFromRequest(request);
  if (!workspaceId) return errorResponse('workspaceId is required', StatusCodes.BAD_REQUEST);

  const workspace = await getWorkspaceForUser(context.db, workspaceId, context.userId);
  if (!workspace) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  try {
    const snapshot = await context.db
      .collection('tutor_messages')
      .where('workspace_id', '==', workspaceId)
      .orderBy('created_at', 'asc')
      .limit(500)
      .get();

    const messages = snapshot.docs.map((d) => {
      const data = d.data() as {
        role?: 'user' | 'assistant';
        content?: string;
        created_at?: { toDate?: () => Date };
        sources?: Array<Record<string, unknown>>;
      };

      return {
        id: d.id,
        role: data.role,
        content: data.content,
        createdAt: data.created_at?.toDate ? data.created_at.toDate().toISOString() : null,
        citations: normalizeStoredSources(data.sources),
      };
    });

    return successResponse({ messages });
  } catch (err: unknown) {
    console.error('Error fetching conversation history:', err);
    return errorResponse('Failed to fetch conversation history', StatusCodes.INTERNAL_ERROR);
  }
});
