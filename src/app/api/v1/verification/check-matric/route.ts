import { NextRequest } from 'next/server';

import { z } from 'zod';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { checkMatricNumberEligibility } from '@/shared/lib/paystack/db';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

const checkMatricSchema = z.object({
  institution: z.string().min(2),
  matric_number: z.string().min(3),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const rawBody = (await request.json()) as {
      institution?: unknown;
      matric_number?: unknown;
      matricNumber?: unknown;
    };

    const parsed = checkMatricSchema.parse({
      institution: rawBody.institution,
      matric_number: rawBody.matric_number ?? rawBody.matricNumber,
    });

    const result = await checkMatricNumberEligibility(parsed.institution, parsed.matric_number);
    if (!result.eligible && result.userId !== user.uid) {
      throw new ValidationError('This matric number has already been registered for a free trial.');
    }

    return apiSuccess({ eligible: true });
  } catch (error) {
    return apiError(error);
  }
}
