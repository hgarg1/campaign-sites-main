/**
 * GET  /api/tenant/[orgId]/roles  — List org's custom roles (any member)
 * POST /api/tenant/[orgId]/roles  — Create a custom role (OWNER only, policy-validated)
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!isDatabaseEnabled()) return NextResponse.json({ data: [] });

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const roles = await prisma.orgCustomRole.findMany({
      where: { organizationId: params.orgId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: roles });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owner = await verifyOrgOwner(userId, params.orgId);
  if (!owner) return NextResponse.json({ error: 'Only an OWNER can create custom roles.' }, { status: 403 });

  try {
    const body = await req.json() as {
      name?: string;
      description?: string;
      color?: string;
      permissions?: PermissionEntry[];
    };

    const { name, description, color = '#6366f1', permissions = [] } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const validationError = await validatePermissions(params.orgId, permissions);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });

    const role = await prisma.orgCustomRole.create({
      data: {
        organizationId: params.orgId,
        name: name.trim(),
        description,
        color,
        permissions: permissions as any,
      },
    });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'invite.create', // reuse closest available action
      extra: { type: 'custom_role.create', roleId: role.id, roleName: role.name },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
