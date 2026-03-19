'use client';

// =============================================================================
// features/workspace/ui/WorkspaceGrid.tsx
// Composes WorkspaceCards into a responsive bento-style grid.
// Handles loading, empty, and error states internally.
// =============================================================================

import React from 'react';

import { useRouter } from 'next/navigation';

import { AlertCircle } from 'lucide-react';

import type { WorkspacesQuery } from '@/shared/types/api';
import { Button } from '@/shared/ui';

import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';
import { WorkspaceCard } from './WorkspaceCard';
import { WorkspaceGridSkeleton } from './WorkspaceCardSkeleton';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { useWorkspaces } from '../model/useWorkspaces';
import { useDeleteWorkspace } from '../model/useWorkspaces';
import { useWorkspaceStore } from '../model/workspaceStore';

// ---------------------------------------------------------------------------

interface WorkspaceGridProps {
  query?: WorkspacesQuery;
}

export function WorkspaceGrid({ query = {} }: WorkspaceGridProps) {
  const router = useRouter();

  // Server state (TanStack Query)
  const { data, isLoading, isError, error, refetch } = useWorkspaces(query);

  // Ephemeral UI state (Zustand)
  const openCreator = useWorkspaceStore((s) => s.openCreator);
  const setPendingDelete = useWorkspaceStore((s) => s.setPendingDelete);

  // Mutation
  const { mutate: deleteWorkspace } = useDeleteWorkspace();

  // ── Handlers ────────────────────────────────────────────────────

  function handleOpen(id: string) {
    router.push(`/dashboard/workspace/${id}`);
  }

  function handleDeleteRequest(id: string) {
    setPendingDelete(id);
  }

  // ── Loading ─────────────────────────────────────────────────────

  if (isLoading) {
    return <WorkspaceGridSkeleton count={6} />;
  }

  // ── Error ───────────────────────────────────────────────────────

  if (isError) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return (
      <div
        className="border-[var(--color-accent-rose)]/30 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-[rgba(244,63,94,0.04)] px-8 py-16 text-center"
        role="alert"
      >
        <AlertCircle size={32} className="text-[var(--color-accent-rose)]" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Failed to load workspaces
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">{message}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────

  const workspaces = data?.workspaces ?? [];

  if (workspaces.length === 0) {
    return <WorkspaceEmptyState onCreateClick={openCreator} />;
  }

  // ── Populated Grid ──────────────────────────────────────────────

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label={`${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
    >
      {workspaces.map((ws, i) => (
        <WorkspaceCard
          key={ws.id}
          workspace={ws}
          index={i}
          onOpen={handleOpen}
          onDelete={handleDeleteRequest}
        />
      ))}

      {/* Confirmation modal for deletions */}
      <DeleteWorkspaceModal />
    </div>
  );
}
