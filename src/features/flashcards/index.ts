// =============================================================================
// features/flashcards/index.ts  —  PUBLIC API
// Layer: features → flashcards
// Rule: Consumers may ONLY import from this file.
//   ✅  import { FlashCardDeck, useFlashcards } from '@/features/flashcards'
//   ❌  import { FlashCard } from '@/features/flashcards/ui/FlashCard'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────────
export { FlashCard } from './ui/FlashCard';
export { FlashCardDeck } from './ui/FlashCardDeck';
export { ReviewQueue } from './ui/ReviewQueue';
export { FlashcardCreator } from './ui/FlashcardCreator';

// ── TanStack Query hooks ───────────────────────────────────────────────────────
export {
  useFlashcards,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
  useReviewFlashcard,
  flashcardKeys,
} from './model/useFlashcards';

// ── Zustand store (UI state only) ─────────────────────────────────────────────
export { useFlashcardsStore } from './model/flashcardsStore';

// ── Types ──────────────────────────────────────────────────────────────────────
export type {
  FlashcardItem,
  MasteryTier,
  DeckStats,
  ReviewSessionState,
  CreateFlashcardValues,
  DifficultyKey,
} from './model/types';

export {
  getMasteryTier,
  getMasteryColor,
  computeDeckStats,
  DIFFICULTY_RATINGS,
  createFlashcardSchema,
} from './model/types';

// ── API functions (for advanced consumers, e.g. server components) ─────────────
export {
  fetchFlashcards,
  fetchFlashcard,
  generateFlashcards,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  submitFlashcardReview,
} from './api/flashcardsApi';
