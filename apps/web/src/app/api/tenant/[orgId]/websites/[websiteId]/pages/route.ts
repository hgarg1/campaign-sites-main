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

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string; websiteId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const pages = await prisma.page.findMany({
      where: { websiteId: params.websiteId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: pages });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string; websiteId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { path, title } = body;

    if (!path || !title) return NextResponse.json({ error: 'path and title required' }, { status: 400 });

    const page = await prisma.page.create({
      data: { path, title, content: {}, websiteId: params.websiteId },
    });

    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
