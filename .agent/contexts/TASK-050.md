# TASK-050 — Delete NLM API Routes, Infrastructure & Studio Feature

**Priority**: P0 🔴 CRITICAL  
**Status**: ⬚ PENDING  
**Dependencies**: TASK-049 must be completed first

---

## Objective

Hard-delete all NotebookLM server-side infrastructure and the Studio feature module.
After TASK-049 removed the NLM calls from feature hooks, nothing should reference the NLM
API routes or `src/shared/lib/notebooklm/`. This task removes those directories permanently.

---

## Directories to Delete (entire directory tree)

| Path                         | Reason                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| `src/app/api/notebooklm/`    | All NLM API route handlers                                            |
| `src/shared/lib/notebooklm/` | NLM client, router, service, types, user-notebooks                    |
| `src/features/studio/`       | Studio module — entirely NLM-dependent (audio/video/infographic jobs) |

Use PowerShell `Remove-Item` to delete. Example:

```powershell
Remove-Item -Recurse -Force "src/app/api/notebooklm"
Remove-Item -Recurse -Force "src/shared/lib/notebooklm"
Remove-Item -Recurse -Force "src/features/studio"
```

---

## Files to Modify

### `src/widgets/WorkspaceShell/WorkspaceShell.tsx`

- The "Studio" pill link was added to the sub-nav in TASK-046
- Remove the Studio entry from `SUB_NAV_ITEMS` (or equivalent array/config)

### `src/features/studio` barrel — already deleted above, so:

- Also remove its export from any parent barrel if one exists (check `src/features/index.ts` if it exists)

### `src/app/dashboard/workspace/[workspaceId]/studio/page.tsx`

- Delete this file (the page route for Studio)
- Delete the entire `studio/` directory under `[workspaceId]/`

---

## Verification

After deletions:

```bash
npx tsc --noEmit
npm run lint
```

If there are import errors pointing to deleted files, trace and remove those import statements.
Both commands must exit with zero errors.

Update task registry: mark TASK-050 ✅ COMPLETED when done.  
Update codebase-map.md: remove all references to `src/app/api/notebooklm/`,
`src/shared/lib/notebooklm/`, `src/features/studio/`, and the Studio sub-nav entry.
