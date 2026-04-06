import { Suspense } from 'react';

import { WorkspaceJoinClient } from './workspace-join-client';

export default function WorkspaceJoinPage() {
  return (
    <Suspense fallback={<WorkspaceJoinClientFallback />}>
      <WorkspaceJoinClient />
    </Suspense>
  );
}

function WorkspaceJoinClientFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Workspace Invite</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Preparing invite…</p>
        <div
          aria-hidden="true"
          className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
        />
      </div>
    </main>
  );
}
