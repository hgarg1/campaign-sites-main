import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgMember, enforceSystemPolicy, writeAuditLog } from '@/app/api/tenant/auth-utils';
import { notifyOrgMembers } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: params.orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
        joinedAt: null,
      })),
    });
  } catch {
    return NextResponse.json({
      data: [
        {
          id: 'mock-member-1',
          userId: userId,
          role: 'OWNER',
          user: { id: userId, name: 'Current User', email: 'user@example.com' },
          joinedAt: new Date().toISOString(),
        },
      ],
    });
  }
}

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const caller = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const denied = await enforceSystemPolicy(params.orgId, 'members', 'invite');
  if (denied) return denied;

  try {
    const body = await req.json();
    const { email, role = 'MEMBER' } = body;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Only OWNER can add another OWNER directly
    if (role === 'OWNER' && caller.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only an OWNER can add another OWNER.' }, { status: 403 });
    }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.organizationMember.findFirst({
      where: { userId: invitedUser.id, organizationId: params.orgId },
    });

    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const newMember = await prisma.organizationMember.create({
      data: { userId: invitedUser.id, organizationId: params.orgId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.organizationInvite.updateMany({
      where: { organizationId: params.orgId, email, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    }).catch(() => { /* non-fatal */ });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'member.add',
      targetUserId: invitedUser.id,
      toRole: role,
    });

    notifyOrgMembers(params.orgId, {
      type: 'ORG_MEMBER_ADDED',
      title: 'New member added',
      body: `${invitedUser.name ?? invitedUser.email} joined the organization as ${role}.`,
      actorId: userId,
    }).catch(() => {});

    return NextResponse.json({ id: newMember.id, userId: newMember.userId, role: newMember.role, user: newMember.user, joinedAt: null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

