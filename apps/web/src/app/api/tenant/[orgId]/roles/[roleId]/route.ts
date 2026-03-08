/**
 * GET    /api/tenant/[orgId]/roles/[roleId]  — Get a specific custom role
 * PATCH  /api/tenant/[orgId]/roles/[roleId]  — Update name/description/color/permissions (OWNER only)
 * DELETE /api/tenant/[orgId]/roles/[roleId]  — Delete role, clears member assignments (OWNER only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgMember, verifyOrgOwner, writeAuditLog } from '@/app/api/tenant/auth-utils';
import { checkOrgPolicy } from '@/lib/org-policy';
import { checkSystemPolicy } from '@/lib/system-policy';

export const dynamic = 'force-dynamic';

interface PermissionEntry {
  resource: string;
  actions: string[];
}

async function validatePermissions(orgId: string, permissions: PermissionEntry[]): Promise<string | null> {
  for (const entry of permissions) {
    for (const action of entry.actions) {
      const sys = await checkSystemPolicy(orgId, entry.resource, action);
      if (!sys.allowed) return `Permission ${entry.resource}.${action} is blocked by system policy`;
      const org = await checkOrgPolicy(orgId, entry.resource, action);
      if (!org.allowed) return `Permission ${entry.resource}.${action} is blocked by parent org policy`;
    }
  }
  return null;
}

async function getRoleOrFail(roleId: string, orgId: string) {
  const role = await prisma.orgCustomRole.findUnique({ where: { id: roleId } });
  if (!role || role.organizationId !== orgId) return null;
  return role;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; roleId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const role = await getRoleOrFail(params.roleId, params.orgId);
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  return NextResponse.json(role);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; roleId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owner = await verifyOrgOwner(userId, params.orgId);
  if (!owner) return NextResponse.json({ error: 'Only an OWNER can update custom roles.' }, { status: 403 });

  const existing = await getRoleOrFail(params.roleId, params.orgId);
  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  try {
    const body = await req.json() as Partial<{
      name: string;
      description: string;
      color: string;
      permissions: PermissionEntry[];
    }>;

    if (body.permissions) {
      const err = await validatePermissions(params.orgId, body.permissions);
      if (err) return NextResponse.json({ error: err }, { status: 422 });
    }

    const updated = await prisma.orgCustomRole.update({
      where: { id: params.roleId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.permissions !== undefined && { permissions: body.permissions as any }),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string; roleId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owner = await verifyOrgOwner(userId, params.orgId);
  if (!owner) return NextResponse.json({ error: 'Only an OWNER can delete custom roles.' }, { status: 403 });

  const existing = await getRoleOrFail(params.roleId, params.orgId);
  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  try {
    // Clear assignments first (cascade via schema SetNull handles this, but be explicit)
    await prisma.organizationMember.updateMany({
      where: { organizationId: params.orgId, customRoleId: params.roleId },
      data: { customRoleId: null },
    });

    await prisma.orgCustomRole.delete({ where: { id: params.roleId } });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'invite.revoke', // reuse closest
      extra: { type: 'custom_role.delete', roleId: params.roleId, roleName: existing.name },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
