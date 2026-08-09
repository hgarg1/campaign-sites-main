/**
 * Read-model for governance UI.
 *
 * The engine knows exactly how far a proposal is from resolving; none of that
 * reached the interface, which showed raw approve/reject counts with no
 * threshold beside them. A voter could see "2 approvals" without learning
 * whether 3 or 5 were needed, who had yet to vote, or when it expired.
 */

import { prisma } from '@/lib/database';
import { approvalReachable, tally, type Ballot, type BallotDecision } from '@/lib/governance-math';
import { toPolicyConfig, tiesPossible } from '@/lib/governance-policy';
import type { GovernanceProposal } from '@prisma/client';

export interface VoterView {
  orgId: string;
  orgName: string;
  stakeBps: number;
  /** Share of the electorate's weight, as an integer percent. */
  sharePercent: number;
  decision: BallotDecision;
  votedByUserId: string | null;
  votedByName: string | null;
  viaProxy: boolean;
  withdrawn: boolean;
  withdrawnReason: string | null;
}

export interface ProposalProgress {
  /** Plain-language statement of the rule in force. */
  ruleSummary: string;
  basis: 'HEADCOUNT' | 'STAKE_WEIGHTED';
  /** True when no owner holds a stake, so the tally fell back to one-vote-each. */
  degradedToHeadcount: boolean;

  approvalPercent: number;
  rejectionPercent: number;
  thresholdPercent: number;
  /** Whether the approval threshold can still be reached. */
  stillReachable: boolean;
  vetoWouldEndIt: boolean;

  votedCount: number;
  totalCount: number;
  outstandingOrgNames: string[];

  voters: VoterView[];
  tieBreak: {
    enabled: boolean;
    orgId: string | null;
    orgName: string | null;
    expiresAt: string | null;
    possible: boolean;
  };
}

/** Integer percent by cross-multiplication — no floating point in a tally. */
function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0;
}

function describeRule(policy: ReturnType<typeof toPolicyConfig>, basisLabel: string): string {
  const { approve, votingMode, rejectMode } = policy;

  const threshold =
    votingMode === 'UNANIMOUS'
      ? 'every owner must approve'
      : votingMode === 'DEAL_MAKER'
        ? 'the first approval carries it'
        : approve.den === 2 && approve.num === 1
          ? approve.inclusive
            ? `at least half of ${basisLabel}`
            : `more than half of ${basisLabel}`
          : `${approve.num}/${approve.den} of ${basisLabel}`;

  const veto =
    rejectMode === 'SINGLE_VETO'
      ? 'any single rejection ends it'
      : rejectMode === 'MAJORITY_VETO'
        ? 'a majority rejection ends it'
        : rejectMode === 'WEIGHTED_VETO'
          ? 'a blocking share of rejections ends it'
          : rejectMode === 'DERIVED'
            ? 'it ends as soon as approval becomes impossible'
            : 'rejections do not end it early';

  return `Needs ${threshold} — ${veto}.`;
}

export async function buildProposalProgress(
  proposal: GovernanceProposal
): Promise<ProposalProgress> {
  const policy = toPolicyConfig({
    votingMode: proposal.votingMode,
    rejectMode: proposal.rejectMode,
    tallyBasis: proposal.tallyBasis ?? 'HEADCOUNT',
    approveNum: proposal.approveNum ?? 1,
    approveDen: proposal.approveDen ?? 1,
    approveInclusive: proposal.approveInclusive ?? true,
    vetoNum: proposal.vetoNum,
    vetoDen: proposal.vetoDen,
    vetoInclusive: proposal.vetoInclusive ?? true,
    quorumNum: proposal.quorumNum ?? 0,
    quorumDen: proposal.quorumDen ?? 1,
    tieBreakEnabled: proposal.tieBreakEnabled,
    dealMakerMinStakeBps: proposal.dealMakerMinStakeBps ?? 0,
    ttlDays: 7,
    quorumPercent: proposal.quorumPercent,
  });

  const [snapshot, votes] = await Promise.all([
    prisma.governanceProposalVoter.findMany({
      where: { proposalId: proposal.id },
      include: { voterOrg: { select: { id: true, name: true } } },
    }),
    prisma.governanceVote.findMany({
      where: { proposalId: proposal.id },
      select: { voterOrgId: true, decision: true, voterUserId: true, castViaProxyId: true },
    }),
  ]);

  const voteByOrg = new Map(votes.map((v) => [v.voterOrgId, v]));

  const voterNames = await prisma.user.findMany({
    where: { id: { in: votes.map((v) => v.voterUserId) } },
    select: { id: true, name: true, email: true },
  });
  const nameById = new Map(voterNames.map((u) => [u.id, u.name ?? u.email]));

  const active = snapshot.filter((s) => !s.withdrawnAt);
  const ballots: Ballot[] = active.map((s) => ({
    voterOrgId: s.voterOrgId,
    stakeBps: s.stakeBps,
    decision: (voteByOrg.get(s.voterOrgId)?.decision ?? null) as BallotDecision,
  }));

  const t = tally(ballots);
  const basis = policy.tallyBasis;
  const basisLabel = basis === 'STAKE_WEIGHTED' ? 'ownership stake' : 'owners';

  const voters: VoterView[] = snapshot.map((s) => {
    const vote = voteByOrg.get(s.voterOrgId);
    const weight = t.degradedToHeadcount ? 1 : s.stakeBps;
    return {
      orgId: s.voterOrgId,
      orgName: s.voterOrg.name,
      stakeBps: s.stakeBps,
      sharePercent: s.withdrawnAt ? 0 : pct(weight, t.w),
      decision: (vote?.decision ?? null) as BallotDecision,
      votedByUserId: vote?.voterUserId ?? null,
      votedByName: vote ? (nameById.get(vote.voterUserId) ?? null) : null,
      viaProxy: Boolean(vote?.castViaProxyId),
      withdrawn: Boolean(s.withdrawnAt),
      withdrawnReason: s.withdrawnReason,
    };
  });

  const tieBreakOrg = proposal.tieBreakOrgId
    ? await prisma.organization.findUnique({
        where: { id: proposal.tieBreakOrgId },
        select: { name: true },
      })
    : null;

  return {
    ruleSummary: describeRule(policy, basisLabel),
    basis,
    degradedToHeadcount: t.degradedToHeadcount,
    approvalPercent: basis === 'STAKE_WEIGHTED' ? pct(t.a, t.w) : pct(t.ah, t.n),
    rejectionPercent: basis === 'STAKE_WEIGHTED' ? pct(t.r, t.w) : pct(t.rh, t.n),
    thresholdPercent: pct(policy.approve.num, policy.approve.den),
    stillReachable: approvalReachable(t, policy.approve, basis),
    vetoWouldEndIt: policy.rejectMode === 'SINGLE_VETO',
    votedCount: t.ah + t.rh,
    totalCount: t.n,
    outstandingOrgNames: voters
      .filter((v) => !v.withdrawn && v.decision === null)
      .map((v) => v.orgName),
    voters,
    tieBreak: {
      enabled: proposal.tieBreakEnabled,
      orgId: proposal.tieBreakOrgId,
      orgName: tieBreakOrg?.name ?? null,
      expiresAt: proposal.tieBreakExpiresAt?.toISOString() ?? null,
      possible: tiesPossible(policy),
    },
  };
}
