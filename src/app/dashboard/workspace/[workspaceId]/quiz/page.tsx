'use client';

// =============================================================================
// app/dashboard/workspace/[workspaceId]/quiz/page.tsx  — FSD-compliant thin page
// Layer: app (routing only — zero business logic)
// This page is a pure composition surface delegating to QuizPageShell.
// =============================================================================

import { QuizPageShell } from './QuizPageShell';

export default function QuizPage() {
  return <QuizPageShell />;
}
