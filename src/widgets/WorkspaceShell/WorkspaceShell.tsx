'use client';

// =============================================================================
// widgets/WorkspaceShell/WorkspaceShell.tsx
// Layer: widgets
// Layout wrapper for all routes under app/(app)/workspace/[id]/
// Blueprint §2.5: WorkspaceShell adds secondary horizontal sub-navigation
// Imports ONLY from: @/shared/ui  and  @/features/workspace
// =============================================================================

import React, { useMemo } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { motion } from 'framer-motion';
import { FileText, Brain, ListChecks, MessageSquare, BarChart3, ChevronRight } from 'lucide-react';

import { Skeleton } from '@/shared/ui';

import { useWorkspace } from '@/features/workspace';

// ---------------------------------------------------------------------------
// Sub-navigation configuration
// ---------------------------------------------------------------------------

interface SubNavLink {
  href: (id: string) => string;
  label: string;
  icon: React.ElementType;
  key: string;
}

const SUB_NAV_LINKS: SubNavLink[] = [
  {
    key: 'sources',
    label: 'Sources',
    icon: FileText,
    href: (id) => `/dashboard/workspace/${id}`,
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    icon: Brain,
    href: (id) => `/dashboard/workspace/${id}/flashcards`,
  },
  {
    key: 'quizzes',
    label: 'Quizzes',
    icon: ListChecks,
    href: (id) => `/dashboard/workspace/${id}/quiz`,
  },
  {
    key: 'tutor',
    label: 'Tutor',
    icon: MessageSquare,
    href: (id) => `/dashboard/workspace/${id}/chat`,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: (id) => `/dashboard/workspace/${id}/analytics`,
  },
];

// ---------------------------------------------------------------------------
// WorkspaceBreadcrumb
// ---------------------------------------------------------------------------

interface BreadcrumbProps {
  workspaceName: string | undefined;
  isLoading: boolean;
}

function WorkspaceBreadcrumb({ workspaceName, isLoading }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-6 pb-0 pt-5">
      <Link
        href="/dashboard"
        className="rounded text-xs font-medium text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
      >
        Workspaces
      </Link>

      <ChevronRight
        size={12}
        aria-hidden="true"
        className="flex-shrink-0 text-[var(--color-text-disabled)]"
      />

      {isLoading ? (
        <Skeleton className="h-3.5 w-28 rounded" />
      ) : (
        <span
          className="max-w-[200px] truncate text-xs font-medium text-[var(--color-text-secondary)]"
          aria-current="page"
        >
          {workspaceName ?? 'Workspace'}
        </span>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceTitle
// ---------------------------------------------------------------------------

interface WorkspaceTitleProps {
  workspaceName: string | undefined;
  isLoading: boolean;
}

function WorkspaceTitle({ workspaceName, isLoading }: WorkspaceTitleProps) {
  return (
    <div className="px-6 pb-0 pt-2">
      {isLoading ? (
        <Skeleton className="h-7 w-48 rounded-lg" />
      ) : (
        <h1 className="max-w-[480px] truncate text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {workspaceName ?? 'Workspace'}
        </h1>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubNavPillGroup
// ---------------------------------------------------------------------------

interface SubNavProps {
  workspaceId: string;
  pathname: string;
}

function SubNavPillGroup({ workspaceId, pathname }: SubNavProps) {
  // Determine active tab by matching path segments
  const activeKey = useMemo(() => {
    if (pathname.endsWith('/flashcards')) return 'flashcards';
    if (pathname.includes('/quiz')) return 'quizzes';
    if (pathname.includes('/chat')) return 'tutor';
    if (pathname.includes('/analytics')) return 'analytics';
    return 'sources';
  }, [pathname]);

  return (
    <nav
      aria-label="Workspace sections"
      className="flex h-[var(--workspace-subnav-height)] items-center gap-1 px-6"
    >
      {/* Pill group container */}
      <div
        role="tablist"
        className="flex items-center gap-0.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-0.5"
      >
        {SUB_NAV_LINKS.map((link) => {
          const isActive = activeKey === link.key;
          const Icon = link.icon;

          return (
            <Link
              key={link.key}
              href={link.href(workspaceId)}
              role="tab"
              aria-selected={isActive}
              aria-label={link.label}
              className="relative flex h-8 items-center gap-1.5 rounded-[calc(var(--radius-lg)-2px)] px-3 text-xs font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-elevated)]"
              style={{
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {/* Active pill background — animated via layoutId */}
              {isActive && (
                <motion.span
                  layoutId="workspace-subnav-pill"
                  className="absolute inset-0 rounded-[calc(var(--radius-lg)-2px)] border border-[var(--color-border-accent)] bg-[var(--color-bg-surface)]"
                  transition={{
                    type: 'spring',
                    bounce: 0.18,
                    duration: 0.35,
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Icon + label — above the animated pill */}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon
                  size={14}
                  aria-hidden="true"
                  style={{
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                />
                <span className="inline">{link.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Divider below the sub-nav
// ---------------------------------------------------------------------------

function SubNavDivider() {
  return <div aria-hidden="true" className="mx-0 border-b border-[var(--color-border)]" />;
}

// ---------------------------------------------------------------------------
// WorkspaceShell — public component
// ---------------------------------------------------------------------------

interface WorkspaceShellProps {
  workspaceId: string;
  children: React.ReactNode;
}

export function WorkspaceShell({ workspaceId, children }: WorkspaceShellProps) {
  const pathname = usePathname();

  // Fetch workspace detail — only title/name needed here.
  // useWorkspace returns WorkspaceDetailResponse: { workspace: WorkspaceDetail }
  const { data: workspaceResponse, isPending: isLoading } = useWorkspace(workspaceId);

  const workspaceName = workspaceResponse?.workspace.name;

  return (
    <div className="-m-6 flex min-h-full flex-col">
      {/* ── Header zone: breadcrumb + title + sub-nav ────────────────────── */}
      <div className="flex-shrink-0 bg-[var(--color-bg-base)]">
        {/* Breadcrumb row */}
        <WorkspaceBreadcrumb workspaceName={workspaceName} isLoading={isLoading} />

        {/* Workspace title row */}
        <WorkspaceTitle workspaceName={workspaceName} isLoading={isLoading} />

        {/* Sub-navigation pill bar */}
        <SubNavPillGroup workspaceId={workspaceId} pathname={pathname ?? ''} />

        <SubNavDivider />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
