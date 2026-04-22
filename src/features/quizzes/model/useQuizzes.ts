// =============================================================================
// features/quizzes/model/useQuizzes.ts
// Layer: features → quizzes → model
// Tool: TanStack Query v5 — server state management.
//       Rule: Never duplicate server data in Zustand.
// =============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { quizKeys } from './types';
import type { GenerateQuizPayload, QuizSubmission } from './types';
import {
  fetchQuizzes,
  fetchQuiz,
  fetchQuizAttemptHistory,
  generateQuiz,
  submitQuiz,
  deleteQuiz,
} from '../api/quizzesApi';

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/** List all quizzes for a workspace */
export function useQuizzes(workspaceId: string) {
  return useQuery({
    queryKey: quizKeys.list(workspaceId),
    queryFn: () => fetchQuizzes(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60_000, // 1 minute
  });
}

/** Fetch a single quiz with full question detail */
export function useQuiz(quizId: string | null) {
  return useQuery({
    queryKey: quizKeys.detail(quizId ?? ''),
    queryFn: () => fetchQuiz(quizId!),
    enabled: Boolean(quizId),
    staleTime: 5 * 60_000, // 5 min — quiz content rarely changes
  });
}

/** Fetch recent quiz attempts in a workspace (review history) */
export function useQuizAttemptHistory(workspaceId: string, limit: number = 20) {
  return useQuery({
    queryKey: [...quizKeys.attempts(workspaceId), limit] as const,
    queryFn: () => fetchQuizAttemptHistory(workspaceId, limit),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Generate a new AI quiz and invalidate the list cache */
export function useGenerateQuiz(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: GenerateQuizPayload) => generateQuiz(workspaceId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quizKeys.list(workspaceId) });
      toast.success('Quiz generated successfully!');
    },
    onError: (err: any) => {
      if (err.upgradeRequired || err.message?.includes('Upgrade')) {
        toast.error('Limit exceeded', {
          description: 'Upgrade to Premium for unlimited AI quiz generation.',
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      } else {
        toast.error(err.message || 'Failed to generate quiz');
      }
    },
  });
}

/** Submit answers and receive scored results */
export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, submission }: { quizId: string; submission: QuizSubmission }) =>
      submitQuiz(quizId, submission),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quizKeys.all });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Delete a quiz with optimistic list removal */
export function useDeleteQuiz(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => deleteQuiz(quizId),
    onMutate: async (quizId) => {
      await qc.cancelQueries({ queryKey: quizKeys.list(workspaceId) });
      const snapshot = qc.getQueryData(quizKeys.list(workspaceId));
      qc.setQueryData(quizKeys.list(workspaceId), (old: { quiz_id: string }[] | undefined) =>
        (old ?? []).filter((q) => q.quiz_id !== quizId),
      );
      return { snapshot };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(quizKeys.list(workspaceId), ctx.snapshot);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete quiz');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: quizKeys.list(workspaceId) });
    },
  });
}
