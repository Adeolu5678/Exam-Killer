import { NextRequest } from 'next/server';

import { loginRequestSchema, sessionMutationRequestSchema } from '@/domains/auth/contracts/session';

import { getAdminAuth } from '@/shared/lib/firebase/admin';
import { setSessionCookie, clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { ValidationError } from '@/shared/lib/rebuild/errors';
import { withRequestLogging } from '@/shared/lib/rebuild/logger';

export async function POST(request: NextRequest): Promise<Response> {
  return withRequestLogging(request, async () => {
    try {
      const payload = loginRequestSchema.parse(await request.json());
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

      if (!apiKey) {
        throw new ValidationError('Server configuration error');
      }

      const signInResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payload.email,
            password: payload.password,
            returnSecureToken: true,
          }),
        },
      );

      if (!signInResponse.ok) {
        const errorData = (await signInResponse.json()) as { error?: { message?: string } };
        const errorMessage = errorData.error?.message;

        if (errorMessage === 'EMAIL_NOT_FOUND' || errorMessage === 'INVALID_PASSWORD') {
          throw new ValidationError('Invalid email or password');
        }

        if (errorMessage === 'USER_DISABLED') {
          throw new ValidationError('This account has been disabled');
        }

        if (errorMessage === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
          return apiError(new ValidationError('Too many failed attempts. Please try again later.'), {
            status: 429,
          });
        }

        throw new ValidationError('Login failed. Please check your credentials.');
      }

      const signInData = (await signInResponse.json()) as {
        idToken?: string;
        refreshToken?: string;
      };

      if (!signInData.idToken) {
        throw new ValidationError('Failed to obtain authentication token');
      }

      await setSessionCookie(signInData.idToken);

      const auth = getAdminAuth();
      const decodedToken = auth ? await auth.verifyIdToken(signInData.idToken) : null;

      return apiSuccess({
        session: {
          access_token: signInData.idToken,
          refresh_token: signInData.refreshToken ?? null,
          expires_at: decodedToken ? decodedToken.exp * 1000 : null,
        },
      });
    } catch (error) {
      return apiError(error instanceof Error ? error : new Error('Failed to log in'));
    }
  });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return withRequestLogging(request, async () => {
    try {
      await clearSessionCookie();
      return apiSuccess({ success: true });
    } catch (error) {
      return apiError(error instanceof Error ? error : new Error('Failed to clear session'));
    }
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return withRequestLogging(request, async () => {
    try {
      const payload = sessionMutationRequestSchema.parse(await request.json());
      await setSessionCookie(payload.idToken);
      return apiSuccess({ success: true });
    } catch (error) {
      return apiError(error instanceof Error ? error : new Error('Failed to set session'));
    }
  });
}
