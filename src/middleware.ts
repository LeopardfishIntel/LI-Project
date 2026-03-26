import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🛰️ LEOPARDFISH TACTICAL MIDDLEWARE
 * Logic: Checks for a valid session before allowing entry to protected zones.
 * Optimized to prevent the 12s compilation hang by avoiding heavy SDK imports.
 */
export function middleware(request: NextRequest) {
  // 🛡️ THE SESSION KEY: Required by Firebase App Hosting for session persistence
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  // 1. DEFINE PROTECTED ZONES
  const isProtectedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/profile') ||
    pathname.startsWith('/schools');

  // 2. GUEST REDIRECT: Kick unauthorized users to signup
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/signup', request.url);
    // 🛰️ INTEL: Pass the original path so they return here after auth
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. AUTH REDIRECT: Prevent logged-in users from hitting signup again
  if (pathname === '/signup' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🛰️ Protocol: Immediate Handover for all other routes
  return NextResponse.next();
}

/**
 * 🎯 TACTICAL MATCHER
 * Instead of matching EVERYTHING, we only trigger on specific routes 
 * to maximize performance and minimize build-time module bloat.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/schools/:path*',
    '/signup',
  ],
};