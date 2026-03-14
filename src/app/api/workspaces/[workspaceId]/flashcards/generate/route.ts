import { NextRequest, NextResponse } from 'next/server';

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
import { createFlashcardPrompt } from '@/shared/lib/openai/prompts';
import { getInitialFlashcardData } from '@/shared/lib/spaced-repetition';

const GenerateFlashcardsSchema = z.object({
  source_ids: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(50).default(10),
  topics: z.array(z.string()).optional(),
});

interface FlashcardFormat {
  front: string;
  back: string;
  tags: string[];
}

interface GeneratedFlashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

// Standard crypto.randomUUID is used

// Segment parsing redundant here

export const POST = withAuth(async (request, context) => {
  const { db, userId } = context;

  return withOwnership(
    async (req, ctx, workspace) => {
      try {
        const workspaceId = workspace.id;
        const { data: body, error } = await parseBodyWithZod(req, GenerateFlashcardsSchema);

        if (error) return error;
        if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

        const { source_ids, count, topics } = body;

        // Check subscription limits
        const { getUserSubscription, getUserUsageStats } = await import('@/shared/lib/paystack/db');
        const subscription = await getUserSubscription(userId);

        if (subscription) {
          const { checkUserLimits } = await import('@/shared/lib/paystack/subscription');
          const usage = await getUserUsageStats(userId);
          const limits = checkUserLimits(subscription, usage);

          if (!limits.canProceed) {
            return errorResponse(
              'Flashcard limit exceeded. Upgrade to Premium for unlimited flashcards!',
              StatusCodes.FORBIDDEN,
              { upgradeRequired: true },
            );
          }
        }

        // Gather content from sources using shared utility
        const { fetchRAGContent, truncateContent } = await import('@/shared/lib/rag/content');
        const content = await fetchRAGContent(db, workspaceId, source_ids);

        if (!content || content.trim().length === 0) {
          return errorResponse(
            'No source content available. Please upload and process sources first.',
            StatusCodes.BAD_REQUEST,
          );
        }

        const truncatedContent = truncateContent(content);

        // Generate flashcards with AI
        const topicString = topics?.join(', ');
        const prompt = createFlashcardPrompt(truncatedContent, count, topicString);

        const { RAG_CONFIG } = await import('@/shared/lib/rag/config');
        const response = await getChatCompletion([{ role: 'user', content: prompt }], {
          temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
          maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
          mockType: 'flashcards',
        });

        let generatedFlashcards: FlashcardFormat[] = [];

        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            generatedFlashcards = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse flashcard response:', parseError);
          return errorResponse('Failed to parse generated flashcards', StatusCodes.INTERNAL_ERROR);
        }

        if (!generatedFlashcards || generatedFlashcards.length === 0) {
          return errorResponse(
            'No flashcards were generated. Please try again.',
            StatusCodes.INTERNAL_ERROR,
          );
        }

        // Create flashcards in Firestore
        const initialData = getInitialFlashcardData();
        const createdFlashcards: GeneratedFlashcard[] = [];

        for (const generated of generatedFlashcards) {
          const flashcardId = crypto.randomUUID();

          const flashcardData = {
            flashcard_id: flashcardId,
            workspace_id: workspaceId,
            user_id: userId,
            source_id: source_ids?.[0] || null,
            front: generated.front,
            back: generated.back,
            tags: generated.tags || [],
            difficulty: 0,
            ease_factor: initialData.ease_factor,
            interval: initialData.interval,
            repetitions: initialData.repetitions,
            next_review: initialData.next_review,
            review_count: 0,
            created_at: require('firebase-admin/firestore').Timestamp.now(),
          };

          const flashcardRef = await db.collection('flashcards').add(flashcardData);

          createdFlashcards.push({
            id: flashcardRef.id,
            front: generated.front,
            back: generated.back,
            tags: generated.tags || [],
          });
        }

        // Increment AI query count
        const { incrementAiQueryCount } = await import('@/shared/lib/paystack/db');
        await incrementAiQueryCount(userId);

        return successResponse({
          flashcards: createdFlashcards,
          generated_count: createdFlashcards.length,
        });
      } catch (error: unknown) {
        console.error('Error in flashcard generation:', error);
        return errorResponse('Failed to generate flashcards', StatusCodes.INTERNAL_ERROR);
      }
    },
    async (req, ctx) => {
      const workspaceId = req.url.split('/workspaces/')[1]?.split('/')[0];
      if (!workspaceId) return null;
      const doc = await ctx.db.collection('workspaces').doc(workspaceId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },
    (workspace: any) => workspace.user_id,
  )(request, context);
});
