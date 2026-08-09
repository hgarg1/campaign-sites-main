/**
 * RBAC permission checking and claim resolution utilities
 * Used throughout the system admin portal for enforcing permissions
 */

import { cache } from 'react';
import { prisma } from '@/lib/database';

export interface ResolvedPermissions {
  allowedClaims: string[];
  deniedClaims: string[];
  allClaims: string[]; // flattened with wildcards expanded
}

/** Escape regex metacharacters so only '*' is treated as a wildcard. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Does `pattern` (which may contain '*' wildcards) match `claim`?
 *
 * This is the single matcher used for both allow and deny evaluation — the two
 * must use identical semantics or a DENY can fail to shadow a broader ALLOW.
 */
export function claimMatches(pattern: string, claim: string): boolean {
  if (!pattern.includes('*')) return pattern === claim;
  const source = pattern.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${source}$`).test(claim);
}

/**
 * Expand wildcard claims to actual claims
 * e.g., "system_admin_portal:*" -> all claims
 *       "system_admin_portal:organizations:*" -> all organization claims
 *
 * Note: the permission table is seeded with wildcard claims, so an expansion can
 * legitimately return wildcards rather than leaf claims. Both allow and deny
 * evaluation go through `claimMatches`, so either form resolves correctly.
 */
export function expandWildcardClaim(claim: string, allClaims: string[]): string[] {
  if (!claim.includes('*')) return [claim];

  const expanded = allClaims.filter((c) => claimMatches(claim, c));
  // Always retain the pattern itself: it may cover claims that are checked in
  // code but not present as rows in SystemAdminPermission.
  return expanded.includes(claim) ? expanded : [claim, ...expanded];
}

/**
 * Resolve effective permissions for a system admin
 * Considers:
 * - Role permissions
 * - User permission overrides
 * - Cascading permissions from delegating admins (not yet implemented)
 *
 * Permission precedence (highest first):
 * 1. User-level overrides (explicit ALLOW/DENY)
 * 2. Role permissions
 */
export const resolveSystemAdminPermissions = cache(async function resolveSystemAdminPermissions(
  systemAdminId: string
): Promise<ResolvedPermissions> {
  // Get all available claims
  const allPermissions = await prisma.systemAdminPermission.findMany({
    select: { claim: true },
  });
  const allClaims = allPermissions.map((p) => p.claim);

  // Get admin's record by userId (systemAdminId param is actually userId)
  let admin = await prisma.systemAdmin.findUnique({
    where: { userId: systemAdminId },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      permissionOverrides: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!admin) {
    // SystemAdmin must be set up ahead of time — no auto-creation.
    // A missing record is a denial, not a server error: returning an empty
    // permission set lets callers answer 403 instead of surfacing a 500.
    return { allowedClaims: [], deniedClaims: [], allClaims };
  }

  const allowedClaims: Set<string> = new Set();
  const deniedClaims: Set<string> = new Set();

  // Collect role permissions
  for (const roleAssignment of admin.roleAssignments) {
    for (const rolePerm of roleAssignment.role.permissions) {
      const claim = rolePerm.permission.claim;
      const expanded = expandWildcardClaim(claim, allClaims);
      expanded.forEach((c) => allowedClaims.add(c));
    }
  }

  // Apply user-level overrides (these take precedence)
  for (const override of admin.permissionOverrides) {
    // Check if override is expired
    if (override.expiresAt && override.expiresAt < new Date()) {
      continue; // Skip expired overrides
    }

    const claim = override.permission.claim;
    const expanded = expandWildcardClaim(claim, allClaims);

    if (override.action === 'DENY') {
      // DENY takes precedence over ALLOW. Record the denial pattern itself so
      // it still shadows broader wildcard grants that were never expanded into
      // the concrete claim (e.g. denying `…:users:delete` under `…:*`).
      deniedClaims.add(claim);
      expanded.forEach((c) => deniedClaims.add(c));
      // Drop anything the denial covers, including wildcards it fully subsumes.
      for (const allowed of Array.from(allowedClaims)) {
        if (claimMatches(claim, allowed)) allowedClaims.delete(allowed);
      }
    } else if (override.action === 'ALLOW') {
      // ALLOW adds to permitted claims, unless already explicitly denied
      expanded.forEach((c) => {
        if (!Array.from(deniedClaims).some((d) => claimMatches(d, c))) {
          allowedClaims.add(c);
        }
      });
    }
  }

  return {
    allowedClaims: Array.from(allowedClaims),
    deniedClaims: Array.from(deniedClaims),
    allClaims,
  };
});

/**
 * Check if admin has permission for a specific claim
 */
export async function hasSystemAdminPermission(
  systemAdminId: string,
  requiredClaim: string
): Promise<boolean> {
  const permissions = await resolveSystemAdminPermissions(systemAdminId);
  return checkResolved(permissions, requiredClaim);
}

/**
 * Evaluate a claim against an already-resolved permission set.
 * DENY always wins, and both sides match with identical wildcard semantics.
 */
export function checkResolved(permissions: ResolvedPermissions, requiredClaim: string): boolean {
  if (permissions.deniedClaims.some((c) => claimMatches(c, requiredClaim))) {
    return false;
  }
  return permissions.allowedClaims.some((c) => claimMatches(c, requiredClaim));
}

/**
 * Check if admin has any of the required claims.
 * Resolves once and evaluates in memory rather than re-querying per claim.
 */
export async function hasSystemAdminAnyPermission(
  systemAdminId: string,
  requiredClaims: string[]
): Promise<boolean> {
  const permissions = await resolveSystemAdminPermissions(systemAdminId);
  return requiredClaims.some((claim) => checkResolved(permissions, claim));
}

/**
 * Get all permissions for a role (for UI display)
 */
export async function getRolePermissions(roleId: string) {
  const role = await prisma.systemAdminRole.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  return role.permissions.map((rp) => rp.permission);
}

/**
 * Create permission override (for system admins)
 */
export async function createPermissionOverride(
  adminId: string,
  permissionId: string,
  action: 'ALLOW' | 'DENY',
  expiresAt: Date | null,
  createdBy: string
) {
  return prisma.systemAdminPermissionOverride.upsert({
    where: {
      adminId_permissionId: {
        adminId,
        permissionId,
      },
    },
    update: {
      action,
      expiresAt,
      updatedAt: new Date(),
    },
    create: {
      adminId,
      permissionId,
      action,
      expiresAt,
      createdBy,
    },
    include: {
      permission: true,
    },
  });
}

/**
 * Cleanup expired permission overrides (to be run as cron job)
 */
export async function cleanupExpiredOverrides() {
  const result = await prisma.systemAdminPermissionOverride.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
