'use client';

// =============================================================================
// features/quizzes/ui/QuizEmptyState.tsx
// Custom inline SVG empty state — no stock assets.
// =============================================================================

import { Button } from '@/shared/ui';

import styles from './QuizEmptyState.module.css';
import { useQuizzesStore } from '../model/quizzesStore';

export function QuizEmptyState() {
  const { openBuilder } = useQuizzesStore();

  return (
    <div className={styles.container}>
      {/* Custom SVG: floating quiz paper with sparkles */}
      <svg
        className={`${styles.illustration} animate-float`}
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        {/* Paper */}
        <rect
          x="22"
          y="18"
          width="68"
          height="84"
          rx="8"
          fill="var(--color-bg-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        {/* Lines */}
        <rect x="34" y="36" width="44" height="3" rx="1.5" fill="var(--color-border-accent)" />
        <rect x="34" y="46" width="36" height="3" rx="1.5" fill="var(--color-border)" />
        <rect x="34" y="56" width="40" height="3" rx="1.5" fill="var(--color-border)" />
        <rect x="34" y="66" width="28" height="3" rx="1.5" fill="var(--color-border)" />
        {/* Question mark */}
        <text x="54" y="32" fontSize="10" fill="var(--color-primary)" fontWeight="700">
          ?
        </text>
        {/* Checkboxes */}
        <rect x="34" y="78" width="8" height="8" rx="2" fill="var(--color-primary)" opacity="0.7" />
        <rect
          x="34"
          y="90"
          width="8"
          height="8"
          rx="2"
          stroke="var(--color-border)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Sparkles */}
        <circle cx="98" cy="26" r="3" fill="var(--color-accent-amber)" opacity="0.8" />
        <circle cx="14" cy="72" r="2" fill="var(--color-primary)" opacity="0.6" />
        <circle cx="105" cy="78" r="2" fill="var(--color-accent-emerald)" opacity="0.7" />
        <circle cx="22" cy="32" r="1.5" fill="var(--color-accent-violet, #8b5cf6)" opacity="0.5" />
        {/* Star lines */}
        <line
          x1="98"
          y1="20"
          x2="98"
          y2="17"
          stroke="var(--color-accent-amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="98"
          y1="32"
          x2="98"
          y2="35"
          stroke="var(--color-accent-amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="92"
          y1="26"
          x2="89"
          y2="26"
          stroke="var(--color-accent-amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="104"
          y1="26"
          x2="107"
          y2="26"
          stroke="var(--color-accent-amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={styles.text}>
        <h3 className={styles.heading}>No Quizzes Yet</h3>
        <p className={styles.description}>
          Generate an AI-powered quiz from your workspace sources to start testing your knowledge.
        </p>
      </div>

      <Button variant="primary" onClick={openBuilder}>
        Generate Your First Quiz
      </Button>
    </div>
  );
}
