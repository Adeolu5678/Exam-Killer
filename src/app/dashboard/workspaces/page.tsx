// =============================================================================
// app/dashboard/workspaces/page.tsx
// Layer: app  →  thin page assembler
//
// FSD Rule: no business logic here. All composition is delegated to the
//   features/workspace layer via its public index.ts API.
//
// Renders: a dedicated "All Workspaces" view with a header and WorkspaceGrid.
// The WorkspaceCreator modal is included so the user can create a workspace
// from this dedicated page without navigating back to the dashboard.
// =============================================================================

import type { Metadata } from 'next';

import { WorkspaceGrid } from '@/features/workspace';
import { WorkspaceCreator } from '@/features/workspace';

// ── Page metadata ──────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'All Workspaces · Exam-Killer',
  description: 'View and manage all your study workspaces in one place.',
};

// ── Page component ─────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  return (
    // Generous whitespace per the 8-Point Grid (Blueprint §1.3): 48px top padding
    <section
      className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-12"
      aria-labelledby="workspaces-heading"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-2">
        <h1
          id="workspaces-heading"
          className="text-2xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-3xl"
        >
          All Workspaces
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage your study environments and pick up where you left off.
        </p>
      </header>

      {/* ── Feature composition ──────────────────────────────────────────── */}
      {/* WorkspaceGrid handles loading → skeleton, empty → EmptyState, error, and data states */}
      <WorkspaceGrid />

      {/* WorkspaceCreator modal — triggered by WorkspaceGrid empty state CTA or FAB */}
      <WorkspaceCreator />
    </section>
  );
}
