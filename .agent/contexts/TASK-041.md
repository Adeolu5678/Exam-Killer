# TASK-041 Context: Router Service & Quota Tracker

## Goal

Build the load-balancing router that intelligently distributes requests across the
NotebookLM account pool, tracks daily usage, and resets counters at midnight.
Also establish the `user_notebooks` Firestore collection for mapping students to their notebooks.

## Prerequisite

TASK-040 must be complete. `NlmMcpClient` and `notebooklm_accounts` Firestore collection must exist.

---

## Step-by-Step Instructions

### Step 1 — Create `src/shared/lib/notebooklm/router.ts`

This is the heart of the load balancer.

#### `selectProfile(jobType)` function

```typescript
type JobType = 'query' | 'audio' | 'video';

export async function selectProfile(jobType: JobType): Promise<string>;
```

Logic:

1. Fetch all documents from Firestore `notebooklm_accounts` where `is_active == true`.
2. Filter to only accounts that haven't exceeded the quota for the requested `jobType`:
   - `'query'`: `daily_queries_used < daily_quota_queries`
   - `'audio'`: `daily_audio_used < daily_quota_audio`
   - `'video'`: `daily_video_used < daily_quota_video`
3. If no eligible accounts exist → throw `new Error('NLM_QUOTA_EXHAUSTED')`.
4. Sort by lowest usage ratio: `used / quota` ascending.
5. Return `eligible[0].profile_name`.

#### `incrementUsage(profileName, jobType)` function

```typescript
export async function incrementUsage(profileName: string, jobType: JobType): Promise<void>;
```

Logic:

- Update the Firestore doc for `profileName` using `FieldValue.increment(1)` on the
  appropriate field (`daily_queries_used`, `daily_audio_used`, or `daily_video_used`).
- If after incrementing the value meets or exceeds the quota, set `is_active: false`
  as well in the same update (read-then-write is fine here since exact quota is a soft limit).

#### `markAccountInactive(profileName)` function

```typescript
export async function markAccountInactive(profileName: string): Promise<void>;
```

Sets `is_active: false` in Firestore. Called if the MCP client returns an auth error.

---

### Step 2 — Create `src/shared/lib/notebooklm/user-notebooks.ts`

CRUD helpers for the `user_notebooks` Firestore collection.

#### Collection document shape:

```typescript
interface UserNotebook {
  id: string; // Firestore doc ID (auto)
  app_user_id: string; // Firebase UID of the student
  workspace_id: string; // Exam-Killer workspace ID this notebook belongs to
  notebook_id: string; // NotebookLM notebook ID
  profile_name: string; // Which pool account owns this notebook
  title: string; // Notebook title (mirrors workspace name)
  created_at: FirebaseFirestore.Timestamp;
}
```

#### Required functions:

```typescript
// Creates a new user_notebooks document after a notebook is created in NLM.
export async function createUserNotebook(
  data: Omit<UserNotebook, 'id' | 'created_at'>,
): Promise<string>;

// Returns the UserNotebook for a given workspace. Returns null if not yet linked.
export async function getUserNotebook(workspaceId: string): Promise<UserNotebook | null>;

// Returns the UserNotebook by its NLM notebook ID.
export async function getUserNotebookByNlmId(notebookId: string): Promise<UserNotebook | null>;

// Deletes the Firestore mapping record.
export async function deleteUserNotebook(workspaceId: string): Promise<void>;
```

---

### Step 3 — Create Daily Reset Cloud Function

Create file: `functions/src/nlmDailyReset.ts` (or integrate into existing Firebase Functions
if the project already has a `functions/` directory — check first).

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Runs at 00:01 UTC every day
export const nlmDailyReset = onSchedule('1 0 * * *', async () => {
  const db = getFirestore();
  const snapshot = await db.collection('notebooklm_accounts').get();
  const batch = db.batch();
  const today = new Date().toISOString().split('T')[0];

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      daily_queries_used: 0,
      daily_audio_used: 0,
      daily_video_used: 0,
      is_active: true,
      last_reset_date: today,
    });
  });

  await batch.commit();
});
```

If a `functions/` directory doesn't exist yet, you only need to create `functions/src/nlmDailyReset.ts`
and export it from `functions/src/index.ts`. The function will be deployed via `firebase deploy --only functions`.

---

### Step 4 — Export from barrel

Add to `src/shared/lib/notebooklm/index.ts`:

```typescript
export { selectProfile, incrementUsage, markAccountInactive } from './router';
export {
  createUserNotebook,
  getUserNotebook,
  getUserNotebookByNlmId,
  deleteUserNotebook,
} from './user-notebooks';
export type { UserNotebook } from './user-notebooks';
```

---

## Files to Create

| File                                          | Purpose                                                  |
| --------------------------------------------- | -------------------------------------------------------- |
| `src/shared/lib/notebooklm/router.ts`         | `selectProfile`, `incrementUsage`, `markAccountInactive` |
| `src/shared/lib/notebooklm/user-notebooks.ts` | Firestore CRUD for `user_notebooks` collection           |
| `functions/src/nlmDailyReset.ts`              | Scheduled Cloud Function (daily quota reset)             |
| `src/shared/lib/notebooklm/index.ts`          | Barrel export for the notebooklm lib module              |

## FSD Rules

All files in `src/shared/lib/` — no imports from `features/`, `widgets/`, or `app/`.
Use `src/shared/lib/firebase/admin.ts` for the Firestore Admin DB instance.

## Verification

Run `npx tsc --noEmit`. Zero errors in the new files.
Write a quick local test: call `selectProfile('query')` and log the returned profile name.
