# TASK-046 Context: Studio Outputs UI (Audio, Video, Infographic)

## Goal

Build the new "Studio" section of Exam-Killer — a tab in the WorkspaceShell that lets
students generate Audio Overviews, Video Overviews, and Infographics from their notebook.
These are the premium long-running NotebookLM outputs that don't exist anywhere in the
current app and represent the biggest student-facing differentiation.

## Prerequisites

TASK-040 through TASK-045 must all be complete.

---

## Overview of What to Build

1. New FSD module: `src/features/studio/`
2. New route: `src/app/dashboard/workspace/[workspaceId]/studio/page.tsx`
3. Modify `src/widgets/WorkspaceShell/WorkspaceShell.tsx` to add "Studio" to the sub-nav.
4. Update `src/shared/lib/notebooklm/index.ts` to export a `useJobPoller` type helper.

---

## Step 1 — Create `src/features/studio/` FSD Module

### `api/studioApi.ts`

```typescript
// Triggers a new long-running job and returns job_id
export async function triggerStudioJob(
  notebookId: string,
  workspaceId: string,
  jobType: 'audio' | 'video' | 'infographic',
): Promise<{ job_id: string }>;

// Polls job status
export async function getJobStatus(jobId: string): Promise<{
  job_id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null;
  error_message: string | null;
  job_type: string;
}>;
```

### `model/types.ts`

```typescript
export type StudioJobType = 'audio' | 'video' | 'infographic';

export interface StudioJob {
  job_id: string;
  job_type: StudioJobType;
  status: 'idle' | 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null;
  error_message: string | null;
}

// Config for each output type
export const STUDIO_OUTPUTS: Record<
  StudioJobType,
  { label: string; description: string; icon: string; estimatedMinutes: string }
> = {
  audio: {
    label: 'Audio Overview',
    description: 'A podcast-style AI conversation about your notes.',
    icon: 'Headphones',
    estimatedMinutes: '5–10 min',
  },
  video: {
    label: 'Video Overview',
    description: 'A dynamic slideshow video with AI narration.',
    icon: 'Video',
    estimatedMinutes: '10–20 min',
  },
  infographic: {
    label: 'Infographic',
    description: 'A visual summary image of your key concepts.',
    icon: 'Image',
    estimatedMinutes: '1–2 min',
  },
};
```

### `model/studioStore.ts`

Zustand (immer) store:

```typescript
interface StudioState {
  jobs: Record<StudioJobType, StudioJob>; // one active job per type
  pollingIntervals: Partial<Record<StudioJobType, ReturnType<typeof setInterval>>>;
}
```

Actions:

- `startJob(jobType, jobId)` — sets status to `pending`, stores `job_id`.
- `updateJob(jobType, update)` — merges new status/result_url into the job.
- `startPolling(jobType, intervalRef)` — stores the interval ref.
- `stopPolling(jobType)` — clears the interval.

### `model/useStudio.ts`

```typescript
// Hook that provides job state and the trigger function
export function useStudio(workspaceId: string, notebookId: string | null);
```

Internally:

- `triggerJob(jobType)` — calls `studioApi.triggerStudioJob`, then `startPolling`.
- Polling: `setInterval(() => getJobStatus(jobId), 15_000)` — on `done` or `error`, `stopPolling`.

### `ui/StudioCard.tsx`

A card for ONE studio output type. Receives `jobType`, current `StudioJob` state, and `onTrigger` callback.

Visual states:

1. **Idle** — Icon, label, description, estimate, "Generate" button (primary, large).
2. **Pending / Processing** — Spinner + "Generating... (~X min)" + discrete progress dots. Button disabled.
3. **Done (audio)** — HTML5 `<audio controls>` tag with `src={result_url}`. Download link.
4. **Done (video)** — `<video controls>` with `src={result_url}`. Download link.
5. **Done (infographic)** — `<img>` with `alt`. Full-width. Download button.
6. **Error** — Red error badge with `error_message`, "Retry" button.

### `ui/StudioPageShell.tsx`

Three `StudioCard` components in a responsive grid (`grid-cols-1 md:grid-cols-3`).
Page heading: "Studio" with a sparkle icon badge.
If `notebookId` is null (workspace not yet linked to NLM), show a banner explaining the setup is required.

### `index.ts`

Barrel export — exposes `StudioPageShell`, `useStudio`, all types. Only permitted import surface.

---

## Step 2 — New Page Route

**File**: `src/app/dashboard/workspace/[workspaceId]/studio/page.tsx`

Thin FSD-compliant page. `next/dynamic` (ssr: false) lazy-loads `StudioPageShell`.

```tsx
'use client';
import dynamic from 'next/dynamic';
import { StudioSkeleton } from '@/features/studio';

const StudioPageShell = dynamic(() => import('@/features/studio').then((m) => m.StudioPageShell), {
  ssr: false,
  loading: () => <StudioSkeleton />,
});

export default function StudioPage({ params }: { params: { workspaceId: string } }) {
  return <StudioPageShell workspaceId={params.workspaceId} />;
}
```

Also create a basic `ui/StudioSkeleton.tsx` — three shimmer card placeholders.

---

## Step 3 — Add "Studio" to WorkspaceShell Sub-Nav

**File to modify**: `src/widgets/WorkspaceShell/WorkspaceShell.tsx`

The current sub-nav has pills for: Sources, Flashcards, Quiz, Chat, Study Plan, Analytics.
Add a new pill: **"Studio"** → `/dashboard/workspace/[workspaceId]/studio`.

Use a `Sparkles` or `Wand2` Lucide icon. The pill styling follows the existing pattern —
`layoutId="subnav-pill"` for the Framer Motion hover indicator.

---

## FSD Rules

- `src/features/studio/` MUST NOT import from other feature modules.
- All icons from `lucide-react`.
- All primitives from `@/shared/ui` (Button, Card, Badge, Spinner, Skeleton).
- Animations via `framer-motion`.
- CSS Modules for local styles where needed.

## Verification

1. `npx tsc --noEmit` → zero errors.
2. Start `npm run dev`. Navigate to a workspace → confirm "Studio" appears in the sub-nav.
3. Click "Studio" tab → `StudioPageShell` renders with three cards in Idle state.
4. Click "Generate" on Audio Overview → button enters loading state, job document appears in Firestore `nlm_jobs`.
5. Poll `/api/notebooklm/jobs/<jobId>` manually every 15s to confirm status updates.
6. When job is done, confirm the `<audio>` player appears with a working `src` URL.
