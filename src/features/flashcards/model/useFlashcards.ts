// =============================================================================
// features/flashcards/model/useFlashcards.ts
// Layer: features → flashcards → model
// Rule: TanStack Query hooks for all server state. No Firebase imports.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FlashcardItem } from './types';
import {
  fetchFlashcards,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  submitFlashcardReview,
  generateNlmFlashcards,
  getNlmNotebook,
} from '../api/flashcardsApi';

// ── Query key factory ─────────────────────────────────────────────────────────
export const flashcardKeys = {
  all: (workspaceId: string) => ['flashcards', workspaceId] as const,
  list: (workspaceId: string) => ['flashcards', workspaceId, 'list'] as const,
  detail: (flashcardId: string) => ['flashcards', 'detail', flashcardId] as const,
};

// ── Fetch list ────────────────────────────────────────────────────────────────
export function useFlashcards(workspaceId: string) {
  return useQuery({
    queryKey: flashcardKeys.list(workspaceId),
    queryFn: () => fetchFlashcards(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (data) => data.flashcards,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateFlashcard(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { front: string; back: string; tags?: string[] }) =>
      createFlashcard(workspaceId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateFlashcard(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      flashcardId,
      data,
    }: {
      flashcardId: string;
      data: { front?: string; back?: string };
    }) => updateFlashcard(flashcardId, data),
    onMutate: async ({ flashcardId, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: flashcardKeys.list(workspaceId) });
      const prev = queryClient.getQueryData<{ flashcards: FlashcardItem[] }>(
        flashcardKeys.list(workspaceId),
      );
      queryClient.setQueryData<{ flashcards: FlashcardItem[] }>(
        flashcardKeys.list(workspaceId),
        (old) => {
          if (!old) return old;
          return {
            flashcards: old.flashcards.map((c) => (c.id === flashcardId ? { ...c, ...data } : c)),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(flashcardKeys.list(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteFlashcard(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flashcardId: string) => deleteFlashcard(flashcardId),
    onMutate: async (flashcardId) => {
      await queryClient.cancelQueries({ queryKey: flashcardKeys.list(workspaceId) });
      const prev = queryClient.getQueryData<{ flashcards: FlashcardItem[] }>(
        flashcardKeys.list(workspaceId),
      );
      queryClient.setQueryData<{ flashcards: FlashcardItem[] }>(
        flashcardKeys.list(workspaceId),
        (old) => (old ? { flashcards: old.flashcards.filter((c) => c.id !== flashcardId) } : old),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(flashcardKeys.list(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
    },
  });
}

// ── Submit review ─────────────────────────────────────────────────────────────
export function useReviewFlashcard(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flashcardId, quality }: { flashcardId: string; quality: number }) =>
      submitFlashcardReview(flashcardId, quality),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
    },
  });
}

// ── Generate via NLM ─────────────────────────────────────────────────────────
export function useGenerateNlmFlashcards(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const notebook = await getNlmNotebook(workspaceId);
      if (!notebook) throw new Error('No linked NotebookLM notebook found for this workspace.');
      return generateNlmFlashcards(notebook.notebook_id, workspaceId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
      toast.success('Flashcards generated via NLM!');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'NLM Generation failed');
    },
  });
}
