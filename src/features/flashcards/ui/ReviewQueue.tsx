'use client';

// =============================================================================
// features/flashcards/ui/ReviewQueue.tsx
// Layer: features → flashcards → ui
// Spec: Full-screen review mode. Space to flip, 1/2/3 for difficulty.
//       Progress bar + stats row (time-to-master, daily goal ring, streak).
//       Keyboard shortcuts handled inside FlashCard — ReviewQueue owns layout.
// =============================================================================

import { useMemo, useCallback } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Flame, Target, Clock } from 'lucide-react';

import { CardSkeleton } from '@/shared/ui';

import { FlashCard } from './FlashCard';
import styles from './ReviewQueue.module.css';
import { useFlashcardsStore } from '../model/flashcardsStore';
import { computeDeckStats } from '../model/types';
import type { FlashcardItem } from '../model/types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReviewQueueProps {
  workspaceId: string;
  cards: FlashcardItem[];
  /** Called when the session is submitted to the API */
  onRate?: (flashcardId: string, quality: number) => void;
  /** Streak count to display */
  streak?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ReviewQueue({ cards, onRate, streak = 0 }: ReviewQueueProps) {
  const { isReviewMode, session, flipCard, nextCard, prevCard, exitReview } = useFlashcardsStore();

  const currentCard = session.cards[session.currentIndex];
  const total = session.cards.length;
  const reviewed = session.ratings.length;
  const isComplete = reviewed >= total && total > 0;

  // progress 0→100
  const progressPct = total > 0 ? Math.round((session.currentIndex / total) * 100) : 0;

  // Deck stats for the stats row
  const stats = useMemo(() => computeDeckStats(cards), [cards]);

  const handleRate = useCallback(
    (quality: number) => {
      if (!currentCard || session.isSubmitting) return;
      const id = currentCard.id;
      onRate?.(id, quality);
      nextCard(quality);
    },
    [currentCard, session.isSubmitting, onRate, nextCard],
  );

  if (!isReviewMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ── Top bar ── */}
        <header className={styles.header}>
          {/* Progress bar */}
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>

          {/* Header row */}
          <div className={styles.headerRow}>
            {/* Card counter */}
            <span className={styles.counter}>
              <span className={styles.counterCurrent}>{session.currentIndex + 1}</span>
              <span className={styles.counterSep}>/</span>
              <span className={styles.counterTotal}>{total}</span>
            </span>

            {/* Stats chips */}
            <div className={styles.statsRow}>
              {/* Time to master */}
              <div className={styles.statChip}>
                <Clock size={12} />
                <span>{stats.estimatedMinutes}m to master</span>
              </div>

              {/* Daily goal ring */}
              <DailyGoalRing completed={reviewed} goal={stats.dailyGoal} />

              {/* Streak */}
              {streak > 0 && (
                <div className={styles.statChip} data-type="streak">
                  <Flame size={12} />
                  <span>{streak} day streak</span>
                </div>
              )}
            </div>

            {/* Close */}
            <button
              className={styles.closeBtn}
              onClick={exitReview}
              aria-label="Exit review session"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ── Main card area ── */}
        <main className={styles.main}>
          {isComplete ? (
            <ReviewComplete stats={stats} reviewed={reviewed} onExit={exitReview} />
          ) : currentCard ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                className={styles.cardWrapper}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                <FlashCard
                  card={currentCard}
                  isFlipped={session.isFlipped}
                  isSubmitting={session.isSubmitting}
                  onFlip={flipCard}
                  onRate={handleRate}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <CardSkeleton />
          )}

          {/* ── Navigation arrows ── */}
          {!isComplete && (
            <div className={styles.navRow}>
              <button
                className={styles.navBtn}
                onClick={prevCard}
                disabled={session.currentIndex === 0}
                aria-label="Previous card"
              >
                <ChevronLeft size={18} />
              </button>

              <div className={styles.keyHints}>
                <span>
                  <kbd>Space</kbd> flip
                </span>
                <span>
                  <kbd>1</kbd> Again · <kbd>2</kbd> Good · <kbd>3</kbd> Easy
                </span>
              </div>

              <button
                className={styles.navBtn}
                onClick={() => nextCard()}
                disabled={session.currentIndex >= total - 1}
                aria-label="Next card"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </main>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Daily goal ring ───────────────────────────────────────────────────────────
function DailyGoalRing({ completed, goal }: { completed: number; goal: number }) {
  const pct = Math.min(100, Math.round((completed / Math.max(goal, 1)) * 100));
  const r = 10;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className={styles.statChip} data-type="goal">
      <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden>
        <circle cx={14} cy={14} r={r} fill="none" stroke="var(--color-border)" strokeWidth={3} />
        <circle
          cx={14}
          cy={14}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={3}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <Target size={12} />
      <span>
        {completed}/{goal} daily
      </span>
    </div>
  );
}

// ── Review complete screen ──────────────────────────────────────────────────
interface ReviewCompleteProps {
  stats: ReturnType<typeof computeDeckStats>;
  reviewed: number;
  onExit: () => void;
}

function ReviewComplete({ reviewed, onExit }: ReviewCompleteProps) {
  return (
    <motion.div
      className={styles.completeScreen}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className={styles.completeEmoji} aria-hidden>
        🎉
      </div>
      <h2 className={styles.completeTitle}>Session complete!</h2>
      <p className={styles.completeSub}>
        You reviewed <strong>{reviewed}</strong> {reviewed === 1 ? 'card' : 'cards'} — great work.
      </p>
      <button className={styles.exitBtn} onClick={onExit}>
        Back to deck
      </button>
    </motion.div>
  );
}
