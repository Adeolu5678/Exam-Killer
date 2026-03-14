'use client';

// =============================================================================
// widgets/DashboardWidget/HeroSection.tsx
// Layer: widgets → DashboardWidget
// Time-sensitive greeting + today's review queue urgency card.
// Blueprint §2.6: "Hero section: Time-sensitive greeting + today's review queue"
// =============================================================================

import React, { useMemo, useState, useEffect } from 'react';

import type { User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Flame, BookOpen, Clock, ArrowRight } from 'lucide-react';

import { Button } from '@/shared/ui';

// ---------------------------------------------------------------------------
// Derive greeting from current hour
// ---------------------------------------------------------------------------

function getTimeGreeting(): { salutation: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { salutation: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { salutation: 'Good afternoon', emoji: '🌤️' };
  return { salutation: 'Good evening', emoji: '🌙' };
}

// ---------------------------------------------------------------------------
// Quick-stat chip (streak / due cards count)
// ---------------------------------------------------------------------------

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'amber' | 'primary' | 'emerald';
}

const COLOR_MAP = {
  amber: {
    bg: 'bg-[var(--color-accent-amber-muted)]',
    text: 'text-[var(--color-accent-amber)]',
  },
  primary: {
    bg: 'bg-[var(--color-primary-muted)]',
    text: 'text-[var(--color-primary)]',
  },
  emerald: {
    bg: 'bg-[var(--color-accent-emerald-muted)]',
    text: 'text-[var(--color-accent-emerald)]',
  },
};

function StatChip({ icon, label, value, color }: StatChipProps) {
  const { bg, text } = COLOR_MAP[color];
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${bg}`}>
      <span className={`${text} flex-shrink-0`}>{icon}</span>
      <span className={`text-xs font-semibold ${text}`}>{value}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review-queue urgency card
// ---------------------------------------------------------------------------

interface ReviewActionCardProps {
  dueCount: number;
  onStart: () => void;
}

function ReviewActionCard({ dueCount, onStart }: ReviewActionCardProps) {
  if (dueCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.25 }}
      className="border-[var(--color-primary)]/20 flex flex-col items-start justify-between gap-4 rounded-xl border bg-[var(--color-primary-muted)] p-4 sm:flex-row sm:items-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white"
          aria-hidden="true"
        >
          <Clock size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
            {dueCount} card{dueCount !== 1 ? 's' : ''} due for review
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Keep your streak alive — review now
          </p>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        rightIcon={<ArrowRight size={13} />}
        onClick={onStart}
        className="w-full sm:w-auto"
      >
        Start Review
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// HeroSection — public component
// ---------------------------------------------------------------------------

interface HeroSectionProps {
  user: User | null;
  streak?: number;
  dueCards?: number;
  onStartReview?: () => void;
}

export function HeroSection({ user, streak = 0, dueCards = 0, onStartReview }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const { salutation, emoji } = useMemo(() => getTimeGreeting(), []);

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

  // First name only, capitalised
  const firstName = displayName.split(' ')[0] ?? displayName;
  const firstName_ = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <section className="space-y-4" aria-labelledby="hero-greeting">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <h1
            id="hero-greeting"
            className="text-2xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-3xl"
          >
            <span aria-hidden="true" className="mr-2">
              {mounted ? emoji : '✨'}
            </span>
            {mounted ? salutation : 'Welcome back'}, {firstName_}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {mounted
              ? new Date().toLocaleDateString('en-NG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : 'Loading your dashboard...'}
          </p>
        </div>

        {/* Quick stat chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="flex flex-wrap gap-2"
          aria-label="Today's stats"
        >
          {streak > 0 && (
            <StatChip icon={<Flame size={12} />} label="day streak" value={streak} color="amber" />
          )}
          <StatChip
            icon={<BookOpen size={12} />}
            label="due today"
            value={dueCards}
            color={dueCards > 0 ? 'primary' : 'emerald'}
          />
        </motion.div>
      </motion.div>

      {/* Review action card */}
      <ReviewActionCard dueCount={dueCards} onStart={onStartReview ?? (() => {})} />
    </section>
  );
}
