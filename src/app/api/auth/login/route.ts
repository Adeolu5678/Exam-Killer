import { NextRequest } from 'next/server';

import { errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminAuth } from '@/shared/lib/firebase/admin';
import { setSessionCookie } from '@/shared/lib/firebase/server-auth';
import { LoginRequest, LoginResponse } from '@/shared/types/api';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', StatusCodes.BAD_REQUEST);
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return errorResponse('Server configuration error', StatusCodes.INTERNAL_ERROR);
    }

    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    if (!signInResponse.ok) {
      const errorData = await signInResponse.json();
      const errorMessage = errorData.error?.message || 'Authentication failed';

      if (errorMessage === 'EMAIL_NOT_FOUND' || errorMessage === 'INVALID_PASSWORD') {
        return errorResponse('Invalid email or password', StatusCodes.UNAUTHORIZED);
      }

      if (errorMessage === 'USER_DISABLED') {
        return errorResponse('This account has been disabled', StatusCodes.FORBIDDEN);
      }

      if (errorMessage === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return errorResponse('Too many failed attempts. Please try again later.', 429);
      }

      return errorResponse(
        'Login failed. Please check your credentials.',
        StatusCodes.UNAUTHORIZED,
      );
    }

    const signInData = await signInResponse.json();
    const idToken = signInData.idToken;

    if (!idToken) {
      return errorResponse('Failed to obtain authentication token', StatusCodes.INTERNAL_ERROR);
    }

    await setSessionCookie(idToken);

    const auth = getAdminAuth();
    if (!auth) {
      return errorResponse('Server configuration error', StatusCodes.INTERNAL_ERROR);
    }
    const decodedToken = await auth.verifyIdToken(idToken);

    return successResponse({
      success: true,
      session: {
        access_token: idToken,
        refresh_token: signInData.refreshToken,
        expires_at: decodedToken.exp * 1000,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);

    return errorResponse(
      'An unexpected error occurred. Please try again.',
      StatusCodes.INTERNAL_ERROR,
    );
  }
}
