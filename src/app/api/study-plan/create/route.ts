import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  parseBody,
} from '@/shared/lib/api/auth';
import { adminDb } from '@/shared/lib/firebase/admin';
import { getChatCompletion } from '@/shared/lib/openai/client';

export const POST = withAuth(async (req: NextRequest, { userId, db }) => {
  const body = await parseBody<{
    workspace_id: string;
    exam_date: string;
    daily_study_hours: number;
    focus_topics: string[];
  }>(req);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { workspace_id, exam_date, daily_study_hours, focus_topics } = body;

  const workspaceDoc = await db.collection('workspaces').doc(workspace_id).get();
  const workspaceData = workspaceDoc.data();

  const sourcesSnapshot = await db
    .collection('sources')
    .where('workspace_id', '==', workspace_id)
    .where('processed', '==', true)
    .limit(3)
    .get();

  sourcesSnapshot.docs.map((doc) => doc.data()).slice(0, 1);

  const examDate = new Date(exam_date);
  const today = new Date();
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const prompt = `Generate a personalized study plan for exam preparation.

USER INPUT:
- Exam date: ${exam_date}
- Days until exam: ${daysUntilExam}
- Daily study hours: ${daily_study_hours}
- Topics to cover: ${focus_topics?.join(', ') || 'All topics from workspace'}

Generate a day-by-day schedule as JSON array (max ${Math.min(daysUntilExam, 30)} items):
[
  {
    "date": "2026-03-01",
    "topic": "Topic name",
    "duration_minutes": ${daily_study_hours * 60},
    "activity_type": "flashcard" | "quiz" | "practice" | "review" | "tutor",
    "completed": false
  }
]

Guidelines:
- Distribute topics across available days
- Mix activity types for variety
- Include review sessions before exam
- Return ONLY valid JSON array, no other text`;

  const text = await getChatCompletion([{ role: 'user', content: prompt }], {
    mockType: 'summary',
  });

  let schedule: unknown[] = [];
  try {
    schedule = JSON.parse(text);
  } catch {
    schedule = [];
  }

  const planData = {
    user_id: userId,
    workspace_id,
    title: `Study Plan - ${workspaceData?.name || 'Workspace'}`,
    exam_date: adminDb.Timestamp.fromDate(new Date(exam_date)),
    daily_study_hours,
    topics_to_cover: focus_topics || [],
    generated_schedule: (schedule as Record<string, unknown>[]).map((item) => ({
      ...item,
      date: item.date,
    })),
    created_at: adminDb.Timestamp.now(),
    status: 'active',
  };

  const docRef = await db.collection('study_plans').add(planData);

  return successResponse(
    {
      plan: {
        id: docRef.id,
        ...planData,
        exam_date,
        created_at: new Date().toISOString(),
        progress: 0,
      },
    },
    StatusCodes.CREATED,
  );
});
