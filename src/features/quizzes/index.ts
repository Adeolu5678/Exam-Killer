// =============================================================================
// features/quizzes/index.ts  —  PUBLIC API
// Layer: features → quizzes
// Rule: Consumers may ONLY import from this file.
//   ✅  import { QuizBuilder, QuizPlayer, useQuizzes } from '@/features/quizzes'
//   ❌  import { QuizPlayer } from '@/features/quizzes/ui/QuizPlayer'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────
export { QuizList } from './ui/QuizList';
export { QuizBuilder } from './ui/QuizBuilder';
export { QuizPlayer } from './ui/QuizPlayer';
export { ScoreReveal } from './ui/ScoreReveal';
export { QuizEmptyState } from './ui/QuizEmptyState';
export { QuizRowSkeleton, QuizListSkeleton } from './ui/QuizSkeleton';

// ── TanStack Query hooks ────────────────────────────────────────────────────
export {
  useQuizzes,
  useQuiz,
  useGenerateQuiz,
  useSubmitQuiz,
  useDeleteQuiz,
} from './model/useQuizzes';

// ── Zustand store ────────────────────────────────────────────────────────────
export { useQuizzesStore } from './model/quizzesStore';

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  QuizListItem,
  QuizDetail,
  QuizQuestion,
  QuizOption,
  QuizSubmission,
  QuizResultData,
  QuestionResult,
  GenerateQuizPayload,
  QuizSessionState,
} from './model/types';
export { generateQuizSchema, quizKeys, getScoreColor, DIFFICULTY_LABELS } from './model/types';

// ── API functions (for advanced consumers) ───────────────────────────────────
export { fetchQuizzes, fetchQuiz, generateQuiz, submitQuiz, deleteQuiz } from './api/quizzesApi';
