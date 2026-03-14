'use client';

// =============================================================================
// features/quizzes/ui/QuizSkeleton.tsx
// Shimmer skeleton states for async content
// =============================================================================

import { Skeleton, RowSkeleton } from '@/shared/ui';

import styles from './QuizSkeleton.module.css';

/** Skeleton for a single quiz row */
export function QuizRowSkeleton() {
  return (
    <div className={styles.row}>
      <Skeleton variant="circle" width={36} height={36} />
      <div className={styles.rowContent}>
        <Skeleton variant="rect" width="55%" height={14} />
        <Skeleton variant="rect" width="30%" height={11} />
      </div>
      <Skeleton variant="rect" width={72} height={32} />
    </div>
  );
}

/** Skeleton for the full quiz list */
export function QuizListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <Skeleton variant="rect" width={120} height={20} />
        <Skeleton variant="rect" width={120} height={36} />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <QuizRowSkeleton key={i} />
      ))}
    </div>
  );
}
