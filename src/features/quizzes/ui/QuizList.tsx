'use client';

// =============================================================================
// features/quizzes/ui/QuizList.tsx
// Layer: features → quizzes → ui
// A list overview of all saved quizzes for a workspace with load + delete.
// =============================================================================

import { motion } from 'framer-motion';
import { BookOpen, Trash2, ChevronRight, Trophy, Plus } from 'lucide-react';

import { Badge, Button, Spinner } from '@/shared/ui';

import { QuizEmptyState } from './QuizEmptyState';
import styles from './QuizList.module.css';
import { QuizListSkeleton } from './QuizSkeleton';
import { fetchQuiz } from '../api/quizzesApi';
import { useQuizzesStore } from '../model/quizzesStore';
import type { QuizListItem } from '../model/types';
import { useQuizzes, useDeleteQuiz } from '../model/useQuizzes';

interface QuizListProps {
  workspaceId: string;
}

function ScoreBadge({ score }: { score: number }) {
  const isGood = score >= 70;
  return (
    <Badge variant={isGood ? 'success' : 'warning'}>
      <Trophy size={11} />
      {score}%
    </Badge>
  );
}

function QuizRow({ item, workspaceId }: { item: QuizListItem; workspaceId: string }) {
  const { startSession, openBuilder } = useQuizzesStore();
  const { mutate: deleteQuiz, isPending: isDeleting } = useDeleteQuiz(workspaceId);

  const handlePlay = async () => {
    try {
      const detail = await fetchQuiz(item.quiz_id);
      startSession(detail);
    } catch {
      // swallow — UI will show nothing
    }
  };

  return (
    <motion.div
      className={styles.quizRow}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className={styles.quizIcon}>
        <BookOpen size={16} />
      </div>

      <div className={styles.quizInfo}>
        <span className={styles.quizTitle}>{item.title}</span>
        {item.topic && <span className={styles.quizTopic}>{item.topic}</span>}
        <span className={styles.quizMeta}>
          {item.question_count} questions
          {item.best_score !== undefined && (
            <>
              {' '}
              · Best: <ScoreBadge score={item.best_score} />
            </>
          )}
        </span>
      </div>

      <div className={styles.quizActions}>
        <button
          className={styles.deleteBtn}
          onClick={() => deleteQuiz(item.quiz_id)}
          disabled={isDeleting}
          aria-label={`Delete ${item.title}`}
        >
          {isDeleting ? <Spinner size="xs" /> : <Trash2 size={14} />}
        </button>
        <Button variant="secondary" onClick={handlePlay}>
          Start <ChevronRight size={14} />
        </Button>
      </div>
    </motion.div>
  );
}

export function QuizList({ workspaceId }: QuizListProps) {
  const { data: quizzes, isLoading, isError, refetch } = useQuizzes(workspaceId);
  const { openBuilder } = useQuizzesStore();

  if (isLoading) return <QuizListSkeleton />;
  if (isError) {
    return (
      <div className={styles.errorState}>
        <p>Failed to load quizzes.</p>
        <Button variant="ghost" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (!quizzes?.length) return <QuizEmptyState />;

  return (
    <div className={styles.container}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>
          Quizzes <span className={styles.count}>{quizzes.length}</span>
        </h2>
        <Button variant="primary" onClick={openBuilder}>
          <Plus size={15} /> Generate New
        </Button>
      </div>
      <div className={styles.list} role="list">
        {quizzes.map((q, i) => (
          <motion.div key={q.quiz_id} transition={{ delay: i * 0.05 }}>
            <QuizRow item={q} workspaceId={workspaceId} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
