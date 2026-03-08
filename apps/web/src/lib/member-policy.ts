/**
 * member-policy.ts
 *
 * Per-member permission enforcement that combines:
 *   1. Effective org policy (system + parent org) — always the ceiling
 *   2. The member's base role defaults (OWNER = all, ADMIN = all, MEMBER = websites only)
 *   3. The member's custom role permissions (if assigned) — acts as a precise allow-list
 *
 * Usage:
 *   const allowed = await checkMemberPermission(orgId, userId, 'websites', 'create');
 *   if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 */

import { prisma } from '@/lib/database';
import { checkSystemPolicy } from '@/lib/system-policy';
import { checkOrgPolicy } from '@/lib/org-policy';

interface PermissionEntry {
  resource: string;
  actions: string[];
}

/**
 * Default permissions for MEMBER base role.
 * OWNERs and ADMINs have access to everything not blocked by policy.
 */
const MEMBER_DEFAULT_PERMISSIONS: PermissionEntry[] = [
  { resource: 'websites', actions: ['read', 'create', 'update', 'publish'] },
];

function matchesDefault(permissions: PermissionEntry[], resource: string, action: string): boolean {
  return permissions.some(
    p => p.resource === resource && (p.actions.includes('*') || p.actions.includes(action))
  );
}

/**
 * Check if a member is allowed to perform action on resource.
 * Returns true = allowed, false = denied.
 * Fails open only for policy engine errors (to avoid blocking all operations during outages).
 */
export async function checkMemberPermission(
  orgId: string,
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Layer 1: effective policy ceiling — always checked first
    const [sysResult, orgResult] = await Promise.all([
      checkSystemPolicy(orgId, resource, action),
      checkOrgPolicy(orgId, resource, action),
    ]);

    if (!sysResult.allowed || !orgResult.allowed) return false;

    // Layer 2: member role + custom role
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
      include: { customRole: true },
    });

    if (!member) return false;

    // OWNERs and ADMINs pass if policy allows
    if (member.role === 'OWNER' || member.role === 'ADMIN') return true;

    // MEMBER with custom role: check custom role permission list
    if (member.customRole) {
      const perms = member.customRole.permissions as unknown as PermissionEntry[];
      return matchesDefault(perms, resource, action);
    }

    // MEMBER without custom role: use default MEMBER permissions
    return matchesDefault(MEMBER_DEFAULT_PERMISSIONS, resource, action);
  } catch {
    // Fail open — don't block on policy engine unavailability
    return true;
  }
}

/**
 * Returns the full set of permissions for a member, already intersected with effective policy.
 * Used by the member detail drawer to render a permission grid.
 */
export async function getMemberEffectivePermissions(
  orgId: string,
  userId: string
): Promise<{ resource: string; action: string; allowed: boolean; reason: string }[]> {
  const ALL_PERMISSIONS: Array<{ resource: string; action: string }> = [
    { resource: 'websites', action: 'read' },
    { resource: 'websites', action: 'create' },
    { resource: 'websites', action: 'update' },
    { resource: 'websites', action: 'publish' },
    { resource: 'websites', action: 'delete' },
    { resource: 'members', action: 'read' },
    { resource: 'members', action: 'invite' },
    { resource: 'members', action: 'update' },
    { resource: 'members', action: 'remove' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'branding', action: 'read' },
    { resource: 'branding', action: 'update' },
    { resource: 'integrations', action: 'read' },
    { resource: 'integrations', action: 'update' },
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'update' },
  ];

  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
    include: { customRole: true },
  }).catch(() => null);

  if (!member) return [];

  const results = await Promise.all(
    ALL_PERMISSIONS.map(async ({ resource, action }) => {
      try {
        const [sys, org] = await Promise.all([
          checkSystemPolicy(orgId, resource, action),
          checkOrgPolicy(orgId, resource, action),
        ]);

        if (!sys.allowed) return { resource, action, allowed: false, reason: 'System policy' };
        if (!org.allowed) return { resource, action, allowed: false, reason: 'Parent org policy' };

        if (member.role === 'OWNER' || member.role === 'ADMIN') {
          return { resource, action, allowed: true, reason: `Base role: ${member.role}` };
        }

        if (member.customRole) {
          const perms = member.customRole.permissions as unknown as PermissionEntry[];
          const allowed = matchesDefault(perms, resource, action);
          return { resource, action, allowed, reason: allowed ? `Custom role: ${member.customRole.name}` : 'Not in custom role' };
        }

        const allowed = matchesDefault(MEMBER_DEFAULT_PERMISSIONS, resource, action);
        return { resource, action, allowed, reason: allowed ? 'Default MEMBER access' : 'Default MEMBER restriction' };
      } catch {
        return { resource, action, allowed: true, reason: 'Policy unavailable (fail open)' };
      }
    })
  );

  return results;
}
