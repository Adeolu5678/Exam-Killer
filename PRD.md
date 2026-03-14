# Exam-Killer — Product Requirements Document (PRD)

## 1. Overview

**Product:** Exam-Killer — AI-Powered Personal Study Companion
**Builder:** Emmanuel Adeoye (Sir)
**Target Launch:** Feb 20, 2026 (7 days from now)
**Revenue Target:** ₦150,000-₦300,000 from first semester

**Core Concept:** Exam-Killer is an AI-Powered Personal Study Companion similar to Google's NotebookLM. Users create "Study Workspaces" where they can upload reference materials (PDFs, past questions, notes, images) and the AI generates quizzes, flashcards, summaries, and provides a personal tutor experience.

---

## 2. Problem Statement

UI students share past questions via WhatsApp groups as ugly PDFs and photos. Everyone has access to the raw materials, but:

- Past questions are **unorganized** — scattered across multiple groups
- No **explanations** — just questions, no solutions
- No **pattern analysis** — students can't see which topics repeat
- No **practice mode** — can't simulate exam conditions
- **Mobile-unfriendly** — PDFs don't render well on phones
- No **personalized learning** — one-size-fits-all study approach
- No **adaptive tutoring** — students struggle alone without guidance
- No **spaced repetition** — inefficient memorization techniques

## 3. Value Proposition

> "Everyone has the past questions. Nobody has the AI-powered study companion."

Exam-Killer transforms raw study materials into:

1. **Study Workspaces** — organize all your materials in one place
2. **AI-generated content** — flashcards, quizzes, summaries, mind maps from your sources
3. **Personal AI Tutor** — adaptive, interactive learning with customizable personality
4. **Spaced Repetition** — Anki-style flashcard reviews for optimal retention
5. **Collaborative Learning** — share workspaces with classmates
6. **Progress Analytics** — track your learning journey
7. **Beautiful mobile-first UI** — study anywhere, anytime

---

## 4. Target Users

| Segment                                | Size (UI CS Dept) | Willingness to Pay                              |
| -------------------------------------- | ----------------- | ----------------------------------------------- |
| Year 1 students (Maths-heavy courses)  | ~100              | High — struggling with Calculus, Linear Algebra |
| Year 2 students (Coding courses start) | ~100              | High — DSA, OOP are filter courses              |
| Year 3-4 students (Pre-finals)         | ~80               | Medium — already have their own strategies      |
| **Other departments** (expand later)   | ~2,000+           | Variable — Maths is universal pain              |

**Primary:** Year 1-2 CS students taking Maths and introductory coding courses.

---

## 5. Core Features

### 5.1 Study Workspaces (NotebookLM-style)

Users create dedicated workspaces for each subject or course:

| Feature            | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Workspace Creation | Create unlimited workspaces for different subjects/courses          |
| File Uploads       | Upload PDFs, past questions, personal notes, lecture slides, images |
| AI Ingestion       | AI processes and indexes all uploaded content                       |
| Source Management  | View, organize, and manage all reference materials                  |
| Content Generation | Generate flashcards, quizzes, summaries, mind maps from sources     |
| Search             | Semantic search across all workspace content                        |

### 5.2 Personal AI Tutor

An interactive, adaptive learning companion:

| Feature              | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| Interactive Teaching | Step-by-step explanations, not just answers                     |
| Adaptive Learning    | Identifies weak areas from practice results and focuses on them |
| Socratic Method      | Asks guiding questions to lead students to understanding        |
| Conversation Memory  | Remembers previous conversations for contextual learning        |
| Multi-turn Dialogues | Extended tutoring sessions on complex topics                    |

#### Tutor Personality Options

| Personality    | Description                                    |
| -------------- | ---------------------------------------------- |
| Patient Mentor | Calm, encouraging, supportive tone             |
| Drill Sergeant | Direct, challenging, pushes limits             |
| Friendly Peer  | Casual, relatable, Nigerian context            |
| Professor      | Formal, academic, thorough explanations        |
| Storyteller    | Uses analogies and stories to explain concepts |
| Exam Coach     | Focuses on exam strategy and time management   |

### 5.3 Spaced Repetition Flashcards

| Feature             | Description                                            |
| ------------------- | ------------------------------------------------------ |
| SM-2 Algorithm      | Anki-style spaced repetition for optimal review timing |
| Difficulty Tracking | Cards rated easy/good/hard for scheduling              |
| Review Queue        | Daily review queue based on due dates                  |
| Statistics          | Track retention rates and study streaks                |
| Auto-Generation     | AI generates flashcards from uploaded materials        |

### 5.4 Collaborative Workspaces

| Feature                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| Workspace Sharing       | Share workspace with classmates via invite link |
| Real-time Collaboration | Study together with live updates                |
| Progress Visibility     | See each other's progress and practice results  |
| Shared Resources        | All members can access and add sources          |
| Discussion Threads      | Comment on flashcards and quizzes               |

### 5.5 Practice & Assessment

| Feature               | Description                               |
| --------------------- | ----------------------------------------- |
| Generated Quizzes     | AI creates quizzes from workspace sources |
| Timed Practice Mode   | Simulate exam conditions with timer       |
| Exam Simulator        | Full mock exams with realistic timing     |
| Performance Analytics | Track scores and identify weak areas      |
| Adaptive Difficulty   | Questions adjust based on performance     |

### 5.6 Analytics & Progress Tracking

| Feature            | Description                          |
| ------------------ | ------------------------------------ |
| Dashboard Overview | Visual summary of all study activity |
| Study Streaks      | Gamification with streak tracking    |
| Time Spent         | Track time per subject/workspace     |
| Mastery Levels     | Progress indicators per topic        |
| Weekly Reports     | Email summaries of progress          |

### 5.7 Additional Features

| Feature               | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| AI Study Planner      | "I have exam in 2 weeks" → generates personalized schedule |
| Quick Explain Mode    | "Explain Like I'm 5" for instant simplification            |
| Concept Map Generator | Visual mind maps of related concepts                       |
| Export Options        | Export to PDF, Anki format                                 |
| WhatsApp Sharing      | Share flashcards and explanations via WhatsApp             |
| Offline PWA Mode      | Progressive Web App for offline access                     |
| University Presets    | Pre-configured settings for UI, UNILAG, OAU, etc.          |

---

## 6. Tech Stack

| Layer           | Technology                           | Why                                            |
| --------------- | ------------------------------------ | ---------------------------------------------- |
| Frontend        | Next.js 14 + Tailwind CSS            | Fast, SEO-friendly, modern React               |
| Backend/API     | Next.js API Routes                   | Keep it simple, same codebase                  |
| Database        | Firebase (Firestore)                 | NoSQL document database, robust free tier      |
| Auth            | Firebase Authentication              | Built-in email/password auth + Google Provider |
| AI              | OpenAI GPT-4o API                    | Best quality explanations and tutoring         |
| Vector Store    | Pinecone / Firebase Vector Extension | For RAG (Retrieval Augmented Generation)       |
| File Processing | LangChain                            | Document parsing and chunking                  |
| Payments        | Paystack                             | Nigeria-native, ₦ support                      |
| Hosting         | Vercel                               | Free tier, automatic deployments               |
| Content Storage | Firebase Cloud Storage               | For uploaded files (PDFs, images)              |
| PWA             | next-pwa                             | Offline capabilities                           |

---

## 7. Data Model

```javascript
/*
🔥 Firestore Database Structure
*/

users (Collection)
  - uid (String, Document ID from Firebase Auth)
  - email (String)
  - full_name (String)
  - avatar_url (String)
  - subscription_tier (String: 'free' | 'premium' | 'annual')
  - subscription_start (Timestamp)
  - subscription_end (Timestamp)
  - created_at (Timestamp)
  - updated_at (Timestamp)
  - settings (Map)
    - default_tutor_personality (String)
    - study_reminder_enabled (Boolean)
    - study_reminder_time (String)

workspaces (Collection)
  - workspace_id (String, Auto-ID)
  - owner_id (String, Refers to users)
  - name (String)
  - description (String)
  - subject (String)
  - university_preset (String, e.g., "UI", "UNILAG")
  - is_public (Boolean)
  - created_at (Timestamp)
  - updated_at (Timestamp)
  - settings (Map)
    - tutor_personality (String)
    - daily_goal_minutes (Number)

sources (Collection)
  - source_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - file_name (String)
  - file_type (String: 'pdf' | 'image' | 'text' | 'note')
  - file_url (String)
  - file_size (Number, in bytes)
  - processed (Boolean)
  - chunk_count (Number)
  - created_at (Timestamp)
  - metadata (Map)
    - page_count (Number)
    - title (String)
    - author (String)

flashcards (Collection)
  - flashcard_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - source_id (String, Refers to sources, optional)
  - front (String)
  - back (String)
  - topic (String)
  - difficulty (Number: 0-5)
  - created_at (Timestamp)
  - spaced_repetition (Map)
    - interval (Number, days)
    - ease_factor (Number)
    - repetitions (Number)
    - next_review_date (Timestamp)
    - last_review_date (Timestamp)

quizzes (Collection)
  - quiz_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - source_id (String, Refers to sources, optional)
  - title (String)
  - description (String)
  - question_count (Number)
  - time_limit_minutes (Number)
  - created_at (Timestamp)
  - questions (Array of Map)
    - question_id (String)
    - question_text (String)
    - question_type (String: 'multiple_choice' | 'true_false' | 'short_answer')
    - options (Array of String, for MCQ)
    - correct_answer (String)
    - explanation (String)
    - topic (String)

quiz_attempts (Collection)
  - attempt_id (String, Auto-ID)
  - quiz_id (String, Refers to quizzes)
  - user_id (String, Refers to users)
  - score (Number)
  - total_questions (Number)
  - time_taken_seconds (Number)
  - answers (Array of Map)
    - question_id (String)
    - user_answer (String)
    - is_correct (Boolean)
  - completed_at (Timestamp)

tutor_sessions (Collection)
  - session_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - user_id (String, Refers to users)
  - personality (String)
  - created_at (Timestamp)
  - updated_at (Timestamp)
  - messages (Array of Map)
    - message_id (String)
    - role (String: 'user' | 'assistant')
    - content (String)
    - timestamp (Timestamp)
    - sources_cited (Array of source_id)

practice_sessions (Collection)
  - session_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - user_id (String, Refers to users)
  - session_type (String: 'practice' | 'exam_simulation')
  - started_at (Timestamp)
  - ended_at (Timestamp)
  - total_questions (Number)
  - correct_answers (Number)
  - topics_reviewed (Array of String)
  - weak_areas_identified (Array of String)

workspace_members (Collection)
  - member_id (String, Auto-ID)
  - workspace_id (String, Refers to workspaces)
  - user_id (String, Refers to users)
  - role (String: 'owner' | 'admin' | 'member')
  - joined_at (Timestamp)
  - permissions (Map)
    - can_add_sources (Boolean)
    - can_edit_sources (Boolean)
    - can_invite_members (Boolean)

user_progress (Collection)
  - progress_id (String, Auto-ID)
  - user_id (String, Refers to users)
  - workspace_id (String, Refers to workspaces)
  - date (Timestamp)
  - study_time_minutes (Number)
  - flashcards_reviewed (Number)
  - quizzes_completed (Number)
  - questions_answered (Number)
  - correct_answers (Number)
  - streak_days (Number)

study_plans (Collection)
  - plan_id (String, Auto-ID)
  - user_id (String, Refers to users)
  - workspace_id (String, Refers to workspaces)
  - exam_date (Timestamp)
  - daily_study_hours (Number)
  - topics_to_cover (Array of String)
  - generated_schedule (Array of Map)
    - date (Timestamp)
    - topic (String)
    - duration_minutes (Number)
    - activity_type (String)
    - completed (Boolean)
  - created_at (Timestamp)

payments (Collection)
  - payment_id (String, Paystack Reference)
  - user_id (String, Refers to users)
  - amount (Number, in kobo)
  - plan (String: 'premium_monthly' | 'premium_annual')
  - status (String: 'success' | 'failed' | 'pending')
  - created_at (Timestamp)

vector_embeddings (Collection) — For RAG
  - embedding_id (String, Auto-ID)
  - source_id (String, Refers to sources)
  - workspace_id (String, Refers to workspaces)
  - chunk_index (Number)
  - chunk_text (String)
  - embedding (Array of Number)
  - metadata (Map)
    - page_number (Number)
    - section (String)
```

---

## 8. Page Structure

```
/                           → Landing page (marketing + features)
/auth/login                 → Login
/auth/signup                → Signup
/dashboard                  → User's workspaces overview
/workspace/new              → Create new workspace
/workspace/[id]             → Workspace dashboard (overview)
/workspace/[id]/sources     → Manage reference files (upload, view, organize)
/workspace/[id]/flashcards  → Flashcard deck with spaced repetition
/workspace/[id]/quizzes     → Generated quizzes and practice
/workspace/[id]/tutor       → Chat with personal AI tutor
/workspace/[id]/practice    → Practice mode (adaptive questions)
/workspace/[id]/settings    → Workspace & tutor personality settings
/workspace/[id]/analytics   → Progress analytics for workspace
/workspace/[id]/members     → Manage workspace collaborators
/library                    → Public past questions library (shared resources)
/pricing                    → Subscription plans
/profile                    → User profile and settings
/settings                   → App-wide settings
/study-plan                 → AI Study Planner
```

---

## 9. Monetization

| Plan    | Price        | Features                                                                                                                          |
| ------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Free    | ₦0           | 1 workspace, 3 file uploads, 5 AI queries/day, 10 flashcards, basic tutor                                                         |
| Premium | ₦2,000/month | Unlimited workspaces, uploads, AI queries, personal tutor with customization, spaced repetition, analytics, collaboration, export |
| Annual  | ₦20,000/year | All Premium + priority support, early access to new features                                                                      |

### Feature Comparison

| Feature             | Free       | Premium   | Annual    |
| ------------------- | ---------- | --------- | --------- |
| Workspaces          | 1          | Unlimited | Unlimited |
| File Uploads        | 3 files    | Unlimited | Unlimited |
| AI Tutor Queries    | 5/day      | Unlimited | Unlimited |
| Flashcards          | 10         | Unlimited | Unlimited |
| Spaced Repetition   | ❌         | ✅        | ✅        |
| Tutor Personalities | Basic only | All 6     | All 6     |
| Analytics           | Basic      | Full      | Full      |
| Collaboration       | ❌         | ✅        | ✅        |
| Export (PDF/Anki)   | ❌         | ✅        | ✅        |
| Offline Mode        | ❌         | ✅        | ✅        |
| Priority Support    | ❌         | ❌        | ✅        |
| Early Access        | ❌         | ❌        | ✅        |

### Payment Flow

1. User signs up (free tier)
2. User hits feature limit → upgrade prompt appears
3. User selects plan → Paystack checkout
4. Paystack webhook confirms payment → subscription tier updated
5. User gains access to premium features

---

## 10. Marketing Strategy

### Pre-Launch (Day 1-3)

- [ ] Create WhatsApp broadcast list of CS classmates
- [ ] Tease: "Something that's going to change how you prepare for exams..."
- [ ] Create Instagram/TikTok demos showing AI tutor conversations
- [ ] Share screenshots of flashcard generation from notes

### Launch Day

- [ ] WhatsApp broadcast: "Exam-Killer is live. First 20 users get Premium free for 1 month."
- [ ] Post in UI CS WhatsApp groups
- [ ] Ask 3-5 friends to sign up and share
- [ ] Twitter: "I built an AI study companion that reads your notes and tutors you"
- [ ] Demo video showing full workspace workflow

### Post-Launch (Week 2+)

- [ ] Get class reps to promote (offer them free Annual access)
- [ ] Create referral program: 1 month free per 3 referrals
- [ ] Partner with study groups on campus
- [ ] Expand to other departments (Maths, Physics, Engineering)
- [ ] User testimonials and success stories

---

## 11. Costs

| Item                              | Monthly Cost                          |
| --------------------------------- | ------------------------------------- |
| Vercel hosting                    | $0 (free tier)                        |
| Firebase (Firestore/Auth/Storage) | $0-5 (free tier covers initial users) |
| Pinecone Vector DB                | $0 (free tier: 1 index, 100k vectors) |
| OpenAI API (GPT-4o)               | ~$15-50 (depends on usage)            |
| LangChain                         | $0 (open source)                      |
| Paystack                          | 1.5% + ₦100 per transaction           |
| Domain (examkiller.ng)            | ~$10/year                             |
| **Total**                         | **~$20-60/month**                     |

### Cost Optimization

- Cache AI-generated content (explanations, flashcards)
- Use GPT-4o-mini for simpler tasks
- Batch process uploaded documents
- Implement rate limiting on free tier

---

## 12. Build Timeline

### Phase 1: MVP (Days 1-7)

| Day   | Task                                                     |
| ----- | -------------------------------------------------------- |
| Day 1 | Setup Next.js project, Firebase schema, authentication   |
| Day 2 | Build workspace creation and source upload (PDF, images) |
| Day 3 | Integrate OpenAI + LangChain for document processing     |
| Day 4 | Build AI tutor chat interface with basic personality     |
| Day 5 | Implement flashcard generation and spaced repetition     |
| Day 6 | Implement Paystack payment flow + subscription tiers     |
| Day 7 | Deploy, polish UI, marketing push, launch                |

### Phase 2: Enhanced Features (Days 8-14)

| Day    | Task                                  |
| ------ | ------------------------------------- |
| Day 8  | Quiz generation and practice mode     |
| Day 9  | Exam simulator with timed tests       |
| Day 10 | Analytics dashboard and study streaks |
| Day 11 | AI Study Planner                      |
| Day 12 | Workspace collaboration features      |
| Day 13 | Export to PDF/Anki, WhatsApp sharing  |
| Day 14 | PWA setup for offline mode            |

### Phase 3: Polish & Scale (Days 15-21)

| Day    | Task                                    |
| ------ | --------------------------------------- |
| Day 15 | University presets (UI, UNILAG, OAU)    |
| Day 16 | Concept map generator                   |
| Day 17 | Performance optimization, caching       |
| Day 18 | Mobile responsiveness testing           |
| Day 19 | User feedback collection, bug fixes     |
| Day 20 | Documentation, admin panel improvements |
| Day 21 | Scale testing, monitoring setup         |

---

## 13. Success Metrics

| Metric                   | Target (Month 1) | Target (Month 3) |
| ------------------------ | ---------------- | ---------------- |
| Registered Users         | 100              | 500              |
| Paid Subscribers         | 20               | 100              |
| Monthly Revenue          | ₦40,000          | ₦200,000         |
| Workspaces Created       | 50               | 300              |
| Flashcards Generated     | 500              | 5,000            |
| Average Session Duration | 15 min           | 20 min           |
| 7-Day Retention          | 40%              | 60%              |

---

## 14. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js PWA)                     │
├─────────────────────────────────────────────────────────────────┤
│  Landing  │  Dashboard  │  Workspaces  │  Tutor  │  Flashcards  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
├─────────────────────────────────────────────────────────────────┤
│  Auth  │  Workspaces  │  AI  │  Payments  │  Analytics          │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Firebase    │     │   OpenAI API  │     │   Pinecone    │
│  (Firestore,  │     │   (GPT-4o)    │     │  (Vectors)    │
│   Auth,       │     │               │     │               │
│   Storage)    │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      Paystack         │
                    │   (Payments)          │
                    └───────────────────────┘
```

### RAG Pipeline for AI Tutor

```
User Query → Embedding → Vector Search → Context Retrieval →
Prompt Construction → GPT-4o Response → Stream to Client
```

---

## 15. Security & Privacy

| Concern            | Solution                                                    |
| ------------------ | ----------------------------------------------------------- |
| User Data          | All data encrypted at rest (Firebase default)               |
| File Uploads       | File type validation, size limits (10MB free, 50MB premium) |
| API Keys           | Server-side only, environment variables                     |
| Rate Limiting      | 5 queries/day free tier, reasonable limits for premium      |
| Payment Security   | Paystack handles all payment data (PCI compliant)           |
| Content Moderation | OpenAI moderation API for uploaded content                  |

---

## 16. Future Roadmap

### Q2 2026

- [ ] Mobile apps (iOS/Android via React Native)
- [ ] Voice tutor (audio responses)
- [ ] Group study rooms (real-time collaboration)
- [ ] Integration with university LMS

### Q3 2026

- [ ] Multi-language support (Yoruba, Hausa, Igbo)
- [ ] AR flashcards
- [ ] Study buddy matching
- [ ] Institutional licenses for departments

### Q4 2026

- [ ] Marketplace for premium study materials
- [ ] Tutor marketplace (human tutors)
- [ ] Certificate generation for completed courses

---

_Created: 2026-02-13 by The Engineer_  
_Updated: 2026-02-25 — Expanded to AI-Powered Personal Study Companion_  
_Status: READY FOR BUILD_
