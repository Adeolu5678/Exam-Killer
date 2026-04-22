import { z } from 'zod';

export const QUIZ_MIN_COUNT = 1;
export const QUIZ_MAX_COUNT = 50;

export const quizQuestionTypeSchema = z.enum(['multiple_choice', 'true_false', 'short_answer']);
export type QuizQuestionType = z.infer<typeof quizQuestionTypeSchema>;

export const generateQuizRequestSchema = z.object({
  source_ids: z.array(z.string().trim().min(1)).max(30).optional(),
  count: z.number().int().min(QUIZ_MIN_COUNT).max(QUIZ_MAX_COUNT).optional().default(10),
  question_types: z.array(quizQuestionTypeSchema).min(1).max(3).optional(),
  topics: z.array(z.string().trim().min(1)).max(12).optional(),
});

export const quizListQuerySchema = z.object({
  source_id: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const submitQuizRequestSchema = z.object({
  answers: z
    .record(z.string(), z.string().trim().min(1))
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one answer is required',
    }),
  time_spent_seconds: z.number().int().min(0).optional().default(0),
});

export const quizAttemptHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type GenerateQuizRequest = z.infer<typeof generateQuizRequestSchema>;
export type QuizListQuery = z.infer<typeof quizListQuerySchema>;
export type SubmitQuizRequest = z.infer<typeof submitQuizRequestSchema>;
export type QuizAttemptHistoryQuery = z.infer<typeof quizAttemptHistoryQuerySchema>;

export interface QuizQuestionSummary {
  question_id: string;
  question_text: string;
  question_type: QuizQuestionType;
  options?: Record<string, string>;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizDetailQuestion extends QuizQuestionSummary {
  correct_answer: string;
  explanation: string;
}

export interface QuizListItem {
  id: string;
  quiz_id: string;
  workspace_id: string;
  title: string;
  topic: string | null;
  source_id: string | null;
  question_count: number;
  completed: boolean;
  best_score: number | null;
  latest_score: number | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuizDetail {
  id: string;
  quiz_id: string;
  workspace_id: string;
  title: string;
  topic: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
  questions: QuizQuestionSummary[];
}

export interface QuizAttemptResultItem {
  question_id: string;
  question_text: string;
  question_type: QuizQuestionType;
  options?: Record<string, string>;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface QuizSubmitResult {
  attempt_id: string;
  quiz_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  time_spent_seconds: number;
  completed_at: string;
  xp_earned: number;
  results: QuizAttemptResultItem[];
}

export interface QuizAttemptHistoryItem {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  correct_count: number;
  total_questions: number;
  time_spent_seconds: number;
  submitted_at: string;
}
