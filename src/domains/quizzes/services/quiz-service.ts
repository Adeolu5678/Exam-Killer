import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { retrieveTutorContext } from '@/domains/retrieval';
import { verifyWorkspaceAccess } from '@/domains/workspaces';

import { updateUserStats } from '@/shared/lib/analytics/stats';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import { getChatCompletion } from '@/shared/lib/openai/client';
import { createQuizPrompt, QUIZ_RESPONSE_SCHEMA } from '@/shared/lib/openai/prompts';
import { consumeAiQueryQuota } from '@/shared/lib/paystack/db';
import { RAG_CONFIG } from '@/shared/lib/rag/config';
import { fetchRAGContent, truncateContent } from '@/shared/lib/rag/content';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import type {
  QuizAttemptHistoryItem,
  QuizAttemptResultItem,
  QuizDetail,
  QuizDetailQuestion,
  QuizListItem,
  QuizQuestionSummary,
  QuizQuestionType,
  QuizSubmitResult,
} from '../contracts/quiz';

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_COLLECTION = 'quiz_questions';
const QUIZ_ATTEMPTS_COLLECTION = 'quiz_attempts';
const QUIZ_ATTEMPT_ANSWERS_COLLECTION = 'quiz_attempt_answers';

interface QuizQuestionRecord {
  question_id?: string;
  question_text?: string;
  question_type?: QuizQuestionType;
  options?: Record<string, string> | null;
  correct_answer?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface QuizRecord {
  quiz_id?: string;
  workspace_id?: string;
  user_id?: string;
  created_by_user_id?: string;
  source_id?: string | null;
  title?: string;
  topic?: string | null;
  questions?: QuizQuestionRecord[];
  total_questions?: number;
  question_count?: number;
  completed?: boolean;
  score?: number | null;
  best_score?: number | null;
  correct_count?: number | null;
  time_spent_seconds?: number | null;
  attempt_count?: number;
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date;
  completed_at?: Timestamp | Date | null;
  last_attempt_id?: string | null;
}

interface QuizAttemptRecord {
  attempt_id?: string;
  quiz_id?: string;
  workspace_id?: string;
  user_id?: string;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  time_spent_seconds?: number;
  xp_earned?: number;
  submitted_at?: Timestamp | Date;
  created_at?: Timestamp | Date;
}

const generatedQuestionsSchema = z.array(
  z.object({
    type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).optional(),
    correct_answer: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
  }),
);

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function toIsoString(value: Timestamp | Date | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return value.toISOString();
}

function toMillis(value: Timestamp | Date | null | undefined): number {
  if (!value) {
    return 0;
  }
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return value.getTime();
}

async function assertWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);
  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }
  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this workspace');
  }
}

function mapQuizQuestionSummary(question: QuizQuestionRecord): QuizQuestionSummary {
  return {
    question_id: String(question.question_id || ''),
    question_text: String(question.question_text || ''),
    question_type: (question.question_type || 'multiple_choice') as QuizQuestionType,
    options: question.options ?? undefined,
    difficulty: question.difficulty || 'medium',
  };
}

function mapQuizListItem(id: string, record: QuizRecord): QuizListItem {
  const questionCount =
    typeof record.question_count === 'number'
      ? record.question_count
      : typeof record.total_questions === 'number'
        ? record.total_questions
        : Array.isArray(record.questions)
          ? record.questions.length
          : 0;

  const latestScore = typeof record.score === 'number' ? record.score : null;
  const bestScore = typeof record.best_score === 'number' ? record.best_score : latestScore;

  return {
    id,
    quiz_id: id,
    workspace_id: String(record.workspace_id || ''),
    title: String(record.title || 'Untitled Quiz'),
    topic: record.topic ? String(record.topic) : null,
    source_id: record.source_id ? String(record.source_id) : null,
    question_count: questionCount,
    completed: record.completed === true,
    best_score: bestScore,
    latest_score: latestScore,
    attempt_count: typeof record.attempt_count === 'number' ? record.attempt_count : 0,
    created_at: toIsoString(record.created_at),
    updated_at: toIsoString(record.updated_at || record.created_at),
  };
}

function buildGenerationQuery(topics?: string[]): string {
  if (topics && topics.length > 0) {
    return `Generate assessment questions focused on: ${topics.join(', ')}`;
  }
  return 'Generate exam-style assessment questions from the highest-value concepts';
}

async function resolveQuizGenerationContext(input: {
  workspaceId: string;
  sourceIds?: string[];
  topics?: string[];
}): Promise<string> {
  const retrieval = await retrieveTutorContext({
    workspaceId: input.workspaceId,
    sourceIds: input.sourceIds,
    query: buildGenerationQuery(input.topics),
    conversationHistory: [],
    topK: 18,
  });

  if (retrieval.context.trim().length > 0) {
    return retrieval.context;
  }

  const db = getDb();
  const rawContent = await fetchRAGContent(db, input.workspaceId, input.sourceIds);
  const truncated = truncateContent(rawContent);
  if (truncated.trim().length === 0) {
    throw new ValidationError('No source content available. Please upload and process sources first.');
  }
  return truncated;
}

function normalizeMultipleChoiceOptions(options: string[] | undefined): Record<string, string> {
  if (!options || options.length < 4) {
    throw new ValidationError('Multiple choice questions must include at least 4 options');
  }

  return {
    A: options[0],
    B: options[1],
    C: options[2],
    D: options[3],
  };
}

function normalizeQuestionType(type: QuizQuestionType): QuizQuestionType {
  if (type === 'multiple_choice' || type === 'true_false' || type === 'short_answer') {
    return type;
  }
  return 'multiple_choice';
}

function scoreQuestion(question: QuizDetailQuestion, userAnswer: string): boolean {
  const answer = String(userAnswer || '').trim();
  if (answer.length === 0) {
    return false;
  }

  const correctAnswer = String(question.correct_answer || '').trim();
  if (question.question_type === 'multiple_choice') {
    return answer.toUpperCase() === correctAnswer.toUpperCase();
  }

  if (question.question_type === 'true_false') {
    return answer.toLowerCase() === correctAnswer.toLowerCase();
  }

  const normalizedUser = answer.toLowerCase();
  const normalizedCorrect = correctAnswer.toLowerCase();
  return (
    normalizedUser === normalizedCorrect ||
    normalizedCorrect.includes(normalizedUser) ||
    normalizedUser.includes(normalizedCorrect)
  );
}

async function getQuizDoc(
  quizId: string,
  userId: string,
): Promise<{ id: string; data: QuizRecord }> {
  const db = getDb();
  const doc = await db.collection(QUIZZES_COLLECTION).doc(quizId).get();

  if (!doc.exists) {
    throw new ValidationError('Quiz not found');
  }

  const data = doc.data() as QuizRecord | undefined;
  if (!data) {
    throw new ValidationError('Quiz data is missing');
  }

  const workspaceId = String(data.workspace_id || '');
  if (!workspaceId) {
    throw new ValidationError('Quiz workspace is missing');
  }

  await assertWorkspaceAccess(workspaceId, userId);
  return { id: doc.id, data };
}

export async function listWorkspaceQuizzes(
  workspaceId: string,
  userId: string,
  options: { sourceId?: string; limit?: number; offset?: number } = {},
): Promise<{ quizzes: QuizListItem[]; total: number }> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const snapshot = await db.collection(QUIZZES_COLLECTION).where('workspace_id', '==', workspaceId).get();

  let quizzes = snapshot.docs
    .map((doc) => mapQuizListItem(doc.id, doc.data() as QuizRecord))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (options.sourceId) {
    quizzes = quizzes.filter((quiz) => quiz.source_id === options.sourceId);
  }

  return {
    quizzes: quizzes.slice(offset, offset + limit),
    total: quizzes.length,
  };
}

export async function getQuizDetail(quizId: string, userId: string): Promise<QuizDetail> {
  const quiz = await getQuizDoc(quizId, userId);
  const questions = Array.isArray(quiz.data.questions) ? quiz.data.questions : [];

  return {
    id: quiz.id,
    quiz_id: quiz.id,
    workspace_id: String(quiz.data.workspace_id || ''),
    title: String(quiz.data.title || 'Untitled Quiz'),
    topic: quiz.data.topic ? String(quiz.data.topic) : null,
    source_id: quiz.data.source_id ? String(quiz.data.source_id) : null,
    created_at: toIsoString(quiz.data.created_at),
    updated_at: toIsoString(quiz.data.updated_at || quiz.data.created_at),
    questions: questions.map(mapQuizQuestionSummary),
  };
}

export async function deleteQuiz(quizId: string, userId: string): Promise<void> {
  const db = getDb();
  const quiz = await getQuizDoc(quizId, userId);

  const workspaceAccess = await verifyWorkspaceAccess(String(quiz.data.workspace_id || ''), userId);
  const creatorId = String(quiz.data.created_by_user_id || quiz.data.user_id || '');
  if (!workspaceAccess.isOwner && creatorId !== userId) {
    throw new AuthorizationError('Only the quiz author or workspace owner can delete this quiz');
  }

  const attemptsSnapshot = await db
    .collection(QUIZ_ATTEMPTS_COLLECTION)
    .where('quiz_id', '==', quiz.id)
    .get();

  const batch = db.batch();
  batch.delete(db.collection(QUIZZES_COLLECTION).doc(quiz.id));

  const questionsSnapshot = await db.collection(QUIZ_QUESTIONS_COLLECTION).where('quiz_id', '==', quiz.id).get();
  questionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  attemptsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  const attemptIds = attemptsSnapshot.docs.map((doc) => doc.id);
  for (let i = 0; i < attemptIds.length; i += 30) {
    const chunk = attemptIds.slice(i, i + 30);
    const answersSnapshot = await db
      .collection(QUIZ_ATTEMPT_ANSWERS_COLLECTION)
      .where('attempt_id', 'in', chunk)
      .get();
    answersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  }

  await batch.commit();
  appLogger.info('Quiz deleted', { quizId: quiz.id, workspaceId: quiz.data.workspace_id, userId });
}

export async function generateWorkspaceQuiz(input: {
  workspaceId: string;
  userId: string;
  sourceIds?: string[];
  count: number;
  questionTypes?: QuizQuestionType[];
  topics?: string[];
}): Promise<{ quiz: QuizDetail; generated_count: number }> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);

  const aiQuota = await consumeAiQueryQuota(input.userId);
  if (!aiQuota.allowed) {
    throw new AuthorizationError(
      'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
    );
  }

  const context = await resolveQuizGenerationContext({
    workspaceId: input.workspaceId,
    sourceIds: input.sourceIds,
    topics: input.topics,
  });

  const prompt = createQuizPrompt(
    context,
    input.count,
    input.questionTypes,
    input.topics && input.topics.length > 0 ? input.topics.join(', ') : undefined,
  );
  const response = await getChatCompletion([{ role: 'user', content: prompt }], {
    temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
    maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
    mockType: 'quiz',
    responseMimeType: 'application/json',
    responseSchema: QUIZ_RESPONSE_SCHEMA,
  });

  const generatedQuestions = generatedQuestionsSchema.parse(JSON.parse(response));
  if (generatedQuestions.length === 0) {
    throw new ValidationError('No quiz questions were generated');
  }

  const questions: QuizDetailQuestion[] = generatedQuestions.map((generated) => {
    const questionType = normalizeQuestionType(generated.type);
    return {
      question_id: crypto.randomUUID(),
      question_text: generated.question.trim(),
      question_type: questionType,
      options:
        questionType === 'multiple_choice'
          ? normalizeMultipleChoiceOptions(generated.options)
          : questionType === 'true_false'
            ? { A: 'True', B: 'False' }
            : undefined,
      correct_answer: generated.correct_answer.trim(),
      explanation: generated.explanation.trim(),
      difficulty: 'medium',
    };
  });

  const persistedQuestions: QuizQuestionRecord[] = questions.map((question) => ({
    ...question,
    options: question.options ?? null,
  }));

  const db = getDb();
  const quizRef = db.collection(QUIZZES_COLLECTION).doc();
  const now = Timestamp.now();
  const quizRecord: QuizRecord = {
    quiz_id: quizRef.id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    created_by_user_id: input.userId,
    source_id: input.sourceIds?.[0] ?? null,
    title: input.topics?.[0] || 'Untitled Quiz',
    topic: input.topics?.[0] || null,
    questions: persistedQuestions,
    total_questions: questions.length,
    question_count: questions.length,
    completed: false,
    score: null,
    best_score: null,
    correct_count: null,
    time_spent_seconds: null,
    attempt_count: 0,
    created_at: now,
    updated_at: now,
    completed_at: null,
    last_attempt_id: null,
  };

  const batch = db.batch();
  batch.set(quizRef, quizRecord);
  for (const question of questions) {
    const questionRef = db.collection(QUIZ_QUESTIONS_COLLECTION).doc();
    batch.set(questionRef, {
      question_id: question.question_id,
      quiz_id: quizRef.id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options ?? null,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      created_at: now,
    });
  }
  await batch.commit();

  appLogger.info('Quiz generated', {
    quizId: quizRef.id,
    workspaceId: input.workspaceId,
    generatedCount: questions.length,
  });

  return {
    quiz: {
      id: quizRef.id,
      quiz_id: quizRef.id,
      workspace_id: input.workspaceId,
      title: String(quizRecord.title || 'Untitled Quiz'),
      topic: quizRecord.topic ? String(quizRecord.topic) : null,
      source_id: quizRecord.source_id ? String(quizRecord.source_id) : null,
      created_at: toIsoString(now),
      updated_at: toIsoString(now),
      questions: questions.map(mapQuizQuestionSummary),
    },
    generated_count: questions.length,
  };
}

export async function submitQuiz(
  quizId: string,
  userId: string,
  payload: { answers: Record<string, string>; timeSpentSeconds?: number },
): Promise<QuizSubmitResult> {
  const db = getDb();
  const quiz = await getQuizDoc(quizId, userId);
  const questions = (quiz.data.questions || []) as QuizDetailQuestion[];
  if (questions.length === 0) {
    throw new ValidationError('Quiz has no questions');
  }

  const answers = payload.answers || {};
  let correctCount = 0;

  const results: QuizAttemptResultItem[] = questions.map((question) => {
    const userAnswer = String(answers[question.question_id] || '');
    const isCorrect = scoreQuestion(question, userAnswer);
    if (isCorrect) {
      correctCount += 1;
    }
    return {
      question_id: question.question_id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options ?? undefined,
      user_answer: userAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      explanation: question.explanation,
    };
  });

  const totalQuestions = questions.length;
  const score = Math.round((correctCount / totalQuestions) * 100);
  const xpEarned = correctCount * 10 + (score >= 80 ? 20 : 0);
  const timeSpentSeconds = Math.max(0, Math.trunc(payload.timeSpentSeconds || 0));
  const now = Timestamp.now();

  const attemptRef = db.collection(QUIZ_ATTEMPTS_COLLECTION).doc();
  const attemptRecord: QuizAttemptRecord = {
    attempt_id: attemptRef.id,
    quiz_id: quiz.id,
    workspace_id: String(quiz.data.workspace_id || ''),
    user_id: userId,
    score,
    correct_count: correctCount,
    total_questions: totalQuestions,
    time_spent_seconds: timeSpentSeconds,
    xp_earned: xpEarned,
    submitted_at: now,
    created_at: now,
  };

  const batch = db.batch();
  batch.set(attemptRef, attemptRecord);

  for (const result of results) {
    const answerRef = db.collection(QUIZ_ATTEMPT_ANSWERS_COLLECTION).doc();
    batch.set(answerRef, {
      attempt_answer_id: answerRef.id,
      attempt_id: attemptRef.id,
      question_id: result.question_id,
      user_answer: result.user_answer,
      is_correct: result.is_correct,
      correct_answer: result.correct_answer,
      explanation_snapshot: result.explanation,
      question_text: result.question_text,
      created_at: now,
    });
  }

  const currentBest = typeof quiz.data.best_score === 'number' ? quiz.data.best_score : null;
  const bestScore = currentBest === null ? score : Math.max(currentBest, score);
  const attemptCount = typeof quiz.data.attempt_count === 'number' ? quiz.data.attempt_count + 1 : 1;

  batch.update(db.collection(QUIZZES_COLLECTION).doc(quiz.id), {
    completed: true,
    score,
    best_score: bestScore,
    correct_count: correctCount,
    time_spent_seconds: timeSpentSeconds,
    attempt_count: attemptCount,
    completed_at: now,
    updated_at: now,
    last_attempt_id: attemptRef.id,
  });

  await batch.commit();

  const workspaceId = String(quiz.data.workspace_id || '');
  if (workspaceId.length > 0) {
    await updateUserStats(db, userId, {
      workspace_id: workspaceId,
      quizzes_completed: 1,
      quiz_score: score,
      study_time_minutes: Math.ceil(timeSpentSeconds / 60),
      xp_earned: xpEarned,
    });
  }

  appLogger.info('Quiz submitted', {
    quizId: quiz.id,
    attemptId: attemptRef.id,
    workspaceId: quiz.data.workspace_id,
    userId,
    score,
  });

  return {
    attempt_id: attemptRef.id,
    quiz_id: quiz.id,
    score,
    correct_count: correctCount,
    total_questions: totalQuestions,
    time_spent_seconds: timeSpentSeconds,
    completed_at: toIsoString(now),
    xp_earned: xpEarned,
    results,
  };
}

export async function listWorkspaceQuizAttempts(
  workspaceId: string,
  userId: string,
  limit: number = 50,
): Promise<{ attempts: QuizAttemptHistoryItem[] }> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();

  const attemptsSnapshot = await db
    .collection(QUIZ_ATTEMPTS_COLLECTION)
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  const attempts = attemptsSnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as QuizAttemptRecord }))
    .sort((a, b) => toMillis(b.data.submitted_at) - toMillis(a.data.submitted_at))
    .slice(0, limit);

  const quizIds = Array.from(
    new Set(attempts.map((attempt) => String(attempt.data.quiz_id || '')).filter((value) => value.length > 0)),
  );

  const titleMap = new Map<string, string>();
  for (let i = 0; i < quizIds.length; i += 30) {
    const chunk = quizIds.slice(i, i + 30);
    const quizzesSnapshot = await db.collection(QUIZZES_COLLECTION).where('__name__', 'in', chunk).get();
    quizzesSnapshot.docs.forEach((quizDoc) => {
      const quizData = quizDoc.data() as QuizRecord;
      titleMap.set(quizDoc.id, String(quizData.title || 'Untitled Quiz'));
    });
  }

  return {
    attempts: attempts.map(({ id, data }) => {
      const quizId = String(data.quiz_id || '');
      return {
        attempt_id: String(data.attempt_id || id),
        quiz_id: quizId,
        quiz_title: titleMap.get(quizId) || 'Untitled Quiz',
        score: typeof data.score === 'number' ? data.score : 0,
        correct_count: typeof data.correct_count === 'number' ? data.correct_count : 0,
        total_questions: typeof data.total_questions === 'number' ? data.total_questions : 0,
        time_spent_seconds: typeof data.time_spent_seconds === 'number' ? data.time_spent_seconds : 0,
        submitted_at: toIsoString(data.submitted_at),
      };
    }),
  };
}

export async function listQuizAttempts(
  quizId: string,
  userId: string,
  limit: number = 50,
): Promise<{ attempts: QuizAttemptHistoryItem[] }> {
  const quiz = await getQuizDoc(quizId, userId);
  const db = getDb();

  const attemptsSnapshot = await db
    .collection(QUIZ_ATTEMPTS_COLLECTION)
    .where('quiz_id', '==', quiz.id)
    .where('user_id', '==', userId)
    .get();

  const attempts = attemptsSnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as QuizAttemptRecord }))
    .sort((a, b) => toMillis(b.data.submitted_at) - toMillis(a.data.submitted_at))
    .slice(0, limit);

  const quizTitle = String(quiz.data.title || 'Untitled Quiz');

  return {
    attempts: attempts.map(({ id, data }) => ({
      attempt_id: String(data.attempt_id || id),
      quiz_id: String(data.quiz_id || quiz.id),
      quiz_title: quizTitle,
      score: typeof data.score === 'number' ? data.score : 0,
      correct_count: typeof data.correct_count === 'number' ? data.correct_count : 0,
      total_questions: typeof data.total_questions === 'number' ? data.total_questions : 0,
      time_spent_seconds: typeof data.time_spent_seconds === 'number' ? data.time_spent_seconds : 0,
      submitted_at: toIsoString(data.submitted_at),
    })),
  };
}
