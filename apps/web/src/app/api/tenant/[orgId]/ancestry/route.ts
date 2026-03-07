import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { getAncestors } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      partyAffiliation: true,
      ownStatus: true,
      parentId: true,
      canCreateChildren: true,
      setupCompletedAt: true,
    },
  });
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ancestors = await getAncestors(params.orgId);

  return NextResponse.json({ org, ancestors });
}
