import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PATHS = ['/admin/portal'];
const TENANT_PATHS = ['/tenant'];

// Passkey setup page — must be reachable even when passkey is required but not yet set up
const PASSKEY_SETUP_PATH = '/admin/portal/security/passkeys';

// These tenant paths are accessible without org membership / status checks
const TENANT_EXEMPT_PATHS = ['/tenant/suspended', '/tenant-chooser'];

/**
 * Redirect helper, NOT a security boundary.
 *
 * Middleware runs on the edge runtime, where the node:crypto HMAC used to sign
 * session tokens is unavailable — so it can check that a cookie is present but
 * never that it is genuine. Authorization is enforced where it can be proven:
 * `apps/web/src/app/admin/layout.tsx` for pages, and `requireAdmin` in
 * `apps/web/src/lib/require-admin.ts` for every /api/admin route. Both run on
 * the Node runtime with database access.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (ADMIN_PATHS.some((adminPath) => path.startsWith(adminPath))) {
    // Presence check only — bounces obviously-anonymous traffic without a
    // round trip. The layout re-verifies and redirects if this is forged.
    const sessionToken = request.cookies.get('campaignsites_session')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Passkey enforcement: if the server has flagged this session as needing passkey setup,
    // redirect to the setup page (except when already heading there).
    // The flag is set by the login API when requirePasskey=true but no passkeyVerified cookie exists.
    const needsPasskeySetup = request.cookies.get('passkey_required')?.value === '1';
    if (needsPasskeySetup && !path.startsWith(PASSKEY_SETUP_PATH)) {
      return NextResponse.redirect(new URL(`${PASSKEY_SETUP_PATH}?setup=required`, request.url));
    }
  }

  if (TENANT_PATHS.some((p) => path.startsWith(p))) {
    // Exempt suspension landing page and chooser — must be reachable without valid org context
    if (TENANT_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt))) {
      return NextResponse.next();
    }

    const sessionToken =
      request.cookies.get('campaignsites_session')?.value || request.cookies.get('token')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Cross-org view-as sessions: /tenant/[id]/view-as/[targetOrgId]
    // Allow through — ancestry access is validated in the page/API layer
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
