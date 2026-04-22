import { NextRequest } from 'next/server';

import { signupRequestSchema } from '@/domains/auth/contracts/session';
import { bootstrapViewerProfile } from '@/domains/auth/services/signup-service';

import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { withRequestLogging } from '@/shared/lib/rebuild/logger';

export async function POST(request: NextRequest): Promise<Response> {
  return withRequestLogging(request, async () => {
    try {
      const payload = signupRequestSchema.parse(await request.json());
      const user = await bootstrapViewerProfile(payload);
      return apiSuccess({ user }, { status: 201 });
    } catch (error) {
      return apiError(error instanceof Error ? error : new Error('Failed to create account'));
    }
  });
}
