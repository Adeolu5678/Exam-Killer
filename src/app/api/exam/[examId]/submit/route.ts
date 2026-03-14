import { NextRequest } from 'next/server';

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

interface SubmitExamBody {
  answers: Record<string, string>;
  time_spent_seconds?: number;
}

interface ExamQuestion {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: unknown;
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
}

interface ExamData {
  exam_id: string;
  user_id: string;
  completed?: boolean;
  questions?: ExamQuestion[];
  time_limit_minutes?: number;
}

function extractExamId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyExamAccess(
  db: Firestore,
  examId: string,
  userId: string,
): Promise<{ examDoc: DocumentSnapshot; examData: ExamData } | null> {
  const examDoc = await db.collection('exams').doc(examId).get();

  if (!examDoc.exists) {
    return null;
  }

  const examData = examDoc.data() as ExamData;

  if (!examData || examData.user_id !== userId) {
    return null;
  }

  return { examDoc, examData };
}

export const POST = withAuth(async (request, { db, userId }) => {
  const examId = extractExamId(request);
  const body = await parseBody<SubmitExamBody>(request);

  if (!body || !body.answers || typeof body.answers !== 'object') {
    return errorResponse('Answers are required', StatusCodes.BAD_REQUEST);
  }

  const access = await verifyExamAccess(db, examId, userId);

  if (!access) {
    return errorResponse('Exam not found', StatusCodes.NOT_FOUND);
  }

  const { examData } = access;

  if (examData.completed) {
    return errorResponse('Exam has already been submitted', StatusCodes.BAD_REQUEST);
  }

  const { answers, time_spent_seconds } = body;
  const questions = examData.questions || [];
  let correctCount = 0;
  const questionResults = [];

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

    questionResults.push({
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

  let xpEarned = correctCount * 10;
  if (score >= 80) {
    xpEarned += 20;
  }

  const timeLimitSeconds = (examData.time_limit_minutes || 15) * 60;
  if (time_spent_seconds && time_spent_seconds < timeLimitSeconds) {
    xpEarned += 10;
  }

  const updateData = {
    completed: true,
    status: 'completed',
    score,
    correct_count: correctCount,
    time_spent_seconds: time_spent_seconds || null,
    completed_at: new Date(),
    xp_earned: xpEarned,
  };

  await db.collection('exams').doc(examId).update(updateData);

  // Update centralized stats
  const { updateUserStats } = await import('@/shared/lib/analytics/stats');
  await updateUserStats(db, userId, {
    exams_completed: 1,
    exam_score: score,
    xp_earned: xpEarned,
    study_time_minutes: Math.ceil((time_spent_seconds || 0) / 60),
  });

  return successResponse({
    result: {
      exam_id: examData.exam_id,
      score,
      correct_count: correctCount,
      total_questions: totalQuestions,
      time_spent_seconds: time_spent_seconds || null,
      question_results: questionResults.map((qr) => ({
        question_id: qr.question_id,
        question_text: qr.question_text,
        user_answer: qr.user_answer,
        correct_answer: qr.correct_answer,
        is_correct: qr.is_correct,
        explanation: qr.explanation,
      })),
      xp_earned: xpEarned,
    },
  });
});
