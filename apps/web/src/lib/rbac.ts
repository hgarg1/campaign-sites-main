/**
 * RBAC permission checking and claim resolution utilities
 * Used throughout the system admin portal for enforcing permissions
 */

import { prisma } from '@/lib/database';

export interface ResolvedPermissions {
  allowedClaims: string[];
  deniedClaims: string[];
  allClaims: string[]; // flattened with wildcards expanded
}

/**
 * Expand wildcard claims to actual claims
 * e.g., "system_admin_portal:*" -> all claims
 *       "system_admin_portal:organizations:*" -> all organization claims
 */
export function expandWildcardClaim(
  claim: string,
  allClaims: string[]
): string[] {
  if (!claim.includes('*')) return [claim];

  const pattern = claim.replace(/\*/g, '.*');
  const regex = new RegExp(`^${pattern}$`);
  return allClaims.filter((c) => regex.test(c));
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
export async function resolveSystemAdminPermissions(
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
    // Auto-create SystemAdmin record if it doesn't exist (for users promoted to admin)
    const user = await prisma.user.findUnique({
      where: { id: systemAdminId },
      select: { email: true, name: true, role: true },
    });
    
    if (!user) {
      throw new Error(`System admin not found for user: ${systemAdminId}`);
    }

    if (user.role !== 'ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new Error(`User ${systemAdminId} is not an admin`);
    }

    // Create SystemAdmin record
    admin = await prisma.systemAdmin.create({
      data: {
        userId: systemAdminId,
        email: user.email,
        name: user.name || 'System Admin',
      },
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
  }

  let allowedClaims: Set<string> = new Set();
  let deniedClaims: Set<string> = new Set();

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
      // DENY takes precedence over ALLOW
      expanded.forEach((c) => {
        allowedClaims.delete(c);
        deniedClaims.add(c);
      });
    } else if (override.action === 'ALLOW') {
      // ALLOW adds to permitted claims
      expanded.forEach((c) => {
        // Only add if not explicitly denied
        if (!deniedClaims.has(c)) {
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
}

/**
 * Check if admin has permission for a specific claim
 */
export async function hasSystemAdminPermission(
  systemAdminId: string,
  requiredClaim: string
): Promise<boolean> {
  const permissions = await resolveSystemAdminPermissions(systemAdminId);

  // Check exact match
  if (permissions.allowedClaims.includes(requiredClaim)) {
    return true;
  }

  // Check wildcard matches in allowed claims
  for (const claim of permissions.allowedClaims) {
    if (claim.includes('*')) {
      const pattern = claim.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(requiredClaim)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if admin has any of the required claims
 */
export async function hasSystemAdminAnyPermission(
  systemAdminId: string,
  requiredClaims: string[]
): Promise<boolean> {
  for (const claim of requiredClaims) {
    if (await hasSystemAdminPermission(systemAdminId, claim)) {
      return true;
    }
  }
  return false;
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
