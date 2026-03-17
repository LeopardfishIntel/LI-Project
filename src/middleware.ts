import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🛡️ LEOPARDFISH EDGE SHIELD
 * Middleware logic strictly isolated from @/firebase client SDKs.
 * Prevents runtime resolution failures in the Next.js edge environment.
 */
export function middleware(request: NextRequest) {
  // Core routing logic remains clean of browser-only SDKs
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
