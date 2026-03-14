import { NextRequest } from 'next/server';

import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { checkMatricNumberEligibility } from '@/shared/lib/paystack/db';

const CheckMatricSchema = z.object({
  institution: z.string().min(2),
  matricNumber: z.string().min(3),
});

export const POST = withAuth(async (request, { userId }) => {
  const { data, error } = await parseBodyWithZod(request, CheckMatricSchema);

  if (error) return error;
  if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

  const { institution, matricNumber } = data;

  try {
    const result = await checkMatricNumberEligibility(institution, matricNumber);

    if (!result.eligible) {
      // If the matric number is already taken by THIS user, that's fine (maybe they are re-submitting)
      if (result.userId === userId) {
        return successResponse({ eligible: true, message: 'Existing matric number for this user' });
      }
      return errorResponse(
        'This matric number has already been registered for a free trial.',
        StatusCodes.BAD_REQUEST,
      );
    }

    return successResponse({ eligible: true });
  } catch (err) {
    console.error('Check matric error:', err);
    return errorResponse('Failed to verify matric number', StatusCodes.INTERNAL_ERROR);
  }
});
