import { NextRequest } from 'next/server';

import { withAuth, successResponse, errorResponse, StatusCodes } from '@/shared/lib/api/auth';

export const GET = withAuth(async (req: NextRequest, { userId, db }) => {
  const planId = new URL(req.url).pathname.split('/')[4];

  const doc = await db.collection('study_plans').doc(planId).get();

  if (!doc.exists) {
    return errorResponse('Plan not found', StatusCodes.NOT_FOUND);
  }

  const data = doc.data();

  if (data?.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const completed =
    data?.generated_schedule?.filter((item: unknown) => (item as { completed?: boolean }).completed)
      .length || 0;
  const total = data?.generated_schedule?.length || 1;

  return successResponse({
    plan: {
      id: doc.id,
      ...data,
      exam_date: data?.exam_date?.toDate?.()?.toISOString(),
      created_at: data?.created_at?.toDate?.()?.toISOString(),
      progress: (completed / total) * 100,
    },
  });
});

export const PUT = withAuth(async (req: NextRequest, { userId, db }) => {
  const planId = new URL(req.url).pathname.split('/')[4];

  const doc = await db.collection('study_plans').doc(planId).get();

  if (!doc.exists) {
    return errorResponse('Plan not found', StatusCodes.NOT_FOUND);
  }

  const data = doc.data();

  if (data?.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const updates = await req.json();
  await doc.ref.update(updates);

  return successResponse({ success: true });
});
