'use client';

// =============================================================================
// app/dashboard/flashcards/page.tsx
// Layer: app  →  thin page assembler
//
// FSD Rule: no business logic here. Delegates all data-fetching and rendering
//   to features/flashcards via its public index.ts API.
//
// Renders: a global overview of the user's flashcard decks across ALL
//   workspaces. Since the existing FlashCardDeck component is scoped to a
//   single workspaceId, this page renders a placeholder shell that re-uses
//   shared/ui primitives (Card, Skeleton) until a dedicated global query hook
//   is implemented in features/flashcards.
// =============================================================================

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardSkeleton,
} from '@/shared/ui';

import { FlashCardDeck, useFlashcards } from '@/features/flashcards';
import { useWorkspaces } from '@/features/workspace';

// ── Local workspace wrapper ────────────────────────────────────────────────
function WorkspaceDeckSection({
  workspace,
}: {
  workspace: { id: string; name: string; course_code?: string | null };
}) {
  const { data: cards, isLoading, error } = useFlashcards(workspace.id);

  return (
    <section aria-labelledby={`ws-deck-heading-${workspace.id}`}>
      <Card className="mb-4">
        <CardHeader className="px-4 py-3 md:px-6 md:py-4">
          <CardTitle id={`ws-deck-heading-${workspace.id}`} className="text-lg font-semibold">
            {workspace.name}
          </CardTitle>
          {workspace.course_code && (
            <CardDescription className="text-xs">{workspace.course_code}</CardDescription>
          )}
        </CardHeader>
      </Card>
      <FlashCardDeck
        cards={cards ?? []}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : null}
      />
    </section>
  );
}

// ── Page component ─────────────────────────────────────────────────────────
export default function GlobalFlashcardsPage() {
  const { data: workspacesResponse, isLoading, isError } = useWorkspaces();
  const workspaces = workspacesResponse?.workspaces ?? [];

  return (
    <section
      className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12"
      aria-labelledby="flashcards-heading"
    >
      <header className="mb-8 flex flex-col gap-2">
        <h1
          id="flashcards-heading"
          className="m-0 text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-3xl dark:text-white"
        >
          Flashcards
        </h1>
        <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
          Review decks across all your workspaces.
        </p>
      </header>

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[1, 2, 3].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <Card>
          <CardContent style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-accent-rose)', marginBottom: '8px', fontWeight: 500 }}>
              Failed to load workspaces
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Please refresh the page or try again later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && !isError && workspaces.length === 0 && (
        <Card>
          <CardContent style={{ padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Create a workspace to start building flashcard decks.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Per-workspace FlashCardDeck ──────────────────────────────────── */}
      {/* Each workspace gets its own deck section.                          */}
      {/* When a global `useAllFlashcards` hook is added to features/        */}
      {/* flashcards/index.ts this block should be replaced with that query. */}
      {!isLoading && !isError && workspaces.length > 0 && (
        <div className="flex flex-col gap-8 md:gap-10">
          {workspaces.map((ws) => (
            <WorkspaceDeckSection key={ws.id} workspace={ws} />
          ))}
        </div>
      )}
    </section>
  );
}
