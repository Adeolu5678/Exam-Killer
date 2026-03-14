'use client';

// =============================================================================
// widgets/AppShell/SidebarNav.tsx
// Layer: widgets → AppShell
// Renders the sidebar navigation items with active route detection.
// =============================================================================

import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  BookOpen,
  Layers,
  BarChart3,
  CalendarDays,
  Settings,
  Zap,
  LogOut,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Exact match required (e.g. /dashboard itself vs nested pages) */
  exact?: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
    exact: true,
  },
  {
    href: '/dashboard/workspaces',
    label: 'Workspaces',
    icon: <Layers size={18} aria-hidden="true" />,
  },
  {
    href: '/dashboard/study-plan',
    label: 'Study Plan',
    icon: <CalendarDays size={18} aria-hidden="true" />,
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: <BarChart3 size={18} aria-hidden="true" />,
  },
  {
    href: '/dashboard/flashcards',
    label: 'Flashcards',
    icon: <BookOpen size={18} aria-hidden="true" />,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: <Settings size={18} aria-hidden="true" />,
  },
];

interface NavActionProps {
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onClick: () => void;
}

function NavAction({ label, icon, collapsed, onClick }: NavActionProps) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={[
        'relative flex w-full items-center rounded-lg',
        'transition-all duration-[var(--duration-base)] ease-[var(--ease-standard)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]',
        'hover:bg-[var(--color-accent-rose)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-rose)]',
        collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2.5',
      ].join(' ')}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm font-medium leading-none">{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Single nav item
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavItemDef;
  collapsed: boolean;
  pathname: string;
  onItemClick?: () => void;
}

function NavItem({ item, collapsed, pathname, onItemClick }: NavItemProps) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onItemClick}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'relative flex items-center rounded-lg',
        'transition-all duration-[var(--duration-base)] ease-[var(--ease-standard)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]',
        collapsed ? 'mx-auto h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
        isActive
          ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]',
      ].join(' ')}
    >
      {/* Active indicator pip */}
      {isActive && !collapsed && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]"
        />
      )}

      <span className="flex-shrink-0">{item.icon}</span>

      {!collapsed && <span className="text-sm font-medium leading-none">{item.label}</span>}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SidebarNav
// ---------------------------------------------------------------------------

interface SidebarNavProps {
  collapsed: boolean;
  onItemClick?: () => void;
  onLogout?: () => void;
}

export function SidebarNav({ collapsed, onItemClick, onLogout }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className={['flex flex-col gap-1', collapsed ? 'items-center px-2' : 'px-3'].join(' ')}
    >
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          collapsed={collapsed}
          pathname={pathname}
          onItemClick={onItemClick}
        />
      ))}

      {onLogout && (
        <NavAction
          label="Log out"
          icon={<LogOut size={18} aria-hidden="true" />}
          collapsed={collapsed}
          onClick={onLogout}
        />
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// UpgradeCTA — shown in the sidebar footer for free-plan users
// ---------------------------------------------------------------------------

interface UpgradeCTAProps {
  collapsed: boolean;
}

export function UpgradeCTA({ collapsed }: UpgradeCTAProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pb-2">
        <Link
          href="/pricing"
          title="Upgrade to Premium"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-amber-muted)] text-[var(--color-accent-amber)] transition-all duration-[var(--duration-base)] hover:bg-[var(--color-accent-amber)] hover:text-[var(--color-bg-base)]"
        >
          <Zap size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3">
      <div className="border-[var(--color-accent-amber)]/20 rounded-xl border bg-[var(--color-accent-amber-muted)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Zap size={14} className="text-[var(--color-accent-amber)]" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-amber)]">
            Free Plan
          </span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Unlock unlimited workspaces, AI queries, and priority support.
        </p>
        <Link
          href="/pricing"
          className="block w-full rounded-lg bg-[var(--color-accent-amber)] px-3 py-2 text-center text-xs font-semibold text-[var(--color-bg-base)] transition-opacity duration-[var(--duration-fast)] hover:opacity-90"
        >
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}
