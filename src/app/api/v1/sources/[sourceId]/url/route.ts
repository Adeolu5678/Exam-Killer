import { NextRequest } from 'next/server';

import {
  getSignedSourceUrl,
  normalizeSignedUrlExpiryMinutes,
} from '@/domains/sources';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AppError, AuthenticationError } from '@/shared/lib/rebuild/errors';
import { enforceRateLimit } from '@/shared/lib/rebuild/rate-limit';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const decision = enforceRateLimit(`signed-source-url:${user.uid}`, {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!decision.allowed) {
      throw new AppError({
        code: 'RATE_LIMITED',
        message: 'Too many signed URL requests. Please try again shortly.',
        status: 429,
        details: {
          retry_after_seconds: decision.retryAfterSeconds,
        },
      });
    }

    const { sourceId } = await context.params;
    const url = new URL(request.url);
    const requestedExpiry = Number.parseInt(url.searchParams.get('expires') || '', 10);
    const expiresInMinutes = normalizeSignedUrlExpiryMinutes(
      Number.isNaN(requestedExpiry) ? undefined : requestedExpiry,
    );

    const signedUrl = await getSignedSourceUrl(sourceId, user.uid, expiresInMinutes);
    return apiSuccess({ url: signedUrl, expires_in_minutes: expiresInMinutes });
  } catch (error) {
    return apiError(error);
  }
}
