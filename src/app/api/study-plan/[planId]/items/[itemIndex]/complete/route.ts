import { NextRequest } from 'next/server';

import {
  withAuth,
  successResponse,
  errorResponse,
  StatusCodes,
  parseBody,
} from '@/shared/lib/api/auth';

export const POST = withAuth(async (req: NextRequest, { userId, db }) => {
  const pathParts = new URL(req.url).pathname.split('/');
  const planId = pathParts[4];
  const itemIndex = pathParts[6];

  const body = await parseBody<{ completed: boolean }>(req);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { completed } = body;

  const doc = await db.collection('study_plans').doc(planId).get();

  if (!doc.exists) {
    return errorResponse('Plan not found', StatusCodes.NOT_FOUND);
  }

  const data = doc.data();

  if (data?.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const schedule = data?.generated_schedule || [];
  schedule[parseInt(itemIndex)] = {
    ...schedule[parseInt(itemIndex)],
    completed,
  };

  await doc.ref.update({ generated_schedule: schedule });

  return successResponse({ success: true });
});
