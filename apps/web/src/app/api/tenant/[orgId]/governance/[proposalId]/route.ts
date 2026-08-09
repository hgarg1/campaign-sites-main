import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import {
  getAuthUserId,
  verifyOrgAccess,
  verifyOrgAdmin,
  verifyOrgOwner,
  writeAuditLog,
} from '@/app/api/tenant/auth-utils';
import { castVote, cancelProposal, castTieBreak } from '@/lib/governance';
import { resolveProxyForVote } from '@/lib/governance-proxy';
import { VoteDecision, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// `satisfies` makes an unknown field a compile error — see the note in
// ../route.ts; this shape previously selected a nonexistent `createdAt`.
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
      votedAt: true,
    },
  },
} satisfies Prisma.GovernanceProposalInclude;

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
  const ownership =
    isInitiator || isChildOrg
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
    if (!ownership)
      return NextResponse.json(
        { error: 'You are not an active owner of this child org' },
        { status: 403 }
      );

    // A live proxy is re-verified here rather than trusted from grant time,
    // because membership and hierarchy both drift after a proxy is issued.
    const proxy = await resolveProxyForVote({
      principalOrgId: orgId,
      childOrgId: proposal.childOrgId,
      actionType: proposal.actionType,
      actingUserId: userId,
    });

    // An exclusive proxy hands the vote to its holder alone, so the principal's
    // own admins step back for its duration.
    const exclusiveHeldByOther = await prisma.governanceProxy.findFirst({
      where: {
        principalOrgId: orgId,
        exclusive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        proxyUserId: { not: userId },
        OR: [{ scopeChildOrgId: null }, { scopeChildOrgId: proposal.childOrgId }],
      },
      select: { id: true },
    });
    if (exclusiveHeldByOther && !proxy) {
      return NextResponse.json(
        { error: 'This organization’s vote is currently delegated exclusively to another person' },
        { status: 403 }
      );
    }

    try {
      const updated = await castVote({
        proposalId,
        voterOrgId: orgId,
        voterUserId: userId,
        decision: decision as VoteDecision,
        comment,
        viaProxyId: proxy?.proxyId,
      });

      await writeAuditLog({
        orgId,
        actorUserId: userId,
        action: 'governance.vote',
        extra: { proposalId, decision, resultingStatus: updated.status },
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

      await writeAuditLog({
        orgId,
        actorUserId: userId,
        action: 'governance.cancel',
        extra: { proposalId },
      });

      return NextResponse.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel proposal';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === 'tiebreak') {
    const { decision, reason } = body;
    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be APPROVE or REJECT' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'A tie-break overrides a deadlocked vote, so a reason is required' },
        { status: 400 }
      );
    }

    // OWNER, not ADMIN. Ancestor inheritance is near-vacuous at the root of a
    // party tree, so this is effectively "an owner of the national tenant".
    const owner = await verifyOrgOwner(userId, orgId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Only an owner of the national tenant may break a tie' },
        { status: 403 }
      );
    }

    try {
      const updated = await castTieBreak({
        proposalId,
        tieBreakOrgId: orgId,
        userId,
        decision: decision as VoteDecision,
        reason,
      });

      await writeAuditLog({
        orgId,
        actorUserId: userId,
        action: 'governance.tiebreak',
        extra: { proposalId, decision, resultingStatus: updated.status },
      });

      return NextResponse.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to break tie';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { error: 'Invalid action. Use ?action=vote, ?action=cancel or ?action=tiebreak' },
    { status: 400 }
  );
}
