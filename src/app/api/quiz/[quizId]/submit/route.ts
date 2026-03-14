import { NextRequest } from 'next/server';

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

interface SubmitQuizBody {
  answers: Record<string, string>;
  time_spent_seconds?: number;
}

interface QuizQuestion {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: unknown;
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
}

interface QuizData {
  quiz_id: string;
  user_id: string;
  completed?: boolean;
  questions?: QuizQuestion[];
}

function extractQuizId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyQuizAccess(
  db: Firestore,
  quizId: string,
  userId: string,
): Promise<{ quizDoc: DocumentSnapshot; quizData: QuizData } | null> {
  const quizDoc = await db.collection('quizzes').doc(quizId).get();

  if (!quizDoc.exists) {
    return null;
  }

  const quizData = quizDoc.data() as QuizData;

  if (!quizData || quizData.user_id !== userId) {
    return null;
  }

  return { quizDoc, quizData };
}

export const POST = withAuth(async (request, { db, userId }) => {
  const quizId = extractQuizId(request);
  const body = await parseBody<SubmitQuizBody>(request);

  if (!body || !body.answers || typeof body.answers !== 'object') {
    return errorResponse('Answers are required', StatusCodes.BAD_REQUEST);
  }

  const access = await verifyQuizAccess(db, quizId, userId);

  if (!access) {
    return errorResponse('Quiz not found', StatusCodes.NOT_FOUND);
  }

  const { quizData } = access;

  if (quizData.completed) {
    return errorResponse('Quiz has already been submitted', StatusCodes.BAD_REQUEST);
  }

  const { answers, time_spent_seconds } = body;
  const questions = quizData.questions || [];
  let correctCount = 0;
  const results = [];

  for (const question of questions) {
    const questionId = question.question_id;
    const userAnswer = answers[questionId];
    const correctAnswer = question.correct_answer;

    let isCorrect = false;

    if (question.question_type === 'multiple_choice') {
      const userAnswerKey = userAnswer?.toUpperCase?.();
      const correctAnswerKey = correctAnswer?.toUpperCase?.();
      isCorrect = userAnswerKey === correctAnswerKey;
    } else if (question.question_type === 'true_false') {
      const userAnswerNormalized = String(userAnswer).toLowerCase().trim();
      const correctAnswerNormalized = String(correctAnswer).toLowerCase().trim();
      isCorrect = userAnswerNormalized === correctAnswerNormalized;
    } else if (question.question_type === 'short_answer') {
      const userAnswerNormalized = String(userAnswer).toLowerCase().trim();
      const correctAnswerNormalized = String(correctAnswer).toLowerCase().trim();
      isCorrect =
        userAnswerNormalized === correctAnswerNormalized ||
        correctAnswerNormalized.includes(userAnswerNormalized) ||
        userAnswerNormalized.includes(correctAnswerNormalized);
    }

    if (isCorrect) {
      correctCount++;
    }

    results.push({
      question_id: questionId,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      explanation: question.explanation,
      difficulty: question.difficulty,
    });
  }

  const totalQuestions = questions.length;
  const score = Math.round((correctCount / totalQuestions) * 100);
  const xpEarned = correctCount * 10 + (score >= 80 ? 20 : 0);

  const updateData = {
    completed: true,
    score,
    correct_count: correctCount,
    time_spent_seconds: time_spent_seconds || null,
    completed_at: new Date(),
    xp_earned: xpEarned,
  };

  await db.collection('quizzes').doc(quizId).update(updateData);

  // Update centralized stats
  const { updateUserStats } = await import('@/shared/lib/analytics/stats');
  await updateUserStats(db, userId, {
    quizzes_completed: 1,
    quiz_score: score,
    xp_earned: xpEarned,
    study_time_minutes: Math.ceil((time_spent_seconds || 0) / 60),
  });

  return successResponse({
    quiz_id: quizData.quiz_id,
    score,
    correct_count: correctCount,
    total_questions: totalQuestions,
    time_spent_seconds: time_spent_seconds || null,
    completed_at: new Date().toISOString(),
    xp_earned: xpEarned,
    results,
  });
});
