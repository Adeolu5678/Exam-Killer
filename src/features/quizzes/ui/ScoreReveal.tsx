'use client';

// =============================================================================
// features/quizzes/ui/ScoreReveal.tsx
// Layer: features → quizzes → ui
// Key behaviour:
//   - Numerical count-up animation: 0% → final%
//   - Final score number turns --color-accent-amber (<70) or --color-accent-emerald (≥70)
//   - Spring scale-in entrance with popIn animation
// =============================================================================

import { useEffect, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import { Trophy, RotateCcw, List, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

import { Button, Badge } from '@/shared/ui';

import styles from './ScoreReveal.module.css';
import { useQuizzesStore } from '../model/quizzesStore';
import { getScoreColor } from '../model/types';
import type { QuizResultData, QuestionResult } from '../model/types';

// ---------------------------------------------------------------------------
// Count-up hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, durationMs: number = 1400): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return current;
}

// ---------------------------------------------------------------------------
// Score ring SVG
// ---------------------------------------------------------------------------
function ScoreRing({ score, colorToken }: { score: number; colorToken: string }) {
  const displayScore = useCountUp(score);
  const r = 72;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.ringWrap}>
      <svg className={styles.ringsvg} viewBox="0 0 180 180" aria-label={`Score: ${score}%`}>
        {/* Track */}
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--color-bg-surface)"
          strokeWidth="10"
        />
        {/* Fill */}
        <motion.circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={colorToken}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.4, ease: [0, 0, 0.2, 1] }}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.scoreNumber} style={{ color: colorToken }}>
          {displayScore}%
        </span>
        <span className={styles.scoreLabel}>Score</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Answer review row
// ---------------------------------------------------------------------------
function ReviewRow({ qr }: { qr: QuestionResult }) {
  return (
    <div
      className={`${styles.reviewRow} ${qr.is_correct ? styles.reviewCorrect : styles.reviewWrong}`}
    >
      <div className={styles.reviewIcon}>
        {qr.is_correct ? (
          <CheckCircle2 size={15} color="var(--color-accent-emerald)" />
        ) : (
          <XCircle size={15} color="var(--color-accent-rose)" />
        )}
      </div>
      <div className={styles.reviewContent}>
        <p className={styles.reviewQuestion}>{qr.question_text}</p>
        {!qr.is_correct && (
          <p className={styles.reviewCorrectAnswer}>
            Correct: <strong>{qr.correct_answer}</strong>
          </p>
        )}
        {qr.explanation && <p className={styles.reviewExplanation}>{qr.explanation}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ScoreReveal
// ---------------------------------------------------------------------------
interface ScoreRevealProps {
  result: QuizResultData;
  onRetry?: () => void;
}

export function ScoreReveal({ result, onRetry }: ScoreRevealProps) {
  const { exitSession } = useQuizzesStore();
  const colorClass = getScoreColor(result.score);
  const colorToken =
    colorClass === 'emerald' ? 'var(--color-accent-emerald)' : 'var(--color-accent-amber)';

  const isPassing = result.score >= 70;
  const minutes = Math.floor(result.time_spent_seconds / 60);
  const seconds = result.time_spent_seconds % 60;

  const [showReview, setShowReview] = useState(false);

  return (
    <div className={styles.reveal}>
      {/* Hero section */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
      >
        {/* Trophy icon */}
        <motion.div
          className={styles.trophyWrap}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ color: colorToken }}
        >
          <Trophy size={32} />
        </motion.div>

        {/* Score ring */}
        <ScoreRing score={result.score} colorToken={colorToken} />

        {/* Result headline */}
        <motion.div
          className={styles.headline}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h1 className={styles.resultTitle}>{isPassing ? '🎉 Great job!' : 'Keep Practicing!'}</h1>
          <p className={styles.resultSubtitle}>
            {result.correct_count} of {result.total_questions} questions correct
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className={styles.statItem}>
            <Clock size={14} />
            <span>
              {minutes}m {seconds}s
            </span>
            <span className={styles.statItemLabel}>Time taken</span>
          </div>
          <div className={styles.statItem}>
            <CheckCircle2 size={14} color="var(--color-accent-emerald)" />
            <span style={{ color: 'var(--color-accent-emerald)' }}>{result.correct_count}</span>
            <span className={styles.statItemLabel}>Correct</span>
          </div>
          <div className={styles.statItem}>
            <XCircle size={14} color="var(--color-accent-rose)" />
            <span style={{ color: 'var(--color-accent-rose)' }}>
              {result.total_questions - result.correct_count}
            </span>
            <span className={styles.statItemLabel}>Wrong</span>
          </div>
          <div className={styles.statItem}>
            <Zap size={14} color="var(--color-accent-amber)" />
            <span style={{ color: 'var(--color-accent-amber)' }}>+{result.xp_earned}</span>
            <span className={styles.statItemLabel}>XP earned</span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Button variant="ghost" onClick={() => exitSession()}>
            <List size={15} />
            Back to Quizzes
          </Button>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              <RotateCcw size={15} />
              Retry Quiz
            </Button>
          )}
        </motion.div>
      </motion.div>

      {/* Review toggle */}
      <motion.div
        className={styles.reviewSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <button
          className={styles.reviewToggle}
          onClick={() => setShowReview((v) => !v)}
          aria-expanded={showReview}
        >
          Review Answers
          <Badge variant={showReview ? 'primary' : 'default'}>
            {result.question_results.length}
          </Badge>
        </button>

        {showReview && (
          <motion.div
            className={styles.reviewList}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {result.question_results.map((qr) => (
              <ReviewRow key={qr.question_id} qr={qr} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
