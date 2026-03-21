# 🗺️ CODEBASE MAP

> **Purpose**: Quick navigation guide for finding relevant files.
> **Project**: Exam-Killer
> **Technology**: Next.js 14, TypeScript, Firebase, Tailwind CSS
> **Last Updated**: 2026-03-03

---

## 📁 Project Structure

```
project-root/
├── .agent/              # 🤖 Workflow system
│   ├── workflows/
│   ├── docs/
│   ├── contexts/
│   └── handoffs/
│
├── src/                 # 📦 Source code
│   ├── app/            # Next.js App Router pages (thin, no logic)
│   ├── features/       # FSD feature modules (workspace, flashcards, tutor)
│   ├── widgets/        # Composed UI blocks (AppShell, WorkspaceShell)
│   ├── shared/         # Zero-business-logic primitives (ui/, hooks/, lib/)
│   ├── styles/         # Design tokens (globals.css, animations.css)
│   ├── components/     # Legacy components (being phased out by FSD)
│   ├── context/        # React context (AuthContext)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Libraries and utilities
│   ├── store/          # Zustand state management stores
│   └── types/          # TypeScript type definitions
│
├── tests/              # 🧪 Test files
└── [config files]     # ⚙️ package.json, tsconfig.json, etc.
```

---

## 🏷️ Directory Purposes

| Directory         | Purpose                  | When to Look Here                  |
| ----------------- | ------------------------ | ---------------------------------- |
| `./.agent/`       | Workflow system          | Always start here                  |
| `src/app/`        | Next.js App Router pages | Page routes, API routes, layouts   |
| `src/components/` | React components         | UI components organized by feature |
| `src/context/`    | React context            | Global state (AuthContext)         |
| `src/hooks/`      | Custom React hooks       | Reusable logic hooks               |
| `src/lib/`        | Libraries and utilities  | Firebase, OpenAI, API clients, RAG |
| `src/store/`      | Zustand stores           | Client state management            |
| `src/types/`      | TypeScript definitions   | Shared types and interfaces        |
| `tests/`          | Test files               | Adding/fixing tests                |

---

## 🌐 src/app/ Structure

| Path                                                     | Purpose                         |
| -------------------------------------------------------- | ------------------------------- |
| `/auth/login/page.tsx`                                   | Login page                      |
| `/auth/signup/page.tsx`                                  | Signup page                     |
| `/dashboard/page.tsx`                                    | Main dashboard                  |
| `/dashboard/workspace/[workspaceId]/page.tsx`            | Workspace detail                |
| `/dashboard/workspace/[workspaceId]/chat/page.tsx`       | AI Tutor chat                   |
| `/dashboard/workspace/[workspaceId]/flashcards/page.tsx` | Flashcards feature              |
| `/dashboard/workspace/[workspaceId]/quiz/page.tsx`       | Quiz practice                   |
| `/dashboard/workspace/[workspaceId]/exam/page.tsx`       | Exam simulator                  |
| `/dashboard/analytics/page.tsx`                          | Analytics dashboard             |
| `/study-plan/page.tsx`                                   | Study plan page                 |
| `/pricing/page.tsx`                                      | Pricing page                    |
| `/page.tsx`                                              | Marketing landing page          |
| `/api/`                                                  | API routes organized by feature |

---

## 🧩 src/components/ Structure

| Directory     | Components                                                           |
| ------------- | -------------------------------------------------------------------- |
| `analytics/`  | ProgressRing, ActivityChart, StreakTracker, StatsCard                |
| `chat/`       | ChatWindow, ChatInput, MessageBubble                                 |
| `exam/`       | ExamGenerator, ExamPlayer, ExamList, ExamResult                      |
| `export/`     | ExportFlashcards, ShareButtons                                       |
| `flashcards/` | FlashcardCreator, FlashcardGenerator, FlashcardReview, FlashcardList |
| `quiz/`       | QuizGenerator, QuizList, QuizPlayer, QuizResult                      |
| `sources/`    | SourceUploader, SourceList                                           |
| `study-plan/` | StudyPlanGenerator, StudyPlanList                                    |
| `workspace/`  | WorkspaceMembers, ShareWorkspaceModal                                |
| `workspaces/` | CreateWorkspaceModal, WorkspaceForm, WorkspaceList                   |
| `Navbar.tsx`  | Navigation header                                                    |

---

## 📚 src/lib/ Structure

| Directory/File         | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `api/`                 | API client functions (sources.ts, workspace.ts)           |
| `firebase/`            | Firebase config, client, admin, server-auth               |
| `openai/`              | OpenAI client and prompts                                 |
| `paystack/`            | Payment integration (client, subscription, db)            |
| `rag/`                 | RAG system (chunker, embeddings, retriever, vector-store) |
| `spaced-repetition.ts` | SRS algorithm                                             |
| `routes.ts`            | Route definitions                                         |

---

## 🏪 src/store/ Structure

| File                 | Purpose                    |
| -------------------- | -------------------------- |
| `chat-store.ts`      | Chat state management      |
| `flashcard-store.ts` | Flashcard state management |
| `quiz-store.ts`      | Quiz state management      |

---

## 🔌 API Routes

| Route               | Purpose               |
| ------------------- | --------------------- |
| `/api/auth/*`       | Authentication        |
| `/api/payments/*`   | Paystack payments     |
| `/api/workspaces/*` | Workspace management  |
| `/api/sources/*`    | Source materials      |
| `/api/flashcards/*` | Flashcard operations  |
| `/api/quiz/*`       | Quiz operations       |
| `/api/exam/*`       | Exam operations       |
| `/api/chat/tutor`   | AI tutor              |
| `/api/study-plan/*` | Study plans           |
| `/api/analytics/*`  | Analytics data        |
| `/api/export/*`     | Export functionality  |
| `/api/share/*`      | Sharing functionality |

---

## 🔎 Quick Find Guide

| Looking For      | Check These Locations                                 |
| ---------------- | ----------------------------------------------------- |
| Page routes      | `src/app/`                                            |
| API endpoints    | `src/app/api/`                                        |
| UI components    | `src/components/<feature>/`                           |
| Business logic   | `src/lib/`, `src/hooks/`                              |
| State management | `src/store/`, `src/context/`                          |
| Type definitions | `src/types/`                                          |
| Configuration    | `package.json`, `tsconfig.json`, `tailwind.config.ts` |
| Tests            | `tests/`, `__tests__/`                                |
| Authentication   | `src/lib/firebase/`, `src/context/AuthContext.tsx`    |
| AI/OpenAI        | `src/lib/openai/`                                     |
| Payments         | `src/lib/paystack/`                                   |
| RAG system       | `src/lib/rag/`                                        |

---

## 📌 Key Files

| File                           | Purpose                       |
| ------------------------------ | ----------------------------- |
| `src/lib/firebase/client.ts`   | Firebase client configuration |
| `src/lib/firebase/admin.ts`    | Firebase Admin SDK            |
| `src/context/AuthContext.tsx`  | Authentication context        |
| `src/lib/routes.ts`            | Application route definitions |
| `src/lib/spaced-repetition.ts` | SRS algorithm implementation  |
| `tailwind.config.ts`           | Tailwind CSS configuration    |
| `next.config.js`               | Next.js configuration         |
| `tsconfig.json`                | TypeScript configuration      |

---

## 🔗 Related Documentation

- Task Registry: `./.agent/docs/task-registry.md`
- Workflow Guide: `./.agent/workflows/ralph.md`

---

> ⚠️ **MAINTENANCE**: When adding new directories or key files, UPDATE THIS MAP.

---

## ⚠️ Infrastructure Notes

**Pinecone Index Dimension Change (2026-03-20)**:
The embedding model changed to Gemini text-embedding-004 (768 dims).
The `exam-killer` Pinecone index must be manually deleted and recreated at 768 dimensions.
See the comment in `src/shared/lib/rag/vector-store.ts` for exact steps.
