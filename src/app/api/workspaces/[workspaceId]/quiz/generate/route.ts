import { NextRequest } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  withOwnership,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getChatCompletion } from '@/shared/lib/openai/client';
import { createQuizPrompt, type QuizQuestionType } from '@/shared/lib/openai/prompts';

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

const GenerateQuizSchema = z.object({
  source_ids: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(50).default(10),
  question_types: z.array(z.enum(['multiple_choice', 'true_false', 'short_answer'])).optional(),
  topics: z.array(z.string()).optional(),
});

export const POST = withAuth(async (request, context) => {
  const { db, userId } = context;

  return withOwnership(
    async (req, ctx, workspace) => {
      try {
        const workspaceId = workspace.id;
        const { data: body, error } = await parseBodyWithZod(req, GenerateQuizSchema);

        if (error) return error;
        if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

        const { source_ids, count, question_types, topics } = body;

        // Check subscription limits
        const { getUserSubscription, getUserUsageStats } = await import('@/shared/lib/paystack/db');
        const subscription = await getUserSubscription(userId);

        if (subscription) {
          const { checkUserLimits } = await import('@/shared/lib/paystack/subscription');
          const usage = await getUserUsageStats(userId);
          const limits = checkUserLimits(subscription, usage);

          if (!limits.canProceed) {
            return errorResponse(
              'Quiz limit exceeded. Upgrade to Premium for unlimited quizzes!',
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
        const prompt = createQuizPrompt(
          truncatedContent,
          count,
          question_types,
          topics?.join(', '),
        );

        const { RAG_CONFIG } = await import('@/shared/lib/rag/config');
        const response = await getChatCompletion([{ role: 'user', content: prompt }], {
          temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
          maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
          mockType: 'quiz',
        });

        let generatedQuestions: QuizQuestionFormat[] = [];

        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            generatedQuestions = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse quiz response:', parseError);
          return errorResponse(
            'Failed to parse generated quiz questions',
            StatusCodes.INTERNAL_ERROR,
          );
        }

        if (!generatedQuestions || generatedQuestions.length === 0) {
          return errorResponse('No quiz questions were generated', StatusCodes.INTERNAL_ERROR);
        }

        const quizId = crypto.randomUUID();
        const questions = [];

        for (const generated of generatedQuestions) {
          const questionId = crypto.randomUUID();

          let options: Record<string, string> | undefined;
          if (generated.type === 'multiple_choice' && generated.options) {
            options = {
              A: generated.options[0],
              B: generated.options[1],
              C: generated.options[2],
              D: generated.options[3],
            };
          }

          questions.push({
            question_id: questionId,
            question_text: generated.question,
            question_type: generated.type,
            options,
            correct_answer: generated.correct_answer,
            explanation: generated.explanation,
            difficulty: 'medium' as const,
          });
        }

        const quizData = {
          quiz_id: quizId,
          workspace_id: workspaceId,
          user_id: userId,
          source_id: source_ids?.[0] || null,
          questions,
          total_questions: questions.length,
          completed: false,
          created_at: require('firebase-admin/firestore').Timestamp.now(),
        };

        const quizRef = await db.collection('quizzes').add(quizData);

        const responseQuestions = questions.map((q) => ({
          question_id: q.question_id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          difficulty: q.difficulty,
        }));

        // Increment AI query count
        const { incrementAiQueryCount } = await import('@/shared/lib/paystack/db');
        await incrementAiQueryCount(userId);

        return successResponse(
          {
            quiz: {
              quiz_id: quizId,
              id: quizRef.id,
              total_questions: questions.length,
              questions: responseQuestions,
            },
            generated_count: questions.length,
          },
          StatusCodes.CREATED,
        );
      } catch (error: unknown) {
        console.error('Error in quiz generation:', error);
        return errorResponse('Failed to generate quiz', StatusCodes.INTERNAL_ERROR);
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
