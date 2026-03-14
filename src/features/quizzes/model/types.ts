// =============================================================================
// features/quizzes/model/types.ts
// Layer: features → quizzes → model
// Rule: No imports from other features. No React.
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizOption {
  key: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuizOption[]; // empty for short_answer
  correct_answer?: string; // revealed after submission
  explanation?: string; // revealed after submission
}

export interface QuizListItem {
  quiz_id: string;
  title: string;
  topic?: string;
  question_count: number;
  created_at: string;
  /** Average score if previously attempted (0–100) */
  best_score?: number;
}

export interface QuizDetail {
  quiz_id: string;
  title: string;
  topic?: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizSubmission {
  /** map of question_id → chosen answer key (or text for short_answer) */
  answers: Record<string, string>;
  time_spent_seconds: number;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface QuizResultData {
  quiz_id: string;
  score: number; // 0–100
  correct_count: number;
  total_questions: number;
  time_spent_seconds: number;
  question_results: QuestionResult[];
  xp_earned: number;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const generateQuizSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(120),
  num_questions: z.number().int().min(3).max(30).default(10),
  question_types: z
    .array(z.enum(['multiple_choice', 'true_false']))
    .min(1)
    .default(['multiple_choice']),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export type GenerateQuizPayload = z.infer<typeof generateQuizSchema>;

// ---------------------------------------------------------------------------
// Active session state shape (used by quizzesStore)
// ---------------------------------------------------------------------------

export interface QuizSessionState {
  quiz: QuizDetail | null;
  /** Current question index (0-based) */
  currentIndex: number;
  /** map of question_id → selected answer */
  selectedAnswers: Record<string, string>;
  /** Epoch ms when the session started, for time tracking */
  startedAt: number | null;
  isSubmitting: boolean;
  result: QuizResultData | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the score color token name based on a 0–100 score */
export function getScoreColor(score: number): 'amber' | 'emerald' {
  return score >= 70 ? 'emerald' : 'amber';
}

/** Label for a difficulty level */
export const DIFFICULTY_LABELS: Record<GenerateQuizPayload['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** TanStack Query key factory */
export const quizKeys = {
  all: ['quizzes'] as const,
  list: (workspaceId: string) => [...quizKeys.all, 'list', workspaceId] as const,
  detail: (quizId: string) => [...quizKeys.all, 'detail', quizId] as const,
};
