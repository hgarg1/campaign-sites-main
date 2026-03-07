import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { isAncestor, getEffectiveStatus, getDescendantIds } from '@/lib/ancestry';
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

  const ancestorCheck = await isAncestor(params.orgId, params.childId);
  if (!ancestorCheck) {
    return NextResponse.json(
      { error: 'Target organization is not a descendant of your organization' },
      { status: 403 }
    );
  }

  // Cannot reactivate if a higher ancestor is still suspending
  const effectiveStatus = await getEffectiveStatus(params.childId);
  if (effectiveStatus !== 'ACTIVE') {
    // Check if the suspension comes from above params.orgId
    const orgEffective = await getEffectiveStatus(params.orgId);
    if (orgEffective !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot reactivate: your organization or a higher ancestor is also suspended' },
        { status: 409 }
      );
    }
  }

  const descendantIds = await getDescendantIds(params.childId);

  // Restore only those suspended by this org's cascade
  const { count } = await prisma.organization.updateMany({
    where: { id: { in: descendantIds }, suspendedByOrgId: params.childId },
    data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
  });
  const updated = await prisma.organization.update({
    where: { id: params.childId },
    data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
  });

  return NextResponse.json({ ...updated, restoredCount: count });
}
