'use client';

// =============================================================================
// features/workspace/ui/WorkspaceEmptyState.tsx
// Custom illustrated empty state for when the user has no workspaces.
// Blueprint §1.5: empty states are unique SVG illustrations per context.
// =============================================================================

import React from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/shared/ui';

// Inline SVG illustration — floating card with sparkles
function FloatingCardIllustration() {
  return (
    <svg
      width="160"
      height="140"
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Card shadow */}
      <ellipse cx="80" cy="128" rx="48" ry="8" fill="var(--color-border)" opacity="0.5" />

      {/* Main card */}
      <g style={{ animation: 'var(--anim-float, none)' }}>
        <rect
          x="24"
          y="32"
          width="112"
          height="80"
          rx="12"
          fill="var(--color-bg-elevated)"
          stroke="var(--color-border-accent)"
          strokeWidth="1.5"
        />

        {/* Card inner content - lines */}
        <rect
          x="40"
          y="52"
          width="30"
          height="30"
          rx="8"
          fill="var(--color-primary-glow)"
          stroke="var(--color-primary)"
          strokeWidth="1"
        />
        {/* Book icon inside */}
        <path
          d="M49 64 L49 75 M51 61 C51 61 52 60 55 60 C58 60 59 61 59 61 L59 75 C59 75 58 74 55 74 C52 74 51 75 51 75 L51 61 Z"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Text placeholder lines */}
        <rect x="80" y="52" width="44" height="5" rx="2.5" fill="var(--color-border-accent)" />
        <rect x="80" y="62" width="32" height="4" rx="2" fill="var(--color-border)" />
        <rect x="80" y="72" width="38" height="4" rx="2" fill="var(--color-border)" />

        {/* Bottom chip row */}
        <rect
          x="40"
          y="94"
          width="28"
          height="10"
          rx="5"
          fill="var(--color-border-accent)"
          opacity="0.6"
        />
        <rect
          x="73"
          y="94"
          width="20"
          height="10"
          rx="5"
          fill="var(--color-border)"
          opacity="0.6"
        />
      </g>

      {/* Sparkle top-left */}
      <g transform="translate(14, 12)">
        <path
          d="M4 0 L4.7 3.3 L8 4 L4.7 4.7 L4 8 L3.3 4.7 L0 4 L3.3 3.3 Z"
          fill="var(--color-accent-amber)"
          opacity="0.8"
        />
      </g>

      {/* Sparkle top-right (smaller) */}
      <g transform="translate(138, 20)">
        <path
          d="M3 0 L3.5 2.5 L6 3 L3.5 3.5 L3 6 L2.5 3.5 L0 3 L2.5 2.5 Z"
          fill="var(--color-primary)"
          opacity="0.7"
        />
      </g>

      {/* Dot cluster */}
      <circle cx="18" cy="88" r="3" fill="var(--color-primary)" opacity="0.4" />
      <circle cx="143" cy="76" r="2" fill="var(--color-accent-emerald)" opacity="0.5" />
      <circle cx="136" cy="110" r="2.5" fill="var(--color-accent-amber)" opacity="0.4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------

interface WorkspaceEmptyStateProps {
  onCreateClick?: () => void;
}

export function WorkspaceEmptyState({ onCreateClick }: WorkspaceEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-8 py-20 text-center"
      role="status"
      aria-label="No workspaces found"
    >
      <FloatingCardIllustration />

      <div className="max-w-[280px] space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
          Your first workspace awaits
        </h3>
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Create a workspace for each course or subject. Upload sources, generate flashcards, and
          let the AI tutor guide you.
        </p>
      </div>

      <Button variant="primary" leftIcon={<Plus size={16} />} onClick={onCreateClick}>
        Create Workspace
      </Button>
    </div>
  );
}
