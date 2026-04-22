import { NextRequest } from 'next/server';

import { getBillingStatus } from '@/domains/billing';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AppError, AuthenticationError } from '@/shared/lib/rebuild/errors';
import { enforceRateLimit } from '@/shared/lib/rebuild/rate-limit';

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const decision = enforceRateLimit(`payments-status:${user.uid}`, {
      windowMs: 60_000,
      maxRequests: 90,
    });
    if (!decision.allowed) {
      throw new AppError({
        code: 'RATE_LIMITED',
        message: 'Too many billing status requests. Please retry shortly.',
        status: 429,
        details: {
          retry_after_seconds: decision.retryAfterSeconds,
        },
      });
    }

    const status = await getBillingStatus(user.uid);
    return apiSuccess(status);
  } catch (error) {
    return apiError(error);
  }
}
