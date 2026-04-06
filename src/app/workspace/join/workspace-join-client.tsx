'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface JoinState {
  status: 'joining' | 'success' | 'error';
  message: string;
}

export function WorkspaceJoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const inviteCode = searchParams.get('code');

  const [state, setState] = useState<JoinState>(() => {
    if (!workspaceId || !inviteCode) {
      return {
        status: 'error',
        message: 'Invite link is incomplete. Please request a new invite.',
      };
    }

    return {
      status: 'joining',
      message: 'Joining workspace…',
    };
  });

  useEffect(() => {
    if (!workspaceId || !inviteCode) {
      return;
    }

    let cancelled = false;

    async function joinWorkspace() {
      const response = await fetch(`/api/workspaces/${workspaceId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => ({ error: 'Failed to join workspace' }))) as {
          error?: string;
        };
        setState({
          status: 'error',
          message: body.error || 'Failed to join workspace',
        });
        return;
      }

      setState({
        status: 'success',
        message: 'Workspace joined successfully. Redirecting…',
      });

      window.setTimeout(() => {
        router.replace(`/dashboard/workspace/${workspaceId}`);
      }, 1200);
    }

    void joinWorkspace();

    return () => {
      cancelled = true;
    };
  }, [inviteCode, router, workspaceId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Workspace Invite</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{state.message}</p>

        {state.status === 'joining' && (
          <div
            aria-hidden="true"
            className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
          />
        )}

        {state.status === 'error' && (
          <div className="mt-6">
            <Link
              href="/dashboard/workspaces"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Go to your workspaces
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
