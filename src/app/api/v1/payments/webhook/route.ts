import { NextRequest } from 'next/server';

import { processPaystackWebhook } from '@/domains/billing';

import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AppError } from '@/shared/lib/rebuild/errors';
import { enforceRateLimit, getClientAddressFromHeaders } from '@/shared/lib/rebuild/rate-limit';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const clientAddress = getClientAddressFromHeaders(request.headers) ?? 'unknown';
    const decision = enforceRateLimit(`payments-webhook:${clientAddress}`, {
      windowMs: 60_000,
      maxRequests: 180,
    });
    if (!decision.allowed) {
      throw new AppError({
        code: 'RATE_LIMITED',
        message: 'Too many webhook requests. Please retry shortly.',
        status: 429,
        details: {
          retry_after_seconds: decision.retryAfterSeconds,
        },
      });
    }

    const signature = request.headers.get('x-paystack-signature');
    const rawBody = await request.text();
    const result = await processPaystackWebhook(rawBody, signature);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
