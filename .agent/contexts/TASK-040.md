# TASK-040 Context: NotebookLM Server-Side MCP Client & Account Pool

## Goal

Stand up the infrastructure that allows the Exam-Killer backend to programmatically talk to
multiple NotebookLM Pro accounts. By the end of this task:

1. `notebooklm-mcp-cli` is installed on the server and all accounts are authenticated.
2. A `NlmMcpClient` TypeScript class exists that can run any CLI command for any named profile.
3. A `notebooklm_accounts` Firestore collection exists with one document per account.

---

## Background

The tool being used is `notebooklm-mcp-cli` by jacob-bd:

- Install: `uv tool install notebooklm-mcp-cli`
- Auth per account: `nlm login --profile <name>` (opens Chrome, you log in)
- Credentials saved at: `~/.notebooklm-mcp-cli/profiles/<name>/auth.json`
- CLI check: `nlm login --check --profile <name>`

This project is a **Next.js 14 App Router** app (TypeScript strict, Firebase Firestore,
Tailwind CSS). All backend code lives in `src/app/api/` and shared utilities in
`src/shared/lib/`. Read `.agent/docs/codebase-map.md` for navigation.

---

## Step-by-Step Instructions

### Step 1 — Install `uv` and `notebooklm-mcp-cli` on the server

Run in the project root terminal:

```bash
# Install uv (Windows PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install the CLI tool
uv tool install notebooklm-mcp-cli
```

Verify install succeeded:

```bash
nlm --version
```

Document the version number in a comment inside `src/shared/lib/notebooklm/client.ts`.

### Step 2 — Authenticate each Google Account

For each NotebookLM Pro account (e.g., 3–5 accounts), run:

```bash
nlm login --profile nlm_01
nlm login --profile nlm_02
nlm login --profile nlm_03
# ...
```

Each command opens a Chrome window. Complete the Google login. After each, verify:

```bash
nlm login --check --profile nlm_01
```

The output should say "Authenticated" or similar.

### Step 3 — Create Firestore `notebooklm_accounts` collection

In Firestore (use Firebase Admin SDK in a one-time seed script), create one document per
account with this exact shape:

```typescript
interface NlmAccount {
  profile_name: string; // "nlm_01" — matches the CLI profile name exactly
  email: string; // The Google account email, for your reference
  is_active: boolean; // true
  daily_queries_used: number; // 0
  daily_audio_used: number; // 0
  daily_video_used: number; // 0
  daily_quota_queries: number; // 480  (buffer below 500 hard limit)
  daily_quota_audio: number; // 18   (buffer below 20 hard limit)
  daily_quota_video: number; // 8
  last_reset_date: string; // "YYYY-MM-DD" format
}
```

Create the seed script at `src/shared/lib/notebooklm/seed-accounts.ts`.
Run it once manually: `npx ts-node src/shared/lib/notebooklm/seed-accounts.ts`

### Step 4 — Build `NlmMcpClient` service class

Create file: `src/shared/lib/notebooklm/client.ts`

This class wraps the `notebooklm-mcp-cli` tool. Use Node.js `child_process.execAsync`
(promisified `exec`) to run CLI commands.

#### Required methods:

```typescript
export class NlmMcpClient {
  // Creates a new notebook on the given profile. Returns the notebook ID.
  async createNotebook(profileName: string, title: string): Promise<string>;

  // Adds a source to a notebook. sourceType: 'url' | 'file' | 'youtube' | 'gdrive'
  async addSource(
    profileName: string,
    notebookId: string,
    sourceType: string,
    value: string,
  ): Promise<void>;

  // Sends a chat query to a notebook. Returns the response text.
  async query(profileName: string, notebookId: string, prompt: string): Promise<string>;

  // Requests a Studio output. jobType: 'audio' | 'video' | 'infographic' | 'flashcards' | 'quiz' | 'mind-map' | 'study-guide'
  // Returns the raw output (text for structured types, URL or blob path for media types)
  async generate(profileName: string, notebookId: string, jobType: string): Promise<string>;

  // Deletes a notebook.
  async deleteNotebook(profileName: string, notebookId: string): Promise<void>;
}
```

#### CLI command patterns to use (from `nlm --help`):

- `nlm create-notebook --profile <name> --title "<title>"`
- `nlm add-source --profile <name> --notebook <id> --url <url>` (for URLs)
- `nlm add-source --profile <name> --notebook <id> --file <path>` (for files)
- `nlm query --profile <name> --notebook <id> --prompt "<text>"`
- `nlm generate --profile <name> --notebook <id> --type <type>`
- `nlm delete-notebook --profile <name> --notebook <id>`

**Important**: Parse CLI stdout to extract the notebook ID after `create-notebook`.
Handle non-zero exit codes by throwing a typed `NlmClientError`.

### Step 5 — Export from shared lib barrel

Add to `src/shared/lib/index.ts` (or create if not exists):

```typescript
export { NlmMcpClient } from './notebooklm/client';
export type { NlmAccount } from './notebooklm/types';
```

Create `src/shared/lib/notebooklm/types.ts` with the `NlmAccount` interface.

---

## Files to Create

| File                                         | Purpose                           |
| -------------------------------------------- | --------------------------------- |
| `src/shared/lib/notebooklm/client.ts`        | `NlmMcpClient` class              |
| `src/shared/lib/notebooklm/types.ts`         | `NlmAccount` TypeScript interface |
| `src/shared/lib/notebooklm/seed-accounts.ts` | One-time Firestore seeder script  |

## FSD Layer Rules

- This code lives in `src/shared/lib/` — it MUST NOT import from `features/`, `widgets/`, or `app/`.
- Use `src/shared/lib/firebase/admin.ts` to get the Firestore Admin DB instance.

## Verification

Run `npx tsc --noEmit` after creating files. Zero errors expected in the new files.
Test the client manually by creating a small test script at `/tmp/test-nlm.ts` that
instantiates `NlmMcpClient` and calls `createNotebook('nlm_01', 'Test NLM')`,
logging the returned notebook ID.
