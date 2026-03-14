export const PROTECTED_ROUTES = ['/dashboard', '/workspace', '/profile', '/settings'] as const;

export const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

export const AUTH_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

export const LOGIN_ROUTE = '/auth/login';
export const DASHBOARD_ROUTE = '/dashboard';

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/auth/')) return true;
  return false;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
