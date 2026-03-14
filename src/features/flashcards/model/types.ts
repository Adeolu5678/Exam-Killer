// =============================================================================
// features/flashcards/model/types.ts
// Layer: features → flashcards → model
// =============================================================================

import { z } from 'zod';

// ── Canonical client-side flashcard shape ─────────────────────────────────────
// (normalised from the API response which may vary slightly from database.ts)
export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  tags: string[];
  /** SM-2 difficulty 0–5 */
  difficulty: number;
  next_review: string; // ISO 8601
  source_id?: string | null;
  review_count?: number;
  ease_factor?: number;
  interval?: number;
}

// ── Mastery tier derived from difficulty ──────────────────────────────────────
export type MasteryTier = 'new' | 'learning' | 'familiar' | 'mastered';

export function getMasteryTier(difficulty: number, reviewCount = 0): MasteryTier {
  if (reviewCount === 0) return 'new';
  if (difficulty <= 1) return 'learning';
  if (difficulty <= 3) return 'familiar';
  return 'mastered';
}

/** Returns a CSS color token name for the mastery tier */
export function getMasteryColor(tier: MasteryTier): string {
  switch (tier) {
    case 'new':
      return 'var(--color-text-muted)';
    case 'learning':
      return 'var(--color-accent-rose)';
    case 'familiar':
      return 'var(--color-accent-amber)';
    case 'mastered':
      return 'var(--color-accent-emerald)';
  }
}

// ── SM-2 difficulty rating labels (1/2/3 hotkeys) ────────────────────────────
export const DIFFICULTY_RATINGS = [
  { key: '1', label: 'Again', quality: 0, color: 'var(--color-accent-rose)' },
  { key: '2', label: 'Good', quality: 3, color: 'var(--color-accent-amber)' },
  { key: '3', label: 'Easy', quality: 5, color: 'var(--color-accent-emerald)' },
] as const;

export type DifficultyKey = '1' | '2' | '3';

// ── Deck statistics helper types ──────────────────────────────────────────────
export interface DeckStats {
  total: number;
  newCount: number;
  learningCount: number;
  familiarCount: number;
  masteredCount: number;
  /** Estimated minutes to master the deck (rough heuristic) */
  estimatedMinutes: number;
  /** Daily goal: how many cards to review to stay on track */
  dailyGoal: number;
  /** Number of cards due for review today */
  dueToday: number;
}

export function computeDeckStats(cards: FlashcardItem[]): DeckStats {
  const now = new Date();
  let newCount = 0,
    learningCount = 0,
    familiarCount = 0,
    masteredCount = 0,
    dueToday = 0;

  for (const card of cards) {
    const tier = getMasteryTier(card.difficulty, card.review_count ?? 0);
    if (tier === 'new') newCount++;
    if (tier === 'learning') learningCount++;
    if (tier === 'familiar') familiarCount++;
    if (tier === 'mastered') masteredCount++;

    const nextReview = new Date(card.next_review);
    if (nextReview <= now) dueToday++;
  }

  // Heuristic: ~5 reviews per card, ~2 min per review
  const estimatedMinutes = Math.round(
    newCount * 10 + learningCount * 6 + familiarCount * 3 + masteredCount * 1,
  );

  return {
    total: cards.length,
    newCount,
    learningCount,
    familiarCount,
    masteredCount,
    estimatedMinutes,
    dailyGoal: Math.max(10, Math.ceil(cards.length * 0.2)),
    dueToday,
  };
}

// ── Zod schemas for form validation ──────────────────────────────────────────
export const createFlashcardSchema = z.object({
  front: z.string().min(1, 'Front is required').max(2000),
  back: z.string().min(1, 'Back is required').max(2000),
  tags: z.array(z.string()).default([]),
});

export type CreateFlashcardValues = z.infer<typeof createFlashcardSchema>;

// ── Review session state type (used by flashcardsStore) ──────────────────────
export interface ReviewSessionState {
  cards: FlashcardItem[];
  currentIndex: number;
  isFlipped: boolean;
  ratings: number[]; // quality submitted for each card
  isSubmitting: boolean;
}
