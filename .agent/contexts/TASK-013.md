# TASK-013 Context: Comprehensive Audit of Next.js App Router Pages

## Goal

The user wants a line-by-line codebase audit to ensure absolute perfection, zero errors, and best-in-class code quality across the entire Next.js App Router pages (`src/app/` directory, excluding `src/app/api/`).

## Scope

- All frontend pages (`page.tsx`), layouts (`layout.tsx`), and error boundaries (`error.tsx`, `not-found.tsx`) inside `src/app/`.
- Do NOT review `src/app/api/` (that is covered by TASK-014).

## Objectives

1. **Line-by-Line Review**: Check every line for potential runtime errors, unhandled edge cases, and logical bugs.
2. **React/Next.js Best Practices**: Ensure correct usage of Server vs Client components, proper hook dependencies, and optimal rendering strategies.
3. **Error Handling**: Verify UI graceful degradation (e.g., proper error states instead of white screens).
4. **Typing**: Ensure strict TypeScript adherence with no implicit `any`s.
5. **Cleanup**: Remove unused imports, variables, and stale `console.log` statements.

## Execution Strategy

- Use the codebase-map.md to iterate systematically through the directory.
- Test as you go if you make logic changes.
- Document any fundamental architectural issues as blockers or backlog tasks.
- Create handoff files (`.agent/handoffs/`) regularly to save state if the task takes too long.
