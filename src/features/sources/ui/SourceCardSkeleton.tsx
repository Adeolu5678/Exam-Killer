'use client';
// =============================================================================
// features/sources/ui/SourceCardSkeleton.tsx
// Layer: features → sources → ui
// Purpose: Shimmer skeleton that mirrors SourceCard layout for async loading.
// Imports: @/shared/ui/index.ts ONLY.
// =============================================================================

import { Skeleton } from '@/shared/ui';

// ---------------------------------------------------------------------------
// Single card skeleton
// ---------------------------------------------------------------------------

export function SourceCardSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
      aria-hidden="true"
    >
      {/* Icon placeholder */}
      <Skeleton
        variant="circle"
        width={40}
        height={40}
        style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }}
      />

      {/* Content placeholder */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {/* File name */}
        <Skeleton variant="text" width="60%" height={14} />
        {/* Meta row */}
        <Skeleton variant="text" width="40%" height={12} />
        {/* Badge */}
        <Skeleton
          variant="text"
          width={80}
          height={18}
          style={{ borderRadius: 'var(--radius-sm)' }}
        />
      </div>

      {/* Action placeholder */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <Skeleton
          variant="circle"
          width={32}
          height={32}
          style={{ borderRadius: 'var(--radius-md)' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-card skeleton list
// ---------------------------------------------------------------------------

interface SourceListSkeletonProps {
  count?: number;
}

export function SourceListSkeleton({ count = 5 }: SourceListSkeletonProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      aria-label="Loading sources…"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SourceCardSkeleton key={i} />
      ))}
    </div>
  );
}
