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
    if (!invitedUser) {
      return NextResponse.json(
        { error: 'No account found with that email. Ask them to register first.' },
        { status: 404 }
      );
    }

    const existing = await prisma.organizationMember.findFirst({
      where: { userId: invitedUser.id, organizationId: params.orgId },
    });

    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const newMember = await prisma.organizationMember.create({
      data: { userId: invitedUser.id, organizationId: params.orgId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(
      {
        id: newMember.id,
        userId: newMember.userId,
        role: newMember.role,
        user: newMember.user,
        joinedAt: null,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
