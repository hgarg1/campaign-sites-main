/**
 * The single authorization entry point for the system admin API.
 *
 * Every handler under /api/admin must call `requireAdmin` (or `requireAdminAny`)
 * before touching data. Middleware cannot do this job: Next.js middleware runs on
 * the edge runtime, where the node:crypto HMAC used to verify session tokens is
 * unavailable, and the matcher deliberately excludes /api. Treat middleware as a
 * redirect helper for pages and this module as the security boundary.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { resolveSystemAdminPermissions, checkResolved } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

export type AdminAuth =
  | { ok: true; userId: string; error?: undefined }
  | { ok: false; userId?: undefined; error: NextResponse };

async function authenticate(): Promise<{ userId: string } | { error: NextResponse }> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const parsed = parseAndVerifySessionToken(sessionToken);
  if (!parsed?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // A deleted or suspended account keeps a validly-signed token until it expires,
  // so the token signature alone is not enough to admit the request.
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, deletedAt: true, suspendedAt: true },
  });
  if (!user || user.deletedAt || user.suspendedAt) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { userId: user.id };
}

/**
 * Require an authenticated system admin holding `claim`.
 *
 * Usage:
 *   const auth = await requireAdmin('system_admin_portal:users:read');
 *   if (!auth.ok) return auth.error;
 *   // auth.userId is safe to use
 */
export async function requireAdmin(claim: string): Promise<AdminAuth> {
  const authed = await authenticate();
  if ('error' in authed) return { ok: false, error: authed.error };

  const permissions = await resolveSystemAdminPermissions(authed.userId);
  if (!checkResolved(permissions, claim)) {
    await logSystemAdminAction({
      action: 'ACCESS_DENIED',
      resourceType: 'Claim',
      resourceId: claim,
      resourceName: claim,
      performedBy: authed.userId,
      status: 'failure',
      errorMessage: `Missing required claim ${claim}`,
    });
    return {
      ok: false,
      error: NextResponse.json({ error: `Insufficient permissions for ${claim}` }, { status: 403 }),
    };
  }

  return { ok: true, userId: authed.userId };
}

/** Require an authenticated system admin holding at least one of `claims`. */
export async function requireAdminAny(claims: string[]): Promise<AdminAuth> {
  const authed = await authenticate();
  if ('error' in authed) return { ok: false, error: authed.error };

  const permissions = await resolveSystemAdminPermissions(authed.userId);
  if (!claims.some((claim) => checkResolved(permissions, claim))) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: `Insufficient permissions for one of: ${claims.join(', ')}` },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: authed.userId };
}

/**
 * Maps a catch-all slug root to a permission category.
 *
 * Deliberately an allowlist: an unrecognised root resolves to null and the
 * request is refused, so adding a new branch to the catch-all cannot
 * accidentally ship without a claim behind it.
 */
const SLUG_CATEGORY: Record<string, string> = {
  analytics: 'analytics',
  governance: 'governance',
  hierarchy: 'hierarchy',
  jobs: 'jobs',
  llm: 'analytics',
  'master-tenants': 'master_tenants',
  monitoring: 'monitoring',
  organizations: 'organizations',
  policies: 'policies',
  settings: 'settings',
  users: 'users',
  websites: 'websites',
};

/**
 * Resolve the claim a catch-all admin request needs from its slug.
 * Read methods map to `<category>:read`, everything else to `<category>:write`.
 * Returns null for an unrecognised slug root.
 */
export function claimForSlug(slug: string[], method: string): string | null {
  const category = SLUG_CATEGORY[slug[0] ?? ''];
  if (!category) return null;
  const action = method === 'GET' || method === 'HEAD' ? 'read' : 'write';
  return `system_admin_portal:${category}:${action}`;
}

/**
 * Guard for the catch-all admin route. Refuses unrecognised slug roots outright.
 */
export async function requireAdminForSlug(slug: string[], method: string): Promise<AdminAuth> {
  const claim = claimForSlug(slug, method);
  if (!claim) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: `Unsupported admin endpoint: /api/admin/${slug.join('/')}` },
        { status: 404 }
      ),
    };
  }
  return requireAdmin(claim);
}
