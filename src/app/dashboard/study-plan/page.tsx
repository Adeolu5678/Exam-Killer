'use client';

// =============================================================================
// app/dashboard/study-plan/page.tsx
// Layer: app  →  thin page assembler
//
// Renders: a global overview of the user's study plans across ALL workspaces.
// Similar to the global flashcards page, it iterates through workspaces
// and shows a summary of upcoming exams and sessions for each.
// =============================================================================

import React, { useMemo, useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { CalendarCheck2, ArrowRight, Clock, AlertCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardSkeleton,
  Button,
} from '@/shared/ui';

import { VerificationBanner } from '@/features/identity/VerificationBanner';
import { VerificationGuard } from '@/features/identity/VerificationGuard';
import { computeCountdown } from '@/features/study-plan/model/types';
import { useStudySessions, useExamDates } from '@/features/study-plan/model/useStudyPlan';
import { useWorkspaces } from '@/features/workspace';

// ── Workspace Summary Card ──────────────────────────────────────────────────
interface WorkspaceSummaryProps {
  workspace: { id: string; name: string; course_code?: string | null };
}

function WorkspaceStudySummary({ workspace }: WorkspaceSummaryProps) {
  const { data: sessions = [], isLoading: loadingSessions } = useStudySessions(workspace.id);
  const { data: exams = [], isLoading: loadingExams } = useExamDates(workspace.id);

  const upcomingExams = useMemo(
    () =>
      exams
        .filter((e) => !computeCountdown(e).isPast)
        .sort((a, b) => a.examDate.localeCompare(b.examDate)),
    [exams],
  );

  const nextSession = useMemo(() => {
    const now = new Date().toISOString();
    return sessions
      .filter((s) => s.status !== 'completed' && s.startTime > now)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  }, [sessions]);

  const isLoading = loadingSessions || loadingExams;

  return (
    <Card className="hover:border-[var(--color-primary)]/50 overflow-hidden border-[var(--color-border)] transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">{workspace.name}</CardTitle>
            {workspace.course_code && (
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {workspace.course_code}
              </CardDescription>
            )}
          </div>
          <Link href={`/dashboard/workspace/${workspace.id}/study-plan`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[var(--color-primary)]">
              View Plan <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Next Session */}
          <div className="border-[var(--color-border)]/40 rounded-lg border bg-[var(--color-bg-surface)] p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Clock size={13} className="text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--color-text-muted)]">
                Next Session
              </span>
            </div>
            {isLoading ? (
              <div className="bg-[var(--color-border)]/50 h-4 w-3/4 animate-pulse rounded" />
            ) : nextSession ? (
              <p className="truncate text-sm font-semibold">{nextSession.title}</p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Nothing scheduled</p>
            )}
          </div>

          {/* Upcoming Exams */}
          <div className="border-[var(--color-border)]/40 rounded-lg border bg-[var(--color-bg-surface)] p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <AlertCircle size={13} className="text-[var(--color-accent-amber)]" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--color-text-muted)]">
                Next Exam
              </span>
            </div>
            {isLoading ? (
              <div className="bg-[var(--color-border)]/50 h-4 w-3/4 animate-pulse rounded" />
            ) : upcomingExams.length > 0 ? (
              <p className="truncate text-sm font-semibold">{upcomingExams[0].title}</p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No exams set</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page Component ──────────────────────────────────────────────────────────
export default function GlobalStudyPlanPage() {
  const { data: wsResponse, isLoading, isError } = useWorkspaces();
  const workspaces = wsResponse?.workspaces ?? [];

  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/payments/status');
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status');
      }
    };
    fetchStatus();
  }, []);

  const vStatus = subscription?.verificationStatus || 'none';

  return (
    <VerificationGuard status={vStatus}>
      <div className="mx-auto max-w-5xl p-6 lg:p-10">
        {/* Verification Banner */}
        <div className="mb-6">
          <VerificationBanner status={vStatus} onVerifyClick={() => {}} />
        </div>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-[var(--color-primary-muted)] p-2 text-[var(--color-primary)]">
              <CalendarCheck2 size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Study Plans
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Manage your exam schedules and study sessions across all active workspaces.
          </p>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {isLoading && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {isError && (
            <Card className="bg-[var(--color-accent-rose)]/5 border-[var(--color-accent-rose)]/20">
              <CardContent className="py-10 text-center">
                <p className="font-semibold text-[var(--color-accent-rose)]">
                  Failed to load workspaces.
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Please try again later.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && workspaces.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="space-y-4 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]">
                  <CalendarCheck2 size={24} />
                </div>
                <div>
                  <p className="text-lg font-semibold">No study plans found</p>
                  <p className="mx-auto max-w-xs text-sm text-[var(--color-text-muted)]">
                    Create a workspace and add some exams or study sessions to see them here.
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && workspaces.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {workspaces.map((ws) => (
                <WorkspaceStudySummary key={ws.id} workspace={ws} />
              ))}
            </div>
          )}
        </div>
      </div>
    </VerificationGuard>
  );
}
