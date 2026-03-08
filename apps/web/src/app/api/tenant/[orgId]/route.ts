import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthUser(): Promise<{ id: string; role: string } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  if (!parsed?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, role: true },
  }).catch(() => null);
  return user ?? null;
}

async function verifyOrgMember(userId: string, orgId: string, requiredRoles?: string[]) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!member) return null;
  if (requiredRoles && !requiredRoles.includes(member.role)) return null;
  return member;
}

function isSystemAdmin(role: string) {
  return role === 'GLOBAL_ADMIN' || role === 'ADMIN';
}

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // System admins can view any org without being a member
  if (!isSystemAdmin(authUser.role)) {
    const member = await verifyOrgMember(authUser.id, params.orgId);
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [org, newWebsitesThisMonth, newWebsitesLastMonth] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: params.orgId },
        include: {
          _count: { select: { members: true, websites: true } },
        },
        // setupCompletedAt is included automatically via findUnique
      }),
      prisma.website.count({
        where: { organizationId: params.orgId, createdAt: { gte: thisMonthStart } },
      }),
      prisma.website.count({
        where: {
          organizationId: params.orgId,
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
    ]);

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const websiteGrowth =
      newWebsitesLastMonth > 0
        ? Math.round(((newWebsitesThisMonth - newWebsitesLastMonth) / newWebsitesLastMonth) * 1000) / 10
        : null;

    // Include the current user's org role so the client can gate the setup modal
    const membership = isSystemAdmin(authUser.role)
      ? null
      : await prisma.organizationMember.findFirst({
          where: { userId: authUser.id, organizationId: params.orgId },
          select: { role: true },
        }).catch(() => null);

    const userRole: string = isSystemAdmin(authUser.role)
      ? 'OWNER'
      : (membership?.role ?? 'MEMBER');

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      whiteLabel: org.whiteLabel ?? false,
      customDomain: org.customDomain ?? null,
      memberCount: org._count.members,
      websiteCount: org._count.websites,
      storageUsedMb: 0,
      status: 'active',
      branding: org.branding
        ? {
            primaryColor: (org.branding as any).primaryColor ?? undefined,
            logoUrl: (org.branding as any).logoUrl ?? undefined,
            faviconUrl: (org.branding as any).faviconUrl ?? undefined,
          }
        : null,
      createdAt: org.createdAt,
      setupCompletedAt: org.setupCompletedAt ?? null,
      userRole,
      newWebsitesThisMonth,
      newWebsitesLastMonth,
      websiteGrowth,
      memberGrowth: null,
    });
  } catch {
    return NextResponse.json({
      id: params.orgId,
      name: 'Demo Organization',
      slug: 'demo-org',
      whiteLabel: false,
      customDomain: null,
      memberCount: 3,
      websiteCount: 2,
      storageUsedMb: 45,
      status: 'active',
      branding: null,
      createdAt: new Date().toISOString(),
      newWebsitesThisMonth: 0,
      newWebsitesLastMonth: 0,
      websiteGrowth: null,
      memberGrowth: null,
    });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUser().then(u => u?.id ?? null);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug, description } = body;

    const updated = await prisma.organization.update({
      where: { id: params.orgId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
