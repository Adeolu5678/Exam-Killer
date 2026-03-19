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
  generateQuiz,
  submitQuiz,
  deleteQuiz,
  generateNlmQuiz,
  getNlmNotebook,
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
    },
  });
}

/** Submit answers and receive scored results */
export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({ quizId, submission }: { quizId: string; submission: QuizSubmission }) =>
      submitQuiz(quizId, submission),
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
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(quizKeys.list(workspaceId), ctx.snapshot);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: quizKeys.list(workspaceId) });
    },
  });
}

/** Generate a quiz via NotebookLM */
export function useGenerateNlmQuiz(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const notebook = await getNlmNotebook(workspaceId);
      if (!notebook) throw new Error('No linked NotebookLM notebook found for this workspace.');
      return generateNlmQuiz(notebook.notebook_id, workspaceId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quizKeys.list(workspaceId) });
      toast.success('Quiz generated via NLM!');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'NLM Quiz generation failed');
    },
  });
}
