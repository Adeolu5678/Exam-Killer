import { NextRequest } from 'next/server';

import { withAuth, successResponse, errorResponse, StatusCodes } from '@/shared/lib/api/auth';

export const GET = withAuth(async (_req: NextRequest, { userId, db }) => {
  try {
    const snapshot = await db
      .collection('study_plans')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    const plans = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        exam_date: data.exam_date?.toDate?.()?.toISOString(),
        created_at: data.created_at?.toDate?.()?.toISOString(),
        progress:
          ((data.generated_schedule?.filter(
            (item: unknown) => (item as { completed?: boolean }).completed,
          ).length || 0) /
            (data.generated_schedule?.length || 1)) *
          100,
      };
    });

    return successResponse({ plans });
  } catch (error: unknown) {
    console.error('Error fetching study plans:', error);
    return errorResponse('Failed to fetch study plans', StatusCodes.INTERNAL_ERROR);
  }
});
