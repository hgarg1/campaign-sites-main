import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { buildOrgTree, getDescendants } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tree = await buildOrgTree(params.orgId);
  if (!tree) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allDescendants = await getDescendants(params.orgId);
  const directChildIds = allDescendants.filter((d) => d.depth === 1).map((d) => d.id);

  const childSummaries = await Promise.all(
    directChildIds.map(async (childId) => {
      const grandchildCount = allDescendants.filter((d) => d.parentId === childId).length;
      const stats = await prisma.organization.findUnique({
        where: { id: childId },
        select: {
          id: true,
          name: true,
          slug: true,
          partyAffiliation: true,
          ownStatus: true,
          canCreateChildren: true,
          setupCompletedAt: true,
          customDomain: true,
          _count: { select: { members: true, websites: true } },
        },
      });
      return { ...stats, grandchildCount };
    })
  );

  return NextResponse.json({
    tree,
    directChildren: childSummaries,
    totalDescendants: allDescendants.length,
  });
}
