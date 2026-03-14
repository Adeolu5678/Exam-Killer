'use client';

// =============================================================================
// features/workspace/ui/WorkspaceCard.tsx
// Hover: translateY(-2px) + --color-border-accent glow (matches Blueprint §1.4)
// =============================================================================

import React from 'react';

import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, BarChart2 } from 'lucide-react';

import { Badge } from '@/shared/ui';

// @eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { WorkspaceListItem } from '../model/types';

// ---------------------------------------------------------------------------
// Progress Ring — SVG-based circular indicator
// ---------------------------------------------------------------------------

function ProgressRing({
  value,
  size = 40,
  strokeWidth = 3,
}: {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s var(--ease-standard)' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Derive a simple progress value from workspace stats
// ---------------------------------------------------------------------------

function deriveProgress(workspace: WorkspaceListItem): number {
  // Heuristic: ratio of flashcards created to a "target" of 50 per source
  const target = (workspace.source_count || 1) * 50;
  return Math.min(100, Math.round((workspace.flashcard_count / target) * 100));
}

// ---------------------------------------------------------------------------
// WorkspaceCard
// ---------------------------------------------------------------------------

export interface WorkspaceCardProps {
  workspace: WorkspaceListItem;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Index used for entrance stagger animation */
  index?: number;
}

export function WorkspaceCard({ workspace, onOpen, onDelete, index = 0 }: WorkspaceCardProps) {
  const progress = deriveProgress(workspace);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.06,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -2 }}
      role="button"
      tabIndex={0}
      aria-label={`Open workspace: ${workspace.name}`}
      onClick={() => onOpen?.(workspace.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(workspace.id);
        }
      }}
      className="group relative flex cursor-pointer select-none flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:border-[var(--color-border-accent)] hover:shadow-[0_0_0_1px_var(--color-border-accent),0_4px_24px_var(--color-primary-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-glow)] text-[var(--color-primary)]"
          aria-hidden="true"
        >
          <BookOpen size={18} />
        </div>

        {/* Title + badges */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]">
            {workspace.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {workspace.course_code && (
              <Badge variant="outline" className="text-xs">
                {workspace.course_code}
              </Badge>
            )}
            {workspace.is_public && (
              <Badge variant="primary" className="text-xs">
                Public
              </Badge>
            )}
          </div>
        </div>

        {/* Progress ring */}
        <div aria-label={`Progress: ${progress}%`} title={`${progress}% complete`}>
          <ProgressRing value={progress} />
        </div>
      </div>

      {/* ── Description ────────────────────────────────────────────── */}
      {workspace.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {workspace.description}
        </p>
      )}

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <BarChart2 size={12} aria-hidden="true" />
          {workspace.source_count} {workspace.source_count === 1 ? 'source' : 'sources'}
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <BookOpen size={12} aria-hidden="true" />
          {workspace.flashcard_count} cards
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Users size={12} aria-hidden="true" />
            {workspace.member_count}
          </span>
          <span className="ml-auto flex items-center gap-1 whitespace-nowrap">
            <Clock size={12} aria-hidden="true" />
            {formatRelativeTime(workspace.last_accessed)}
          </span>
        </div>
      </div>

      {/* ── Delete button ──────────────────── */}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete workspace: ${workspace.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(workspace.id);
          }}
          className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--color-text-muted)] opacity-0 transition-opacity duration-[var(--duration-base)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--color-accent-rose)] group-hover:opacity-100 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      )}
    </motion.article>
  );
}
