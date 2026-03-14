'use client';

// =============================================================================
// features/flashcards/ui/FlashCard.tsx
// Layer: features → flashcards → ui
// Constraint: imports ONLY from @/shared/ui
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';

import { Badge } from '@/shared/ui';

import styles from './FlashCard.module.css';
import { getMasteryColor, getMasteryTier, DIFFICULTY_RATINGS } from '../model/types';
import type { FlashcardItem } from '../model/types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface FlashCardProps {
  card: FlashcardItem;
  isFlipped: boolean;
  isSubmitting?: boolean;
  onFlip: () => void;
  onRate: (quality: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FlashCard({
  card,
  isFlipped,
  isSubmitting = false,
  onFlip,
  onRate,
}: FlashCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = getMasteryTier(card.difficulty, card.review_count ?? 0);
  const color = getMasteryColor(tier);

  // ── Keyboard shortcuts: Space to flip, 1/2/3 to rate ─────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
        return;
      }

      if (isFlipped && !isSubmitting) {
        const rating = DIFFICULTY_RATINGS.find((r) => r.key === e.key);
        if (rating) {
          e.preventDefault();
          onRate(rating.quality);
        }
      }
    },
    [isFlipped, isSubmitting, onFlip, onRate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={styles.scene} ref={containerRef}>
      {/* ── 3D flip container ── */}
      <div
        className={`${styles.card} ${isFlipped ? styles.cardFlipped : ''}`}
        onClick={onFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFlip()}
        aria-pressed={isFlipped}
        aria-label={
          isFlipped
            ? 'Card showing answer. Press Space to flip.'
            : 'Card showing question. Press Space to flip.'
        }
      >
        {/* ── FRONT face ── */}
        <div className={styles.face} data-side="front">
          {/* Mastery indicator strip */}
          <div className={styles.masteryStrip} style={{ background: color }} />

          <div className={styles.faceContent}>
            <span className={styles.sideLabel}>QUESTION</span>
            <p className={styles.cardText}>{card.front}</p>

            <div className={styles.flipHint}>
              <kbd className={styles.kbd}>Space</kbd>
              <span>to reveal answer</span>
            </div>
          </div>
        </div>

        {/* ── BACK face ── */}
        <div className={styles.face} data-side="back">
          <div className={styles.masteryStrip} style={{ background: color }} />

          <div className={styles.faceContent}>
            <span className={styles.sideLabel}>ANSWER</span>
            <p className={styles.cardText}>{card.back}</p>

            {/* Tags */}
            {card.tags.length > 0 && (
              <div className={styles.tagRow}>
                {card.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Rating buttons */}
            <div className={styles.ratingRow} onClick={(e) => e.stopPropagation()}>
              {DIFFICULTY_RATINGS.map(({ key, label, quality, color: btnColor }) => (
                <button
                  key={key}
                  className={styles.ratingBtn}
                  style={{ '--btn-color': btnColor } as React.CSSProperties}
                  onClick={() => onRate(quality)}
                  disabled={isSubmitting}
                  aria-label={`Rate as ${label} (key ${key})`}
                >
                  <span className={styles.ratingKey}>{key}</span>
                  <span className={styles.ratingLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
