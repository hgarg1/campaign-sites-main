import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin, verifyOrgMember, writeAuditLog } from '@/app/api/tenant/auth-utils';
import { MemberRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId: params.orgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: invites });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

  const caller = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json() as { email?: string; role?: string };
    const { email, role: roleStr = 'MEMBER' } = body;
    const role = roleStr as MemberRole;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Only OWNER can invite another OWNER
    if (role === 'OWNER' && caller.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only an OWNER can invite another OWNER.' }, { status: 403 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const existing = await prisma.organizationInvite.findFirst({
      where: { organizationId: params.orgId, email, status: 'PENDING' },
    });

    let invite = existing
      ? await prisma.organizationInvite.update({
          where: { id: existing.id },
          data: { role, expiresAt, createdAt: new Date(), invitedByUserId: userId },
        })
      : await prisma.organizationInvite.create({
          data: { organizationId: params.orgId, email, role, expiresAt, invitedByUserId: userId, status: 'PENDING' },
        });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.organizationMember.findFirst({
        where: { userId: existingUser.id, organizationId: params.orgId },
      });
      if (!alreadyMember) {
        await prisma.organizationMember.create({
          data: { userId: existingUser.id, organizationId: params.orgId, role },
        });
      }
      invite = await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });
    }

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'invite.create',
      targetEmail: email,
      toRole: role,
    });

    return NextResponse.json(invite, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

