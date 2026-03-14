import { NextRequest, NextResponse } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';
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

        // Check subscription limits
        const { getUserSubscription, getUserUsageStats } = await import('@/shared/lib/paystack/db');
        const subscription = await getUserSubscription(userId);

        if (subscription) {
          const { checkUserLimits } = await import('@/shared/lib/paystack/subscription');
          const usage = await getUserUsageStats(userId);
          const limits = checkUserLimits(subscription, usage);

          if (!limits.canProceed) {
            return errorResponse(
              'Exam limit exceeded. Upgrade to Premium for unlimited exams!',
              StatusCodes.FORBIDDEN,
              { upgradeRequired: true },
            );
          }
        }

        const { data: body, error } = await parseBodyWithZod(req, GenerateExamSchema);

        if (error) return error;
        if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

        const { source_ids, question_count, time_limit_minutes } = body;

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

        const prompt = `You are an expert test creator specializing in comprehensive exam assessments. Generate high-quality exam questions from the provided content.

Requirements:
- Create questions that test deep understanding, not just memorization
- Include a mix of difficulty levels (easy, medium, hard)
- Ensure all questions have clear, unambiguous wording
- Provide correct answers with detailed explanations
- For multiple choice, include 4 options with one clearly correct answer
- Cover the breadth of the material provided
- These are exam-style questions - make them comprehensive and challenging

Question types to include:
- Multiple choice: 4 options, single correct answer
- True/False: Clear statements that are definitively true or false
- Short answer: Questions requiring brief written responses

Output format (JSON array):
[
  {
    "type": "multiple_choice" | "true_false" | "short_answer",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"], // for multiple choice only
    "correct_answer": "The correct answer",
    "explanation": "Detailed explanation of why this is correct"
  }
]

Generate ${question_count} exam questions from the following content:
${truncatedContent}`;

        const { RAG_CONFIG } = await import('@/shared/lib/rag/config');
        const response = await getChatCompletion([{ role: 'user', content: prompt }], {
          temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
          maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
          mockType: 'quiz',
        });

        let generatedQuestions: ExamQuestionFormat[] = [];

        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            generatedQuestions = JSON.parse(jsonMatch[0]);
          }
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
          created_at: require('firebase-admin/firestore').Timestamp.now(),
        };

        const examRef = await db.collection('exams').add(examData);

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
      const workspaceId = req.url.split('/workspaces/')[1]?.split('/')[0];
      if (!workspaceId) return null;
      const doc = await ctx.db.collection('workspaces').doc(workspaceId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },
    (workspace: any) => workspace.user_id,
  )(request, context);
});
