import { WebsiteStatus } from '@prisma/client';
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
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    const status = searchParams.get('status') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const where = {
      organizationId: params.orgId,
      ...(status && { status: status as WebsiteStatus }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const [websites, total] = await Promise.all([
      prisma.website.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.website.count({ where }),
    ]);

    return NextResponse.json({ data: websites, pagination: { page, pageSize, total } });
  } catch {
    return NextResponse.json({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
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
    const { name, slug, domain } = body;

    if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });

    const website = await prisma.website.create({
      data: {
        name,
        slug,
        domain: domain ?? null,
        organizationId: params.orgId,
        userId: userId,
        status: 'DRAFT' as WebsiteStatus,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(website, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
