'use client';

// =============================================================================
// features/workspace/ui/WorkspaceCardSkeleton.tsx
// Shimmer placeholder shown while the workspace list is loading.
// =============================================================================

import React from 'react';

import { Skeleton, CardSkeleton } from '@/shared/ui';

export function WorkspaceCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Skeleton variant="rect" className="h-10 w-10 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="33%" height={12} />
        </div>
        <Skeleton variant="circle" width={40} height={40} className="flex-shrink-0" />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="83%" />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Skeleton variant="text" width={64} height={12} />
        <Skeleton variant="text" width={56} height={12} />
        <Skeleton variant="text" width={32} height={12} />
        <Skeleton variant="text" width={48} height={12} className="ml-auto" />
      </div>
    </div>
  );
}

/**
 * Renders `count` skeletons in a grid layout matching WorkspaceGrid.
 */
export function WorkspaceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading workspaces…"
    >
      {Array.from({ length: count }, (_, i) => (
        <WorkspaceCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Also re-export the generic CardSkeleton for convenience
export { CardSkeleton };
