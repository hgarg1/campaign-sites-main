import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { isAncestor, getEffectiveStatus } from '@/lib/ancestry';
import { prisma } from '@/lib/database';
import { createProposal } from '@/lib/governance';

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

  const target = await prisma.organization.findUnique({ where: { id: params.childId } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const result = await createProposal({
      childOrgId: params.childId,
      initiatorOrgId: params.orgId,
      initiatorUserId: userId,
      actionType: 'REACTIVATE',
      payload: { description: 'Reactivate organization and descendants' },
    });

    if (result.autoExecuted) {
      const updated = await prisma.organization.findUnique({ where: { id: params.childId } });
      return NextResponse.json({ ...updated, restoredCount: 0, autoExecuted: true });
    }

    return NextResponse.json({ proposalCreated: true, proposal: result.proposal }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create reactivation proposal';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
