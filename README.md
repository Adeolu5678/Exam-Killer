# Exam-Killer

> AI-Powered Personal Study Companion for Nigerian University Students

## Overview

Exam-Killer is an intelligent study platform designed to transform how Nigerian university students prepare for exams. Modeled after tools like NotebookLM, it allows students to create Study Workspaces where they can upload PDFs, lecture notes, and past questions, then instantly generate AI-powered learning tools.

Starting with University of Ibadan students, the platform combines the power of Kilo Gateway (Minimax m2.5-free) with proven learning techniques like spaced repetition to make studying more effective and engaging. Students get a personal AI tutor that adapts to their learning style, whether they need a patient mentor, a no-nonsense drill sergeant, or an encouraging peer.

The core value proposition is simple: upload any study material and get AI-generated flashcards, practice quizzes, and a personal tutor that actually understands your course content. No more generic study apps—Exam-Killer learns from your materials and helps you master them.

## Key Features

- **Study Workspaces** - Create dedicated spaces for each course, upload PDFs, notes, and past questions
- **Personal AI Tutor** - Customizable personality (mentor, drill sergeant, friendly peer, professor, storyteller, exam coach)
- **Spaced Repetition Flashcards** - SM-2 algorithm for optimal retention and long-term memory
- **AI-Generated Quizzes** - Practice questions automatically created from your uploaded materials
- **Collaborative Study** - Share workspaces with classmates for group study sessions
- **Progress Analytics** - Track improvement, maintain study streaks, and unlock achievements
- **Offline Support** - PWA functionality for studying in areas with poor internet connectivity

## Tech Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Frontend        | Next.js 14, Tailwind CSS, TypeScript      |
| Backend         | Next.js API Routes                        |
| Database        | Firebase Firestore                        |
| Auth            | Firebase Authentication                   |
| AI/LLM          | Kilo Gateway (Minimax), OpenAI Embeddings |
| Vector Store    | Pinecone                                  |
| File Processing | LangChain                                 |
| Payments        | Paystack                                  |
| Hosting         | Vercel                                    |
| Mobile (Future) | Flutter                                   |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/username/exam-killer.git

# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Run development server
npm run dev
```

## Project Structure

```
/app                 # Next.js app router pages
/components          # React components
/lib                 # Utility libraries
  /firebase          # Firebase config and admin
  /openai            # OpenAI client and prompts
  /paystack          # Paystack integration
  /rag               # RAG pipeline utilities
/store               # Zustand state stores
/types               # TypeScript type definitions
```

## Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [SSD.md](./SSD.md) - System Specification Document

## License

MIT License

## Author

Emmanuel Adeoye
