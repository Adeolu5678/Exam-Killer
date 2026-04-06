import { NextRequest, NextResponse } from 'next/server';

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  withOwnership,
  errorResponse,
  successResponse,
  StatusCodes,
  parseBodyWithZod,
} from '@/shared/lib/api/auth';
import { getChatCompletion } from '@/shared/lib/openai/client';
import {
  createExamPrompt,
  EXAM_RESPONSE_SCHEMA,
  type QuizQuestionType,
} from '@/shared/lib/openai/prompts';

const GenerateExamSchema = z.object({
  source_ids: z.array(z.string()).optional(),
  question_count: z.number().int().min(1).max(50).default(10),
  time_limit_minutes: z.number().int().min(1).max(300).default(60),
  question_types: z.array(z.enum(['multiple_choice', 'true_false', 'short_answer'])).optional(),
  focus_topics: z.array(z.string()).optional(),
});

interface ExamQuestionFormat {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

function getWorkspaceIdFromRequest(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[3] || null;
}

function formatQuestions(generatedQuestions: ExamQuestionFormat[]) {
  return generatedQuestions.map((generated: any) => {
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
}

export const POST = withAuth(async (request, context) => {
  const { db, userId } = context;

  return withOwnership(
    async (req, ctx, workspace) => {
      try {
        const workspaceId = workspace.id;

        const { data: body, error } = await parseBodyWithZod(req, GenerateExamSchema);

        if (error) return error;
        if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

        const { source_ids, question_count, time_limit_minutes, question_types, focus_topics } =
          body;

        // Gather content using shared utility
        const { fetchRAGContent, truncateContent } = await import('@/shared/lib/rag/content');
        const content = await fetchRAGContent(db, workspaceId, source_ids);

        if (!content || content.trim().length === 0) {
          return errorResponse(
            'No source content available. Please upload and process sources first.',
            StatusCodes.BAD_REQUEST,
          );
        }

        const truncatedContent = truncateContent(content);

        const prompt = createExamPrompt(
          truncatedContent,
          question_count,
          question_types as QuizQuestionType[] | undefined,
          focus_topics,
        );

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
          responseSchema: EXAM_RESPONSE_SCHEMA,
        });

        let generatedQuestions: ExamQuestionFormat[] = [];

        try {
          generatedQuestions = JSON.parse(response) as ExamQuestionFormat[];
        } catch (parseError) {
          console.error('Failed to parse exam response:', parseError);
          return errorResponse(
            'Failed to parse generated exam questions',
            StatusCodes.INTERNAL_ERROR,
          );
        }

        if (!generatedQuestions || generatedQuestions.length === 0) {
          return errorResponse(
            'No exam questions were generated. Please try again.',
            StatusCodes.INTERNAL_ERROR,
          );
        }

        const questions = formatQuestions(generatedQuestions);
        const examId = crypto.randomUUID();

        const examData = {
          exam_id: examId,
          workspace_id: workspaceId,
          user_id: userId,
          title: `Exam - ${new Date().toLocaleDateString()}`,
          questions,
          question_count: questions.length,
          time_limit_minutes,
          status: 'in_progress',
          completed: false,
          created_at: Timestamp.now(),
        };

        const examRef = await db.collection('exams').add(examData);

        const responseQuestions = questions.map((q) => ({
          question_id: q.question_id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          difficulty: q.difficulty,
        }));

        return successResponse(
          {
            exam_id: examId,
            id: examRef.id,
            question_count: questions.length,
            time_limit_minutes,
            questions: responseQuestions,
          },
          StatusCodes.CREATED,
        );
      } catch (error: unknown) {
        console.error('Generate exam error:', error);
        return errorResponse('Failed to generate exam', StatusCodes.INTERNAL_ERROR);
      }
    },
    async (req, ctx) => {
      const workspaceId = getWorkspaceIdFromRequest(req);
      if (!workspaceId) return null;
      const doc = await ctx.db.collection('workspaces').doc(workspaceId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },
    (workspace: Record<string, any>) => workspace.user_id as string,
  )(request, context);
});
