import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🛡️ LEOPARDFISH EDGE SHIELD v2
 * Optimized to prevent Port 3000 lag and 429 errors.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * ⚡ TACTICAL MATCHER REPAIR:
     * Excludes everything that isn't a "Page" request.
     */
    '/((?!api|_next/static|_next/image|images|assets|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};