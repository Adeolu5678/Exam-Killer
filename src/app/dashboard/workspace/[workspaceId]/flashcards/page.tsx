'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/flashcards/page.tsx
// Layer: app (thin assembly only — no business logic)
// Assembles: FlashCardDeck (overview) + ReviewQueue (full-screen mode)
// =============================================================================

import { useParams } from 'next/navigation';

import { FlashCardDeck, ReviewQueue, FlashcardCreator } from '@/features/flashcards';
import { useFlashcards, useReviewFlashcard } from '@/features/flashcards';

export default function FlashcardsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: cards = [], isLoading, error } = useFlashcards(workspaceId);
  const { mutate: submitRating } = useReviewFlashcard(workspaceId);

  const handleRate = (flashcardId: string, quality: number) => {
    submitRating({ flashcardId, quality });
  };

  return (
    <>
      {/* ── Deck overview ── */}
      <section style={{ padding: 'var(--space-8)' }}>
        <FlashCardDeck cards={cards} isLoading={isLoading} error={error?.message ?? null} />
      </section>

      {/* ── Full-screen review overlay (portal-like, renders over everything) ── */}
      <ReviewQueue workspaceId={workspaceId} cards={cards} onRate={handleRate} />

      {/* ── Card creator modal ── */}
      <FlashcardCreator workspaceId={workspaceId} />
    </>
  );
}
