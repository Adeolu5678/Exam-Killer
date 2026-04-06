import { NextRequest, NextResponse } from 'next/server';

import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getChatCompletion } from '@/shared/lib/openai/client';
import { createFlashcardPrompt, FLASHCARD_RESPONSE_SCHEMA } from '@/shared/lib/openai/prompts';
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

function getWorkspaceIdFromRequest(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[3] || null;
}

export const POST = withAuth(async (request, context) => {
  const { db, userId } = context;
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
    }

    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
    if (!workspaceDoc.exists) {
      return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
    }

    const workspaceData = workspaceDoc.data();
    const memberSnapshot = await db
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (!workspaceData || (workspaceData.user_id !== userId && memberSnapshot.empty)) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const { data: body, error } = await parseBodyWithZod(request, GenerateFlashcardsSchema);

    if (error) return error;
    if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const { source_ids, count, topics } = body;

    const { getUserSubscription, getUserUsageStats } = await import('@/shared/lib/paystack/db');
    const { getPlanDetails, getEffectivePlan } = await import('@/shared/lib/paystack/subscription');

    const subscription = await getUserSubscription(userId);
    const usage = await getUserUsageStats(userId);
    const effectivePlan = getEffectivePlan(subscription);
    const plan = getPlanDetails(effectivePlan);
    const requestedCount = count ?? 10;
    const flashcardLimit =
      plan.features.flashcards === 'unlimited' ? Infinity : plan.features.flashcards;

    if (
      Number.isFinite(flashcardLimit) &&
      usage.flashcardsCount + requestedCount > flashcardLimit
    ) {
      return errorResponse(
        'You have reached your flashcard limit. Upgrade your plan for unlimited flashcards.',
        StatusCodes.FORBIDDEN,
        { upgradeRequired: effectivePlan === 'free' },
      );
    }

    const { fetchRAGContent, truncateContent } = await import('@/shared/lib/rag/content');
    const content = await fetchRAGContent(db, workspaceId, source_ids);

    if (!content || content.trim().length === 0) {
      return errorResponse(
        'No source content available. Please upload and process sources first.',
        StatusCodes.BAD_REQUEST,
      );
    }

    const truncatedContent = truncateContent(content);
    const prompt = createFlashcardPrompt(truncatedContent, count, topics?.join(', '));

    const { consumeAiQueryQuota } = await import('@/shared/lib/paystack/db');
    const aiQuota = await consumeAiQueryQuota(userId);
    if (!aiQuota.allowed) {
      return errorResponse(
        'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
        StatusCodes.FORBIDDEN,
        { upgradeRequired: aiQuota.limit <= 5 },
      );
    }

    const { RAG_CONFIG } = await import('@/shared/lib/rag/config');
    const response = await getChatCompletion([{ role: 'user', content: prompt }], {
      temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
      maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
      mockType: 'flashcards',
      responseMimeType: 'application/json',
      responseSchema: FLASHCARD_RESPONSE_SCHEMA,
    });

    let generatedFlashcards: FlashcardFormat[] = [];

    try {
      generatedFlashcards = JSON.parse(response) as FlashcardFormat[];
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

    const initialData = getInitialFlashcardData();
    const createdFlashcards: GeneratedFlashcard[] = [];

    for (const generated of generatedFlashcards) {
      const flashcardId = crypto.randomUUID();
      const flashcardRef = await db.collection('flashcards').add({
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
        created_at: Timestamp.now(),
      });

      createdFlashcards.push({
        id: flashcardRef.id,
        front: generated.front,
        back: generated.back,
        tags: generated.tags || [],
      });
    }

    return successResponse({
      flashcards: createdFlashcards,
      generated_count: createdFlashcards.length,
    });
  } catch (error: unknown) {
    console.error('Error in flashcard generation:', error);
    return errorResponse('Failed to generate flashcards', StatusCodes.INTERNAL_ERROR);
  }
});
