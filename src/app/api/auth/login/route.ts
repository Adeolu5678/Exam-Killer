import { NextRequest, NextResponse } from 'next/server';

import { getAdminAuth } from '@/shared/lib/firebase/admin';
import { setSessionCookie } from '@/shared/lib/firebase/server-auth';
import { LoginRequest, LoginResponse } from '@/shared/types/api';

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      );
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
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 },
        );
      }

      if (errorMessage === 'USER_DISABLED') {
        return NextResponse.json(
          { success: false, error: 'This account has been disabled' },
          { status: 403 },
        );
      }

      if (errorMessage === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return NextResponse.json(
          { success: false, error: 'Too many failed attempts. Please try again later.' },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { success: false, error: 'Login failed. Please check your credentials.' },
        { status: 401 },
      );
    }

    const signInData = await signInResponse.json();
    const idToken = signInData.idToken;

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Failed to obtain authentication token' },
        { status: 500 },
      );
    }

    await setSessionCookie(idToken);

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      );
    }
    const decodedToken = await auth.verifyIdToken(idToken);

    return NextResponse.json({
      success: true,
      session: {
        access_token: idToken,
        refresh_token: signInData.refreshToken,
        expires_at: decodedToken.exp * 1000,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
