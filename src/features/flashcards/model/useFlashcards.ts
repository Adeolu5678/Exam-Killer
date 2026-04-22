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
  fetchFlashcardReviewHistory,
  createFlashcard,
  generateFlashcards,
  updateFlashcard,
  deleteFlashcard,
  submitFlashcardReview,
} from '../api/flashcardsApi';

// ── Query key factory ─────────────────────────────────────────────────────────
export const flashcardKeys = {
  all: (workspaceId: string) => ['flashcards', workspaceId] as const,
  list: (workspaceId: string) => ['flashcards', workspaceId, 'list'] as const,
  detail: (flashcardId: string) => ['flashcards', 'detail', flashcardId] as const,
  reviewHistory: (workspaceId: string) => ['flashcards', workspaceId, 'review-history'] as const,
};

// ── Fetch list ────────────────────────────────────────────────────────────────
export function useFlashcards(workspaceId: string) {
  return useQuery({
    queryKey: flashcardKeys.list(workspaceId),
    queryFn: () => fetchFlashcards(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    select: (data) => data.flashcards,
  });
}

// ── Review history ────────────────────────────────────────────────────────────
export function useFlashcardReviewHistory(workspaceId: string, limit: number = 20) {
  return useQuery({
    queryKey: [...flashcardKeys.reviewHistory(workspaceId), limit] as const,
    queryFn: () => fetchFlashcardReviewHistory(workspaceId, limit),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    select: (data) => data.history,
  });
}

// ── Generate ──────────────────────────────────────────────────────────────────
export function useGenerateFlashcards(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { source_ids?: string[]; topic?: string; count?: number }) =>
      generateFlashcards(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flashcardKeys.all(workspaceId) });
      toast.success('Flashcards generated successfully!');
    },
    onError: (err: any) => {
      if (err.upgradeRequired || err.message?.includes('Upgrade')) {
        toast.error('Limit exceeded', {
          description: 'Upgrade to Premium for unlimited AI flashcard generation.',
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      } else {
        toast.error(err.message || 'Failed to generate flashcards');
      }
    },
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
      const prev = queryClient.getQueryData<FlashcardItem[]>(flashcardKeys.list(workspaceId));
      queryClient.setQueryData<FlashcardItem[]>(flashcardKeys.list(workspaceId), (old) =>
        old?.map((card) => (card.id === flashcardId ? { ...card, ...data } : card)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(flashcardKeys.list(workspaceId), ctx.prev);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update flashcard');
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
      const prev = queryClient.getQueryData<FlashcardItem[]>(flashcardKeys.list(workspaceId));
      queryClient.setQueryData<FlashcardItem[]>(flashcardKeys.list(workspaceId), (old) =>
        old?.filter((card) => card.id !== flashcardId),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(flashcardKeys.list(workspaceId), ctx.prev);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete flashcard');
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
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: any) => {
      if (err?.upgradeRequired || err?.message?.includes('Premium')) {
        toast.error('Premium required', {
          description: 'Spaced repetition review is available on Premium plans.',
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
        return;
      }

      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    },
  });
}
