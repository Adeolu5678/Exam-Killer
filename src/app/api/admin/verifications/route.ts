import { NextRequest } from 'next/server';

import { z } from 'zod';

import {
  withAdminAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getPendingVerifications, updateUserSubscription } from '@/shared/lib/paystack/db';

const ReviewVerificationSchema = z.object({
  targetUserId: z.string(),
  status: z.enum(['verified', 'rejected']),
  reason: z.string().optional(),
});

/**
 * GET: List all pending verifications
 */
export const GET = withAdminAuth(async (request) => {
  try {
    const verifications = await getPendingVerifications();
    return successResponse({ verifications });
  } catch (err) {
    return errorResponse('Failed to fetch pending verifications', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * POST: Approve or Reject a verification
 */
export const POST = withAdminAuth(async (request) => {
  const { data, error } = await parseBodyWithZod(request, ReviewVerificationSchema);

  if (error) return error;
  if (!data) return errorResponse('Invalid request', StatusCodes.BAD_REQUEST);

  const { targetUserId, status, reason } = data;

  try {
    const success = await updateUserSubscription(targetUserId, {
      verification_status: status,
    });

    if (!success) {
      return errorResponse('Failed to update user verification status', StatusCodes.INTERNAL_ERROR);
    }

    return successResponse({
      success: true,
      message: `User verification ${status} successfully.`,
    });
  } catch (err) {
    return errorResponse('Internal error during verification review', StatusCodes.INTERNAL_ERROR);
  }
});
