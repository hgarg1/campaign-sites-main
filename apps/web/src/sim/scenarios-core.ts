/**
 * Scripted governance scenarios.
 *
 * Each one states a claim the design makes and then makes the real engine
 * either honour it or fail. Where a scenario exists because of a specific
 * decision taken during design ("a suspended co-owner keeps its vote"), the
 * comment says which, because the value of the case is that it pins a choice
 * that would otherwise be re-litigated by whoever touches the code next.
 */

import { prisma } from '@/lib/database';
import { scenario } from './harness';
import { buildWorld, setOrgRule, setGlobalRule, setConfig } from './world';
import { castTieBreak, castVote, createProposal, evaluateProposal, expireStaleProposals } from '@/lib/governance';
import { grantProxy } from '@/lib/governance-proxy';

const G = 'Weighted voting';
const T = 'Tie-breaking';
const E = 'Electorate';
const P = 'Proxies';
const S = 'Self-amendment';
const C = 'Concurrency';

/** A two-parent co-owned child under a national committee. The default fixture. */
async function coOwned(stakes: [number, number]) {
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'REPUBLICAN', masterFor: 'REPUBLICAN' },
      { key: 'stateA', parent: 'national' },
      { key: 'stateB', parent: 'national' },
      { key: 'county', parent: 'stateA' },
    ],
    owners: [
      { parent: 'stateA', child: 'county', stakeBps: stakes[0], isPrimary: true },
      { parent: 'stateB', child: 'county', stakeBps: stakes[1] },
    ],
    users: [
      { key: 'natOwner', memberships: ['national:OWNER'] },
      { key: 'aOwner', memberships: ['stateA:OWNER'] },
      { key: 'bOwner', memberships: ['stateB:OWNER'] },
    ],
  });
  return w;
}

async function proposeSuspend(w: Awaited<ReturnType<typeof coOwned>>, from = 'stateA') {
  return createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org[from],
    initiatorUserId: w.user[from === 'stateA' ? 'aOwner' : 'bOwner'],
    actionType: 'SUSPEND',
    payload: { description: 'sim' },
  });
}

// ─── Weighted tallying ────────────────────────────────────────────────────────

scenario(G, 'A 60% owner alone does not carry a two-thirds weighted rule', async (ctx) => {
  const w = await coOwned([6000, 4000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'WEIGHTED',
    tallyBasis: 'STAKE_WEIGHTED',
    approveNum: 2,
    approveDen: 3,
    approveInclusive: true,
    rejectMode: 'DERIVED',
  });

  const { proposal } = await proposeSuspend(w);
  const afterA = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  ctx.eq('60% alone leaves it pending', afterA.status, 'PENDING_VOTES');

  const afterB = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'APPROVE',
  });
  ctx.eq('100% carries it', afterB.status, 'APPROVED');

  const county = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.county } });
  ctx.eq('and the action actually executed', county.ownStatus, 'SUSPENDED');
});

scenario(G, 'Two of three is two-thirds, despite 6667bps saying otherwise', async (ctx) => {
  // The reason thresholds are rationals rather than percentages: at N=3,
  // 2/3 as basis points is 6666.67, and any integer rounding decides the vote.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'GREEN', masterFor: 'GREEN' },
      { key: 'p1', parent: 'national' },
      { key: 'p2', parent: 'national' },
      { key: 'p3', parent: 'national' },
      { key: 'child', parent: 'p1' },
    ],
    owners: [
      { parent: 'p1', child: 'child', stakeBps: 3334, isPrimary: true },
      { parent: 'p2', child: 'child', stakeBps: 3333 },
      { parent: 'p3', child: 'child', stakeBps: 3333 },
    ],
    users: [
      { key: 'u1', memberships: ['p1:OWNER'] },
      { key: 'u2', memberships: ['p2:OWNER'] },
      { key: 'u3', memberships: ['p3:OWNER'] },
    ],
  });
  await setOrgRule(prisma, w.org.child, {
    votingMode: 'SUPERMAJORITY',
    tallyBasis: 'HEADCOUNT',
    approveNum: 2,
    approveDen: 3,
    approveInclusive: true,
    rejectMode: 'DERIVED',
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.child,
    initiatorOrgId: w.org.p1,
    initiatorUserId: w.user.u1,
    actionType: 'SUSPEND',
    payload: { description: 'sim' },
  });

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p1,
    voterUserId: w.user.u1,
    decision: 'APPROVE',
  });
  const after2 = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p2,
    voterUserId: w.user.u2,
    decision: 'APPROVE',
  });
  ctx.eq('2 of 3 meets an inclusive two-thirds', after2.status, 'APPROVED');
});

scenario(G, 'A 1% owner can veto a 99% owner under SINGLE_VETO', async (ctx) => {
  // Allowed with a warning rather than forbidden: a deal-breaker is a
  // legitimate thing to grant a minority partner, and the engine must not
  // quietly weight it away.
  const w = await coOwned([9900, 100]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'WEIGHTED',
    tallyBasis: 'STAKE_WEIGHTED',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'SINGLE_VETO',
  });

  // The minority owner votes first, deliberately. Majority-by-stake is already
  // satisfied by the 99% holder alone, so letting it vote first would resolve
  // the proposal before the veto could be exercised — which is correct
  // behaviour, and would test nothing about the veto.
  const { proposal } = await proposeSuspend(w);
  const after = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });
  ctx.eq('the 1% rejection ends it outright', after.status, 'REJECTED');

  const county = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.county } });
  ctx.eq('nothing was executed', county.ownStatus, 'ACTIVE');

  await ctx.rejects(
    'and the 99% owner cannot reopen it',
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateA,
      voterUserId: w.user.aOwner,
      decision: 'APPROVE',
    })
  );
});

scenario(G, 'A stake majority resolves as soon as it is reached', async (ctx) => {
  // The counterpart to the case above: weight is decisive the moment it is
  // decisive. Waiting for outstanding ballots that cannot change the result
  // would leave every proposal open for its full TTL.
  const w = await coOwned([9900, 100]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'WEIGHTED',
    tallyBasis: 'STAKE_WEIGHTED',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'DERIVED',
  });

  const { proposal } = await proposeSuspend(w);
  const after = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  ctx.eq('99% carries a stake majority immediately', after.status, 'APPROVED');
  ctx.eq('without waiting for the other ballot', after.resolvedAt !== null, true);
});

scenario(G, 'All-zero stakes degrade to headcount, identically to the legacy engine', async (ctx) => {
  // The entire backward-compatibility story: the stake column shipped with no
  // backfill, so every pre-existing edge is 0 and behaviour must be unchanged.
  const w = await coOwned([0, 0]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'WEIGHTED',
    tallyBasis: 'STAKE_WEIGHTED',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'DERIVED',
  });

  const { proposal } = await proposeSuspend(w);
  const afterA = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  ctx.eq('one of two is not more than half', afterA.status, 'PENDING_VOTES');

  const afterB = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'APPROVE',
  });
  ctx.eq('two of two is', afterB.status, 'APPROVED');
});

scenario(G, 'A zero-stake owner still counts for headcount unanimity', async (ctx) => {
  // Otherwise a co-owner's veto could be stripped simply by zeroing its stake,
  // which would make SET_OWNERSHIP_STAKES a way to disenfranchise a partner.
  const w = await coOwned([10000, 0]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    tallyBasis: 'HEADCOUNT',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  const afterA = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  ctx.eq('the 100% owner cannot finish alone', afterA.status, 'PENDING_VOTES');

  const afterB = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });
  ctx.eq('and the zero-stake owner can still block', afterB.status, 'REJECTED');
});

// ─── Electorate reconciliation ────────────────────────────────────────────────

scenario(E, 'Removing an owner mid-proposal keeps unanimity reachable', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });

  await prisma.organizationOwnership.update({
    where: { parentOrgId_childOrgId: { parentOrgId: w.org.stateB, childOrgId: w.org.county } },
    data: { status: 'REMOVED', removedAt: new Date() },
  });

  const after = await evaluateProposal(proposal.id);
  ctx.eq('the remaining owner now constitutes unanimity', after.status, 'APPROVED');

  const voters = await prisma.governanceProposalVoter.findMany({
    where: { proposalId: proposal.id },
  });
  const withdrawn = voters.filter((v) => v.withdrawnAt !== null);
  ctx.eq('exactly one voter row was withdrawn', withdrawn.length, 1);
  ctx.eq('with a stated reason', withdrawn[0]?.withdrawnReason, 'OWNERSHIP_REMOVED');
});

scenario(E, 'A suspended co-owner keeps its vote', async (ctx) => {
  // A design decision, not an oversight. If suspension removed a vote, the way
  // to win any disagreement would be to suspend whoever disagrees and then pass
  // what you wanted unopposed.
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  await prisma.organization.update({
    where: { id: w.org.stateB },
    data: { ownStatus: 'SUSPENDED', suspendedAt: new Date() },
  });

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const after = await evaluateProposal(proposal.id);
  ctx.eq('it stays pending on the suspended owner', after.status, 'PENDING_VOTES');

  const voters = await prisma.governanceProposalVoter.findMany({
    where: { proposalId: proposal.id },
  });
  ctx.eq('and no voter row was withdrawn', voters.filter((v) => v.withdrawnAt).length, 0);
});

scenario(E, 'A deactivated co-owner is withdrawn — deactivation is terminal', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  await prisma.organization.update({
    where: { id: w.org.stateB },
    data: { ownStatus: 'DEACTIVATED' },
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const after = await evaluateProposal(proposal.id);
  ctx.eq('the survivor carries it', after.status, 'APPROVED');
});

scenario(E, 'An emptied electorate expires; 0 of 0 is never unanimous', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  await prisma.organizationOwnership.updateMany({
    where: { childOrgId: w.org.county },
    data: { status: 'REMOVED', removedAt: new Date() },
  });

  const after = await evaluateProposal(proposal.id);
  ctx.eq('it expires rather than passing', after.status, 'EXPIRED');
  ctx.eq('with the reason recorded', after.resolvedReason, 'Electorate empty');

  const county = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.county } });
  ctx.eq('nothing executed', county.ownStatus, 'ACTIVE');
});

scenario(E, 'An owner added mid-proposal does not join the electorate', async (ctx) => {
  // Otherwise ADD_PARENT is a denial of service: adding an owner would reset
  // every pending proposal's denominator and strand all of them.
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  const extra = await prisma.organization.create({
    data: { name: 'latecomer', slug: `latecomer-${Date.now()}`, canCreateChildren: true },
  });
  await prisma.organizationOwnership.create({
    data: { parentOrgId: extra.id, childOrgId: w.org.county, stakeBps: 5000 },
  });

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const after = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'APPROVE',
  });
  ctx.eq('the original two still constitute unanimity', after.status, 'APPROVED');

  const voters = await prisma.governanceProposalVoter.findMany({
    where: { proposalId: proposal.id },
  });
  ctx.eq('the electorate stayed at two', voters.length, 2);
});

// ─── Tie-breaking ─────────────────────────────────────────────────────────────

scenario(T, 'A split vote escalates to the national tenant, which decides', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setConfig(prisma, 'tieBreakTtlDays', 3);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await proposeSuspend(w);
  ctx.eq('the tie-breaker was resolved at creation', proposal.tieBreakOrgId, w.org.national);

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const tied = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });
  ctx.eq('full turnout with no rule fired is a tie', tied.status, 'PENDING_TIEBREAK');
  ctx.check('the tie-break has its own clock', tied.tieBreakExpiresAt !== null);

  await ctx.rejects(
    'a tie-break without a reason is refused',
    castTieBreak({
      proposalId: proposal.id,
      tieBreakOrgId: w.org.national,
      userId: w.user.natOwner,
      decision: 'APPROVE',
      reason: '   ',
    }),
    /reason/i
  );

  const resolved = await castTieBreak({
    proposalId: proposal.id,
    tieBreakOrgId: w.org.national,
    userId: w.user.natOwner,
    decision: 'APPROVE',
    reason: 'State committee deferred to the national position.',
  });
  ctx.eq('the national tenant carries it', resolved.status, 'APPROVED');

  const votes = await prisma.governanceVote.findMany({ where: { proposalId: proposal.id } });
  ctx.eq('the original ballots are preserved, not overwritten', votes.length, 2);

  const county = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.county } });
  ctx.eq('and the action executed', county.ownStatus, 'SUSPENDED');
});

scenario(T, 'A stall is not a tie — it expires instead of escalating', async (ctx) => {
  // The single predicate separating the two is `Uh === 0`. If a stall escalated,
  // one silent co-owner would hand every decision to the national tenant.
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const pending = await evaluateProposal(proposal.id);
  ctx.eq('one ballot outstanding is not a tie', pending.status, 'PENDING_VOTES');

  await prisma.governanceProposal.update({
    where: { id: proposal.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const expired = await expireStaleProposals(w.org.county);
  ctx.check('the sweep expired it', expired >= 1, `expired ${expired}`);

  const after = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('and it never reached the tie-breaker', after.status, 'EXPIRED');
});

scenario(T, 'A tie detected near the deadline gets its own window', async (ctx) => {
  // The easiest thing in this design to get wrong: a tie can be detected on day
  // 6.9 of a 7-day TTL. If the sweep expired PENDING_TIEBREAK rows on the
  // proposal clock, the tie-breaker would be killed before it could act.
  const w = await coOwned([5000, 5000]);
  await setConfig(prisma, 'tieBreakTtlDays', 3);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });

  // Proposal deadline already passed; the tie-break window has not.
  await prisma.governanceProposal.update({
    where: { id: proposal.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  await expireStaleProposals(w.org.county);

  const still = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('the sweep left the tie alone', still.status, 'PENDING_TIEBREAK');

  const resolved = await castTieBreak({
    proposalId: proposal.id,
    tieBreakOrgId: w.org.national,
    userId: w.user.natOwner,
    decision: 'REJECT',
    reason: 'Insufficient consultation.',
  });
  ctx.eq('and the tie-breaker could still act', resolved.status, 'REJECTED');
});

scenario(T, 'An expired tie-break window resolves the proposal, not the tie', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setConfig(prisma, 'tieBreakTtlDays', 3);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });

  await prisma.governanceProposal.update({
    where: { id: proposal.id },
    data: { tieBreakExpiresAt: new Date(Date.now() - 60_000) },
  });
  await expireStaleProposals(w.org.county);

  const after = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('an unbroken tie expires', after.status, 'EXPIRED');

  await ctx.rejects(
    'and the window cannot be used late',
    castTieBreak({
      proposalId: proposal.id,
      tieBreakOrgId: w.org.national,
      userId: w.user.natOwner,
      decision: 'APPROVE',
      reason: 'late',
    })
  );
});

scenario(T, 'An org cannot adjudicate its own tie', async (ctx) => {
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'DEMOCRAT', masterFor: 'DEMOCRAT' },
      { key: 'p1', parent: 'national' },
      { key: 'p2', parent: 'national' },
    ],
    // The child *is* the master tenant: co-owned by two of its own children.
    owners: [
      { parent: 'p1', child: 'national', stakeBps: 5000, isPrimary: true },
      { parent: 'p2', child: 'national', stakeBps: 5000 },
    ],
    users: [
      { key: 'u1', memberships: ['p1:OWNER'] },
      { key: 'u2', memberships: ['p2:OWNER'] },
    ],
  });
  await setOrgRule(prisma, w.org.national, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.national,
    initiatorOrgId: w.org.p1,
    initiatorUserId: w.user.u1,
    actionType: 'UPDATE_SETTINGS',
    payload: { settings: { name: 'renamed' }, description: 'sim' },
  });
  ctx.eq('tie-breaking was disabled at creation', proposal.tieBreakEnabled, false);
  ctx.eq('and no tie-breaker was assigned', proposal.tieBreakOrgId, null);

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p1,
    voterUserId: w.user.u1,
    decision: 'APPROVE',
  });
  const tied = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p2,
    voterUserId: w.user.u2,
    decision: 'REJECT',
  });
  ctx.check(
    'a deadlock without a tie-breaker does not sit in PENDING_TIEBREAK',
    tied.status !== 'PENDING_TIEBREAK',
    `status was ${tied.status}`
  );
});

scenario(T, 'A suspended national tenant is a hard stop, not a fallback', async (ctx) => {
  // Falling through to the next ancestor would be a one-move attack: suspend
  // the tie-breaker and the casting vote moves to someone you control.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'root', party: 'LIBERTARIAN', masterFor: 'LIBERTARIAN' },
      { key: 'regional', parent: 'root' },
      { key: 'p1', parent: 'regional' },
      { key: 'p2', parent: 'regional' },
      { key: 'child', parent: 'p1' },
    ],
    owners: [
      { parent: 'p1', child: 'child', stakeBps: 5000, isPrimary: true },
      { parent: 'p2', child: 'child', stakeBps: 5000 },
    ],
    users: [
      { key: 'rootOwner', memberships: ['root:OWNER'] },
      { key: 'regionalOwner', memberships: ['regional:OWNER'] },
      { key: 'u1', memberships: ['p1:OWNER'] },
      { key: 'u2', memberships: ['p2:OWNER'] },
    ],
  });
  await setOrgRule(prisma, w.org.child, {
    votingMode: 'SIMPLE_MAJORITY',
    approveNum: 1,
    approveDen: 2,
    approveInclusive: false,
    rejectMode: 'MAJORITY_VETO',
    vetoNum: 1,
    vetoDen: 2,
    vetoInclusive: false,
    tieBreakEnabled: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.child,
    initiatorOrgId: w.org.p1,
    initiatorUserId: w.user.u1,
    actionType: 'SUSPEND',
    payload: { description: 'sim' },
  });
  ctx.eq('the root was chosen as tie-breaker', proposal.tieBreakOrgId, w.org.root);

  await prisma.organization.update({
    where: { id: w.org.root },
    data: { ownStatus: 'SUSPENDED', suspendedAt: new Date() },
  });

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p1,
    voterUserId: w.user.u1,
    decision: 'APPROVE',
  });
  const tied = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p2,
    voterUserId: w.user.u2,
    decision: 'REJECT',
  });

  ctx.check(
    'the assignment never moved to the intermediate ancestor',
    tied.tieBreakOrgId !== w.org.regional,
    `tieBreakOrgId was ${tied.tieBreakOrgId}`
  );
  await ctx.rejects(
    'and the intermediate ancestor cannot cast',
    castTieBreak({
      proposalId: proposal.id,
      tieBreakOrgId: w.org.regional,
      userId: w.user.regionalOwner,
      decision: 'APPROVE',
      reason: 'opportunistic',
    })
  );
});

// ─── Self-amendment ───────────────────────────────────────────────────────────

scenario(S, 'Rewriting the stake vector needs unanimity', async (ctx) => {
  // If stakes were unilaterally rewritable the entire weighting scheme would be
  // decorative — the majority owner would simply vote itself 100%.
  const w = await coOwned([6000, 4000]);
  await setGlobalRule(prisma, 'SET_OWNERSHIP_STAKES', {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org.stateA,
    initiatorUserId: w.user.aOwner,
    actionType: 'SET_OWNERSHIP_STAKES',
    payload: {
      description: 'sim',
      stakes: [
        { parentOrgId: w.org.stateA, stakeBps: 9900 },
        { parentOrgId: w.org.stateB, stakeBps: 100 },
      ],
    },
  });

  const afterA = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  ctx.eq('the majority owner cannot do it alone', afterA.status, 'PENDING_VOTES');

  const afterB = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'REJECT',
  });
  ctx.eq('the diluted owner blocks it', afterB.status, 'REJECTED');

  const edge = await prisma.organizationOwnership.findUniqueOrThrow({
    where: { parentOrgId_childOrgId: { parentOrgId: w.org.stateA, childOrgId: w.org.county } },
  });
  ctx.eq('and the stake is untouched', edge.stakeBps, 6000);
});

scenario(S, 'An approved stake change is applied and audited', async (ctx) => {
  const w = await coOwned([6000, 4000]);
  await setGlobalRule(prisma, 'SET_OWNERSHIP_STAKES', {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org.stateA,
    initiatorUserId: w.user.aOwner,
    actionType: 'SET_OWNERSHIP_STAKES',
    payload: {
      description: 'sim',
      stakes: [
        { parentOrgId: w.org.stateA, stakeBps: 7000 },
        { parentOrgId: w.org.stateB, stakeBps: 3000 },
      ],
    },
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  const done = await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'APPROVE',
  });
  ctx.eq('it passes', done.status, 'APPROVED');

  const edges = await prisma.organizationOwnership.findMany({
    where: { childOrgId: w.org.county },
  });
  const total = edges.reduce((s, e) => s + e.stakeBps, 0);
  ctx.eq('the new allocation totals 10000', total, 10000);

  const audit = await prisma.ownershipStakeChange.findMany({
    where: { childOrgId: w.org.county },
  });
  ctx.check('every edge change is recorded', audit.length >= 2, `${audit.length} audit rows`);
  ctx.check(
    'and attributed to the proposal',
    audit.every((a) => a.proposalId === proposal.id),
    JSON.stringify(audit.map((a) => a.reason))
  );
});

scenario(S, 'A governance rule amends itself under the rules in force', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setGlobalRule(prisma, 'SET_GOVERNANCE_RULE', {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org.stateA,
    initiatorUserId: w.user.aOwner,
    actionType: 'SET_GOVERNANCE_RULE',
    payload: {
      description: 'sim',
      rule: {
        actionType: 'SUSPEND',
        votingMode: 'WEIGHTED',
        rejectMode: 'DERIVED',
        tallyBasis: 'STAKE_WEIGHTED',
        approveNum: 3,
        approveDen: 4,
        approveInclusive: true,
      },
    },
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateB,
    voterUserId: w.user.bOwner,
    decision: 'APPROVE',
  });

  const rule = await prisma.orgGovernanceRule.findFirst({
    where: { childOrgId: w.org.county, actionType: 'SUSPEND' },
  });
  ctx.check('the new rule exists', rule !== null);
  ctx.eq('with the requested threshold', `${rule?.approveNum}/${rule?.approveDen}`, '3/4');
  ctx.eq('and it records the proposal that set it', rule?.setByProposalId, proposal.id);

  // The next proposal must be judged by the amended rule, not the old one.
  const next = await proposeSuspend(w);
  ctx.eq('the amendment governs the next proposal', next.proposal.approveNum, 3);
  ctx.eq('', next.proposal.approveDen, 4);
});

// ─── Proxies ──────────────────────────────────────────────────────────────────

scenario(P, 'A proxy casts for its principal, attributed to the principal', async (ctx) => {
  const w = await coOwned([6000, 4000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  // An ADMIN of stateA itself — inside the affected structure.
  const holder = await prisma.user.create({
    data: { email: `holder-${Date.now()}@sim.local`, passwordHash: 'x', name: 'holder' },
  });
  await prisma.organizationMember.create({
    data: { organizationId: w.org.stateA, userId: holder.id, role: 'ADMIN' },
  });

  const proxy = await grantProxy({
    principalOrgId: w.org.stateA,
    proxyUserId: holder.id,
    grantedByUserId: w.user.aOwner,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: holder.id,
    decision: 'APPROVE',
    viaProxyId: proxy.id,
  });

  const vote = await prisma.governanceVote.findFirstOrThrow({
    where: { proposalId: proposal.id, voterOrgId: w.org.stateA },
  });
  ctx.eq('the ballot belongs to the principal org', vote.voterOrgId, w.org.stateA);
  ctx.eq('the human is recorded', vote.voterUserId, holder.id);
  ctx.eq('and the proxy is traceable', vote.castViaProxyId, proxy.id);
});

scenario(P, "A co-parent's admin may not hold the other parent's proxy", async (ctx) => {
  // The whole point of delegating to a person rather than an org: if stateB's
  // admin could hold stateA's proxy, the two blocs would have merged.
  const w = await coOwned([5000, 5000]);
  const bAdmin = await prisma.user.create({
    data: { email: `badmin-${Date.now()}@sim.local`, passwordHash: 'x', name: 'bAdmin' },
  });
  await prisma.organizationMember.create({
    data: { organizationId: w.org.stateB, userId: bAdmin.id, role: 'ADMIN' },
  });

  await ctx.rejects(
    'the grant is refused',
    grantProxy({
      principalOrgId: w.org.stateA,
      proxyUserId: bAdmin.id,
      grantedByUserId: w.user.aOwner,
      expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    })
  );
});

scenario(P, 'A perpetual proxy is refused', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  const holder = await prisma.user.create({
    data: { email: `h2-${Date.now()}@sim.local`, passwordHash: 'x', name: 'h2' },
  });
  await prisma.organizationMember.create({
    data: { organizationId: w.org.stateA, userId: holder.id, role: 'ADMIN' },
  });
  await setConfig(prisma, 'maxProxyDays', 30);

  await ctx.rejects(
    'beyond the ceiling',
    grantProxy({
      principalOrgId: w.org.stateA,
      proxyUserId: holder.id,
      grantedByUserId: w.user.aOwner,
      expiresAt: new Date(Date.now() + 400 * 24 * 3600 * 1000),
    }),
    /longer than/i
  );
  await ctx.rejects(
    'and in the past',
    grantProxy({
      principalOrgId: w.org.stateA,
      proxyUserId: holder.id,
      grantedByUserId: w.user.aOwner,
      expiresAt: new Date(Date.now() - 1000),
    }),
    /future/i
  );
});

scenario(P, 'One live proxy per scope; re-granting requires revocation', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  const [h1, h2] = await Promise.all([
    prisma.user.create({
      data: { email: `p1-${Date.now()}@sim.local`, passwordHash: 'x', name: 'p1' },
    }),
    prisma.user.create({
      data: { email: `p2-${Date.now()}@sim.local`, passwordHash: 'x', name: 'p2' },
    }),
  ]);
  for (const u of [h1, h2]) {
    await prisma.organizationMember.create({
      data: { organizationId: w.org.stateA, userId: u.id, role: 'ADMIN' },
    });
  }

  const expiresAt = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  await grantProxy({
    principalOrgId: w.org.stateA,
    proxyUserId: h1.id,
    grantedByUserId: w.user.aOwner,
    expiresAt,
  });
  await ctx.rejects(
    'a second live proxy for the same scope is refused',
    grantProxy({
      principalOrgId: w.org.stateA,
      proxyUserId: h2.id,
      grantedByUserId: w.user.aOwner,
      expiresAt,
    }),
    /already active/i
  );

  // The database must refuse it too, not only the application check — that is
  // what the partial unique index is for.
  await ctx.rejects(
    'and the index refuses a direct insert',
    prisma.governanceProxy.create({
      data: {
        principalOrgId: w.org.stateA,
        proxyUserId: h2.id,
        grantedByUserId: w.user.aOwner,
        expiresAt,
        eligibilitySource: 'ADMIN',
        eligibilityOrgId: w.org.stateA,
      },
    })
  );
});

scenario(P, 'One person cannot cast for two organizations on one proposal', async (ctx) => {
  // This closes a hole that predates proxies: because admin authority inherits
  // through ancestry, an admin of a common grandparent could already cast both
  // co-parents' ballots.
  const w = await coOwned([5000, 5000]);
  await setConfig(prisma, 'maxVotesPerUserPerProposal', 1);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const dual = await prisma.user.create({
    data: { email: `dual-${Date.now()}@sim.local`, passwordHash: 'x', name: 'dual' },
  });
  for (const key of ['stateA', 'stateB']) {
    await prisma.organizationMember.create({
      data: { organizationId: w.org[key], userId: dual.id, role: 'OWNER' },
    });
  }

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: dual.id,
    decision: 'APPROVE',
  });
  await ctx.rejects(
    'the second ballot from the same person is refused',
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateB,
      voterUserId: dual.id,
      decision: 'APPROVE',
    })
  );

  const after = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('so the proposal did not pass on one person', after.status, 'PENDING_VOTES');
});

// ─── Concurrency ──────────────────────────────────────────────────────────────

scenario(C, 'Two simultaneous ballots resolve the proposal exactly once', async (ctx) => {
  // Without a status guard on the resolving update, two concurrent votes can
  // both read PENDING_VOTES, both resolve, and execute an action for a proposal
  // that ends up recorded as rejected.
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);

  const results = await Promise.allSettled([
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateA,
      voterUserId: w.user.aOwner,
      decision: 'APPROVE',
    }),
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateB,
      voterUserId: w.user.bOwner,
      decision: 'APPROVE',
    }),
  ]);
  ctx.check(
    'at least one ballot landed',
    results.some((r) => r.status === 'fulfilled'),
    JSON.stringify(results.map((r) => (r.status === 'rejected' ? String(r.reason) : 'ok')))
  );

  const after = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('it resolved once, as approved', after.status, 'APPROVED');

  const votes = await prisma.governanceVote.findMany({ where: { proposalId: proposal.id } });
  ctx.eq('with exactly two ballots', votes.length, 2);

  // The decisive check. Resolution emits one PROPOSAL_APPROVED notification per
  // active owner; a second resolution would emit a second full set. Counting
  // them detects a double transition that the status column alone cannot show,
  // because the second write lands on the same value.
  const notified = await prisma.governanceNotification.count({
    where: { proposalId: proposal.id, type: 'PROPOSAL_APPROVED' },
  });
  ctx.eq('and announced its result exactly once per owner', notified, 2);
});

scenario(C, 'Concurrent ballots execute the action exactly once', async (ctx) => {
  // SUSPEND is idempotent, so it cannot reveal a double execution. Rewriting
  // the stake vector is not: each application appends its own audit rows, so
  // running twice leaves twice as many.
  const w = await coOwned([6000, 4000]);
  await setGlobalRule(prisma, 'SET_OWNERSHIP_STAKES', {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
  });

  const { proposal } = await createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org.stateA,
    initiatorUserId: w.user.aOwner,
    actionType: 'SET_OWNERSHIP_STAKES',
    payload: {
      description: 'sim',
      stakes: [
        { parentOrgId: w.org.stateA, stakeBps: 5500 },
        { parentOrgId: w.org.stateB, stakeBps: 4500 },
      ],
    },
  });

  await Promise.allSettled([
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateA,
      voterUserId: w.user.aOwner,
      decision: 'APPROVE',
    }),
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateB,
      voterUserId: w.user.bOwner,
      decision: 'APPROVE',
    }),
  ]);

  const after = await prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposal.id } });
  ctx.eq('it approved', after.status, 'APPROVED');

  const audit = await prisma.ownershipStakeChange.findMany({
    where: { childOrgId: w.org.county, proposalId: proposal.id },
  });
  ctx.eq('with one audit row per edge, not two', audit.length, 2);

  const edges = await prisma.organizationOwnership.findMany({
    where: { childOrgId: w.org.county },
  });
  ctx.eq('and the allocation still totals 10000', edges.reduce((s, e) => s + e.stakeBps, 0), 10000);
});

scenario(C, 'A proposal cannot be voted on twice by the same org', async (ctx) => {
  const w = await coOwned([5000, 5000]);
  await setOrgRule(prisma, w.org.county, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const { proposal } = await proposeSuspend(w);
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.stateA,
    voterUserId: w.user.aOwner,
    decision: 'APPROVE',
  });
  await ctx.rejects(
    'the second ballot from the same org is refused',
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.stateA,
      voterUserId: w.user.aOwner,
      decision: 'REJECT',
    })
  );
});

scenario(C, 'Re-admitting a removed parent does not restore its old stake', async (ctx) => {
  // The ownership row is reused rather than versioned, so a naive re-add would
  // silently hand back voting power that was deliberately taken away.
  const w = await coOwned([7000, 3000]);
  await prisma.organizationOwnership.update({
    where: { parentOrgId_childOrgId: { parentOrgId: w.org.stateB, childOrgId: w.org.county } },
    data: { status: 'REMOVED', removedAt: new Date() },
  });

  await setGlobalRule(prisma, 'ADD_PARENT', {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
  });

  // Sole remaining owner: the N=1 path executes immediately.
  const result = await createProposal({
    childOrgId: w.org.county,
    initiatorOrgId: w.org.stateA,
    initiatorUserId: w.user.aOwner,
    actionType: 'ADD_PARENT',
    payload: { parentOrgId: w.org.stateB, description: 'sim' },
  });
  ctx.eq('a sole owner acts without a vote', result.proposal.status, 'APPROVED');

  const edge = await prisma.organizationOwnership.findUniqueOrThrow({
    where: { parentOrgId_childOrgId: { parentOrgId: w.org.stateB, childOrgId: w.org.county } },
  });
  ctx.eq('the edge is active again', edge.status, 'ACTIVE');
  ctx.eq('but its stake reset to zero', edge.stakeBps, 0);
});
