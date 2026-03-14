import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isProtectedRoute, isAuthRoute, LOGIN_ROUTE, DASHBOARD_ROUTE } from './shared/lib/routes';

const SESSION_COOKIE_NAME = 'session';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionCookie;

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
    '/dashboard/:path*',
    '/workspace/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
};
