'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/quiz/QuizPageShell.tsx
// Thin composition shell — connects URL params to the quizzes feature state.
// Layer: app (routing only)
// =============================================================================

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { QuizListSkeleton, useQuizAttemptHistory, useQuizzesStore } from '@/features/quizzes';

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
  const { data: attemptHistory = [] } = useQuizAttemptHistory(workspaceId, 12);

  const { view, isBuilderOpen, session } = useQuizzesStore();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Quiz list (default view) */}
      {view === 'list' && (
        <div style={{ padding: 'var(--space-6)' }}>
          <QuizList workspaceId={workspaceId} />

          {attemptHistory.length > 0 && (
            <section
              style={{
                marginTop: 'var(--space-5)',
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
                Recent quiz attempts
              </h2>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {attemptHistory.map((attempt) => (
                  <div
                    key={attempt.attempt_id}
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
                      title={attempt.quiz_title}
                    >
                      {attempt.quiz_title}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {attempt.score}% · {new Date(attempt.submitted_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
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
