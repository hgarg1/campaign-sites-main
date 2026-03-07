import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { isAncestor, getDescendantIds } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { orgId: string; childId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify orgId is actually an ancestor of childId
  const ancestorCheck = await isAncestor(params.orgId, params.childId);
  if (!ancestorCheck) {
    return NextResponse.json(
      { error: 'Target organization is not a descendant of your organization' },
      { status: 403 }
    );
  }

  const target = await prisma.organization.findUnique({ where: { id: params.childId } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const descendantIds = await getDescendantIds(params.childId);
  const now = new Date();

  // Cascade suspend all ACTIVE descendants
  await prisma.organization.updateMany({
    where: { id: { in: descendantIds }, ownStatus: 'ACTIVE' },
    data: { ownStatus: 'SUSPENDED', suspendedAt: now, suspendedByOrgId: params.childId },
  });
  const updated = await prisma.organization.update({
    where: { id: params.childId },
    data: { ownStatus: 'SUSPENDED', suspendedAt: now, suspendedByOrgId: params.orgId },
  });

  return NextResponse.json({ ...updated, cascadedCount: descendantIds.length });
}
