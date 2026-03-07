import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { getDescendantIds } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const descendantIds = await getDescendantIds(params.orgId);
  const allOrgIds = [params.orgId, ...descendantIds];

  const [memberCount, websiteCount, orgStatuses] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId: { in: allOrgIds } } }),
    prisma.website.count({ where: { organizationId: { in: allOrgIds } } }),
    prisma.organization.findMany({
      where: { id: { in: allOrgIds } },
      select: { ownStatus: true },
    }),
  ]);

  const activeCount = orgStatuses.filter((o) => o.ownStatus === 'ACTIVE').length;
  const suspendedCount = orgStatuses.filter((o) => o.ownStatus === 'SUSPENDED').length;
  const deactivatedCount = orgStatuses.filter((o) => o.ownStatus === 'DEACTIVATED').length;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const websites = await prisma.website.findMany({
    where: { organizationId: { in: allOrgIds } },
    select: { id: true },
  });
  const websiteIds = websites.map((w) => w.id);
  const recentBuilds = websiteIds.length > 0
    ? await prisma.buildJob.count({
        where: { websiteId: { in: websiteIds }, createdAt: { gte: thirtyDaysAgo } },
      })
    : 0;

  return NextResponse.json({
    totalDescendants: descendantIds.length,
    totalMembers: memberCount,
    totalWebsites: websiteCount,
    activeDescendants: activeCount,
    suspendedDescendants: suspendedCount,
    deactivatedDescendants: deactivatedCount,
    recentBuilds,
  });
}
