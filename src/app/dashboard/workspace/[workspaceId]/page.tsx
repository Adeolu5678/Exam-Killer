'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/page.tsx
// Layer: app (thin assembly only — no business logic)
// Assembles: UploadZone + SourceList wrappers (Sources feature)
// Note: layout.tsx wraps this in WorkspaceShell
// =============================================================================

import { useParams } from 'next/navigation';

import { UploadZone, SourceList } from '@/features/sources';

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-base)] p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            Upload Sources
          </h2>
          <UploadZone workspaceId={workspaceId} />
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-base)] p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            Your Sources
          </h2>
          <SourceList workspaceId={workspaceId} showUploadZone={false} />
        </div>
      </div>
    </div>
  );
}
