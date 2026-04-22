'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/flashcards/page.tsx
// Layer: app (thin assembly only — no business logic)
// Assembles: FlashCardDeck (overview) + ReviewQueue (full-screen mode)
// =============================================================================

import { useContext, useState } from 'react';

import { useParams } from 'next/navigation';

import { AuthContext } from '@/context/AuthContext';

import { Button } from '@/shared/ui';

import {
  FlashCardDeck,
  ReviewQueue,
  FlashcardCreator,
  useFlashcards,
  useFlashcardReviewHistory,
  useReviewFlashcard,
  useGenerateFlashcards,
} from '@/features/flashcards';

interface ApiErrorEnvelope {
  success: false;
  error?: {
    message?: string;
  };
}

export default function FlashcardsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const authContext = useContext(AuthContext);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingAnki, setIsExportingAnki] = useState(false);
  const canUseSpacedRepetition = Boolean(authContext?.canUseFeature?.('spacedRepetition'));
  const canExportPdf = Boolean(authContext?.canUseFeature?.('exportPdf'));
  const canExportAnki = Boolean(authContext?.canUseFeature?.('exportAnki'));

  const { data: cards = [], isLoading, error } = useFlashcards(workspaceId);
  const { data: reviewHistory = [] } = useFlashcardReviewHistory(workspaceId, 12);
  const { mutate: submitRating } = useReviewFlashcard(workspaceId);
  const { mutate: generate, isPending: isGenerating } = useGenerateFlashcards(workspaceId);

  const handleRate = (flashcardId: string, quality: number) => {
    submitRating({ flashcardId, quality });
  };

  const handleGenerate = () => {
    generate({});
  };

  const handleExport = async (format: 'pdf' | 'anki') => {
    const setLoading = format === 'pdf' ? setIsExportingPdf : setIsExportingAnki;
    const canExport = format === 'pdf' ? canExportPdf : canExportAnki;

    if (!canExport) {
      setExportError(
        format === 'pdf'
          ? 'PDF export is available on verified Premium plans. Upgrade or complete verification to continue.'
          : 'Anki export is available on verified Premium plans. Upgrade or complete verification to continue.',
      );
      return;
    }

    setLoading(true);
    setExportError(null);

    try {
      const response = await fetch(`/api/v1/export/flashcards/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = (await response.json()) as ApiErrorEnvelope;
          throw new Error(payload.error?.message || 'Failed to export flashcards');
        }
        throw new Error('Failed to export flashcards');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `flashcards-${workspaceId}.${format === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (exportErr) {
      setExportError(exportErr instanceof Error ? exportErr.message : 'Failed to export flashcards');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Deck overview ── */}
      <section style={{ padding: 'var(--space-8)' }}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            loading={isExportingPdf}
            disabled={!canExportPdf}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('anki')}
            loading={isExportingAnki}
            disabled={!canExportAnki}
          >
            Export Anki
          </Button>
          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
        </div>
        {(!canExportPdf || !canExportAnki) && (
          <p className="mb-4 text-sm text-amber-600">
            Flashcard export is available on verified Premium plans. Upgrade or restore verification to
            unlock downloads.
          </p>
        )}
        <FlashCardDeck
          cards={cards}
          isLoading={isLoading}
          error={error?.message ?? null}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          reviewHref={canUseSpacedRepetition ? undefined : '/pricing'}
          reviewLabel={canUseSpacedRepetition ? undefined : 'Upgrade for review mode'}
        />
        {!canUseSpacedRepetition && (
          <p className="mt-3 text-sm text-amber-600">
            Spaced repetition review is a Premium feature. Upgrade to unlock it.
          </p>
        )}
      </section>

      {/* ── Full-screen review overlay (portal-like, renders over everything) ── */}
      {canUseSpacedRepetition && (
        <ReviewQueue workspaceId={workspaceId} cards={cards} onRate={handleRate} />
      )}

      {/* ── Card creator modal ── */}
      <FlashcardCreator workspaceId={workspaceId} />

      {/* ── Review history ── */}
      {reviewHistory.length > 0 && (
        <section style={{ padding: '0 var(--space-8) var(--space-8) var(--space-8)' }}>
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-elevated)',
              padding: 'var(--space-4)',
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 'var(--space-3)',
                fontSize: '0.95rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Recent flashcard reviews
            </h2>

            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {reviewHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: 'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={entry.front}
                  >
                    {entry.front}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    Rating {entry.rating} · {new Date(entry.reviewed_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
