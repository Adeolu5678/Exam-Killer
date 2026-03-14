# Exam-Killer — System Specification Document (SSD)

## 0. Product Vision

### 0.1 Core Concept

Exam-Killer is an **AI-Powered Personal Study Companion** that transforms how students learn and prepare for exams. Drawing inspiration from NotebookLM, the platform provides:

- **Study Workspaces**: Organized spaces for each course or subject where students can upload reference materials, generate study content, and track progress
- **Personal AI Tutor**: A customizable AI tutor with selectable personalities (mentor, drill sergeant, peer, professor, storyteller, coach) that adapts to the student's learning style
- **Spaced Repetition Flashcards**: AI-generated flashcards using the SM-2 algorithm for optimal retention
- **Collaborative Workspaces**: Share workspaces with study groups, assign roles, and learn together
- **Content Generation from Uploaded Files**: Upload PDFs, images, or notes and automatically generate flashcards, quizzes, and summaries using RAG (Retrieval-Augmented Generation)

### 0.2 Key Differentiators

| Feature          | Traditional Study Apps    | Exam-Killer                                      |
| ---------------- | ------------------------- | ------------------------------------------------ |
| Content Source   | Pre-loaded question banks | User-uploaded materials + existing question bank |
| AI Interaction   | Generic explanations      | Personalized tutor with customizable personality |
| Study Method     | Passive reading           | Active recall with spaced repetition             |
| Collaboration    | None                      | Shared workspaces with role-based access         |
| Content Creation | Manual                    | AI-generated from uploaded documents             |

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Client
        WEB[Next.js PWA]
        MOBILE[Mobile Browser/PWA]
    end

    subgraph Vercel
        NEXT[Next.js 14 App Router]
        API[API Routes]
        MW[Middleware]
    end

    subgraph Firebase
        AUTH[Firebase Auth]
        DB[(Firestore NoSQL)]
        STORAGE[Cloud Storage]
        RULES[Security Rules]
    end

    subgraph AI_Services
        OPENAI[OpenAI GPT-4o]
        EMBED[OpenAI Embeddings]
        LANGCHAIN[LangChain]
    end

    subgraph Vector_Store
        PINECONE[Pinecone]
        VERTEX[Firebase Vertex AI]
    end

    subgraph External
        PAYSTACK[Paystack API]
    end

    WEB --> NEXT
    MOBILE --> NEXT
    NEXT --> MW
    MW --> AUTH
    MW --> API
    API --> DB
    API --> STORAGE
    API --> OPENAI
    API --> EMBED
    API --> LANGCHAIN
    API --> PINECONE
    API --> VERTEX
    API --> PAYSTACK
    AUTH --> DB
    DB --> RULES
    STORAGE --> LANGCHAIN
    LANGCHAIN --> EMBED
    EMBED --> PINECONE
    EMBED --> VERTEX
```

### 1.2 RAG Pipeline Architecture

```mermaid
graph LR
    subgraph Ingestion
        UPLOAD[File Upload]
        EXTRACT[Text Extraction]
        CHUNK[Chunking]
        EMBED_GEN[Generate Embeddings]
        STORE[Store in Vector DB]
    end

    subgraph Retrieval
        QUERY[User Query]
        Q_EMBED[Query Embedding]
        VSEARCH[Vector Search]
        CONTEXT[Context Retrieval]
        LLM[LLM Generation]
        RESPONSE[Response]
    end

    UPLOAD --> EXTRACT
    EXTRACT --> CHUNK
    CHUNK --> EMBED_GEN
    EMBED_GEN --> STORE

    QUERY --> Q_EMBED
    Q_EMBED --> VSEARCH
    VSEARCH --> CONTEXT
    CONTEXT --> LLM
    LLM --> RESPONSE

    STORE -.-> VSEARCH
```

### 1.3 Request Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant M as Middleware
    participant A as Firebase Auth
    participant D as Database
    participant V as Vector Store
    participant O as OpenAI
    participant P as Paystack

    U->>N: Request Page
    N->>M: Check Auth
    M->>A: Validate Session
    A-->>M: Session Valid
    M-->>N: Proceed

    alt Protected Route
        M->>M: Check is_paid
        M-->>N: Allow/Deny
    end

    N->>D: Fetch Data
    D-->>N: Return Data

    alt Need AI Response (RAG)
        N->>V: Search Relevant Context
        V-->>N: Return Chunks
        N->>O: Generate with Context
        O-->>N: Return Response
        N->>D: Cache Response
    end

    alt Tutor Chat
        N->>V: Search Workspace Sources
        V-->>N: Relevant Context
        N->>O: Chat with Tutor Personality
        O-->>N: Tutor Response
    end

    N-->>U: Render Page
```

---

## 2. Complete Database Schema (Firestore)

### 2.1 Collections & Subcollections

```javascript
/*
🔥 Firestore Database Structure
*/

users (Collection)
  - uid (String, Document ID from Firebase Auth)
  - email (String)
  - full_name (String)
  - subscription_status (String: 'free' | 'premium' | 'active')
  - subscription_tier (String)
  - paid_until (Timestamp)
  - free_explanations_used (Number)
  - free_ai_queries_used (Number)
  - free_ai_queries_limit (Number, default 5)
  - current_streak (Number)
  - total_xp (Number)
  - preferred_tutor_personality (String: 'mentor' | 'drill' | 'peer' | 'professor' | 'storyteller' | 'coach')
  - created_at (Timestamp)

workspaces (Collection)
  - workspace_id (String, Auto-ID)
  - user_id (String, owner)
  - name (String)
  - description (String)
  - course_code (String, optional)
  - university (String, optional)
  - tutor_personality (String: 'mentor' | 'drill' | 'peer' | 'professor' | 'storyteller' | 'coach')
  - tutor_custom_instructions (String, optional)
  - is_public (Boolean)
  - created_at (Timestamp)
  - last_accessed (Timestamp)

sources (Collection)
  - source_id (String, Auto-ID)
  - workspace_id (String)
  - user_id (String)
  - type (String: 'pdf' | 'image' | 'text' | 'link' | 'note')
  - file_url (String)
  - file_name (String)
  - file_size_bytes (Number)
  - processed (Boolean)
  - chunk_count (Number)
  - embedding_status (String: 'pending' | 'completed' | 'failed')
  - created_at (Timestamp)

flashcards (Collection)
  - flashcard_id (String, Auto-ID)
  - workspace_id (String)
  - source_id (String, optional)
  - front (String)
  - back (String)
  - tags (Array of Strings)
  - difficulty (Number: 0-5, SM-2 algorithm)
  - ease_factor (Number, default 2.5)
  - interval (Number, days)
  - next_review (Timestamp)
  - review_count (Number)
  - last_review (Timestamp)
  - created_at (Timestamp)

tutor_sessions (Collection)
  - session_id (String, Auto-ID)
  - workspace_id (String)
  - user_id (String)
  - messages (Array of Objects: {role, content, timestamp})
  - topic_focus (String, optional)
  - started_at (Timestamp)
  - ended_at (Timestamp)
  - message_count (Number)

workspace_members (Collection)
  - id (String, Auto-ID)
  - workspace_id (String)
  - user_id (String)
  - role (String: 'owner' | 'admin' | 'member')
  - invited_by (String, user_id)
  - joined_at (Timestamp)

practice_sessions (Collection)
  - session_id (String, Auto-ID)
  - workspace_id (String)
  - user_id (String)
  - session_type (String: 'quiz' | 'flashcard' | 'exam_simulator' | 'custom')
  - score (Number)
  - total_questions (Number)
  - correct_count (Number)
  - questions (Array)
  - topic_breakdown (Object)
  - duration_seconds (Number)
  - completed_at (Timestamp)

courses (Collection)
  - course_id (String, Auto-ID)
  - code (String, e.g., "CSC 101")
  - title (String)
  - department (String)
  - level (Number)
  - is_active (Boolean)
  - created_at (Timestamp)

topics (Collection)
  - topic_id (String, Auto-ID)
  - course_id (String, Refers to courses)
  - name (String)
  - question_count (Number)

questions (Collection)
  - question_id (String, Auto-ID)
  - course_id (String, Refers to courses)
  - topic_id (String, Refers to topics)
  - year (Number)
  - semester (String)
  - question_number (Number)
  - question_text (String)
  - question_image_url (String)
  - explanation_status (String: 'pending' | 'completed')
  - created_at (Timestamp)

explanations (Collection)
  - explanation_id (String, matches question_id)
  - question_id (String)
  - explanation_text (String)
  - step_by_step (Array of Objects)
  - formulas_used (Array of Strings)
  - model_used (String)
  - generated_at (Timestamp)

payments (Collection)
  - payment_id (String, Paystack Reference)
  - user_id (String)
  - amount_kobo (Number)
  - status (String: 'success' | 'failed' | 'pending')
  - initiated_at (Timestamp)

vector_chunks (Collection)
  - chunk_id (String, Auto-ID)
  - source_id (String)
  - workspace_id (String)
  - content (String)
  - chunk_index (Number)
  - embedding_id (String, Pinecone/Vertex ID)
  - metadata (Object)
  - created_at (Timestamp)
```

### 2.2 TypeScript Interfaces

```typescript
// types/database.ts

export interface User {
  uid: string;
  email: string;
  full_name: string;
  subscription_status: 'free' | 'premium' | 'active';
  subscription_tier?: string;
  paid_until?: Date;
  free_explanations_used: number;
  free_ai_queries_used: number;
  free_ai_queries_limit: number;
  current_streak: number;
  total_xp: number;
  preferred_tutor_personality: TutorPersonality;
  created_at: Date;
}

export type TutorPersonality = 'mentor' | 'drill' | 'peer' | 'professor' | 'storyteller' | 'coach';

export interface Workspace {
  workspace_id: string;
  user_id: string;
  name: string;
  description: string;
  course_code?: string;
  university?: string;
  tutor_personality: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public: boolean;
  created_at: Date;
  last_accessed: Date;
}

export interface Source {
  source_id: string;
  workspace_id: string;
  user_id: string;
  type: 'pdf' | 'image' | 'text' | 'link' | 'note';
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  embedding_status: 'pending' | 'completed' | 'failed';
  created_at: Date;
}

export interface Flashcard {
  flashcard_id: string;
  workspace_id: string;
  source_id?: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: number; // 0-5, SM-2 algorithm
  ease_factor: number; // default 2.5
  interval: number; // days
  next_review: Date;
  review_count: number;
  last_review?: Date;
  created_at: Date;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TutorSession {
  session_id: string;
  workspace_id: string;
  user_id: string;
  messages: TutorMessage[];
  topic_focus?: string;
  started_at: Date;
  ended_at?: Date;
  message_count: number;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by: string;
  joined_at: Date;
}

export interface PracticeSession {
  session_id: string;
  workspace_id: string;
  user_id: string;
  session_type: 'quiz' | 'flashcard' | 'exam_simulator' | 'custom';
  score: number;
  total_questions: number;
  correct_count: number;
  questions: PracticeQuestion[];
  topic_breakdown: Record<string, { correct: number; total: number }>;
  duration_seconds: number;
  completed_at: Date;
}

export interface PracticeQuestion {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface VectorChunk {
  chunk_id: string;
  source_id: string;
  workspace_id: string;
  content: string;
  chunk_index: number;
  embedding_id: string;
  metadata: {
    page_number?: number;
    section?: string;
    source_type: string;
  };
  created_at: Date;
}
```

### 2.3 Firebase Security Rules (Replaces RLS)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function getUserId() {
      return request.auth.uid;
    }

    function isOwner(userId) {
      return isSignedIn() && getUserId() == userId;
    }

    function getWorkspaceRole(workspaceId) {
      let member = get(/databases/$(database)/documents/workspace_members/$(workspaceId)_$(getUserId()));
      return member.exists ? member.data.role : null;
    }

    function isWorkspaceMember(workspaceId) {
      return getWorkspaceRole(workspaceId) != null;
    }

    function isWorkspaceAdmin(workspaceId) {
      let role = getWorkspaceRole(workspaceId);
      return role == 'owner' || role == 'admin';
    }

    function isWorkspaceOwner(workspaceId) {
      return getWorkspaceRole(workspaceId) == 'owner';
    }

    // Users can only view and edit their own profiles
    match /users/{userId} {
      allow read, update: if isOwner(userId);
      allow create: if isSignedIn();
    }

    // Workspaces: owner and members can read, only owner can delete
    match /workspaces/{workspaceId} {
      allow read: if isWorkspaceMember(workspaceId) || resource.data.is_public == true;
      allow create: if isSignedIn() && request.resource.data.user_id == getUserId();
      allow update: if isWorkspaceAdmin(workspaceId);
      allow delete: if isWorkspaceOwner(workspaceId);
    }

    // Sources: workspace members can read, only owner/admin can upload
    match /sources/{sourceId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow create: if isSignedIn() && isWorkspaceAdmin(request.resource.data.workspace_id);
      allow update: if isWorkspaceAdmin(resource.data.workspace_id);
      allow delete: if isWorkspaceOwner(resource.data.workspace_id);
    }

    // Flashcards: workspace members can read/write
    match /flashcards/{flashcardId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow create, update: if isSignedIn() && isWorkspaceMember(request.resource.data.workspace_id);
      allow delete: if isWorkspaceMember(resource.data.workspace_id);
    }

    // Tutor sessions: only session owner can read/write
    match /tutor_sessions/{sessionId} {
      allow read, write: if isOwner(resource.data.user_id);
      allow create: if isSignedIn();
    }

    // Workspace members: based on role permissions
    match /workspace_members/{memberId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow create: if isSignedIn() && isWorkspaceAdmin(request.resource.data.workspace_id);
      allow delete: if isWorkspaceOwner(resource.data.workspace_id);
    }

    // Practice sessions
    match /practice_sessions/{sessionId} {
      allow read: if isOwner(resource.data.user_id) ||
                     (isWorkspaceMember(resource.data.workspace_id) &&
                      getWorkspaceRole(resource.data.workspace_id) in ['owner', 'admin']);
      allow create, update: if isSignedIn();
    }

    // Vector chunks
    match /vector_chunks/{chunkId} {
      allow read: if isWorkspaceMember(resource.data.workspace_id);
      allow write: if false; // Only Admin SDK can write
    }

    // Courses and topics are globally readable
    match /courses/{courseId} {
      allow read: if true;
    }
    match /topics/{topicId} {
      allow read: if true;
    }

    // Questions are readable by everyone
    match /questions/{questionId} {
      allow read: if true;
    }

    // Explanations can only be read if user is premium or has free credits available
    match /explanations/{explanationId} {
      allow read: if isSignedIn() && (
        get(/databases/$(database)/documents/users/$(getUserId())).data.subscription_status == 'premium' ||
        get(/databases/$(database)/documents/users/$(getUserId())).data.free_explanations_used < 3
      );
    }

    // Payments are strictly API-only
    match /payments/{paymentId} {
      allow read: if isSignedIn() && resource.data.user_id == getUserId();
      allow write: if false;
    }
  }
}

// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /questions/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }

    match /sources/{workspaceId}/{sourceId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.metadata.workspaceId == workspaceId;
    }
  }
}
```

---

## 3. API Endpoints Specification

### 3.1 Authentication Endpoints

#### POST `/api/auth/signup`

```typescript
interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  matric_number?: string;
  department?: string;
  level?: number;
  referral_code?: string;
}

interface SignupResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}
```

#### POST `/api/auth/login`

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}
```

#### POST `/api/auth/logout`

```typescript
interface LogoutResponse {
  success: boolean;
}
```

#### GET `/api/auth/session`

```typescript
interface SessionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    full_name: string;
    subscription_status: string;
    paid_until: string | null;
    preferred_tutor_personality: string;
    current_streak: number;
    total_xp: number;
  };
}
```

### 3.2 Workspace Endpoints

#### GET `/api/workspaces`

```typescript
interface WorkspacesQuery {
  search?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
}

interface WorkspacesResponse {
  workspaces: Array<{
    id: string;
    name: string;
    description: string;
    course_code: string | null;
    university: string | null;
    tutor_personality: string;
    is_public: boolean;
    owner_id: string;
    member_count: number;
    source_count: number;
    flashcard_count: number;
    created_at: string;
    last_accessed: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

#### POST `/api/workspaces`

```typescript
interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  course_code?: string;
  university?: string;
  tutor_personality?: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public?: boolean;
}

interface CreateWorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    description: string;
  };
}
```

#### GET `/api/workspaces/[id]`

```typescript
interface WorkspaceDetailResponse {
  workspace: {
    id: string;
    name: string;
    description: string;
    course_code: string | null;
    university: string | null;
    tutor_personality: TutorPersonality;
    tutor_custom_instructions: string | null;
    is_public: boolean;
    owner: {
      id: string;
      name: string;
      email: string;
    };
    user_role: 'owner' | 'admin' | 'member' | null;
    sources: Array<{
      id: string;
      name: string;
      type: string;
      processed: boolean;
      chunk_count: number;
    }>;
    flashcard_stats: {
      total: number;
      due_today: number;
      mastered: number;
    };
    recent_sessions: Array<{
      id: string;
      type: string;
      score: number;
      completed_at: string;
    }>;
    created_at: string;
    last_accessed: string;
  };
}
```

#### PUT `/api/workspaces/[id]`

```typescript
interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  course_code?: string;
  university?: string;
  tutor_personality?: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public?: boolean;
}

interface UpdateWorkspaceResponse {
  success: boolean;
  workspace: WorkspaceDetailResponse['workspace'];
}
```

#### DELETE `/api/workspaces/[id]`

```typescript
interface DeleteWorkspaceResponse {
  success: boolean;
}
```

#### POST `/api/workspaces/[id]/invite`

```typescript
interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member';
}

interface InviteMemberResponse {
  success: boolean;
  invite_id?: string;
  error?: string;
}
```

#### GET `/api/workspaces/[id]/members`

```typescript
interface WorkspaceMembersResponse {
  members: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
  }>;
}
```

### 3.3 Source Endpoints

#### POST `/api/workspaces/[id]/sources`

```typescript
interface UploadSourceRequest {
  file: File; // multipart/form-data
  type: 'pdf' | 'image' | 'text';
}

interface UploadSourceResponse {
  source: {
    id: string;
    file_name: string;
    file_size_bytes: number;
    type: string;
    processed: boolean;
    embedding_status: string;
  };
  upload_url?: string; // For direct upload to Firebase Storage
}
```

#### GET `/api/sources/[id]`

```typescript
interface SourceDetailResponse {
  source: {
    id: string;
    workspace_id: string;
    type: string;
    file_url: string;
    file_name: string;
    file_size_bytes: number;
    processed: boolean;
    chunk_count: number;
    embedding_status: string;
    created_at: string;
  };
}
```

#### DELETE `/api/sources/[id]`

```typescript
interface DeleteSourceResponse {
  success: boolean;
}
```

#### POST `/api/sources/[id]/reprocess`

```typescript
interface ReprocessSourceResponse {
  success: boolean;
  job_id: string;
}
```

### 3.4 Flashcard Endpoints

#### GET `/api/workspaces/[id]/flashcards`

```typescript
interface FlashcardsQuery {
  tags?: string[];
  due_only?: boolean;
  source_id?: string;
  page?: number;
  limit?: number;
}

interface FlashcardsResponse {
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    tags: string[];
    difficulty: number;
    next_review: string;
    source?: {
      id: string;
      name: string;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  stats: {
    total: number;
    due_today: number;
    mastered: number;
    learning: number;
  };
}
```

#### POST `/api/workspaces/[id]/flashcards/generate`

```typescript
interface GenerateFlashcardsRequest {
  source_id?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  focus_topics?: string[];
}

interface GenerateFlashcardsResponse {
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    tags: string[];
  }>;
  source_used: string | null;
  generated_count: number;
}
```

#### POST `/api/flashcards/[id]/review`

```typescript
interface ReviewFlashcardRequest {
  quality: number; // 0-5, SM-2 quality rating
  // 0 = complete blackout, 5 = perfect response
}

interface ReviewFlashcardResponse {
  success: boolean;
  updated_card: {
    id: string;
    difficulty: number;
    ease_factor: number;
    interval: number;
    next_review: string;
  };
  sm2_debug?: {
    old_interval: number;
    new_interval: number;
    old_ease_factor: number;
    new_ease_factor: number;
  };
}
```

#### GET `/api/flashcards/due`

```typescript
interface DueFlashcardsQuery {
  workspace_id?: string;
  limit?: number;
}

interface DueFlashcardsResponse {
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    workspace_id: string;
    workspace_name: string;
    next_review: string;
  }>;
  total_due: number;
  due_by_workspace: Record<string, number>;
}
```

### 3.5 Tutor Endpoints

#### POST `/api/tutor/chat`

```typescript
interface TutorChatRequest {
  workspace_id: string;
  message: string;
  session_id?: string; // Continue existing session
  context?: {
    source_ids?: string[];
    include_all_sources?: boolean;
  };
}

interface TutorChatResponse {
  response: string;
  session_id: string;
  message_id: string;
  sources_used?: Array<{
    id: string;
    name: string;
    relevance_score: number;
  }>;
  suggested_followups?: string[];
}
```

#### GET `/api/tutor/sessions`

```typescript
interface TutorSessionsQuery {
  workspace_id?: string;
  page?: number;
  limit?: number;
}

interface TutorSessionsResponse {
  sessions: Array<{
    id: string;
    workspace_id: string;
    workspace_name: string;
    topic_focus: string | null;
    message_count: number;
    started_at: string;
    ended_at: string | null;
    preview: string; // First user message
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### PUT `/api/workspaces/[id]/tutor-settings`

```typescript
interface UpdateTutorSettingsRequest {
  personality?: TutorPersonality;
  custom_instructions?: string;
}

interface UpdateTutorSettingsResponse {
  success: boolean;
  settings: {
    personality: TutorPersonality;
    custom_instructions: string | null;
  };
}
```

### 3.6 Quiz Endpoints

#### POST `/api/workspaces/[id]/quizzes/generate`

```typescript
interface GenerateQuizRequest {
  source_ids?: string[];
  question_count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  question_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
  focus_topics?: string[];
}

interface GenerateQuizResponse {
  quiz: {
    id: string;
    workspace_id: string;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options?: Record<string, string>; // For multiple choice
      correct_answer: string;
      explanation: string;
      difficulty: string;
      source_reference?: string;
    }>;
    total_questions: number;
    estimated_time_minutes: number;
  };
}
```

#### GET `/api/quizzes/[id]`

```typescript
interface QuizDetailResponse {
  quiz: {
    id: string;
    workspace_id: string;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options?: Record<string, string>;
      difficulty: string;
    }>;
    total_questions: number;
    estimated_time_minutes: number;
    created_at: string;
  };
  started: boolean;
  completed: boolean;
}
```

#### POST `/api/quizzes/[id]/submit`

```typescript
interface SubmitQuizRequest {
  answers: Array<{
    question_id: string;
    answer: string;
    time_spent_seconds: number;
  }>;
}

interface SubmitQuizResponse {
  result: {
    quiz_id: string;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    question_results: Array<{
      question_id: string;
      question_text: string;
      user_answer: string;
      correct_answer: string;
      is_correct: boolean;
      explanation: string;
    }>;
    xp_earned: number;
  };
}
```

### 3.7 AI Endpoints

#### POST `/api/ai/generate-flashcards`

```typescript
interface AIGenerateFlashcardsRequest {
  content: string; // Text content to generate from
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

interface AIGenerateFlashcardsResponse {
  flashcards: Array<{
    front: string;
    back: string;
    tags: string[];
  }>;
}
```

#### POST `/api/ai/generate-quiz

```typescript
interface AIGenerateQuizRequest {
  content: string;
  question_count?: number;
  question_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
}

interface AIGenerateQuizResponse {
  questions: Array<{
    question_text: string;
    question_type: string;
    options?: Record<string, string>;
    correct_answer: string;
    explanation: string;
  }>;
}
```

#### POST `/api/ai/generate-summary`

```typescript
interface AIGenerateSummaryRequest {
  content: string;
  max_length?: number;
  style?: 'brief' | 'detailed' | 'bullet_points';
}

interface AIGenerateSummaryResponse {
  summary: string;
  key_points: string[];
  topics_covered: string[];
}
```

#### POST `/api/ai/explain`

```typescript
interface AIExplainRequest {
  content: string;
  context?: string;
  level?: 'beginner' | 'intermediate' | 'advanced'; // "explain like I'm 5"
}

interface AIExplainResponse {
  explanation: string;
  analogies?: string[];
  related_concepts?: string[];
}
```

### 3.8 Course Endpoints

#### GET `/api/courses`

```typescript
interface CoursesQuery {
  department?: string;
  level?: number;
  search?: string;
  page?: number;
  limit?: number;
}

interface CoursesResponse {
  courses: Array<{
    id: string;
    code: string;
    title: string;
    department: string;
    level: number;
    total_questions: number;
    years_available: number[];
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

#### GET `/api/courses/[id]`

```typescript
interface CourseDetailResponse {
  course: {
    id: string;
    code: string;
    title: string;
    description: string;
    department: string;
    level: number;
    total_questions: number;
    years_available: number[];
    topics: Array<{
      id: string;
      name: string;
      question_count: number;
    }>;
  };
}
```

#### GET `/api/courses/[id]/questions`

```typescript
interface QuestionsQuery {
  year?: number;
  semester?: string;
  topic_id?: string;
  page?: number;
  limit?: number;
}

interface QuestionsResponse {
  questions: Array<{
    id: string;
    question_number: number;
    sub_question: string | null;
    question_text: string;
    question_image_url: string | null;
    topic: string;
    marks: number | null;
    has_explanation: boolean;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### 3.9 Question Endpoints

#### GET `/api/questions/[id]`

```typescript
interface QuestionDetailResponse {
  question: {
    id: string;
    course: {
      id: string;
      code: string;
      title: string;
    };
    year: number;
    semester: string;
    question_number: number;
    sub_question: string | null;
    question_text: string;
    question_image_url: string | null;
    topic: string;
    marks: number | null;
    difficulty: string | null;
  };
  explanation?: {
    explanation_text: string;
    step_by_step: Array<{ step: number; content: string }>;
    key_concepts: string[];
  };
  can_view_explanation: boolean;
  is_bookmarked: boolean;
}
```

#### GET `/api/questions/[id]/explanation`

```typescript
interface ExplanationResponse {
  explanation: {
    explanation_text: string;
    step_by_step: Array<{ step: number; content: string }>;
    key_concepts: string[];
    formulas_used: string[];
  };
  is_free_view: boolean;
  remaining_free_views: number;
}
```

### 3.10 Practice Endpoints

#### POST `/api/practice/sessions`

```typescript
interface CreatePracticeSessionRequest {
  workspace_id?: string;
  course_id?: string;
  topic_ids?: string[];
  question_count?: number;
  time_limit_minutes?: number;
  session_type: 'quiz' | 'flashcard' | 'exam_simulator' | 'custom' | 'timed' | 'untimed' | 'review';
}

interface CreatePracticeSessionResponse {
  session: {
    id: string;
    questions: Array<{
      id: string;
      question_number: number;
      question_text: string;
      question_image_url: string | null;
      options?: Record<string, string>;
    }>;
    total_questions: number;
    time_limit_minutes: number | null;
  };
}
```

#### PUT `/api/practice/sessions/[id]/answer`

```typescript
interface SubmitAnswerRequest {
  question_id: string;
  answer: string;
  selected_option?: string;
  time_spent_seconds: number;
}

interface SubmitAnswerResponse {
  is_correct: boolean;
  correct_answer?: string;
  explanation?: string;
}
```

#### POST `/api/practice/sessions/[id]/complete`

```typescript
interface CompleteSessionResponse {
  session: {
    id: string;
    score: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    total_time_seconds: number;
    topic_breakdown: Record<string, { correct: number; total: number }>;
    xp_earned: number;
  };
}
```

### 3.11 Payment Endpoints

#### POST `/api/payments/initialize`

```typescript
interface InitializePaymentRequest {
  subscription_tier: 'premium' | 'bulk';
  bulk_count?: number;
  referral_code?: string;
}

interface InitializePaymentResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  amount: number;
}
```

#### GET `/api/payments/verify/[reference]`

```typescript
interface VerifyPaymentResponse {
  success: boolean;
  status: string;
  subscription_status: string;
  paid_until: string;
}
```

#### POST `/api/payments/webhook`

```typescript
interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    channel: string;
    customer: {
      email: string;
    };
    metadata: Record<string, any>;
    paid_at: string;
  };
}
```

### 3.12 User Endpoints

#### GET `/api/user/profile`

```typescript
interface ProfileResponse {
  profile: {
    id: string;
    email: string;
    full_name: string;
    matric_number: string | null;
    department: string | null;
    level: number | null;
    subscription_status: string;
    subscription_tier: string;
    paid_until: string | null;
    free_explanations_used: number;
    free_explanations_limit: number;
    free_ai_queries_used: number;
    free_ai_queries_limit: number;
    current_streak: number;
    total_xp: number;
    preferred_tutor_personality: string;
    referral_code: string;
    referral_credits: number;
  };
}
```

#### PUT `/api/user/profile`

```typescript
interface UpdateProfileRequest {
  full_name?: string;
  matric_number?: string;
  department?: string;
  level?: number;
  preferred_tutor_personality?: TutorPersonality;
}

interface UpdateProfileResponse {
  success: boolean;
  profile: ProfileResponse['profile'];
}
```

#### GET `/api/user/dashboard`

```typescript
interface DashboardResponse {
  stats: {
    workspaces_count: number;
    flashcards_total: number;
    flashcards_due_today: number;
    questions_viewed: number;
    practice_sessions: number;
    average_score: number | null;
    current_streak: number;
    total_xp: number;
  };
  recent_workspaces: Array<{
    id: string;
    name: string;
    last_accessed: string;
    flashcard_count: number;
  }>;
  recent_activity: Array<{
    type: 'question_view' | 'practice_session' | 'flashcard_review' | 'tutor_session' | 'payment';
    data: Record<string, any>;
    created_at: string;
  }>;
  subscription: {
    status: string;
    paid_until: string | null;
    days_remaining: number | null;
  };
  ai_queries_remaining: number;
}
```

#### GET `/api/user/bookmarks`

```typescript
interface BookmarksResponse {
  bookmarks: Array<{
    id: string;
    question: {
      id: string;
      question_number: number;
      question_text: string;
      course: { code: string; title: string };
    };
    note: string | null;
    created_at: string;
  }>;
}
```

#### POST `/api/user/bookmarks`

```typescript
interface AddBookmarkRequest {
  question_id: string;
  note?: string;
}

interface AddBookmarkResponse {
  success: boolean;
  bookmark_id: string;
}
```

#### DELETE `/api/user/bookmarks/[id]`

```typescript
interface DeleteBookmarkResponse {
  success: boolean;
}
```

### 3.13 Admin Endpoints

#### POST `/api/admin/courses`

```typescript
interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
  department?: string;
  level: number;
  credit_units?: number;
}

interface CreateCourseResponse {
  course: {
    id: string;
    code: string;
    title: string;
  };
}
```

#### POST `/api/admin/questions`

```typescript
interface CreateQuestionRequest {
  course_id: string;
  year: number;
  semester: string;
  question_number: number;
  sub_question?: string;
  question_text: string;
  question_image_url?: string;
  topic?: string;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_type?: 'theory' | 'objective';
  options?: Record<string, string>;
  correct_option?: string;
}

interface CreateQuestionResponse {
  question: {
    id: string;
    question_number: number;
  };
}
```

#### POST `/api/admin/questions/batch`

```typescript
interface BatchCreateQuestionsRequest {
  course_id: string;
  questions: Array<CreateQuestionRequest>;
}

interface BatchCreateQuestionsResponse {
  created: number;
  failed: number;
  questions: Array<{ id: string; question_number: number }>;
}
```

#### POST `/api/admin/explanations/generate`

```typescript
interface GenerateExplanationsRequest {
  course_id?: string;
  question_ids?: string[];
  regenerate?: boolean;
}

interface GenerateExplanationsResponse {
  queued: number;
  job_id: string;
}
```

#### GET `/api/admin/stats`

```typescript
interface AdminStatsResponse {
  users: {
    total: number;
    active_today: number;
    paid: number;
    free: number;
  };
  content: {
    workspaces: number;
    sources: number;
    flashcards: number;
    courses: number;
    questions: number;
    explanations_generated: number;
    explanations_pending: number;
  };
  revenue: {
    total_kobo: number;
    this_month_kobo: number;
    this_week_kobo: number;
  };
  practice: {
    total_sessions: number;
    completed_sessions: number;
    average_score: number;
  };
  ai_usage: {
    total_queries: number;
    tutor_sessions: number;
    flashcards_generated: number;
    quizzes_generated: number;
  };
}
```

---

## 4. Third-Party Integrations

### 4.1 OpenAI API Integration

#### Configuration

```typescript
// lib/openai/config.ts
export const OPENAI_CONFIG = {
  model: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
  maxTokens: 2000,
  temperature: 0.3,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

export const RATE_LIMITS = {
  requestsPerMinute: 50,
  tokensPerMinute: 90000,
};
```

#### Tutor Personality Prompts

```typescript
// lib/openai/tutor-personalities.ts

export type TutorPersonality = 'mentor' | 'drill' | 'peer' | 'professor' | 'storyteller' | 'coach';

export const TUTOR_PERSONALITY_PROMPTS: Record<TutorPersonality, string> = {
  mentor: `You are a wise and patient mentor who guides students through their learning journey. 
    You ask thought-provoking questions, provide encouragement, and help students discover answers 
    themselves rather than just giving them away. You celebrate small wins and help students learn 
    from mistakes. You speak with warmth and use phrases like "Let's explore this together" and 
    "What do you think about..."`,

  drill: `You are a strict, no-nonsense drill sergeant focused on rigorous practice and mastery. 
    You push students to work harder, emphasize precision, and don't accept lazy thinking. 
    You use military-style motivation and phrases like "Again!" and "Is that the best you can do?" 
    Your goal is to build mental toughness and ensure complete understanding through repetition.`,

  peer: `You are a friendly study buddy who learns alongside the student. You're relatable, 
    use casual language, and share in the struggle of learning difficult concepts. You say things 
    like "I used to find this confusing too" and "Let's figure this out together." You're supportive 
    but not overly formal, making learning feel less intimidating.`,

  professor: `You are an accomplished academic professor with deep expertise. You explain concepts 
    with precision, provide historical context, and reference related theories and research. 
    You challenge students to think critically and ask "Why?" and "How does this relate to what 
    we learned before?" You maintain intellectual rigor while being approachable.`,

  storyteller: `You are a captivating storyteller who weaves concepts into memorable narratives. 
    You use analogies, real-world examples, and vivid scenarios to make abstract concepts concrete. 
    You might say "Imagine you're building a bridge..." or "Picture a busy marketplace..." 
    Your explanations stick because they're wrapped in engaging stories.`,

  coach: `You are an encouraging coach focused on growth and improvement. You help students set 
    goals, track progress, and push through challenges. You use sports analogies and motivational 
    language like "You've got this!" and "One step at a time." You celebrate effort over perfection 
    and help students build confidence.`,
};

export function buildTutorSystemPrompt(
  personality: TutorPersonality,
  customInstructions: string | null,
  context: string,
): string {
  const basePrompt = TUTOR_PERSONALITY_PROMPTS[personality];

  return `${basePrompt}

${customInstructions ? `Additional instructions from the student: ${customInstructions}` : ''}

You have access to the following study materials from the student's workspace:
${context}

Guidelines:
- Use the provided materials to give accurate, relevant responses
- If the answer isn't in the materials, say so honestly
- Encourage active learning by asking follow-up questions
- Adapt your explanations to the student's apparent level of understanding
- Be concise but thorough
- Format mathematical expressions with LaTeX when helpful`;
}
```

#### Prompt Templates

```typescript
// lib/openai/prompts.ts

export const EXPLANATION_PROMPT = `
You are an expert tutor at the University of Ibadan, Nigeria. Generate a clear, 
detailed explanation for the following exam question. The explanation should be 
understandable to a university student.

COURSE: {course_code} - {course_title}
TOPIC: {topic}
YEAR: {year}
QUESTION {question_number}: {question_text}

Provide your response in the following JSON format:
{
  "explanation_text": "Full explanation in paragraphs",
  "step_by_step": [
    {"step": 1, "content": "First step..."},
    {"step": 2, "content": "Second step..."}
  ],
  "key_concepts": ["concept1", "concept2"],
  "formulas_used": ["formula1"]
}

Guidelines:
- Use Nigerian educational context where relevant
- Be thorough but concise
- Break down complex problems into steps
- Include relevant formulas and theorems
- Explain the "why" not just the "how"
`;

export const FLASHCARD_GENERATION_PROMPT = `
Generate {count} flashcards from the following content. Each flashcard should:
- Have a clear, concise question on the front
- Have a complete but brief answer on the back
- Focus on key concepts, definitions, or relationships
- Be suitable for spaced repetition study

CONTENT:
{content}

Provide your response as a JSON array:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation",
    "tags": ["topic1", "topic2"]
  }
]

Difficulty level: {difficulty}
`;

export const QUIZ_GENERATION_PROMPT = `
Generate a {question_count}-question quiz from the following content.

CONTENT:
{content}

Question types to include: {question_types}
Difficulty: {difficulty}

Provide your response as a JSON array:
[
  {
    "question_text": "The question",
    "question_type": "multiple_choice" | "true_false" | "short_answer",
    "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}, // only for multiple_choice
    "correct_answer": "A" or "true" or "the answer",
    "explanation": "Why this is correct",
    "difficulty": "easy" | "medium" | "hard"
  }
]
`;

export const TOPIC_PREDICTION_PROMPT = `
Analyze the following question topics and their appearance frequency in past exams.
Predict which topics are most likely to appear in upcoming exams.

Course: {course_code}
Topics and frequencies: {topic_data}

Provide predictions as JSON array:
[
  {
    "topic": "topic_name",
    "predicted_importance": "high|medium|low",
    "confidence": 0.0-1.0,
    "reason": "Brief explanation"
  }
]
`;

export const SUMMARY_GENERATION_PROMPT = `
Summarize the following content in a {style} manner.

CONTENT:
{content}

Maximum length: {max_length} words

Provide your response as JSON:
{
  "summary": "The summary text",
  "key_points": ["point1", "point2", "point3"],
  "topics_covered": ["topic1", "topic2"]
}
`;

export const EXPLAIN_LIKE_IM_5_PROMPT = `
Explain the following concept at a {level} level. Use simple language, 
analogies, and relatable examples.

CONCEPT: {content}
${'CONTEXT: {context}'}

Provide your response as JSON:
{
  "explanation": "Simple explanation",
  "analogies": ["analogy1", "analogy2"],
  "related_concepts": ["concept1", "concept2"]
}
`;
```

#### Caching Strategy

```typescript
// lib/openai/cache.ts
import { adminDb } from '@/lib/firebase/admin';

interface CacheEntry {
  prompt_hash: string;
  response: string;
  created_at: Date;
  expires_at: Date;
}

export class OpenAICache {
  static async getCachedExplanation(questionId: string): Promise<any | null> {
    const explanationsRef = adminDb.collection('explanations');
    const snapshot = await explanationsRef.where('question_id', '==', questionId).limit(1).get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  static async getOrGenerate<T>(
    cacheKey: string,
    promptHash: string,
    generator: () => Promise<T>,
    ttlDays: number = 365,
  ): Promise<T> {
    const explanationsRef = adminDb.collection('explanations');
    const snapshot = await explanationsRef.where('prompt_hash', '==', promptHash).limit(1).get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as T;
    }

    const result = await generator();
    return result;
  }

  static hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex');
  }
}
```

#### Error Handling

```typescript
// lib/openai/errors.ts

export class OpenAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export const ERROR_CODES = {
  RATE_LIMIT: 'rate_limit_exceeded',
  CONTEXT_LENGTH: 'context_length_exceeded',
  INVALID_RESPONSE: 'invalid_response',
  TIMEOUT: 'timeout',
  API_ERROR: 'api_error',
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'] || delayMs * (i + 1);
        await sleep(typeof retryAfter === 'number' ? retryAfter : parseInt(retryAfter) * 1000);
      } else if (!isRetryableError(error)) {
        throw error;
      } else {
        await sleep(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}

function isRetryableError(error: any): boolean {
  const retryableStatuses = [429, 500, 502, 503, 504];
  return retryableStatuses.includes(error.status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 4.2 LangChain Integration for RAG

```typescript
// lib/rag/pipeline.ts
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { adminDb } from '@/lib/firebase/admin';

export class RAGPipeline {
  private embeddings: OpenAIEmbeddings;
  private pinecone: Pinecone;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async processDocument(
    sourceId: string,
    workspaceId: string,
    fileUrl: string,
    fileType: 'pdf' | 'text',
  ): Promise<{ chunkCount: number; status: 'completed' | 'failed' }> {
    try {
      // Update source status
      await adminDb.collection('sources').doc(sourceId).update({
        embedding_status: 'pending',
      });

      // Load document
      let loader;
      if (fileType === 'pdf') {
        loader = new PDFLoader(fileUrl);
      } else {
        loader = new TextLoader(fileUrl);
      }

      const docs = await loader.load();

      // Split into chunks
      const chunks = await this.textSplitter.splitDocuments(docs);

      // Generate embeddings and store in Pinecone
      const index = this.pinecone.Index(process.env.PINECONE_INDEX!);

      const vectorStore = await PineconeStore.fromDocuments(
        chunks.map((chunk, index) => ({
          pageContent: chunk.pageContent,
          metadata: {
            sourceId,
            workspaceId,
            chunkIndex: index,
            ...chunk.metadata,
          },
        })),
        this.embeddings,
        { pineconeIndex: index, namespace: workspaceId },
      );

      // Store chunk references in Firestore
      const batch = adminDb.batch();
      chunks.forEach((chunk, index) => {
        const chunkRef = adminDb.collection('vector_chunks').doc();
        batch.set(chunkRef, {
          source_id: sourceId,
          workspace_id: workspaceId,
          content: chunk.pageContent,
          chunk_index: index,
          metadata: chunk.metadata || {},
          created_at: new Date(),
        });
      });
      await batch.commit();

      // Update source status
      await adminDb.collection('sources').doc(sourceId).update({
        processed: true,
        chunk_count: chunks.length,
        embedding_status: 'completed',
      });

      return { chunkCount: chunks.length, status: 'completed' };
    } catch (error) {
      await adminDb.collection('sources').doc(sourceId).update({
        embedding_status: 'failed',
      });
      throw error;
    }
  }

  async searchRelevantChunks(
    workspaceId: string,
    query: string,
    topK: number = 5,
  ): Promise<Array<{ content: string; score: number; metadata: any }>> {
    const index = this.pinecone.Index(process.env.PINECONE_INDEX!);

    const vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex: index,
      namespace: workspaceId,
    });

    const results = await vectorStore.similaritySearchWithScore(query, topK);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      score,
      metadata: doc.metadata,
    }));
  }

  async deleteSourceChunks(sourceId: string, workspaceId: string): Promise<void> {
    const index = this.pinecone.Index(process.env.PINECONE_INDEX!);

    // Delete from Pinecone
    await index.namespace(workspaceId).deleteMany({
      filter: { sourceId: { $eq: sourceId } },
    });

    // Delete from Firestore
    const chunksSnapshot = await adminDb
      .collection('vector_chunks')
      .where('source_id', '==', sourceId)
      .get();

    const batch = adminDb.batch();
    chunksSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
```

### 4.3 Paystack Integration

#### Configuration

```typescript
// lib/paystack/config.ts
export const PAYSTACK_CONFIG = {
  baseUrl: 'https://api.paystack.co',
  publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
  secretKey: process.env.PAYSTACK_SECRET_KEY!,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET!,

  pricing: {
    premium: 200000, // ₦2,000 in kobo (monthly)
  },

  subscriptionMonths: 1, // Monthly subscription
};
```

#### Payment Flow

```typescript
// lib/paystack/client.ts

export class PaystackClient {
  private baseUrl = PAYSTACK_CONFIG.baseUrl;
  private headers = {
    Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`,
    'Content-Type': 'application/json',
  };

  async initializeTransaction(params: {
    email: string;
    amount: number;
    reference?: string;
    metadata?: Record<string, any>;
    callback_url?: string;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const reference = params.reference || this.generateReference();

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ...params,
        reference,
        callback_url: params.callback_url || `${process.env.NEXT_PUBLIC_URL}/payment/verify`,
        metadata: {
          ...params.metadata,
          custom_fields: [
            {
              display_name: 'Student Email',
              variable_name: 'student_email',
              value: params.email,
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize transaction');
    }

    return data.data;
  }

  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    customer: { email: string };
    metadata: Record<string, any>;
    channel: string;
    paid_at: string;
    id: number;
  }> {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: this.headers,
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Transaction verification failed');
    }

    return data.data;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `EK-${timestamp}-${random}`.toUpperCase();
  }

  calculateFees(amountKobo: number): {
    paystack_fee: number;
    net_amount: number;
  } {
    const fee = Math.round(amountKobo * 0.015 + 10000);
    return {
      paystack_fee: fee,
      net_amount: amountKobo - fee,
    };
  }
}
```

#### Webhook Handler

```typescript
// app/api/payments/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PaystackClient } from '@/lib/paystack/client';
import { adminDb } from '@/lib/firebase/admin';

const paystack = new PaystackClient();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    if (!paystack.verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true });
    }

    const data = event.data;

    const paymentsRef = adminDb.collection('payments');
    const paymentSnapshot = await paymentsRef
      .where('paystack_reference', '==', data.reference)
      .limit(1)
      .get();

    if (paymentSnapshot.empty) {
      console.error('Payment not found:', data.reference);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentDoc = paymentSnapshot.docs[0];
    const payment = paymentDoc.data();

    await paymentDoc.ref.update({
      status: 'success',
      paystack_transaction_id: data.id,
      payment_method: data.channel,
      completed_at: new Date().toISOString(),
      webhook_received_at: new Date().toISOString(),
      webhook_data: data,
      ...paystack.calculateFees(data.amount),
    });

    const paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + PAYSTACK_CONFIG.subscriptionMonths);

    const userRef = adminDb.collection('users').doc(payment.user_id);
    await userRef.update({
      subscription_status: 'active',
      subscription_tier: payment.subscription_tier,
      paid_until: paidUntil.toISOString(),
    });

    if (payment.referral_code_used) {
      const usersRef = adminDb.collection('users');
      const referrerSnapshot = await usersRef
        .where('referral_code', '==', payment.referral_code_used)
        .limit(1)
        .get();

      if (!referrerSnapshot.empty) {
        const referrerId = referrerSnapshot.docs[0].id;
        await adminDb.collection('referrals').add({
          referrer_id: referrerId,
          referee_id: payment.user_id,
          reward_type: 'credit',
          reward_value: 200,
          payment_id: paymentDoc.id,
        });
      }
    }

    await adminDb.collection('notifications').add({
      user_id: payment.user_id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your subscription is now active until ${paidUntil.toLocaleDateString()}`,
      created_at: new Date(),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);

    await adminDb.collection('error_logs').add({
      error_type: 'payment_error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      request_body: { payload: 'failed to parse' },
      created_at: new Date(),
    });

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

### 4.4 Firebase Auth Configuration

```typescript
// lib/firebase/auth.ts
import { auth } from './config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return await signOut(auth);
};
```

### 4.5 User Registration Flow

```typescript
export async function getAuthUser(req) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return null;

    const decodedToken = await adminAuth.verifyIdToken(token);

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data(),
    };
  } catch (error) {
    return null;
  }
}
```

---

## 5. Frontend Component Structure

### 5.1 Component Hierarchy

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Landing page
├── (auth)/
│   ├── layout.tsx                # Auth layout (centered card)
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/
│   ├── layout.tsx                # Dashboard layout with sidebar
│   ├── dashboard/page.tsx        # Dashboard with workspace overview
│   ├── workspaces/
│   │   ├── page.tsx              # All workspaces list
│   │   ├── new/page.tsx          # Create workspace
│   │   └── [id]/
│   │       ├── page.tsx          # Workspace detail
│   │       ├── sources/page.tsx  # Manage sources
│   │       ├── flashcards/page.tsx # Flashcard deck
│   │       ├── quiz/page.tsx     # Quiz generator
│   │       ├── tutor/page.tsx    # AI Tutor chat
│   │       └── settings/page.tsx # Workspace settings
│   ├── courses/
│   │   ├── [code]/page.tsx       # Course detail
│   │   └── [code]/[year]/page.tsx # Questions by year
│   ├── question/
│   │   └── [id]/page.tsx         # Question detail
│   ├── practice/
│   │   ├── page.tsx              # Practice setup
│   │   └── session/[id]/page.tsx # Active practice
│   ├── bookmarks/page.tsx
│   └── settings/page.tsx
├── (marketing)/
│   ├── pricing/page.tsx
│   └── about/page.tsx
└── api/                          # API routes

components/
├── ui/                           # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   ├── skeleton.tsx
│   ├── toast.tsx
│   └── progress.tsx
├── layout/
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── footer.tsx
│   └── mobile-nav.tsx
├── auth/
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   └── auth-provider.tsx
├── workspace/
│   ├── workspace-card.tsx
│   ├── workspace-grid.tsx
│   ├── create-workspace-modal.tsx
│   ├── workspace-header.tsx
│   ├── member-list.tsx
│   ├── invite-modal.tsx
│   └── permission-settings.tsx
├── sources/
│   ├── file-uploader.tsx
│   ├── source-list.tsx
│   ├── processing-status.tsx
│   └── source-preview.tsx
├── flashcards/
│   ├── flashcard-deck.tsx
│   ├── flashcard-review.tsx
│   ├── flashcard-editor.tsx
│   ├── spaced-repetition-stats.tsx
│   └── generate-flashcards-modal.tsx
├── tutor/
│   ├── tutor-chat.tsx
│   ├── message-bubble.tsx
│   ├── typing-indicator.tsx
│   ├── tutor-personality-selector.tsx
│   └── session-history.tsx
├── quiz/
│   ├── quiz-display.tsx
│   ├── quiz-progress.tsx
│   ├── quiz-results.tsx
│   └── generate-quiz-modal.tsx
├── courses/
│   ├── course-card.tsx
│   ├── course-grid.tsx
│   ├── course-filter.tsx
│   └── year-tabs.tsx
├── questions/
│   ├── question-card.tsx
│   ├── question-viewer.tsx
│   ├── explanation-panel.tsx
│   ├── paywall-modal.tsx
│   └── bookmark-button.tsx
├── practice/
│   ├── practice-setup.tsx
│   ├── question-display.tsx
│   ├── answer-input.tsx
│   ├── timer.tsx
│   ├── progress-bar.tsx
│   └── results-summary.tsx
├── analytics/
│   ├── progress-charts.tsx
│   ├── streak-display.tsx
│   ├── xp-badge.tsx
│   └── study-stats.tsx
├── payment/
│   ├── pricing-card.tsx
│   ├── payment-form.tsx
│   └── payment-success.tsx
└── shared/
    ├── loading-spinner.tsx
    ├── error-boundary.tsx
    ├── pagination.tsx
    └── search-input.tsx
```

### 5.2 Key Component Props

```typescript
// components/workspace/workspace-card.tsx
interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description: string;
    course_code: string | null;
    tutor_personality: TutorPersonality;
    is_public: boolean;
    member_count: number;
    source_count: number;
    flashcard_count: number;
    last_accessed: string;
  };
  userRole: 'owner' | 'admin' | 'member' | null;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// components/workspace/create-workspace-modal.tsx
interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    course_code?: string;
    university?: string;
    tutor_personality: TutorPersonality;
    tutor_custom_instructions?: string;
    is_public: boolean;
  }) => void;
}

// components/sources/file-uploader.tsx
interface FileUploaderProps {
  workspaceId: string;
  onUploadComplete: (source: Source) => void;
  acceptedTypes: ('pdf' | 'image' | 'text')[];
  maxFileSizeMB?: number;
}

// components/sources/processing-status.tsx
interface ProcessingStatusProps {
  source: {
    id: string;
    file_name: string;
    processed: boolean;
    chunk_count: number;
    embedding_status: 'pending' | 'completed' | 'failed';
  };
  onReprocess?: () => void;
}

// components/flashcards/flashcard-deck.tsx
interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onReview: (flashcardId: string, quality: number) => void;
  showAnswer: boolean;
  onFlip: () => void;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

// components/flashcards/flashcard-review.tsx
interface FlashcardReviewProps {
  flashcard: Flashcard;
  onRate: (quality: number) => void;
  isFlipped: boolean;
  onFlip: () => void;
}

// components/flashcards/spaced-repetition-stats.tsx
interface SpacedRepetitionStatsProps {
  stats: {
    total_cards: number;
    due_today: number;
    mastered: number;
    learning: number;
    new: number;
    retention_rate: number;
    average_interval: number;
  };
  streak: number;
}

// components/tutor/tutor-chat.tsx
interface TutorChatProps {
  workspaceId: string;
  sessionId?: string;
  personality: TutorPersonality;
  customInstructions?: string;
  onSessionEnd?: () => void;
}

// components/tutor/tutor-personality-selector.tsx
interface TutorPersonalitySelectorProps {
  value: TutorPersonality;
  onChange: (personality: TutorPersonality) => void;
  showDescriptions?: boolean;
}

// components/tutor/message-bubble.tsx
interface MessageBubbleProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
  personality: TutorPersonality;
  sourcesUsed?: Array<{
    id: string;
    name: string;
    relevance_score: number;
  }>;
}

// components/quiz/quiz-display.tsx
interface QuizDisplayProps {
  question: {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: Record<string, string>;
  };
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  selectedAnswer?: string;
  showResult?: boolean;
  isCorrect?: boolean;
}

// components/quiz/quiz-results.tsx
interface QuizResultsProps {
  results: {
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    question_results: Array<{
      question_text: string;
      user_answer: string;
      correct_answer: string;
      is_correct: boolean;
      explanation: string;
    }>;
    xp_earned: number;
  };
  onRetry: () => void;
  onReviewMistakes: () => void;
}

// components/analytics/streak-display.tsx
interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  lastActiveDate: Date;
}

// components/analytics/xp-badge.tsx
interface XpBadgeProps {
  xp: number;
  level?: number;
  showProgress?: boolean;
  xpToNextLevel?: number;
}

// components/analytics/progress-charts.tsx
interface ProgressChartsProps {
  data: {
    daily_reviews: Array<{ date: string; count: number }>;
    accuracy_over_time: Array<{ date: string; accuracy: number }>;
    topic_mastery: Record<string, number>;
  };
  timeRange: 'week' | 'month' | 'year';
}

// components/courses/course-card.tsx
interface CourseCardProps {
  course: {
    id: string;
    code: string;
    title: string;
    department: string;
    level: number;
    total_questions: number;
    years_available: number[];
  };
  onClick?: () => void;
}

// components/questions/question-viewer.tsx
interface QuestionViewerProps {
  question: {
    id: string;
    question_number: number;
    sub_question: string | null;
    question_text: string;
    question_image_url: string | null;
    marks: number | null;
    difficulty: string | null;
  };
  course: {
    code: string;
    title: string;
  };
  explanation?: {
    explanation_text: string;
    step_by_step: Array<{ step: number; content: string }>;
    key_concepts: string[];
  };
  canViewExplanation: boolean;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

// components/questions/explanation-panel.tsx
interface ExplanationPanelProps {
  explanation: {
    explanation_text: string;
    step_by_step: Array<{ step: number; content: string }>;
    key_concepts: string[];
    formulas_used: string[];
  };
  isLoading?: boolean;
}

// components/questions/paywall-modal.tsx
interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingFreeViews: number;
  onUpgrade: () => void;
}

// components/practice/practice-setup.tsx
interface PracticeSetupProps {
  course?: {
    id: string;
    code: string;
    title: string;
    topics: Array<{ id: string; name: string; question_count: number }>;
  };
  workspace?: {
    id: string;
    name: string;
    sources: Array<{ id: string; name: string }>;
  };
  onStartPractice: (config: {
    topic_ids?: string[];
    source_ids?: string[];
    question_count: number;
    time_limit_minutes?: number;
    session_type: string;
  }) => void;
}

// components/practice/question-display.tsx
interface QuestionDisplayProps {
  question: {
    id: string;
    question_number: number;
    question_text: string;
    question_image_url: string | null;
    options?: Record<string, string>;
    question_type: 'theory' | 'objective';
  };
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string, selectedOption?: string) => void;
  onSkip: () => void;
}

// components/practice/timer.tsx
interface TimerProps {
  initialMinutes: number;
  isPaused: boolean;
  onTimeUp: () => void;
}

// components/practice/results-summary.tsx
interface ResultsSummaryProps {
  results: {
    score: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    total_time_seconds: number;
    topic_breakdown: Record<string, { correct: number; total: number }>;
    xp_earned: number;
  };
  questions: Array<{
    id: string;
    question_text: string;
    user_answer: string;
    is_correct: boolean | null;
  }>;
  onRetry: () => void;
  onReviewMistakes: () => void;
}

// components/payment/pricing-card.tsx
interface PricingCardProps {
  tier: 'free' | 'premium';
  price: number;
  features: string[];
  isPopular?: boolean;
  onSelect: () => void;
  currentPlan?: boolean;
}

// components/shared/pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

### 5.3 State Management

```typescript
// Using React Context + useState for most state
// Using Zustand for complex client state

// store/workspace-store.ts
import { create } from 'zustand';

interface WorkspaceState {
  currentWorkspace: {
    id: string;
    name: string;
    tutor_personality: TutorPersonality;
    user_role: 'owner' | 'admin' | 'member';
  } | null;

  setCurrentWorkspace: (workspace: WorkspaceState['currentWorkspace']) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  clearWorkspace: () => set({ currentWorkspace: null }),
}));

// store/flashcard-store.ts
import { create } from 'zustand';

interface FlashcardState {
  deck: Flashcard[];
  currentIndex: number;
  isFlipped: boolean;
  sessionStats: {
    reviewed: number;
    correct: number;
    incorrect: number;
  };

  setDeck: (flashcards: Flashcard[]) => void;
  flip: () => void;
  next: () => void;
  previous: () => void;
  recordReview: (quality: number) => void;
  resetSession: () => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
  deck: [],
  currentIndex: 0,
  isFlipped: false,
  sessionStats: { reviewed: 0, correct: 0, incorrect: 0 },

  setDeck: (flashcards) => set({ deck: flashcards, currentIndex: 0 }),
  flip: () => set((state) => ({ isFlipped: !state.isFlipped })),
  next: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.deck.length - 1),
      isFlipped: false,
    })),
  previous: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
      isFlipped: false,
    })),
  recordReview: (quality) =>
    set((state) => ({
      sessionStats: {
        reviewed: state.sessionStats.reviewed + 1,
        correct: state.sessionStats.correct + (quality >= 3 ? 1 : 0),
        incorrect: state.sessionStats.incorrect + (quality < 3 ? 1 : 0),
      },
    })),
  resetSession: () =>
    set({
      currentIndex: 0,
      isFlipped: false,
      sessionStats: { reviewed: 0, correct: 0, incorrect: 0 },
    }),
}));

// store/tutor-store.ts
import { create } from 'zustand';

interface TutorState {
  messages: TutorMessage[];
  isTyping: boolean;
  currentSessionId: string | null;

  addMessage: (message: TutorMessage) => void;
  setTyping: (isTyping: boolean) => void;
  setSessionId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useTutorStore = create<TutorState>((set) => ({
  messages: [],
  isTyping: false,
  currentSessionId: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setTyping: (isTyping) => set({ isTyping }),
  setSessionId: (id) => set({ currentSessionId: id }),
  clearMessages: () => set({ messages: [], currentSessionId: null }),
}));

// store/practice-store.ts
import { create } from 'zustand';

interface PracticeState {
  session: {
    id: string;
    questions: Question[];
    currentIndex: number;
    answers: Map<string, { answer: string; time_spent: number }>;
    startTime: Date;
  } | null;

  startSession: (session: PracticeState['session']) => void;
  submitAnswer: (questionId: string, answer: string, timeSpent: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  endSession: () => void;
}

export const usePracticeStore = create<PracticeState>((set) => ({
  session: null,

  startSession: (session) => set({ session }),

  submitAnswer: (questionId, answer, timeSpent) =>
    set((state) => {
      if (!state.session) return state;
      const newAnswers = new Map(state.session.answers);
      newAnswers.set(questionId, { answer, time_spent: timeSpent });
      return {
        session: { ...state.session, answers: newAnswers },
      };
    }),

  nextQuestion: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          currentIndex: Math.min(
            state.session.currentIndex + 1,
            state.session.questions.length - 1,
          ),
        },
      };
    }),

  previousQuestion: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          currentIndex: Math.max(state.session.currentIndex - 1, 0),
        },
      };
    }),

  endSession: () => set({ session: null }),
}));

// store/auth-store.ts
interface AuthState {
  user: {
    id: string;
    email: string;
    profile: Profile;
  } | null;
  isLoading: boolean;

  setUser: (user: AuthState['user']) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isLoading: false }),
}));
```

### 5.4 Protected Route Implementation

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();

  const sessionToken = request.cookies.get('session');

  const protectedRoutes = ['/dashboard', '/workspaces', '/practice', '/bookmarks', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedRoute && !sessionToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/workspaces/:path*',
    '/practice/:path*',
    '/bookmarks/:path*',
    '/settings/:path*',
  ],
};
```

```typescript
// Initial client wrapper for Firebase auth listener
'use client';

import { createContext, useContext, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';

const AuthContext = createContext({});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser({ ...firebaseUser, ...profileDoc.data() });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

---

## 6. Security Considerations

### 6.1 API Key Management

```typescript
// Environment variables (NEVER commit to git)
// .env.local (not in version control)

# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="exam-killer-xxxx.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="exam-killer-xxxx"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="exam-killer-xxxx.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:xxx:web:yyy"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_URL=https://examkiller.ng

# Firebase Admin SDK (Keep Secret!)
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@exam-killer-xxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...=\n-----END PRIVATE KEY-----\n"

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=exam-killer

# Upstash Redis
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...

// .env.example (committed to git for documentation)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_URL=
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```

```typescript
// lib/config.ts - Centralized config with validation

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const config = {
  public: {
    firebase: {
      apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
    },
    paystackPublicKey: getEnvVar('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'),
    appUrl: getEnvVar('NEXT_PUBLIC_URL'),
  },

  server: {
    firebase: {
      clientEmail: getEnvVar('FIREBASE_CLIENT_EMAIL'),
      privateKey: getEnvVar('FIREBASE_PRIVATE_KEY'),
    },
    paystackSecretKey: getEnvVar('PAYSTACK_SECRET_KEY'),
    paystackWebhookSecret: getEnvVar('PAYSTACK_WEBHOOK_SECRET'),
    openaiApiKey: getEnvVar('OPENAI_API_KEY'),
    pinecone: {
      apiKey: getEnvVar('PINECONE_API_KEY'),
      index: getEnvVar('PINECONE_INDEX'),
    },
    redis: {
      url: getEnvVar('UPSTASH_REDIS_URL'),
      token: getEnvVar('UPSTASH_REDIS_TOKEN'),
    },
  },
};

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function requireServer(): void {
  if (!isServer()) {
    throw new Error('This function can only be called on the server');
  }
}
```

### 6.2 Rate Limiting Strategy

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'examkiller:general',
});

export const explanationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'examkiller:explanation',
});

export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'examkiller:ai',
});

export const tutorLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'examkiller:tutor',
});

export const paymentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'examkiller:payment',
});

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'examkiller:auth',
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset: new Date(reset),
  };
}

export function withRateLimit(limiter: Ratelimit, getIdentifier: (req: Request) => string) {
  return async function rateLimitMiddleware(req: Request, next: () => Promise<Response>) {
    const identifier = getIdentifier(req);
    const { success, remaining, reset } = await checkRateLimit(limiter, identifier);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Too many requests', reset }), {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(remaining),
          'X-RateLimit-Reset': reset.toISOString(),
        },
      });
    }

    return next();
  };
}
```

### 6.3 Input Validation

```typescript
// lib/validation.ts
import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  matric_number: z
    .string()
    .regex(/^[A-Z]{3}\d{2}\/\d{4,5}$/, 'Invalid matric number format (e.g., CSC21/1234)')
    .optional(),
  department: z.string().min(2).max(100).optional(),
  level: z.number().int().min(100).max(700).optional(),
  referral_code: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  course_code: z.string().max(20).optional(),
  university: z.string().max(100).optional(),
  tutor_personality: z
    .enum(['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'])
    .default('mentor'),
  tutor_custom_instructions: z.string().max(1000).optional(),
  is_public: z.boolean().default(false),
});

export const uploadSourceSchema = z.object({
  type: z.enum(['pdf', 'image', 'text']),
  workspace_id: z.string().min(1),
});

export const generateFlashcardsSchema = z.object({
  source_id: z.string().optional(),
  count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  focus_topics: z.array(z.string()).max(10).optional(),
});

export const reviewFlashcardSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const tutorChatSchema = z.object({
  workspace_id: z.string().min(1),
  message: z.string().min(1).max(4000),
  session_id: z.string().optional(),
  context: z
    .object({
      source_ids: z.array(z.string()).optional(),
      include_all_sources: z.boolean().optional(),
    })
    .optional(),
});

export const generateQuizSchema = z.object({
  source_ids: z.array(z.string()).max(10).optional(),
  question_count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  question_types: z
    .array(z.enum(['multiple_choice', 'true_false', 'short_answer']))
    .default(['multiple_choice']),
  focus_topics: z.array(z.string()).max(10).optional(),
});

export const createQuestionSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  semester: z.enum(['First', 'Second', 'Rain', 'Harmattan']),
  question_number: z.number().int().positive(),
  sub_question: z.string().max(10).optional(),
  question_text: z.string().min(1, 'Question text is required'),
  question_image_url: z.string().url().optional(),
  topic: z.string().max(200).optional(),
  marks: z.number().int().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  question_type: z.enum(['theory', 'objective', 'fill-blank', 'practical']).optional(),
  options: z.record(z.string()).optional(),
  correct_option: z.string().max(5).optional(),
});

export const initializePaymentSchema = z.object({
  subscription_tier: z.enum(['premium', 'bulk']),
  bulk_count: z.number().int().min(10).max(100).optional(),
  referral_code: z.string().max(20).optional(),
});

export const createPracticeSessionSchema = z.object({
  workspace_id: z.string().optional(),
  course_id: z.string().uuid('Invalid course ID').optional(),
  topic_ids: z.array(z.string().uuid()).max(10).optional(),
  question_count: z.number().int().min(5).max(50).default(10),
  time_limit_minutes: z.number().int().min(5).max(180).optional(),
  session_type: z
    .enum(['quiz', 'flashcard', 'exam_simulator', 'custom', 'timed', 'untimed', 'review'])
    .default('timed'),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  matric_number: z
    .string()
    .regex(/^[A-Z]{3}\d{2}\/\d{4,5}$/)
    .optional()
    .or(z.literal('')),
  department: z.string().min(2).max(100).optional(),
  level: z.number().int().min(100).max(700).optional(),
  preferred_tutor_personality: z
    .enum(['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'])
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeIdentifier(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, '');
}
```

### 6.4 API Route Security

```typescript
// lib/api-security.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/firebase/auth';
import { checkRateLimit, generalLimiter } from '@/lib/rate-limit';

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [process.env.NEXT_PUBLIC_URL, 'http://localhost:3000'];

  const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders },
      );
    }

    return handler(req, user);
  };
}

export function withPremium(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return withAuth(async (req, user) => {
    const hasAccess =
      user.subscription_status === 'active' && new Date(user.paid_until) > new Date();

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403, headers: securityHeaders },
      );
    }

    return handler(req, user);
  });
}

export function withAdmin(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return withAuth(async (req, user) => {
    const adminEmails = ['sir@example.com', 'admin@examkiller.ng'];

    if (!adminEmails.includes(user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: securityHeaders },
      );
    }

    return handler(req, user);
  });
}

export function withRateLimitWrapper(identifier: (req: NextRequest) => string) {
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
      const { success, reset } = await checkRateLimit(generalLimiter, identifier(req));

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests', reset },
          {
            status: 429,
            headers: {
              ...securityHeaders,
              'X-RateLimit-Reset': reset.toISOString(),
            },
          },
        );
      }

      return handler(req);
    };
  };
}

export function secureApiRoute(
  handler: (req: NextRequest, context: { user: any | null }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requirePremium?: boolean;
    requireAdmin?: boolean;
    rateLimit?: boolean;
  } = {},
) {
  return async (req: NextRequest) => {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...securityHeaders,
          ...corsHeaders(req.headers.get('origin')),
        },
      });
    }

    if (options.rateLimit) {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const { success, reset } = await checkRateLimit(generalLimiter, ip);

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: securityHeaders },
        );
      }
    }

    const user = await getAuthUser(req);

    if (options.requireAuth && !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders },
      );
    }

    if (options.requirePremium && user) {
      const hasAccess =
        user.subscription_status === 'active' && new Date(user.paid_until) > new Date();

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Premium subscription required' },
          { status: 403, headers: securityHeaders },
        );
      }
    }

    if (options.requireAdmin && user) {
      const adminEmails = ['sir@example.com', 'admin@examkiller.ng'];
      if (!adminEmails.includes(user.email)) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403, headers: securityHeaders },
        );
      }
    }

    return handler(req, { user });
  };
}
```

---

## 7. Deployment Configuration

### 7.1 Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    },
    "app/api/ai/**/*.ts": {
      "memory": 2048,
      "maxDuration": 60
    },
    "app/api/tutor/**/*.ts": {
      "memory": 2048,
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store, must-revalidate" }]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ],
  "rewrites": [
    {
      "source": "/api/payments/webhook",
      "destination": "/api/payments/webhook"
    }
  ]
}
```

### 7.2 Next.js Configuration

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
```

---

## 8. Monitoring & Logging

### 8.1 Error Tracking

```typescript
// lib/monitoring/error-tracking.ts

interface ErrorContext {
  user_id?: string;
  request_path?: string;
  request_method?: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  metadata?: Record<string, any>;
}

export async function logError(context: ErrorContext): Promise<void> {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    await adminDb.collection('error_logs').add({
      error_type: context.error_type,
      error_message: context.error_message,
      error_stack: context.error_stack,
      user_id: context.user_id,
      request_path: context.request_path,
      request_method: context.request_method,
      metadata: context.metadata || {},
      created_at: new Date(),
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

export function handleApiError(error: unknown, req: NextRequest, userId?: string): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logError({
    user_id: userId,
    request_path: req.nextUrl.pathname,
    request_method: req.method,
    error_type: 'api_error',
    error_message: errorMessage,
    error_stack: errorStack,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return NextResponse.json(
    {
      error: isProduction ? 'Internal server error' : errorMessage,
      ...(isProduction ? {} : { stack: errorStack }),
    },
    { status: 500, headers: securityHeaders },
  );
}
```

### 8.2 Analytics Events

```typescript
// lib/monitoring/analytics.ts
import { adminDb } from '@/lib/firebase/admin';

interface AnalyticsEvent {
  event: string;
  user_id?: string;
  properties?: Record<string, any>;
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await adminDb.collection('analytics_events').add({
      event_name: event.event,
      user_id: event.user_id,
      properties: event.properties || {},
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

export const ANALYTICS_EVENTS = {
  // Auth
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',

  // Workspace
  WORKSPACE_CREATED: 'workspace_created',
  WORKSPACE_SHARED: 'workspace_shared',
  WORKSPACE_DELETED: 'workspace_deleted',

  // Sources
  SOURCE_UPLOADED: 'source_uploaded',
  SOURCE_PROCESSED: 'source_processed',

  // Flashcards
  FLASHCARD_GENERATED: 'flashcard_generated',
  FLASHCARD_REVIEWED: 'flashcard_reviewed',
  FLASHCARD_DECK_COMPLETED: 'flashcard_deck_completed',

  // Tutor
  TUTOR_SESSION_STARTED: 'tutor_session_started',
  TUTOR_MESSAGE_SENT: 'tutor_message_sent',
  TUTOR_SESSION_ENDED: 'tutor_session_ended',

  // Quiz
  QUIZ_GENERATED: 'quiz_generated',
  QUIZ_COMPLETED: 'quiz_completed',

  // Content
  QUESTION_VIEW: 'question_view',
  EXPLANATION_VIEW: 'explanation_view',
  COURSE_BROWSE: 'course_browse',

  // Practice
  PRACTICE_START: 'practice_start',
  PRACTICE_COMPLETE: 'practice_complete',
  PRACTICE_ABANDON: 'practice_abandon',

  // Payment
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',

  // Referral
  REFERRAL_USED: 'referral_used',

  // Streak/XP
  STREAK_EXTENDED: 'streak_extended',
  STREAK_BROKEN: 'streak_broken',
  XP_EARNED: 'xp_earned',
};
```

---

## 9. SM-2 Spaced Repetition Algorithm

```typescript
// lib/spaced-repetition/sm2.ts

interface SM2Result {
  newInterval: number;
  newEaseFactor: number;
  nextReview: Date;
}

export function sm2Algorithm(
  currentInterval: number,
  currentEaseFactor: number,
  quality: number, // 0-5, where 0 = complete blackout, 5 = perfect response
): SM2Result {
  // Quality rating interpretation:
  // 0 - Complete blackout
  // 1 - Incorrect, but recognized the correct answer
  // 2 - Incorrect, but easy to recall
  // 3 - Correct, but with significant effort
  // 4 - Correct, with some hesitation
  // 5 - Perfect response

  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure ease factor doesn't go below 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  let newInterval: number;

  if (quality < 3) {
    // If the response was incorrect, reset the interval
    newInterval = 1;
  } else {
    // Calculate new interval based on current interval and ease factor
    if (currentInterval === 0) {
      newInterval = 1;
    } else if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    newInterval,
    newEaseFactor: Math.round(newEaseFactor * 100) / 100,
    nextReview,
  };
}

export function getInitialFlashcardState(): {
  difficulty: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
} {
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 1); // Review tomorrow for new cards

  return {
    difficulty: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReview,
  };
}
```

---

## 10. Pricing

| Plan    | Price        | Features                                                                                                                                                 |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free    | ₦0           | • 5 AI queries per day<br>• 3 free explanations<br>• 1 workspace<br>• Basic flashcards                                                                   |
| Premium | ₦2,000/month | • Unlimited AI queries<br>• Unlimited explanations<br>• Unlimited workspaces<br>• Collaborative workspaces<br>• Priority support<br>• Advanced analytics |

---

_Document Version: 2.0_
_Created: 2026-02-14 by The Engineer_
_Updated: 2026-02-25_
_Status: PRODUCTION-READY SPECIFICATION_
