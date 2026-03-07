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
    const website = await prisma.website.findFirst({
      where: { id: params.websiteId, organizationId: params.orgId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(website);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { name, slug, domain } = body;

    const updated = await prisma.website.update({
      where: { id: params.websiteId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(domain !== undefined && { domain }),
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    await prisma.website.delete({ where: { id: params.websiteId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

