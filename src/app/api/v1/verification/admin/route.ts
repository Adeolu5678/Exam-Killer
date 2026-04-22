import { z } from 'zod';

import { getPendingVerifications, updateUserSubscription } from '@/shared/lib/paystack/db';
import { requireAdminUserId } from '@/shared/lib/rebuild/admin-access';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import {
  ValidationError,
} from '@/shared/lib/rebuild/errors';

const reviewVerificationSchema = z.object({
  target_user_id: z.string().min(1),
  status: z.enum(['verified', 'rejected']),
  reason: z.string().optional(),
});

export async function GET(): Promise<Response> {
  try {
    await requireAdminUserId();
    const verifications = await getPendingVerifications();
    return apiSuccess({ verifications });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminUserId();

    const rawBody = (await request.json()) as {
      target_user_id?: unknown;
      targetUserId?: unknown;
      status?: unknown;
      reason?: unknown;
    };

    const parsed = reviewVerificationSchema.parse({
      target_user_id: rawBody.target_user_id ?? rawBody.targetUserId,
      status: rawBody.status,
      reason: rawBody.reason,
    });

    const updated = await updateUserSubscription(parsed.target_user_id, {
      verification_status: parsed.status,
    });

    if (!updated) {
      throw new ValidationError('Failed to update user verification status');
    }

    return apiSuccess({
      reviewed: true,
      target_user_id: parsed.target_user_id,
      status: parsed.status,
    });
  } catch (error) {
    return apiError(error);
  }
}
