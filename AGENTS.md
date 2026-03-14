# AGENTS.md

Guidelines for AI agents working in the Exam-Killer codebase.

## Project Overview

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **AI**: OpenAI GPT-4o, LangChain, Pinecone

## Commands

```bash
npm run dev           # Dev server (http://localhost:3000)
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint (zero warnings)
npm run deploy        # Vercel production
npm run deploy:preview # Vercel preview
```

**Testing**: No framework configured. Use Vitest: `npx vitest run src/test.spec.ts`

## Code Style

### TypeScript

- Avoid `any`, prefer `unknown`
- Use interfaces for objects, type aliases for unions
- Declare return types for functions

```typescript
interface User {
  uid: string;
  email: string;
}
type Status = 'free' | 'premium';
function getUser(id: string): Promise<User> {
  /* ... */
}
```

### React/Next.js

- Use `'use client'` for hooks, server components by default
- Keep client boundaries minimal

```typescript
'use client';
import { useState, useCallback } from 'react';
interface Props { title: string; onAction?: () => void; }
export function Component({ title, onAction }: Props) {
  const [state, setState] = useState<string>('');
  const handle = useCallback(() => onAction?.(), [onAction]);
  return <div onClick={handle}>{title}</div>;
}
```

### Imports (ESLint order)

1. React 2. Next.js 3. Third-party 4. Internal (@/\*) 5. Types

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types';
```

### Naming

| Element        | Convention | Example              |
| -------------- | ---------- | -------------------- |
| Components     | PascalCase | `QuizGenerator`      |
| Functions/vars | camelCase  | `handleGenerate`     |
| Types          | PascalCase | `User`, `Workspace`  |
| Files          | kebab-case | `quiz-generator.tsx` |

### File Structure

```
src/
├── app/           # Pages & API routes
├── components/    # React (quiz/, flashcards/)
├── context/       # AuthContext.tsx
├── lib/           # firebase, openai, paystack
├── types/         # database.ts, api.ts, index.ts
└── store/         # Zustand stores
```

### Error Handling

**API Routes**:

```typescript
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    return NextResponse.json(await create(user.uid, body));
  } catch (e: unknown) {
    console.error('Error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Frontend**:

```typescript
try {
  const r = await fetch('/api/endpoint');
  if (!r.ok) throw new Error((await r.json()).error || 'Failed');
  setData(await r.json());
} catch (e) {
  setError(e instanceof Error ? e.message : 'Error');
}
```

### Tailwind CSS

Order: Layout → Sizing → Spacing → Borders → Background → Typography → States → Responsive.
Custom colors: primary-50-900, secondary-50-900, accent-50-900, success-50-900, error-50-900.

### Firebase

```typescript
// Client
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
if (!isFirebaseConfigured) throw new Error('Firebase not configured');

// Server
import { getAdminDb } from '@/lib/firebase/admin';
const db = getAdminDb();
if (!db) return NextResponse.json({ error: 'Config error' }, { status: 500 });
```

### Firestore

```typescript
const ref = db.collection('workspaces').doc();
await ref.set({ workspace_id: ref.id, user_id: user.uid, created_at: new Date() });
```

## Common Patterns

```typescript
// Loading
{isLoading ? <Spinner /> : <Button>Submit</Button>}

// Form validation
const [errors, setErrors] = useState<Record<string, string>>({});
const validate = () => {
  const e: Record<string, string> = {};
  if (!formData.name) e.name = 'Required';
  setErrors(e);
  return Object.keys(e).length === 0;
};
```

## Environment Variables

See `.env.example`: Firebase, OpenAI, Pinecone, Paystack keys.
