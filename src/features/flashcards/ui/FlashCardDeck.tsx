'use client';
/* eslint-disable react-hooks/incompatible-library */

// =============================================================================
// features/flashcards/ui/FlashCardDeck.tsx
// Layer: features → flashcards → ui
// Spec:
//   - Mastery color coding (red → amber → green gradient in deck overview)
//   - Stats row: estimated time to master, daily goal ring, streak indicator
//   - Virtualized list with @tanstack/virtual when > 50 cards
//   - Start review session button → opens ReviewQueue
// =============================================================================

import { useRef, useMemo } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Play, Plus, Clock, Flame, BookOpen, CheckCircle2, Layers } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '@/shared/ui';

import styles from './FlashCardDeck.module.css';
import { useFlashcardsStore } from '../model/flashcardsStore';
import { getMasteryTier, getMasteryColor, computeDeckStats } from '../model/types';
import type { FlashcardItem, MasteryTier } from '../model/types';

// ── Constants ─────────────────────────────────────────────────────────────────
const VIRTUALIZE_THRESHOLD = 50;

// ── Props ─────────────────────────────────────────────────────────────────────
interface FlashCardDeckProps {
  cards: FlashcardItem[];
  isLoading?: boolean;
  error?: string | null;
  streak?: number;
  onAddCard?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FlashCardDeck({
  cards,
  isLoading = false,
  error = null,
  streak = 0,
  onAddCard,
}: FlashCardDeckProps) {
  const { openReview, openCreator } = useFlashcardsStore();
  const stats = useMemo(() => computeDeckStats(cards), [cards]);

  // Determine cards for review (due today + new)
  const dueCards = useMemo(
    () =>
      cards.filter((c) => {
        const due = new Date(c.next_review);
        const now = new Date();
        const tier = getMasteryTier(c.difficulty, c.review_count ?? 0);
        return due <= now || tier === 'new';
      }),
    [cards],
  );

  const handleStartReview = () => {
    const queue = dueCards.length > 0 ? dueCards : cards;
    openReview(queue);
  };

  const handleAddCard = () => {
    onAddCard?.();
    openCreator();
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (isLoading) return <DeckSkeleton />;

  if (error)
    return (
      <div className={styles.errorState}>
        <p className={styles.errorText}>Failed to load flashcards: {error}</p>
      </div>
    );

  if (cards.length === 0) return <EmptyDeck onAddCard={handleAddCard} />;

  return (
    <div className={styles.root}>
      {/* ── Stats bar ── */}
      <motion.div
        className={styles.statsBar}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StatChip
          icon={<Clock size={14} />}
          label={`~${stats.estimatedMinutes}m to master`}
          color="primary"
        />
        <DailyGoalChip completed={stats.dueToday} goal={stats.dailyGoal} />
        {streak > 0 && (
          <StatChip icon={<Flame size={14} />} label={`${streak} day streak`} color="amber" />
        )}

        {/* Mastery breakdown */}
        <div className={styles.masteryBreakdown}>
          <MasteryDot tier="learning" label={String(stats.learningCount)} />
          <MasteryDot tier="familiar" label={String(stats.familiarCount)} />
          <MasteryDot tier="mastered" label={String(stats.masteredCount)} />
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={handleAddCard} aria-label="Add flashcard">
            <Plus size={16} />
          </button>
          <button
            className={styles.reviewBtn}
            onClick={handleStartReview}
            disabled={dueCards.length === 0 && cards.length === 0}
          >
            <Play size={15} />
            {dueCards.length > 0 ? `Review ${dueCards.length} due` : 'Review all'}
          </button>
        </div>
      </motion.div>

      {/* ── Mastery gradient bar ── */}
      <MasteryGradientBar stats={stats} />

      {/* ── Card list ── */}
      {cards.length > VIRTUALIZE_THRESHOLD ? (
        <VirtualCardList cards={cards} />
      ) : (
        <StaticCardList cards={cards} />
      )}
    </div>
  );
}

// ── Mastery gradient bar ───────────────────────────────────────────────────────
function MasteryGradientBar({ stats }: { stats: ReturnType<typeof computeDeckStats> }) {
  const total = stats.total || 1;
  const newPct = Math.round((stats.newCount / total) * 100);
  const lrnPct = Math.round((stats.learningCount / total) * 100);
  const famPct = Math.round((stats.familiarCount / total) * 100);
  const masPct = Math.round((stats.masteredCount / total) * 100);

  return (
    <div className={styles.masteryBar} role="img" aria-label="Deck mastery overview">
      {newPct > 0 && (
        <div
          className={styles.masterySegment}
          data-tier="new"
          style={{ width: `${newPct}%` }}
          title={`New: ${stats.newCount}`}
        />
      )}
      {lrnPct > 0 && (
        <div
          className={styles.masterySegment}
          data-tier="learning"
          style={{ width: `${lrnPct}%` }}
          title={`Learning: ${stats.learningCount}`}
        />
      )}
      {famPct > 0 && (
        <div
          className={styles.masterySegment}
          data-tier="familiar"
          style={{ width: `${famPct}%` }}
          title={`Familiar: ${stats.familiarCount}`}
        />
      )}
      {masPct > 0 && (
        <div
          className={styles.masterySegment}
          data-tier="mastered"
          style={{ width: `${masPct}%` }}
          title={`Mastered: ${stats.masteredCount}`}
        />
      )}
    </div>
  );
}

// ── Static card list (< 50 items) ─────────────────────────────────────────────
function StaticCardList({ cards }: { cards: FlashcardItem[] }) {
  return (
    <ul className={styles.cardList} role="list">
      {cards.map((card, i) => (
        <motion.li
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
        >
          <DeckCardRow card={card} />
        </motion.li>
      ))}
    </ul>
  );
}

// ── Virtualized card list (≥ 50 items) ────────────────────────────────────────
function VirtualCardList({ cards }: { cards: FlashcardItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className={styles.virtualContainer}>
      <ul
        role="list"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const card = cards[vRow.index];
          if (!card) return null;
          return (
            <li
              key={card.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <DeckCardRow card={card} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Individual deck row card ───────────────────────────────────────────────────
function DeckCardRow({ card }: { card: FlashcardItem }) {
  const tier = getMasteryTier(card.difficulty, card.review_count ?? 0);
  const color = getMasteryColor(tier);
  const isDue = new Date(card.next_review) <= new Date();

  return (
    <Card interactive padding="sm" className={styles.deckRow}>
      {/* Mastery dot */}
      <div
        className={styles.masteryDot}
        style={{ background: color }}
        aria-label={`Mastery: ${tier}`}
      />

      {/* Front text */}
      <p className={styles.rowFront}>{card.front}</p>

      {/* Right side */}
      <div className={styles.rowMeta}>
        {card.tags.slice(0, 2).map((t) => (
          <Badge key={t} variant="default">
            {t}
          </Badge>
        ))}
        {isDue && <Badge variant="warning">Due</Badge>}
        {tier === 'mastered' && (
          <CheckCircle2 size={14} style={{ color: 'var(--color-accent-emerald)', flexShrink: 0 }} />
        )}
      </div>
    </Card>
  );
}

// ── Stat chips ─────────────────────────────────────────────────────────────────
function StatChip({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'primary' | 'amber' | 'secondary';
}) {
  return (
    <div className={styles.statChip} data-color={color}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DailyGoalChip({ completed, goal }: { completed: number; goal: number }) {
  const pct = Math.min(100, Math.round((completed / Math.max(goal, 1)) * 100));
  const r = 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className={styles.statChip} data-color="primary">
      <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden>
        <circle cx={11} cy={11} r={r} fill="none" stroke="var(--color-border)" strokeWidth={2.5} />
        <circle
          cx={11}
          cy={11}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 11 11)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <span>
        {completed}/{goal} today
      </span>
    </div>
  );
}

function MasteryDot({ tier, label }: { tier: MasteryTier; label: string }) {
  const color = getMasteryColor(tier);
  return (
    <div className={styles.masteryLegendItem}>
      <div className={styles.masteryLegendDot} style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyDeck({ onAddCard }: { onAddCard: () => void }) {
  return (
    <motion.div
      className={styles.emptyState}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Illustration */}
      <div className={styles.emptyIllustration} aria-hidden>
        <EmptyDeckSvg />
      </div>
      <h3 className={styles.emptyTitle}>No flashcards yet</h3>
      <p className={styles.emptySub}>
        Generate cards from your study materials or create them manually.
      </p>
      <button className={styles.reviewBtn} onClick={onAddCard}>
        <Plus size={15} />
        Create first card
      </button>
    </motion.div>
  );
}

function EmptyDeckSvg() {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={160}
      height={106}
    >
      {/* Back card */}
      <rect
        x="20"
        y="14"
        width="72"
        height="48"
        rx="8"
        fill="var(--color-bg-surface)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />
      {/* Lines on back card */}
      <rect x="32" y="28" width="40" height="3" rx="1.5" fill="var(--color-border)" />
      <rect x="32" y="36" width="28" height="3" rx="1.5" fill="var(--color-border)" />
      {/* Front card (floating slightly) */}
      <rect
        x="28"
        y="6"
        width="72"
        height="48"
        rx="8"
        fill="var(--color-bg-elevated)"
        stroke="var(--color-border-accent)"
        strokeWidth="1.5"
        transform="rotate(-3 28 6)"
      />
      {/* Sparkle */}
      <circle cx="95" cy="12" r="2" fill="var(--color-primary)" opacity="0.6" />
      <circle cx="16" cy="58" r="1.5" fill="var(--color-accent-amber)" opacity="0.6" />
      <circle cx="102" cy="56" r="1" fill="var(--color-accent-violet)" opacity="0.6" />
      {/* Layers icon */}
      <g transform="translate(52, 22)">
        <Layers size={16} color="var(--color-text-muted)" />
      </g>
    </svg>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function DeckSkeleton() {
  return (
    <div className={styles.root}>
      <div className={styles.statsBar}>
        {[80, 120, 90].map((w, i) => (
          <Skeleton key={i} width={w} height={28} style={{ borderRadius: 'var(--radius-full)' }} />
        ))}
      </div>
      <Skeleton height={6} style={{ marginBottom: 'var(--space-4)' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          height={56}
          style={{ marginBottom: 'var(--space-2)', borderRadius: 'var(--radius-lg)' }}
        />
      ))}
    </div>
  );
}
