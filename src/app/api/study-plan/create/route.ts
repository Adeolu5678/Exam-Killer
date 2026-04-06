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
import { createStudyPlanPrompt, STUDY_PLAN_RESPONSE_SCHEMA } from '@/shared/lib/openai/prompts';

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
  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }
  const workspaceData = workspaceDoc.data();
  if (!workspaceData || workspaceData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

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

  const prompt = createStudyPlanPrompt({
    examDate: exam_date,
    daysUntilExam,
    dailyStudyHours: daily_study_hours,
    focusTopics: focus_topics,
    maxDays: Math.min(daysUntilExam, 30),
  });

  const { consumeAiQueryQuota } = await import('@/shared/lib/paystack/db');
  const aiQuota = await consumeAiQueryQuota(userId);
  if (!aiQuota.allowed) {
    return errorResponse(
      'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
      StatusCodes.FORBIDDEN,
      { upgradeRequired: aiQuota.limit <= 5 },
    );
  }

  const text = await getChatCompletion([{ role: 'user', content: prompt }], {
    mockType: 'study_plan',
    responseMimeType: 'application/json',
    responseSchema: STUDY_PLAN_RESPONSE_SCHEMA,
  });

  let schedule: unknown[] = [];
  try {
    schedule = JSON.parse(text) as unknown[];
  } catch (parseError) {
    console.error('Failed to parse study plan response:', parseError);
    return errorResponse('Failed to parse generated study plan', StatusCodes.INTERNAL_ERROR);
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
