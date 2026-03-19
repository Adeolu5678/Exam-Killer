'use client';

// =============================================================================
// widgets/AppShell/AppShell.tsx
// Layer: widgets
// The three-panel global layout shell: TopBar (48px) + Sidebar (260px/60px) + Main
// Blueprint §2.5: "three-panel shell inspired by Linear and VS Code"
// =============================================================================

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenCheck, PanelLeftClose, PanelLeftOpen, Search, LogOut } from 'lucide-react';

import { AuthContext } from '@/context/AuthContext';

import { useAppShellStore } from '@/shared/stores/ui-store';
import { Avatar } from '@/shared/ui';

import { CommandPalette } from '@/widgets/CommandPalette';

import { SidebarNav, UpgradeCTA } from './SidebarNav';

// ---------------------------------------------------------------------------
// Logo mark component
// ---------------------------------------------------------------------------

function LogoMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label="Exam-Killer — go to dashboard"
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
    >
      {/* Icon mark */}
      <div
        aria-hidden="true"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary-glow)]"
      >
        <BookOpenCheck size={14} className="text-white" />
      </div>

      {/* Wordmark — hidden when collapsed */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden whitespace-nowrap text-sm font-bold tracking-tight text-[var(--color-text-primary)]"
          >
            Exam-Killer
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

interface TopBarProps {
  user: User | null;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
}

function TopBar({
  user,
  isCollapsed,
  onToggleSidebar,
  onOpenMobile,
  onOpenCommandPalette,
  onLogout,
}: TopBarProps) {
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <header
      className="bg-[var(--color-bg-base)]/90 fixed left-0 right-0 top-0 z-30 flex h-[var(--topbar-height)] items-center gap-3 border-b border-[var(--color-border)] px-4 backdrop-blur-md transition-[padding-left] duration-[var(--duration-slow)] ease-[var(--ease-standard)]"
      style={{
        paddingLeft: `calc(var(--mobile-safe-padding) + ${
          isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
        } + 1rem)`,
      }}
    >
      <style jsx>{`
        header {
          padding-left: 1rem !important;
        }
        @media (min-width: 1024px) {
          header {
            padding-left: calc(
              ${isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'} + 1rem
            ) !important;
          }
        }
      `}</style>
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobile}
        className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] lg:hidden"
      >
        <PanelLeftOpen size={18} aria-hidden="true" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ⌘K command palette trigger */}
      <button
        type="button"
        aria-label="Open command palette (Ctrl+K)"
        onClick={onOpenCommandPalette}
        className="hidden h-8 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-xs text-[var(--color-text-muted)] transition-all duration-[var(--duration-base)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:flex"
      >
        <Search size={12} aria-hidden="true" />
        <span>Search</span>
        <kbd
          aria-hidden="true"
          className="ml-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-1.5 py-0.5 font-mono text-[10px]"
        >
          ⌘K
        </kbd>
      </button>

      {/* Avatar / profile / logout */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/settings"
          title={`Settings for ${displayName}`}
          className="flex items-center gap-2 rounded-lg p-1 transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Avatar name={displayName} src={user?.photoURL ?? undefined} size="sm" />
        </Link>

        <button
          type="button"
          aria-label="Log out"
          onClick={onLogout}
          className="hover:bg-[var(--color-accent-rose)]/10 rounded-lg p-2 text-[var(--color-text-muted)] transition-all duration-[var(--duration-fast)] hover:text-[var(--color-accent-rose)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  subscription: { plan: string; status: string } | null;
  onLogout: () => void;
}

function Sidebar({ isCollapsed, onToggle, subscription, onLogout }: SidebarProps) {
  const isFree = !subscription || subscription.plan === 'free';

  return (
    <aside
      aria-label="Sidebar"
      className="fixed left-0 top-0 z-20 hidden h-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-standard)] lg:flex"
      style={{
        width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
      }}
    >
      {/* Sidebar header: logo + collapse toggle */}
      <div className="flex h-[var(--topbar-height)] flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3">
        <LogoMark collapsed={isCollapsed} />

        <button
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
          className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] lg:flex"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={15} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={15} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <SidebarNav collapsed={isCollapsed} onLogout={onLogout} />
      </div>

      {/* Footer: upgrade CTA */}
      {isFree && <UpgradeCTA collapsed={isCollapsed} />}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer overlay
// ---------------------------------------------------------------------------

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function MobileDrawer({ isOpen, onClose, onLogout }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="bg-[var(--color-bg-base)]/70 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 z-50 flex h-full w-[var(--sidebar-width)] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex h-[var(--topbar-height)] flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
              <LogoMark collapsed={false} />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
              >
                <PanelLeftClose size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              <SidebarNav collapsed={false} onItemClick={onClose} onLogout={onLogout} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// AppShell — public component
// ---------------------------------------------------------------------------

interface AppShellProps {
  children: React.ReactNode;
  user: User | null;
  subscription: { plan: string; status: string } | null;
}

export function AppShell({ children, user, subscription }: AppShellProps) {
  const {
    isSidebarCollapsed,
    isMobileDrawerOpen,
    toggleSidebar,
    openMobileDrawer,
    closeMobileDrawer,
    openCommandPalette,
  } = useAppShellStore();

  const router = useRouter();
  const auth = React.useContext(AuthContext);

  const handleLogout = async () => {
    try {
      if (auth?.logout) {
        await auth.logout();
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  return (
    <div
      className="min-h-screen bg-[var(--color-bg-base)]"
      data-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}
    >
      {/* Desktop sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        subscription={subscription}
        onLogout={handleLogout}
      />

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={closeMobileDrawer}
        onLogout={handleLogout}
      />

      {/* TopBar */}
      <TopBar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobile={openMobileDrawer}
        onOpenCommandPalette={openCommandPalette}
        onLogout={handleLogout}
      />

      {/* Global ⌘K Command Palette — rendered once at shell root */}
      <CommandPalette />

      {/* Main content area */}
      <main
        id="main-content"
        className="h-screen overflow-hidden pt-[var(--topbar-height)] transition-[padding-left] duration-[var(--duration-slow)] ease-[var(--ease-standard)]"
        style={{
          paddingLeft: 0,
        }}
      >
        <style jsx>{`
          main {
            padding-left: 0 !important;
          }
          @media (min-width: 1024px) {
            main {
              padding-left: ${isSidebarCollapsed
                ? 'var(--sidebar-collapsed-width)'
                : 'var(--sidebar-width)'} !important;
            }
          }
        `}</style>
        <div className="mx-auto flex h-full max-w-[var(--content-max-width)] flex-col p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
