# TASK-042 Context: Notebook Lifecycle API Routes

## Goal

Create three Next.js API routes that manage the full lifecycle of a NotebookLM notebook,
wired to the `NlmMcpClient` and the router/quota system from TASK-040 and TASK-041.

## Prerequisites

TASK-040 and TASK-041 must be complete.
Imports from `@/shared/lib/notebooklm` must resolve correctly.

---

## Routes to Create

All routes live under `src/app/api/notebooklm/`.

### Route 1: `POST /api/notebooklm/notebooks`

**File**: `src/app/api/notebooklm/notebooks/route.ts`

**Purpose**: Creates a new NotebookLM notebook on the best available account, stores the
mapping in Firestore, and returns the notebook ID to the client.

**Request body**:

```typescript
{
  workspaceId: string;
  title: string;
}
```

**Logic**:

1. Authenticate the user via `withAuth` middleware (import from `@/shared/lib/api/auth`).
2. Parse and validate body with Zod:
   ```typescript
   const schema = z.object({ workspaceId: z.string().min(1), title: z.string().min(1) });
   ```
3. Check if `getUserNotebook(workspaceId)` already exists — if so, return `409 Conflict` with the existing `notebook_id`.
4. Call `selectProfile('query')` to pick an account.
5. Instantiate `NlmMcpClient` and call `createNotebook(profileName, title)` → get `notebookId`.
6. Call `incrementUsage(profileName, 'query')`.
7. Call `createUserNotebook({ app_user_id, workspace_id, notebook_id, profile_name, title })`.
8. Return `201` with `{ notebook_id: notebookId, profile_name: profileName }`.
9. Wrap in try/catch — if NLM call fails, return `502 Bad Gateway` with descriptive error.

---

### Route 2: `POST /api/notebooklm/notebooks/[notebookId]/sources`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/sources/route.ts`

**Purpose**: Adds a source document/URL to an existing NotebookLM notebook.

**Request body**:

```typescript
{
  workspaceId: string;
  sourceType: 'url' | 'youtube' | 'gdrive';
  value: string;
}
// For file uploads, this will be a multipart FormData request (future extension)
```

**Logic**:

1. Auth via `withAuth`.
2. Parse `notebookId` from URL params.
3. Look up `getUserNotebook(workspaceId)` — verify the requesting user owns this workspace.
   Return `404` if not found, `403` if `app_user_id` doesn't match.
4. Validate body with Zod.
5. Call `NlmMcpClient.addSource(profileName, notebookId, sourceType, value)`.
6. Call `incrementUsage(profileName, 'query')`.
7. Return `200 { success: true }`.

---

### Route 3: `DELETE /api/notebooklm/notebooks/[notebookId]`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/route.ts`

**Purpose**: Deletes a notebook from NotebookLM and removes the Firestore mapping.

**Logic**:

1. Auth via `withAuth`.
2. Parse `notebookId` from URL params.
3. Look up `getUserNotebookByNlmId(notebookId)` — verify requesting user owns it.
4. Call `NlmMcpClient.deleteNotebook(profileName, notebookId)`.
5. Call `deleteUserNotebook(workspaceId)`.
6. Return `200 { success: true }`.
7. If NLM deletion fails, still delete Firestore record (best effort) and log the error.

---

## Error Handling Pattern

Follow the project pattern from `src/shared/lib/api/auth.ts`:

```typescript
return NextResponse.json({ error: 'NLM_QUOTA_EXHAUSTED' }, { status: 503 });
return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
return NextResponse.json({ error: 'Failed to create notebook' }, { status: 502 });
```

## FSD / Code Style Rules

- Use `withAuth` from `@/shared/lib/api/auth` for authentication.
- Use `parseBodyWithZod` from `@/shared/lib/api/auth` for body validation.
- Import NLM utilities from `@/shared/lib/notebooklm`.
- Declare explicit return types: `Promise<NextResponse>`.
- No `any` types.

## Verification

`npx tsc --noEmit | Select-String notebooklm` → zero errors.
Test with `curl` or a REST client:

```bash
curl -X POST http://localhost:3000/api/notebooklm/notebooks \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws_test","title":"Test NLM"}'
```

Expected: `201 { notebook_id: "...", profile_name: "nlm_01" }`.
