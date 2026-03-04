import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require GLOBAL_ADMIN role
const ADMIN_PATHS = ['/admin/portal'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if path requires admin access
  if (ADMIN_PATHS.some((adminPath) => path.startsWith(adminPath))) {
    // Get user role from session/token (implement based on your auth system)
    // For now, this is a placeholder - you'll need to integrate with your actual auth
    const userRole = request.cookies.get('userRole')?.value;

    // If not GLOBAL_ADMIN, redirect to login
    if (userRole !== 'GLOBAL_ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

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
