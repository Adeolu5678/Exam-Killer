// =============================================================================
// app/dashboard/workspace/[workspaceId]/sources/page.tsx
// Layer: app (Next.js page — thin assembly, no business logic)
// Purpose: Sources tab for a workspace — displays the upload zone + document list.
// =============================================================================

import type { Metadata } from 'next';

import dynamic from 'next/dynamic';

import { SourceListSkeleton } from '@/features/sources';

// ---------------------------------------------------------------------------
// Lazy-load the client-heavy SourceList (drag/drop + virtualization)
// ---------------------------------------------------------------------------

const SourceList = dynamic(() => import('@/features/sources').then((m) => m.SourceList), {
  ssr: false,
  loading: () => <SourceListSkeleton count={5} />,
});

// ---------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Sources — Exam Killer',
  description: 'Upload and manage your study documents for this workspace.',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface SourcesPageProps {
  params: { workspaceId: string };
}

export default function SourcesPage({ params }: SourcesPageProps) {
  const { workspaceId } = params;

  return (
    <section
      aria-label="Workspace sources"
      style={{
        padding: 'var(--space-8) var(--space-6)',
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Sources
        </h1>
        <p
          style={{
            marginTop: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            maxWidth: '60ch',
          }}
        >
          Upload PDFs, images, or text files. Your AI tutor and flashcard generator will use these
          as their knowledge base.
        </p>
      </header>

      {/* Main content — SourceList includes UploadZone at the top */}
      <SourceList workspaceId={workspaceId} showUploadZone />
    </section>
  );
}
