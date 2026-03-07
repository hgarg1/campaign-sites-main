import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
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

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json() as { email?: string; role?: string };
    const { email, role: roleStr = 'MEMBER' } = body;
    const role = roleStr as MemberRole;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Re-use or create invite record
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

    // If the user already has an account, add them directly and mark invite accepted
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

    return NextResponse.json(invite, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
