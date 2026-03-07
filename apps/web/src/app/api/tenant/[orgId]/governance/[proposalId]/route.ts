import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getAuthUserId, verifyOrgAccess, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { castVote, cancelProposal } from '@/lib/governance';
import { VoteDecision } from '@prisma/client';

export const dynamic = 'force-dynamic';

const proposalInclude = {
  childOrg: { select: { id: true, name: true } },
  initiatorOrg: { select: { id: true, name: true } },
  votes: {
    select: {
      id: true,
      voterOrgId: true,
      voterUserId: true,
      decision: true,
      comment: true,
      createdAt: true,
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; proposalId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId, proposalId } = params;

  const proposal = await prisma.governanceProposal.findUnique({
    where: { id: proposalId },
    include: proposalInclude,
  });

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  // Verify this org is involved: initiator, owner of childOrg, or childOrg itself
  const isInitiator = proposal.initiatorOrgId === orgId;
  const isChildOrg = proposal.childOrgId === orgId;
  const ownership = isInitiator || isChildOrg
    ? true
    : await prisma.organizationOwnership.findFirst({
        where: { parentOrgId: orgId, childOrgId: proposal.childOrgId, status: 'ACTIVE' },
      });

  if (!ownership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(proposal);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string; proposalId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId, proposalId } = params;
  const action = req.nextUrl.searchParams.get('action');
  const body = await req.json();

  if (action === 'vote') {
    const { decision, comment } = body;
    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be APPROVE or REJECT' }, { status: 400 });
    }

    // Validate this org is an ACTIVE owner of the proposal's childOrg
    const proposal = await prisma.governanceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    const ownership = await prisma.organizationOwnership.findFirst({
      where: { parentOrgId: orgId, childOrgId: proposal.childOrgId, status: 'ACTIVE' },
    });
    if (!ownership) return NextResponse.json({ error: 'You are not an active owner of this child org' }, { status: 403 });

    try {
      const updated = await castVote({
        proposalId,
        voterOrgId: orgId,
        voterUserId: userId,
        decision: decision as VoteDecision,
        comment,
      });
      return NextResponse.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === 'cancel') {
    try {
      const updated = await cancelProposal(proposalId, orgId);
      return NextResponse.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel proposal';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Invalid action. Use ?action=vote or ?action=cancel' }, { status: 400 });
}
