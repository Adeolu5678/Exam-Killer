'use client';

// =============================================================================
// widgets/WorkspaceShell/WorkspaceShellSkeleton.tsx
// Layer: widgets
// Shimmer loading skeleton mirroring the WorkspaceShell header.
// Imports ONLY from: @/shared/ui
// =============================================================================

import React from 'react';

import { Skeleton } from '@/shared/ui';

export function WorkspaceShellSkeleton() {
  return (
    <div className="-m-6 flex min-h-full flex-col">
      {/* Header zone */}
      <div className="flex-shrink-0 bg-[var(--color-bg-base)]">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-1.5 px-6 pb-0 pt-5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>

        {/* Title skeleton */}
        <div className="px-6 pb-0 pt-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
        </div>

        {/* Sub-nav skeleton */}
        <div
          className="flex items-center gap-1 px-6"
          style={{ height: 'var(--workspace-subnav-height)' }}
        >
          <div className="flex items-center gap-0.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-0.5">
            {['Sources', 'Flashcards', 'Quizzes', 'Tutor', 'Analytics'].map((label) => (
              <Skeleton key={label} className="h-8 w-20 rounded-[calc(var(--radius-lg)-2px)]" />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div aria-hidden="true" className="border-b border-[var(--color-border)]" />
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-3/4 rounded-xl" />
      </div>
    </div>
  );
}
