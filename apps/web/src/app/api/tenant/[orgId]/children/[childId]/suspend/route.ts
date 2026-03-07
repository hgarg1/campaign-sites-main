import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { isAncestor } from '@/lib/ancestry';
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

  try {
    const result = await createProposal({
      childOrgId: params.childId,
      initiatorOrgId: params.orgId,
      initiatorUserId: userId,
      actionType: 'SUSPEND',
      payload: { description: 'Suspend organization and descendants' },
    });

    if (result.autoExecuted) {
      const updated = await prisma.organization.findUnique({ where: { id: params.childId } });
      return NextResponse.json({ ...updated, cascadedCount: 0, autoExecuted: true });
    }

    return NextResponse.json({ proposalCreated: true, proposal: result.proposal }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create suspension proposal';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
