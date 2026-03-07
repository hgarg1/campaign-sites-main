import { cookies } from 'next/headers';
import { MemberRole } from '@prisma/client';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { verifyAncestorAccess, AccessResult } from '@/lib/cross-org-auth';
import { getEffectiveStatus } from '@/lib/ancestry';

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  return parsed?.userId ?? null;
}

/**
 * Verifies direct org membership (unchanged from original).
 * Use verifyOrgAccess instead when ancestor access should also be accepted.
 */
export async function verifyOrgMember(userId: string, orgId: string, requiredRoles?: string[]) {
  try {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
    });
    if (!member) return null;
    if (requiredRoles && !requiredRoles.includes(member.role)) return null;
    return member;
  } catch {
    return null;
  }
}

/**
 * Verifies access to orgId either via direct membership OR ancestor inheritance.
 * Returns the AccessResult (with role + source) on success, null on failure.
 *
 * This is the preferred guard for all tenant API routes — it transparently
 * allows ancestor admins to operate on descendant orgs.
 */
export async function verifyOrgAccess(
  userId: string,
  orgId: string,
  minRole: MemberRole = 'MEMBER'
): Promise<AccessResult | null> {
  try {
    const result = await verifyAncestorAccess(userId, orgId, minRole);
    return result.hasAccess ? result : null;
  } catch {
    return null;
  }
}

/**
 * Verifies that userId is an ADMIN or OWNER of orgId (direct or ancestor).
 * Shorthand for write-gated routes.
 */
export async function verifyOrgAdmin(userId: string, orgId: string): Promise<AccessResult | null> {
  return verifyOrgAccess(userId, orgId, 'ADMIN');
}

/**
 * Verifies that userId is an OWNER of orgId (direct or ancestor-owner).
 */
export async function verifyOrgOwner(userId: string, orgId: string): Promise<AccessResult | null> {
  return verifyOrgAccess(userId, orgId, 'OWNER');
}

/**
 * Checks the effective status of an org (accounting for ancestor suspensions).
 * Returns true if the org is accessible (ACTIVE), false if suspended/deactivated.
 */
export async function isOrgAccessible(orgId: string): Promise<boolean> {
  try {
    const status = await getEffectiveStatus(orgId);
    return status === 'ACTIVE';
  } catch {
    return false;
  }
}

/**
 * Verifies that userId can access a descendant org on behalf of a parent org.
 * Used by cross-org "view-as" flows — validates that actingOrgId is an actual
 * ancestor of targetOrgId and that userId is ADMIN/OWNER in actingOrgId.
 */
export async function verifyDescendantAccess(
  userId: string,
  actingOrgId: string,
  targetOrgId: string
): Promise<AccessResult | null> {
  try {
    // User must be admin in the acting org
    const actingAccess = await verifyAncestorAccess(userId, actingOrgId, 'ADMIN');
    if (!actingAccess.hasAccess) return null;

    // Acting org must be an ancestor of target org
    const { isAncestor } = await import('@/lib/ancestry');
    const ancestorCheck = await isAncestor(actingOrgId, targetOrgId);
    if (!ancestorCheck) return null;

    return actingAccess;
  } catch {
    return null;
  }
}
