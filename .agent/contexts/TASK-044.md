# TASK-044 Context: Async Job Queue for Long-Running Generations

## Goal

Audio Overviews, Video Overviews, and Infographics take 5–20 minutes to generate.
This task builds the full async job queue system so the student gets an immediate response
and is notified when the job is done.

## Prerequisites

TASK-040, TASK-041, TASK-042, TASK-043 must be complete.

---

## Firestore Collection: `nlm_jobs`

Each document has this shape:

```typescript
interface NlmJob {
  job_id: string; // Firestore document ID (auto-generated)
  app_user_id: string; // Firebase UID of the requesting student
  workspace_id: string; // Exam-Killer workspace ID
  notebook_id: string; // NotebookLM notebook ID
  profile_name: string; // Which pool account to use
  job_type: 'audio' | 'video' | 'infographic';
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null; // Firebase Storage URL, populated when done
  error_message: string | null; // Populated if status === 'error'
  retry_count: number; // Max 2 retries
  created_at: FirebaseFirestore.Timestamp;
  completed_at: FirebaseFirestore.Timestamp | null;
}
```

Add `NlmJob` to `src/shared/lib/notebooklm/types.ts`.

---

## Step 1 — Create Job Submission API Route

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/jobs/route.ts`

**Method**: `POST`

Request body:

```typescript
{
  workspaceId: string;
  jobType: 'audio' | 'video' | 'infographic';
}
```

Logic:

1. Auth via `withAuth`.
2. Parse `notebookId` from URL params.
3. Validate body with Zod.
4. `getUserNotebookByNlmId(notebookId)` → verify ownership, get `profile_name`.
5. Check if an identical pending/processing job already exists for this workspace+jobType — if so return `409` with the existing `job_id`.
6. Create a new `nlm_jobs` document in Firestore with `status: 'pending'`, `result_url: null`, `retry_count: 0`.
7. Return `202 { job_id: <docId> }` immediately — do NOT wait for generation.

---

## Step 2 — Create Job Status API Route

**File**: `src/app/api/notebooklm/jobs/[jobId]/route.ts`

**Method**: `GET`

Logic:

1. Auth via `withAuth`.
2. Parse `jobId` from URL params.
3. Fetch the `nlm_jobs` document.
4. Verify `app_user_id` matches the authenticated user.
5. Return `200` with the full job document (omit internal `profile_name` from the response).

Response shape:

```typescript
{
  job_id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null;
  error_message: string | null;
  created_at: string; // ISO string
  completed_at: string | null;
}
```

---

## Step 3 — Create Firebase Cloud Function Worker

**File**: `functions/src/nlmJobWorker.ts`

This is a Firestore `onCreate` trigger that fires when a new `nlm_jobs` document is created.

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { NlmMcpClient } from '../../src/shared/lib/notebooklm/client';
// Note: adjust import path based on how functions/ is set up relative to src/

export const nlmJobWorker = onDocumentCreated('nlm_jobs/{jobId}', async (event) => {
  const db = getFirestore();
  const jobRef = event.data?.ref;
  const job = event.data?.data() as NlmJob;

  if (!job || job.status !== 'pending') return;

  // Mark as processing
  await jobRef.update({ status: 'processing' });

  const client = new NlmMcpClient();
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const rawResult = await client.generate(job.profile_name, job.notebook_id, job.job_type);

      // rawResult is a local file path or binary blob from the CLI
      // Upload to Firebase Storage
      const bucket = getStorage().bucket();
      const destPath = `nlm-outputs/${job.app_user_id}/${event.params.jobId}.${getExtension(job.job_type)}`;
      await bucket.upload(rawResult, { destination: destPath, public: false });
      const [url] = await bucket
        .file(destPath)
        .getSignedUrl({ action: 'read', expires: '2099-01-01' });

      await jobRef.update({
        status: 'done',
        result_url: url,
        completed_at: Timestamp.now(),
        retry_count: attempt,
      });
      return; // success — exit
    } catch (e: unknown) {
      if (attempt === maxRetries) {
        await jobRef.update({
          status: 'error',
          error_message: e instanceof Error ? e.message : 'Unknown error',
          completed_at: Timestamp.now(),
        });
      }
      // else loop and retry
    }
  }
});

function getExtension(jobType: string) {
  return { audio: 'mp3', video: 'mp4', infographic: 'png' }[jobType] ?? 'bin';
}
```

Export from `functions/src/index.ts`:

```typescript
export { nlmJobWorker } from './nlmJobWorker';
export { nlmDailyReset } from './nlmDailyReset';
```

---

## Step 4 — Add Helper to notebooklm lib

Add to `src/shared/lib/notebooklm/user-notebooks.ts`:

```typescript
export async function createJob(
  data: Omit<NlmJob, 'job_id' | 'created_at' | 'completed_at' | 'retry_count'>,
): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection('nlm_jobs').doc();
  await ref.set({
    ...data,
    job_id: ref.id,
    created_at: Timestamp.now(),
    completed_at: null,
    retry_count: 0,
  });
  return ref.id;
}

export async function getJob(jobId: string): Promise<NlmJob | null> {
  const db = getAdminDb();
  const doc = await db.collection('nlm_jobs').doc(jobId).get();
  return doc.exists ? (doc.data() as NlmJob) : null;
}
```

---

## Frontend Polling Note (for agent working on TASK-045/046)

The frontend should poll `GET /api/notebooklm/jobs/<jobId>` every 15 seconds until
`status === 'done'` or `status === 'error'`. Implement with `setInterval` that clears
itself when the terminal status is reached. A Firestore real-time listener is an
alternative but polling is simpler for the prototype.

---

## Files to Create / Modify

| File                                                          | Type                               |
| ------------------------------------------------------------- | ---------------------------------- |
| `src/app/api/notebooklm/notebooks/[notebookId]/jobs/route.ts` | NEW                                |
| `src/app/api/notebooklm/jobs/[jobId]/route.ts`                | NEW                                |
| `functions/src/nlmJobWorker.ts`                               | NEW                                |
| `functions/src/index.ts`                                      | MODIFY (add export)                |
| `src/shared/lib/notebooklm/types.ts`                          | MODIFY (add `NlmJob`)              |
| `src/shared/lib/notebooklm/user-notebooks.ts`                 | MODIFY (add `createJob`, `getJob`) |

## Verification

`npx tsc --noEmit` → zero errors in new files.
Create a test job via:

```bash
curl -X POST http://localhost:3000/api/notebooklm/notebooks/<id>/jobs \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws_test","jobType":"audio"}'
```

Expected: `202 { job_id: "abc123" }`.
Then poll: `curl http://localhost:3000/api/notebooklm/jobs/abc123`.
