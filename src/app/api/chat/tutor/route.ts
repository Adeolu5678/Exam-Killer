import { NextRequest } from 'next/server';

import { z } from 'zod';

import {
  withAuth,
  withOwnership,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthContext,
} from '@/shared/lib/api/auth';
import { getChatCompletion } from '@/shared/lib/openai/client';
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
  customInstructions: z.string().optional(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
});

type TutorChatRequest = z.infer<typeof TutorChatRequestSchema>;

interface Source {
  sourceId: string;
  pageNumber?: number;
  content: string;
}

interface TutorChatResponse {
  success: boolean;
  response: string;
  sources: Source[];
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { userId, db } = context;

  return withOwnership(
    async (req, ctx, workspace) => {
      try {
        const { data: body, error } = await parseBodyWithZod(req, TutorChatRequestSchema);

        if (error) return error;
        if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

        const { message, personality, customInstructions, conversationHistory, workspaceId } = body;

        // Check subscription limits
        const { getUserSubscription, getUserUsageStats } = await import('@/shared/lib/paystack/db');
        const subscription = await getUserSubscription(userId);

        if (subscription) {
          const { checkUserLimits } = await import('@/shared/lib/paystack/subscription');
          const usage = await getUserUsageStats(userId);
          const limits = checkUserLimits(subscription, usage);

          if (!limits.canProceed) {
            return errorResponse(
              'You have reached your AI query limit. Upgrade to Premium for unlimited queries!',
              StatusCodes.FORBIDDEN,
              { upgradeRequired: true },
            );
          }
        }

        // Personality handling
        const tutorPersonality: TutorPersonality =
          personality && VALID_PERSONALITIES.includes(personality) ? personality : 'mentor';

        // RAG retrieval - handles workspace-level and source-level filtering
        const retrievedChunks = await retrieveContext(message, {
          workspaceId,
          topK: 10,
          minScore: 0.0,
        });

        const promptContext = formatContextForPrompt(retrievedChunks, 4000);

        const prompt = createTutorConversationPrompt(
          tutorPersonality,
          customInstructions,
          conversationHistory || [],
          message,
          promptContext || undefined,
        );

        const aiResponse = await getChatCompletion(prompt.messages, {
          temperature: 0.7,
          maxTokens: 4096,
          mockType: 'tutor',
        });

        const sources: Source[] = retrievedChunks.map((chunk: RetrievedChunk) => ({
          sourceId: chunk.sourceId,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
        }));

        const response: TutorChatResponse = {
          success: true,
          response: aiResponse,
          sources,
        };

        // Increment AI query count
        const { incrementAiQueryCount } = await import('@/shared/lib/paystack/db');
        await incrementAiQueryCount(userId);

        return successResponse(response);
      } catch (error: unknown) {
        console.error('Error in tutor chat:', error);
        return errorResponse(
          'An error occurred while processing your request. Please try again.',
          StatusCodes.INTERNAL_ERROR,
        );
      }
    },
    async (req, ctx) => {
      try {
        const body = await req.clone().json();
        const workspaceId = body.workspaceId;
        if (!workspaceId) return null;
        const workspaceDoc = await ctx.db.collection('workspaces').doc(workspaceId).get();
        if (!workspaceDoc.exists) return null;
        return { id: workspaceDoc.id, ...workspaceDoc.data() };
      } catch {
        return null;
      }
    },
    (workspace: any) => workspace.user_id,
  )(request, context);
});
