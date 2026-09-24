import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🛰️ LEOPARDFISH TACTICAL MIDDLEWARE
 * Logic: Checks for a valid session before allowing entry to protected zones.
 * Ensures priority marketing, forecaster, and intelligence routes remain 100% public
 * to allow search engine crawlers and unauthenticated visitors direct access without login redirection.
 */
export function middleware(request: NextRequest) {
  // 🛡️ THE SESSION KEY: Required by Firebase App Hosting & auth cookies
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  // 1. PRIORITY PUBLIC TARGET PAGES (Zero auth gating; accessible to visitors & crawlers)
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/evaluate') ||
    pathname.startsWith('/compare') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/job') ||
    pathname.startsWith('/featured-jobs') ||
    pathname.startsWith('/financial-forecaster') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/prepare') ||
    pathname.startsWith('/calculators') ||
    pathname.startsWith('/churn-calculator') ||
    pathname.startsWith('/framework-mismatch') ||
    pathname.startsWith('/find-your-fit') ||
    pathname.startsWith('/methodology') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/partners') ||
    pathname.startsWith('/schools');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. DEFINE PROTECTED ZONES
  const isProtectedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/profile');

  // 3. GUEST REDIRECT: Kick unauthorized users from protected routes to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    // 🛰️ INTEL: Pass the original path so they return here after auth
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. AUTH REDIRECT: Prevent already logged-in users from hitting login/signup again
  if ((pathname === '/login' || pathname === '/signup') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🛰️ Protocol: Immediate Handover for all other routes
  return NextResponse.next();
}

/**
 * 🎯 TACTICAL MATCHER
 * Filters out internal Next.js assets, static assets, and favicon files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, icon.png (metadata/favicon assets)
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icon.png|assets|api).*)',
  ],
};
