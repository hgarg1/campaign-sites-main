import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { MemberRole } from '@prisma/client';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { verifyAncestorAccess, AccessResult } from '@/lib/cross-org-auth';
import { getEffectiveStatus } from '@/lib/ancestry';
import { checkSystemPolicy } from '@/lib/system-policy';
import { checkOrgPolicy } from '@/lib/org-policy';

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

export async function verifyOrgAdmin(userId: string, orgId: string): Promise<AccessResult | null> {
  return verifyOrgAccess(userId, orgId, 'ADMIN');
}

export async function verifyOrgOwner(userId: string, orgId: string): Promise<AccessResult | null> {
  return verifyOrgAccess(userId, orgId, 'OWNER');
}

export async function isOrgAccessible(orgId: string): Promise<boolean> {
  try {
    const status = await getEffectiveStatus(orgId);
    return status === 'ACTIVE';
  } catch {
    return false;
  }
}

export async function verifyDescendantAccess(
  userId: string,
  actingOrgId: string,
  targetOrgId: string
): Promise<AccessResult | null> {
  try {
    const actingAccess = await verifyAncestorAccess(userId, actingOrgId, 'ADMIN');
    if (!actingAccess.hasAccess) return null;
    const { isAncestor } = await import('@/lib/ancestry');
    const ancestorCheck = await isAncestor(actingOrgId, targetOrgId);
    if (!ancestorCheck) return null;
    return actingAccess;
  } catch {
    return null;
  }
}

/**
 * Checks the system policy AND parent org policy for a given org + resource + action.
 * Returns a 403 NextResponse if blocked by either layer, or null if allowed.
 */
export async function enforceSystemPolicy(
  orgId: string,
  resource: string,
  action: string
): Promise<NextResponse | null> {
  try {
    const sysResult = await checkSystemPolicy(orgId, resource, action);
    if (!sysResult.allowed) {
      return NextResponse.json(
        {
          error: 'Action blocked by system policy',
          policyId: sysResult.policyId,
          reason: sysResult.reason ?? `${resource}.${action} is restricted by system administrator`,
        },
        { status: 403 }
      );
    }

    const orgResult = await checkOrgPolicy(orgId, resource, action);
    if (!orgResult.allowed) {
      return NextResponse.json(
        {
          error: 'Action blocked by parent organization policy',
          source: orgResult.source,
          reason: orgResult.reason ?? `${resource}.${action} is restricted by your parent organization`,
        },
        { status: 403 }
      );
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Writes an audit log entry to ServerLog.
 * Non-fatal — never throws.
 */
export async function writeAuditLog(payload: {
  orgId: string;
  actorUserId: string;
  action: 'member.add' | 'member.remove' | 'member.role_change' | 'invite.create' | 'invite.revoke' | 'invite.resend';
  targetUserId?: string;
  targetEmail?: string;
  fromRole?: string;
  toRole?: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.serverLog.create({
      data: {
        level: 'INFO',
        message: `[audit] ${payload.action} in org ${payload.orgId} by ${payload.actorUserId}`,
        source: 'audit',
        metadata: { ...payload } as any,
      },
    });
  } catch {
    // Non-fatal
  }
}

