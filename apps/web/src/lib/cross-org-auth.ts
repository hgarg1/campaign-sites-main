/**
 * Cross-org access verification.
 *
 * Implements the "implicit inheritance" authority model:
 * a user who holds ADMIN or OWNER in any ancestor org automatically
 * has that same role for all descendant orgs — without needing explicit
 * OrganizationMember rows in every descendant.
 */

import { PrismaClient, MemberRole } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/database';

// Role hierarchy for comparison (higher index = more privilege)
const ROLE_ORDER: MemberRole[] = ['MEMBER', 'ADMIN', 'OWNER'];

function roleAtLeast(actual: MemberRole, required: MemberRole): boolean {
  return ROLE_ORDER.indexOf(actual) >= ROLE_ORDER.indexOf(required);
}

export interface AccessResult {
  hasAccess: boolean;
  /** The effective role granted — either from the target org directly or inherited from an ancestor */
  role: MemberRole | null;
  /** How the access was granted */
  source: 'direct' | 'ancestor' | 'none';
  /** The org ID that granted the access (same as targetOrgId for direct) */
  grantingOrgId: string | null;
}

/**
 * Checks whether userId has at least minRole access to targetOrgId.
 *
 * Access is granted if the user:
 *   1. Has a direct OrganizationMember row in targetOrgId, OR
 *   2. Has an OrganizationMember row with sufficient role in any ancestor org
 *
 * Ancestors can delegate authority downward; children cannot push authority upward.
 */
export async function verifyAncestorAccess(
  userId: string,
  targetOrgId: string,
  minRole: MemberRole = 'MEMBER',
  db: PrismaClient = defaultPrisma
): Promise<AccessResult> {
  // 1. Check direct membership in target org
  const directMember = await db.organizationMember.findFirst({
    where: { userId, organizationId: targetOrgId },
  });

  if (directMember) {
    if (roleAtLeast(directMember.role, minRole)) {
      return { hasAccess: true, role: directMember.role, source: 'direct', grantingOrgId: targetOrgId };
    }
    // Has direct membership but insufficient role — don't let ancestor override to lower it
    // (direct membership takes precedence; ancestor could still give MORE privilege if higher)
  }

  // 2. Check membership in any ancestor org (ancestors only — not siblings/cousins)
  const ancestorRows = await db.organizationAncestry.findMany({
    where: { descendantId: targetOrgId, depth: { gt: 0 } },
    select: { ancestorId: true, depth: true },
    orderBy: { depth: 'asc' }, // check closest ancestor first
  });

  for (const { ancestorId } of ancestorRows) {
    const ancestorMember = await db.organizationMember.findFirst({
      where: { userId, organizationId: ancestorId },
    });

    if (ancestorMember && roleAtLeast(ancestorMember.role, minRole)) {
      // Ancestors must be ADMIN or OWNER to inherit authority — MEMBERs in an
      // ancestor org do NOT automatically gain access to descendants.
      if (roleAtLeast(ancestorMember.role, 'ADMIN')) {
        return {
          hasAccess: true,
          role: ancestorMember.role,
          source: 'ancestor',
          grantingOrgId: ancestorId,
        };
      }
    }
  }

  // If we had a direct member with insufficient role, report that
  if (directMember) {
    return { hasAccess: false, role: directMember.role, source: 'direct', grantingOrgId: targetOrgId };
  }

  return { hasAccess: false, role: null, source: 'none', grantingOrgId: null };
}

/**
 * Like verifyAncestorAccess but throws-style — returns null on failure.
 * Convenient for API route guards.
 */
export async function requireAncestorAccess(
  userId: string,
  targetOrgId: string,
  minRole: MemberRole = 'MEMBER',
  db: PrismaClient = defaultPrisma
): Promise<AccessResult | null> {
  const result = await verifyAncestorAccess(userId, targetOrgId, minRole, db);
  return result.hasAccess ? result : null;
}

/**
 * Returns the effective role a user has in targetOrgId (direct or inherited).
 * Returns null if the user has no access.
 */
export async function getEffectiveRole(
  userId: string,
  targetOrgId: string,
  db: PrismaClient = defaultPrisma
): Promise<MemberRole | null> {
  const result = await verifyAncestorAccess(userId, targetOrgId, 'MEMBER', db);
  return result.hasAccess ? result.role : null;
}

/**
 * Checks whether a user can perform write operations (ADMIN-level or above)
 * on targetOrgId, including via ancestor inheritance.
 */
export async function canAdminOrg(
  userId: string,
  targetOrgId: string,
  db: PrismaClient = defaultPrisma
): Promise<boolean> {
  const result = await verifyAncestorAccess(userId, targetOrgId, 'ADMIN', db);
  return result.hasAccess;
}

/**
 * Returns all org IDs that a user can access (directly or as ancestor admin).
 * Used for building "accessible orgs" lists in the UI.
 */
export async function getAccessibleOrgIds(
  userId: string,
  db: PrismaClient = defaultPrisma
): Promise<string[]> {
  // Orgs the user is directly a member of
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });

  const accessibleIds = new Set<string>(memberships.map((m) => m.organizationId));

  // For orgs where user is ADMIN or OWNER, also add all descendants
  const adminMemberships = memberships.filter((m) => roleAtLeast(m.role, 'ADMIN'));
  for (const { organizationId } of adminMemberships) {
    const descendantRows = await db.organizationAncestry.findMany({
      where: { ancestorId: organizationId, depth: { gt: 0 } },
      select: { descendantId: true },
    });
    for (const { descendantId } of descendantRows) {
      accessibleIds.add(descendantId);
    }
  }

  return Array.from(accessibleIds);
}
