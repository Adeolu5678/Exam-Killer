'use client';

// =============================================================================
// features/tutor/ui/PersonalitySelector.tsx
// Layer: features → tutor → ui
// Purpose: Horizontal row of clickable avatar cards, one per tutor personality.
//          Uses TUTOR_PERSONALITIES + PERSONALITY_THEMES from model/types.ts.
//          Imports shared/ui Avatar for the emoji avatar rendering.
// =============================================================================

import React, { useCallback } from 'react';

import { motion } from 'framer-motion';

import { Avatar } from '@/shared/ui';

import { useTutorStore } from '../model/tutorStore';
import { TUTOR_PERSONALITIES, PERSONALITY_THEMES } from '../model/types';
import type { TutorPersonalityId } from '../model/types';

interface PersonalitySelectorProps {
  className?: string;
}

export function PersonalitySelector({ className }: PersonalitySelectorProps) {
  const { selectedPersonality, setPersonality } = useTutorStore();

  const handleSelect = useCallback(
    (id: TutorPersonalityId) => {
      setPersonality(id);
    },
    [setPersonality],
  );

  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Select tutor personality"
      style={styles.wrapper}
    >
      {TUTOR_PERSONALITIES.map((p, i) => {
        const theme = PERSONALITY_THEMES[p.id];
        const isSelected = selectedPersonality === p.id;

        return (
          <motion.button
            key={p.id}
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(p.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.05,
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              ...styles.card,
              background: isSelected ? `${theme.gradient}` : 'var(--color-bg-elevated)',
              borderColor: isSelected ? theme.accentColor : 'var(--color-border)',
              boxShadow: isSelected
                ? `0 0 0 2px ${theme.accentColor}, 0 8px 24px rgba(0,0,0,0.3)`
                : 'none',
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                ...styles.avatarWrap,
                background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-surface)',
              }}
            >
              <span style={styles.emoji}>{p.emoji}</span>
            </div>

            {/* Labels */}
            <div style={styles.labels}>
              <span
                style={{
                  ...styles.name,
                  color: isSelected ? '#fff' : 'var(--color-text-primary)',
                }}
              >
                {p.label}
              </span>
              <span
                style={{
                  ...styles.tagline,
                  color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)',
                }}
              >
                {PERSONALITY_THEMES[p.id].tagline}
              </span>
            </div>

            {/* Selected indicator dot */}
            {isSelected && (
              <motion.div
                layoutId="personality-dot"
                style={styles.dot}
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (token-driven)
// ---------------------------------------------------------------------------

const styles = {
  wrapper: {
    display: 'flex',
    gap: 'var(--space-3)',
    overflowX: 'auto' as const,
    paddingBottom: 'var(--space-2)',
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  },
  card: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    minWidth: '100px',
    maxWidth: '120px',
    borderRadius: 'var(--radius-xl)',
    border: '1.5px solid transparent',
    cursor: 'pointer',
    transition:
      'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
    outline: 'none',
    flexShrink: 0,
  },
  avatarWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background var(--duration-base) var(--ease-standard)',
  },
  emoji: {
    fontSize: '22px',
    lineHeight: 1,
  },
  labels: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    textAlign: 'center' as const,
  },
  name: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.2,
    transition: 'color var(--duration-base) var(--ease-standard)',
  },
  tagline: {
    fontSize: '10px',
    fontWeight: 'var(--font-weight-normal)',
    lineHeight: 1.3,
    transition: 'color var(--duration-base) var(--ease-standard)',
  },
  dot: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.85)',
  },
} as const;
