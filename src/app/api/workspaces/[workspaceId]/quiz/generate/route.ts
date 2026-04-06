import { NextRequest } from 'next/server';

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getChatCompletion } from '@/shared/lib/openai/client';
import {
  createQuizPrompt,
  QUIZ_RESPONSE_SCHEMA,
  type QuizQuestionType,
} from '@/shared/lib/openai/prompts';

interface GenerateQuizBody {
  source_ids?: string[];
  count?: number;
  question_types?: QuizQuestionType[];
  topics?: string[];
}

interface QuizQuestionFormat {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

// Standard crypto.randomUUID is used

// Redundant functions removed (handled by withOwnership or route structure)

function getWorkspaceIdFromRequest(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[3] || null;
}

const GenerateQuizSchema = z.object({
  source_ids: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(50).default(10),
  question_types: z.array(z.enum(['multiple_choice', 'true_false', 'short_answer'])).optional(),
  topics: z.array(z.string()).optional(),
});

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

    const { data: body, error } = await parseBodyWithZod(request, GenerateQuizSchema);

    if (error) return error;
    if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const { source_ids, count, question_types, topics } = body;

    const { fetchRAGContent, truncateContent } = await import('@/shared/lib/rag/content');
    const content = await fetchRAGContent(db, workspaceId, source_ids);

    if (!content || content.trim().length === 0) {
      return errorResponse(
        'No source content available. Please upload and process sources first.',
        StatusCodes.BAD_REQUEST,
      );
    }

    const truncatedContent = truncateContent(content);
    const prompt = createQuizPrompt(truncatedContent, count, question_types, topics?.join(', '));

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
      mockType: 'quiz',
      responseMimeType: 'application/json',
      responseSchema: QUIZ_RESPONSE_SCHEMA,
    });

    let generatedQuestions: QuizQuestionFormat[] = [];

    try {
      generatedQuestions = JSON.parse(response) as QuizQuestionFormat[];
    } catch (parseError) {
      console.error('Failed to parse quiz response:', parseError);
      return errorResponse('Failed to parse generated quiz questions', StatusCodes.INTERNAL_ERROR);
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      return errorResponse('No quiz questions were generated', StatusCodes.INTERNAL_ERROR);
    }

    const quizId = crypto.randomUUID();
    const questions = generatedQuestions.map((generated) => {
      const questionId = crypto.randomUUID();
      const options =
        generated.type === 'multiple_choice' && generated.options
          ? {
              A: generated.options[0],
              B: generated.options[1],
              C: generated.options[2],
              D: generated.options[3],
            }
          : undefined;

      return {
        question_id: questionId,
        question_text: generated.question,
        question_type: generated.type,
        options,
        correct_answer: generated.correct_answer,
        explanation: generated.explanation,
        difficulty: 'medium' as const,
      };
    });

    const quizRef = await db.collection('quizzes').add({
      quiz_id: quizId,
      workspace_id: workspaceId,
      user_id: userId,
      source_id: source_ids?.[0] || null,
      title: topics?.[0] || 'Untitled Quiz',
      topic: topics?.[0] || null,
      questions,
      total_questions: questions.length,
      completed: false,
      created_at: Timestamp.now(),
    });

    return successResponse(
      {
        quiz: {
          quiz_id: quizId,
          id: quizRef.id,
          total_questions: questions.length,
          questions: questions.map((q) => ({
            question_id: q.question_id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            difficulty: q.difficulty,
          })),
        },
        generated_count: questions.length,
      },
      StatusCodes.CREATED,
    );
  } catch (error: unknown) {
    console.error('Error in quiz generation:', error);
    return errorResponse('Failed to generate quiz', StatusCodes.INTERNAL_ERROR);
  }
});
