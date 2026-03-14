// =============================================================================
// features/tutor/model/types.ts
// Layer: features → tutor → model
// Purpose: Tutor-local types. Consumes TutorPersonalityId from workspace
//          public API (FSD-compliant cross-feature import via index.ts).
// =============================================================================

import { TUTOR_PERSONALITIES, type TutorPersonalityId } from '@/features/workspace';

// Re-export so callers only need '@/features/tutor'
export { TUTOR_PERSONALITIES };
export type { TutorPersonalityId };

// ---------------------------------------------------------------------------
// Personality display config (visual theme per personality)
// ---------------------------------------------------------------------------

export interface PersonalityTheme {
  /** Gradient used on the selected avatar card */
  gradient: string;
  /** Accent CSS variable key (for ring / glow) */
  accentColor: string;
  /** Short tagline shown under the name */
  tagline: string;
}

/** Maps each personality id → its visual theme */
export const PERSONALITY_THEMES: Record<TutorPersonalityId, PersonalityTheme> = {
  mentor: {
    gradient: 'linear-gradient(135deg, #3D7BF5 0%, #6366F1 100%)',
    accentColor: 'var(--color-primary)',
    tagline: 'Warm & systematic',
  },
  drill: {
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #FB923C 100%)',
    accentColor: 'var(--color-accent-rose)',
    tagline: 'Intense & relentless',
  },
  peer: {
    gradient: 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',
    accentColor: 'var(--color-accent-emerald)',
    tagline: 'Casual & collaborative',
  },
  professor: {
    gradient: 'linear-gradient(135deg, #F5A623 0%, #EAB308 100%)',
    accentColor: 'var(--color-accent-amber)',
    tagline: 'Academic & thorough',
  },
  storyteller: {
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    accentColor: 'var(--color-accent-violet)',
    tagline: 'Vivid & memorable',
  },
  coach: {
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3D7BF5 100%)',
    accentColor: 'var(--color-primary)',
    tagline: 'Motivating & focused',
  },
};

// ---------------------------------------------------------------------------
// Chat message shape (mirrors API types for local state)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: CitationChip[];
  /** True while tokens are streaming in */
  isStreaming?: boolean;
}

export interface CitationChip {
  sourceId: string;
  label: string;
  filename: string;
  page?: number;
}
