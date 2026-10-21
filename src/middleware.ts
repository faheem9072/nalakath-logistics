import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sanitize malformed paths if copied with markdown syntax or extra trailing characters
  if (pathname.startsWith('/drivers') && pathname !== '/drivers') {
    return NextResponse.redirect(new URL('/drivers', request.url));
  }
  if (pathname.startsWith('/driver') && !pathname.startsWith('/drivers') && pathname !== '/driver') {
    return NextResponse.redirect(new URL('/driver', request.url));
  }
  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/login') && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
