'use client';
/* eslint-disable react-hooks/incompatible-library */
// =============================================================================
// features/sources/ui/SourceList.tsx
// Layer: features → sources → ui
// Purpose: Orchestrates loading, empty, error, and populated states for the
//          sources list. Uses @tanstack/virtual for virtualization when > 50.
// Imports: @/shared/ui/index.ts ONLY — no feature cross-imports.
// =============================================================================

import { useRef } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/ui';

import { SourceCard } from './SourceCard';
import { SourceListSkeleton } from './SourceCardSkeleton';
import styles from './SourceList.module.css';
import { UploadZone } from './UploadZone';
import type { SourceItem } from '../model/types';
import { useSources, useDeleteSource, useProcessSource } from '../model/useSources';

// ---------------------------------------------------------------------------
// Virtualization threshold (Blueprint §2.4)
// ---------------------------------------------------------------------------

const VIRTUALIZE_THRESHOLD = 50;
const ESTIMATED_ROW_HEIGHT = 88; // px — SourceCard approximate height

// ---------------------------------------------------------------------------
// Empty state SVG illustration
// ---------------------------------------------------------------------------

function EmptyStateIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Subtle floating document — minimal, editorial */}
      {/* Shadow */}
      <ellipse cx="60" cy="104" rx="28" ry="6" fill="var(--color-border)" opacity="0.5" />

      {/* Document body — animated float */}
      <g style={{ animation: 'float 3s ease-in-out infinite', transformOrigin: '60px 58px' }}>
        {/* Page */}
        <rect
          x="30"
          y="18"
          width="60"
          height="76"
          rx="8"
          fill="var(--color-bg-elevated)"
          stroke="var(--color-border-accent)"
          strokeWidth="1.5"
        />

        {/* Lines */}
        <rect
          x="40"
          y="34"
          width="40"
          height="4"
          rx="2"
          fill="var(--color-border-accent)"
          opacity="0.8"
        />
        <rect x="40" y="44" width="30" height="3" rx="1.5" fill="var(--color-border)" />
        <rect x="40" y="52" width="36" height="3" rx="1.5" fill="var(--color-border)" />
        <rect x="40" y="60" width="24" height="3" rx="1.5" fill="var(--color-border)" />
        <rect x="40" y="68" width="32" height="3" rx="1.5" fill="var(--color-border)" />

        {/* Upload arrow */}
        <circle cx="78" cy="26" r="10" fill="var(--color-primary-muted)" />
        <path
          d="M78 31 L78 22 M74 26 L78 22 L82 26"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sparkles */}
      <circle
        cx="24"
        cy="38"
        r="2.5"
        fill="var(--color-primary)"
        opacity="0.6"
        style={{ animation: 'float 3s ease-in-out infinite 0.5s', transformOrigin: '24px 38px' }}
      />
      <circle
        cx="96"
        cy="55"
        r="2"
        fill="var(--color-accent-violet)"
        opacity="0.7"
        style={{ animation: 'float 3s ease-in-out infinite 1s', transformOrigin: '96px 55px' }}
      />
      <circle
        cx="20"
        cy="72"
        r="1.5"
        fill="var(--color-accent-amber)"
        opacity="0.5"
        style={{ animation: 'float 3s ease-in-out infinite 1.5s', transformOrigin: '20px 72px' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Virtualized list (> VIRTUALIZE_THRESHOLD items)
// ---------------------------------------------------------------------------

interface VirtualListProps {
  sources: SourceItem[];
  onDelete: (id: string) => void;
  onReprocess: (id: string) => void;
  deletingId: string | null;
}

function VirtualList({ sources, onDelete, onReprocess, deletingId }: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sources.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className={styles.listWrap}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const source = sources[vItem.index];
          return (
            <div
              key={vItem.key}
              className={styles.virtualRow}
              style={{ transform: `translateY(${vItem.start}px)` }}
            >
              <SourceCard
                source={source}
                onDelete={onDelete}
                onReprocess={onReprocess}
                isDeleting={deletingId === source.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static list (≤ VIRTUALIZE_THRESHOLD items)
// ---------------------------------------------------------------------------

interface StaticListProps {
  sources: SourceItem[];
  onDelete: (id: string) => void;
  onReprocess: (id: string) => void;
  deletingId: string | null;
}

function StaticList({ sources, onDelete, onReprocess, deletingId }: StaticListProps) {
  return (
    <div className={styles.staticList}>
      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          onDelete={onDelete}
          onReprocess={onReprocess}
          isDeleting={deletingId === source.id}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SourceList component
// ---------------------------------------------------------------------------

interface SourceListProps {
  workspaceId: string;
  /** If true, the UploadZone is shown at the top of the list */
  showUploadZone?: boolean;
}

export function SourceList({ workspaceId, showUploadZone = true }: SourceListProps) {
  const { data: sources, isLoading, isError, error, refetch } = useSources(workspaceId);
  const {
    mutate: deleteSource,
    isPending: isDeleting,
    variables: deletingId,
  } = useDeleteSource(workspaceId);
  const { mutate: processSource } = useProcessSource(workspaceId);

  const handleDelete = (id: string) => deleteSource(id);
  const handleReprocess = (id: string) => processSource(id);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        {showUploadZone && <UploadZone workspaceId={workspaceId} />}
        <SourceListSkeleton count={5} />
      </div>
    );
  }

  // Error state
  if (isError || !sources) {
    const message = error instanceof Error ? error.message : 'Failed to load sources.';
    return (
      <div className={styles.container}>
        {showUploadZone && <UploadZone workspaceId={workspaceId} />}
        <div className={styles.errorWrap} role="alert">
          <AlertCircle size={32} style={{ color: 'var(--color-accent-rose)' }} />
          <p className={styles.errorTitle}>Could not load sources</p>
          <p className={styles.errorMessage}>{message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw size={14} /> Try again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (sources.length === 0) {
    return (
      <div className={styles.container}>
        {showUploadZone && <UploadZone workspaceId={workspaceId} />}
        <div className={styles.emptyWrap}>
          <EmptyStateIllustration />
          <p className={styles.emptyTitle}>No sources yet</p>
          <p className={styles.emptySubtitle}>
            Upload a PDF, image, or text file to start building your knowledge base.
          </p>
        </div>
      </div>
    );
  }

  // Populated state — choose rendering strategy based on count
  const useVirtual = sources.length > VIRTUALIZE_THRESHOLD;
  const currentDeletingId = isDeleting ? (deletingId ?? null) : null;

  return (
    <div className={styles.container}>
      {showUploadZone && <UploadZone workspaceId={workspaceId} />}

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Sources</h2>
        <span className={styles.count}>
          {sources.length} document{sources.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {useVirtual ? (
        <VirtualList
          sources={sources}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          deletingId={currentDeletingId}
        />
      ) : (
        <StaticList
          sources={sources}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          deletingId={currentDeletingId}
        />
      )}
    </div>
  );
}
