import { cookies } from 'next/headers';

import { DecodedIdToken } from 'firebase-admin/auth';

import { getAdminAuth } from './admin';

const SESSION_COOKIE_NAME = 'session';
const SESSION_COOKIE_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000;

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

function mapDecodedTokenToUser(token: DecodedIdToken): AuthUser {
  return {
    uid: token.uid,
    email: token.email || null,
    displayName: token.name || null,
    photoURL: token.picture || null,
    emailVerified: token.email_verified || false,
  };
}

export async function verifySessionCookie(sessionCookie: string): Promise<DecodedIdToken | null> {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      return null;
    }
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedToken = await verifySessionCookie(sessionCookie);

    if (!decodedToken) {
      return null;
    }

    return mapDecodedTokenToUser(decodedToken);
  } catch {
    return null;
  }
}

export async function createSessionCookie(
  idToken: string,
  expiresIn: number = SESSION_COOKIE_EXPIRES_IN,
): Promise<string> {
  const auth = getAdminAuth();
  if (!auth) {
    throw new Error('Firebase Admin not initialized');
  }
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  return sessionCookie;
}

export async function setSessionCookie(
  idToken: string,
  expiresIn: number = SESSION_COOKIE_EXPIRES_IN,
): Promise<void> {
  const sessionCookie = await createSessionCookie(idToken, expiresIn);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getDecodedToken(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    return await verifySessionCookie(sessionCookie);
  } catch {
    return null;
  }
}
