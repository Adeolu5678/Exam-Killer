'use client';

// =============================================================================
// app/dashboard/layout.tsx
// Replaces the legacy layout with the FSD AppShell widget.
// Installs QueryClientProvider so all dashboard sub-routes have TanStack Query.
// Layer: app (routing only — no business logic)
// =============================================================================

import React, { useContext, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthContext } from '@/context';

import { isFirebaseConfigured } from '@/shared/lib/firebase/client';

import { AppShell } from '@/widgets/AppShell';

// ---------------------------------------------------------------------------
// TanStack Query client factory
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Inner layout — reads AuthContext (which contains subscription)
// ---------------------------------------------------------------------------

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const context = useContext(AuthContext);
  const router = useRouter();

  const user = context?.user ?? null;
  const loading = context?.loading ?? true;
  const subscription = context?.subscription ?? null;
  const isLoadingSubscription = context?.isLoadingSubscription ?? false;

  useEffect(() => {
    if (!loading && (!isFirebaseConfigured || !user)) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  // Show nothing while auth resolves or subscription is fetching for a new user
  const isInitialLoading = loading;
  const isSubscriptionLoading = user && isLoadingSubscription && !subscription;

  if (isInitialLoading || isSubscriptionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <span className="sr-only">Loading…</span>
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
        />
      </div>
    );
  }

  // Final check to ensure we don't render authenticated UI without a user
  if (!user) return null;

  return (
    <AppShell
      user={user}
      subscription={
        subscription
          ? { plan: subscription.plan, status: subscription.status }
          : { plan: 'free', status: 'inactive' }
      }
    >
      {children}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Use useState for queryClient to ensure it's stable and avoids hydration mismatches
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </QueryClientProvider>
  );
}
