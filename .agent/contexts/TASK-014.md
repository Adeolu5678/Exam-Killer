# TASK-014 Context: Comprehensive Audit of API Routes

## Goal

The user wants a line-by-line codebase audit to ensure absolute perfection, zero errors, and best-in-class code quality across the entire backend API (`src/app/api/` directory).

## Scope

- All `route.ts` files inside `src/app/api/`.

## Objectives

1. **Line-by-Line Review**: Check every line for missing `await`s, unhandled promises, and logical flaws.
2. **Security & Validation**: Ensure every route validates incoming data (e.g., Zod schemas), authenticates requests (via `withAuth` wrapper), and handles unauthorized states properly.
3. **Robust Error Handling**: Verify that `try/catch` blocks wrap all database and external API (OpenAI, Paystack) interactions. Return standard error structures using the `errorResponse` utility.
4. **Performance**: Prevent `N+1` queries or slow external API blocking where background execution could be used, or ensure timeouts are handled gracefully.

## Execution Strategy

- Iterate systematically through the endpoints listed in `codebase-map.md`.
- Document any fundamental architectural issues as blockers.
- Use handoffs if the review exceeds a single agent session.
