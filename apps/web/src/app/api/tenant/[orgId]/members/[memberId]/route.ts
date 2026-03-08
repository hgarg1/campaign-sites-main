import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgMember, enforceSystemPolicy, writeAuditLog } from '@/app/api/tenant/auth-utils';
import { notifyOrgMembers } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function countOwners(orgId: string): Promise<number> {
  return prisma.organizationMember.count({
    where: { organizationId: orgId, role: 'OWNER' },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const caller = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const denied = await enforceSystemPolicy(params.orgId, 'members', 'update');
  if (denied) return denied;

  try {
    const body = await req.json();
    const { role } = body as { role: string };

    if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });

    const target = await prisma.organizationMember.findUnique({
      where: { id: params.memberId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!target || target.organizationId !== params.orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const fromRole = target.role;

    // Only OWNER can promote someone to OWNER
    if (role === 'OWNER' && caller.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only an OWNER can promote another member to OWNER.' },
        { status: 403 }
      );
    }

    // Prevent demoting the last OWNER
    if (fromRole === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await countOwners(params.orgId);
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last OWNER. Promote another member first.' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: params.memberId },
      data: { role: role as any },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'member.role_change',
      targetUserId: target.userId,
      fromRole,
      toRole: role,
    });

    notifyOrgMembers(params.orgId, {
      type: 'ORG_ROLE_CHANGED',
      title: 'Member role updated',
      body: `${target.user?.name ?? target.user?.email ?? 'A member'}'s role changed from ${fromRole} to ${role}.`,
      actorId: userId,
    }).catch(() => {});

    return NextResponse.json({ id: updated.id, userId: updated.userId, role: updated.role, user: updated.user, joinedAt: null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const caller = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const denied = await enforceSystemPolicy(params.orgId, 'members', 'remove');
  if (denied) return denied;

  try {
    const target = await prisma.organizationMember.findUnique({
      where: { id: params.memberId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!target || target.organizationId !== params.orgId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the last OWNER
    if (target.role === 'OWNER') {
      const ownerCount = await countOwners(params.orgId);
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last OWNER. Transfer ownership first.' },
          { status: 409 }
        );
      }
    }

    await prisma.organizationMember.delete({ where: { id: params.memberId } });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'member.remove',
      targetUserId: target.userId,
      fromRole: target.role,
    });

    notifyOrgMembers(params.orgId, {
      type: 'ORG_MEMBER_REMOVED',
      title: 'Member removed',
      body: `${target.user?.email ?? 'A member'} was removed from the organization.`,
      actorId: userId,
    }).catch(() => {});

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
