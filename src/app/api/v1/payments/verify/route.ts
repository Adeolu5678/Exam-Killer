import { NextRequest } from 'next/server';

import { verifyCheckout, verifyCheckoutQuerySchema } from '@/domains/billing';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AppError, AuthenticationError } from '@/shared/lib/rebuild/errors';
import { enforceRateLimit } from '@/shared/lib/rebuild/rate-limit';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const decision = enforceRateLimit(`payments-verify:${user.uid}`, {
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!decision.allowed) {
      throw new AppError({
        code: 'RATE_LIMITED',
        message: 'Too many payment verification requests. Please retry shortly.',
        status: 429,
        details: {
          retry_after_seconds: decision.retryAfterSeconds,
        },
      });
    }

    const parsed = verifyCheckoutQuerySchema.parse({
      reference: request.nextUrl.searchParams.get('reference'),
    });

    const result = await verifyCheckout(parsed.reference, user.uid);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
