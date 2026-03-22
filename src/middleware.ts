import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Currently just passing through all requests
  return NextResponse.next();
}

// Ensure the middleware doesn't interfere with static assets or API routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
