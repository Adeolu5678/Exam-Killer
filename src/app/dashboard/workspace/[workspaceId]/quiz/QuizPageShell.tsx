'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/quiz/QuizPageShell.tsx
// Thin composition shell — connects URL params to the quizzes feature state.
// Layer: app (routing only)
// =============================================================================

import { use } from 'react';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { QuizListSkeleton } from '@/features/quizzes';
import { useQuizzesStore } from '@/features/quizzes';

const QuizList = dynamic(
  () => import('@/features/quizzes').then((m) => ({ default: m.QuizList })),
  { ssr: false, loading: () => <QuizListSkeleton /> },
);
const QuizBuilder = dynamic(
  () => import('@/features/quizzes').then((m) => ({ default: m.QuizBuilder })),
  { ssr: false },
);
const QuizPlayer = dynamic(
  () => import('@/features/quizzes').then((m) => ({ default: m.QuizPlayer })),
  { ssr: false },
);
const ScoreReveal = dynamic(
  () => import('@/features/quizzes').then((m) => ({ default: m.ScoreReveal })),
  { ssr: false },
);

export function QuizPageShell() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { view, isBuilderOpen, session } = useQuizzesStore();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Quiz list (default view) */}
      {view === 'list' && (
        <div style={{ padding: 'var(--space-6)' }}>
          <QuizList workspaceId={workspaceId} />
        </div>
      )}

      {/* Active quiz player */}
      {view === 'player' && <QuizPlayer />}

      {/* Score reveal */}
      {view === 'reveal' && session.result && (
        <ScoreReveal
          result={session.result}
          onRetry={() => {
            // Re-start the same quiz if the detail is still in session
            if (session.quiz) {
              useQuizzesStore.getState().startSession(session.quiz);
            }
          }}
        />
      )}

      {/* Builder dialog (modal overlay, rendered on top of any view) */}
      {isBuilderOpen && <QuizBuilder workspaceId={workspaceId} />}
    </div>
  );
}
