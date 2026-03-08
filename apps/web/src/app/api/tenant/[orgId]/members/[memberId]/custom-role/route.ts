/**
 * PATCH /api/tenant/[orgId]/members/[memberId]/custom-role
 * Assigns or clears a custom role on an org member.
 *
 * Body: { customRoleId: string | null }
 * Rules:
 *  - Caller must be OWNER
 *  - customRoleId must belong to this org
 *  - Target member's base role must be MEMBER or ADMIN (not OWNER — OWNERs have full access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgOwner, writeAuditLog } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owner = await verifyOrgOwner(userId, params.orgId);
  if (!owner) return NextResponse.json({ error: 'Only an OWNER can assign custom roles.' }, { status: 403 });

  try {
    const body = await req.json() as { customRoleId?: string | null };
    const { customRoleId = null } = body;

    const target = await prisma.organizationMember.findUnique({
      where: { id: params.memberId },
    });
    if (!target || target.organizationId !== params.orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (target.role === 'OWNER') {
      return NextResponse.json(
        { error: 'OWNERs always have full access — custom roles cannot be assigned to them.' },
        { status: 422 }
      );
    }

    if (customRoleId) {
      const customRole = await prisma.orgCustomRole.findUnique({ where: { id: customRoleId } });
      if (!customRole || customRole.organizationId !== params.orgId) {
        return NextResponse.json({ error: 'Custom role not found in this organization.' }, { status: 404 });
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: params.memberId },
      data: { customRoleId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customRole: true,
      },
    });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'member.role_change',
      targetUserId: target.userId,
      extra: {
        type: 'custom_role.assign',
        customRoleId: customRoleId ?? null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      customRoleId: updated.customRoleId,
      customRole: updated.customRole,
      user: updated.user,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
