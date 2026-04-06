import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasValidUnexpiredJwt } from '@/shared/lib/auth/session-cookie';

import { isProtectedRoute, isAuthRoute, LOGIN_ROUTE, DASHBOARD_ROUTE } from './shared/lib/routes';

const SESSION_COOKIE_NAME = 'session';

async function verifySessionWithServer(request: NextRequest): Promise<boolean> {
  try {
    const validateUrl = new URL('/api/auth/session/validate', request.url);
    const response = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    if (!response.ok) return false;
    const payload = (await response.json()) as { authenticated?: boolean };
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const maybeAuthenticated = hasValidUnexpiredJwt(sessionCookie);
  const isAuthenticated = maybeAuthenticated ? await verifySessionWithServer(request) : false;

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(DASHBOARD_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/workspace/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
};
