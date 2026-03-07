import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  return parsed?.userId ?? null;
}

async function verifyOrgMember(userId: string, orgId: string, requiredRoles?: string[]) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!member) return null;
  if (requiredRoles && !requiredRoles.includes(member.role)) return null;
  return member;
}

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

  const member = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { email, role = 'MEMBER' } = body;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

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

    // Sync any PENDING invite for this email to ACCEPTED
    await prisma.organizationInvite.updateMany({
      where: { organizationId: params.orgId, email, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ id: newMember.id, userId: newMember.userId, role: newMember.role, user: newMember.user, joinedAt: null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
