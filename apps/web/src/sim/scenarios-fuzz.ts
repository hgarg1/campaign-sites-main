/**
 * Property and chaos scenarios.
 *
 * The scripted cases check outcomes someone thought of. These check invariants
 * that must hold across randomly generated electorates, stake vectors, policies
 * and vote orders — the cases nobody thought of.
 *
 * Everything is driven from a seeded RNG, so a failure prints a seed that
 * reproduces it exactly. A fuzz failure you cannot replay is barely a finding.
 */

import { prisma } from '@/lib/database';
import { scenario, type Ctx, type Rng } from './harness';
import { buildWorld, setOrgRule, setConfig } from './world';
import { castVote, createProposal, evaluateProposal } from '@/lib/governance';
import { meets, splitEvenBps, type Cmp } from '@/lib/governance-math';
import { toPolicyConfig, validatePolicy } from '@/lib/governance-policy';

const F = 'Properties';
const X = 'Chaos';

interface PolicyDraw {
  votingMode: 'UNANIMOUS' | 'SIMPLE_MAJORITY' | 'SUPERMAJORITY' | 'WEIGHTED' | 'DEAL_MAKER';
  rejectMode: 'SINGLE_VETO' | 'WEIGHTED_VETO' | 'DERIVED' | 'NONE';
  tallyBasis: 'HEADCOUNT' | 'STAKE_WEIGHTED';
  approveNum: number;
  approveDen: number;
  approveInclusive: boolean;
  vetoNum: number | null;
  vetoDen: number | null;
  vetoInclusive: boolean;
  quorumNum: number;
  quorumDen: number;
  tieBreakEnabled: boolean;
  dealMakerMinStakeBps: number;
  ttlDays: number;
}

/**
 * Draw a policy that `validatePolicy` accepts.
 *
 * Rejecting invalid draws rather than avoiding them keeps the generator honest:
 * if the guards ever stop rejecting an incoherent combination, this starts
 * feeding it to the engine and the invariants catch what happens.
 */
function drawPolicy(rng: Rng): PolicyDraw {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const basis = rng.pick(['HEADCOUNT', 'STAKE_WEIGHTED'] as const);
    const mode = rng.pick([
      'UNANIMOUS',
      'SIMPLE_MAJORITY',
      'SUPERMAJORITY',
      'WEIGHTED',
      'DEAL_MAKER',
    ] as const);
    const [num, den, inclusive] = rng.pick([
      [1, 1, true],
      [1, 2, false],
      [1, 2, true],
      [2, 3, true],
      [3, 4, true],
      [3, 5, false],
      [7, 10, true],
    ] as const);

    /*
     * WEIGHTED_VETO is over-weighted on purpose.
     *
     * A tie needs full turnout with neither threshold met, and only
     * `MAJORITY_VETO` and `WEIGHTED_VETO` leave that gap: `SINGLE_VETO` ends on
     * the first rejection and `DERIVED` rejects the moment approval becomes
     * unreachable, so under either, "everyone voted and nothing fired" is
     * unreachable by construction. Drawing all four modes uniformly produced
     * zero escalations in 120 elections — the tie path was being fuzzed in name
     * only.
     */
    const rejectMode = rng.pick([
      'SINGLE_VETO',
      'WEIGHTED_VETO',
      'WEIGHTED_VETO',
      'WEIGHTED_VETO',
      'DERIVED',
      'NONE',
    ] as const);
    const useVeto = rejectMode === 'WEIGHTED_VETO';
    const [vn, vd] = rng.pick([
      [1, 2],
      [1, 3],
      [2, 5],
      [1, 4],
    ] as const);

    const draw: PolicyDraw = {
      votingMode: mode,
      rejectMode,
      tallyBasis: mode === 'UNANIMOUS' ? 'HEADCOUNT' : basis,
      approveNum: mode === 'UNANIMOUS' ? 1 : num,
      approveDen: mode === 'UNANIMOUS' ? 1 : den,
      approveInclusive: mode === 'UNANIMOUS' ? true : inclusive,
      vetoNum: useVeto ? vn : null,
      vetoDen: useVeto ? vd : null,
      vetoInclusive: rng.bool(),
      quorumNum: rng.pick([0, 1, 1, 2]),
      quorumDen: rng.pick([1, 2, 3]),
      dealMakerMinStakeBps: mode === 'DEAL_MAKER' ? rng.pick([0, 0, 1000, 3000]) : 0,
      ttlDays: 7,
      // Enabled far more often than a real deployment would, so the escalation
      // path is actually reached. Ties are opt-in and off by default in
      // production; a generator that mirrored that would never test them.
      tieBreakEnabled: rng.bool(0.7),
    };
    if (draw.quorumNum > draw.quorumDen) continue;

    const verdict = validatePolicy(
      toPolicyConfig({ ...draw, quorumPercent: null } as never)
    );
    if (verdict.ok) return draw;
  }
  // Always-valid fallback so a run can never stall on generation.
  return {
    votingMode: 'UNANIMOUS',
    rejectMode: 'SINGLE_VETO',
    tallyBasis: 'HEADCOUNT',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    vetoNum: null,
    vetoDen: null,
    vetoInclusive: true,
    quorumNum: 0,
    quorumDen: 1,
    tieBreakEnabled: false,
    dealMakerMinStakeBps: 0,
    ttlDays: 7,
  };
}

/** Stake vectors that include the shapes most likely to break arithmetic. */
function drawStakes(rng: Rng, n: number): number[] {
  switch (rng.int(0, 5)) {
    case 0:
      return new Array(n).fill(0); // the no-backfill compatibility case
    case 1:
      return splitEvenBps(n); // largest remainder, sums to exactly 10000
    case 2: {
      const v = new Array(n).fill(0);
      v[rng.int(0, n - 1)] = 10000; // one owner holds everything
      return v;
    }
    case 3: {
      const v = splitEvenBps(n);
      v[rng.int(0, n - 1)] = 0; // a legitimate non-voting owner
      return v;
    }
    case 4: {
      // Extreme skew: one dominant holder, the rest token.
      const v = new Array(n).fill(1);
      v[0] = 10000 - (n - 1);
      return rng.shuffle(v);
    }
    default: {
      const raw = Array.from({ length: n }, () => rng.int(0, 5000));
      const total = raw.reduce((a, b) => a + b, 0);
      return total === 0 ? splitEvenBps(n) : raw;
    }
  }
}

async function buildElectorate(rng: Rng, n: number, stakes: number[]) {
  const parents = Array.from({ length: n }, (_, i) => `p${i}`);
  return buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'NONPARTISAN', masterFor: 'NONPARTISAN' },
      ...parents.map((k) => ({ key: k, parent: 'national' })),
      { key: 'child', parent: parents[0] },
    ],
    owners: parents.map((k, i) => ({
      parent: k,
      child: 'child',
      stakeBps: stakes[i],
      isPrimary: i === 0,
    })),
    users: parents.map((k) => ({ key: `${k}u`, memberships: [`${k}:OWNER`] })),
  });
}

const TERMINAL = ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'];

scenario(F, 'Invariants hold across 120 random elections', async (ctx) => {
  let elections = 0;
  let decided = 0;
  let tied = 0;

  for (let round = 0; round < 120; round += 1) {
    // Truncating inside the loop keeps each election independent, which is what
    // makes a seed reproduce a single failing case rather than a whole history.
    await truncate();

    const n = ctx.rng.int(2, 6);
    const stakes = drawStakes(ctx.rng, n);
    const policy = drawPolicy(ctx.rng);
    const w = await buildElectorate(ctx.rng, n, stakes);
    await setOrgRule(prisma, w.org.child, policy);

    const { proposal } = await createProposal({
      childOrgId: w.org.child,
      initiatorOrgId: w.org.p0,
      initiatorUserId: w.user.p0u,
      actionType: 'SUSPEND',
      payload: { description: `fuzz-${round}` },
    });
    elections += 1;

    const frozen = await prisma.governanceProposalVoter.findMany({
      where: { proposalId: proposal.id },
    });
    const frozenTotal = frozen.reduce((s, v) => s + v.stakeBps, 0);

    // I1 — the electorate is frozen at creation and matches the live stakes.
    if (frozen.length !== n) {
      ctx.violation('electorate size differs from owner count', `${frozen.length} vs ${n}`);
    }
    if (frozenTotal !== stakes.reduce((a, b) => a + b, 0)) {
      ctx.violation('frozen stake total differs from live total', `${frozenTotal}`);
    }

    const order = ctx.rng.shuffle(
      Array.from({ length: n }, (_, i) => i)
    );
    let lastStatus = proposal.status as string;
    let reachabilityLost = false;

    for (const i of order) {
      const current = await prisma.governanceProposal.findUniqueOrThrow({
        where: { id: proposal.id },
      });
      if (current.status !== 'PENDING_VOTES') break;

      const decision = ctx.rng.bool(0.65) ? 'APPROVE' : 'REJECT';
      const next = await castVote({
        proposalId: proposal.id,
        voterOrgId: w.org[`p${i}`],
        voterUserId: w.user[`p${i}u`],
        decision,
      });

      // I2 — a terminal status is terminal.
      if (TERMINAL.includes(lastStatus) && next.status !== lastStatus) {
        ctx.violation(
          'a resolved proposal changed status',
          `${lastStatus} -> ${next.status} (seed ${ctx.rng.seed}, round ${round})`
        );
      }

      // I3 — reachability is monotonic: once approval is arithmetically out of
      // reach it can never come back, so the engine must not later approve.
      const ballots = await prisma.governanceVote.findMany({
        where: { proposalId: proposal.id },
      });
      const weightOf = (orgId: string) =>
        frozenTotal > 0 ? (frozen.find((f) => f.voterOrgId === orgId)?.stakeBps ?? 0) : 1;
      const W = frozenTotal > 0 ? frozenTotal : n;
      const A = ballots
        .filter((b) => b.decision === 'APPROVE')
        .reduce((s, b) => s + weightOf(b.voterOrgId), 0);
      const R = ballots
        .filter((b) => b.decision === 'REJECT')
        .reduce((s, b) => s + weightOf(b.voterOrgId), 0);
      const U = W - A - R;
      const cmp: Cmp = {
        num: policy.approveNum,
        den: policy.approveDen,
        inclusive: policy.approveInclusive,
      };
      const stillReachable =
        policy.tallyBasis === 'STAKE_WEIGHTED'
          ? meets(A + U, W, cmp)
          : meets(
              ballots.filter((b) => b.decision === 'APPROVE').length + (n - ballots.length),
              n,
              cmp
            );

      if (!stillReachable) reachabilityLost = true;
      if (reachabilityLost && next.status === 'APPROVED' && policy.rejectMode !== 'NONE') {
        // DEAL_MAKER approves on a single ballot regardless of the threshold,
        // so it is legitimately exempt from this invariant.
        if (policy.votingMode !== 'DEAL_MAKER') {
          ctx.violation(
            'approved after approval became unreachable',
            `seed ${ctx.rng.seed}, round ${round}, policy ${JSON.stringify(policy)}`
          );
        }
      }

      lastStatus = next.status as string;
    }

    const final = await prisma.governanceProposal.findUniqueOrThrow({
      where: { id: proposal.id },
    });

    // I4 — the org's status changed if and only if the proposal was approved.
    const child = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.child } });
    const executed = child.ownStatus === 'SUSPENDED';
    if (executed !== (final.status === 'APPROVED')) {
      ctx.violation(
        'execution and outcome disagree',
        `status=${final.status} orgStatus=${child.ownStatus} (seed ${ctx.rng.seed}, round ${round})`
      );
    }

    // I5 — a tie requires full turnout. Anything else is a stall.
    if (final.status === 'PENDING_TIEBREAK') {
      tied += 1;
      const cast = await prisma.governanceVote.count({ where: { proposalId: proposal.id } });
      if (cast !== n) {
        ctx.violation(
          'escalated to a tie-break without full turnout',
          `${cast} of ${n} voted (seed ${ctx.rng.seed}, round ${round})`
        );
      }
      // An escalation nobody can act on is worse than none: it looks like a
      // pending decision and is actually a dead proposal.
      if (!final.tieBreakOrgId) {
        ctx.violation(
          'escalated with no tie-breaker assigned',
          `seed ${ctx.rng.seed}, round ${round}`
        );
      }
      if (final.tieBreakOrgId === w.org.child) {
        ctx.violation('an organization was assigned to adjudicate itself', `round ${round}`);
      }
      if (!final.tieBreakExpiresAt) {
        ctx.violation(
          'escalated without its own deadline',
          `the proposal clock would kill it (round ${round})`
        );
      }
    }

    // I6 — nobody voted twice.
    const votes = await prisma.governanceVote.findMany({ where: { proposalId: proposal.id } });
    const orgs = new Set(votes.map((v) => v.voterOrgId));
    if (orgs.size !== votes.length) {
      ctx.violation('an organization voted more than once', `seed ${ctx.rng.seed}`);
    }

    // I7 — resolution is announced exactly once.
    if (final.status === 'APPROVED' || final.status === 'REJECTED') {
      decided += 1;
      const notifications = await prisma.governanceNotification.count({
        where: {
          proposalId: proposal.id,
          type: final.status === 'APPROVED' ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
        },
      });
      if (notifications > n) {
        ctx.violation(
          'the result was announced more than once',
          `${notifications} notifications for ${n} owners (seed ${ctx.rng.seed}, round ${round})`
        );
      }
    }

    // I8 — the frozen stakes are immutable for the life of the proposal.
    const frozenAfter = await prisma.governanceProposalVoter.findMany({
      where: { proposalId: proposal.id },
    });
    if (frozenAfter.reduce((s, v) => s + v.stakeBps, 0) !== frozenTotal) {
      ctx.violation('frozen stakes changed during the vote', `seed ${ctx.rng.seed}`);
    }
  }

  ctx.check('every election completed', elections === 120, `${elections} ran`);
  ctx.note(`${elections} elections · ${decided} decided · ${tied} escalated to a tie-break`);
  // Coverage is worth stating: a fuzz run that never reaches a branch has not
  // tested it, and reporting zero is how that gets noticed.
  if (tied === 0) {
    ctx.violation(
      'no election reached the tie-break path',
      'the generator is not producing tie-capable policies, so escalation is untested'
    );
  }
});

scenario(F, 'All-zero stakes give identical outcomes to headcount', async (ctx) => {
  // The compatibility guarantee, checked as a property rather than an example:
  // for the same electorate, votes and threshold, a weighted tally over
  // all-zero stakes must agree with a headcount tally.
  let compared = 0;

  for (let round = 0; round < 30; round += 1) {
    const n = ctx.rng.int(2, 5);
    const [num, den, inclusive] = ctx.rng.pick([
      [1, 2, false],
      [2, 3, true],
      [1, 1, true],
      [3, 4, true],
    ] as const);
    const decisions = Array.from({ length: n }, () => ctx.rng.bool(0.6));

    const outcomes: string[] = [];
    for (const basis of ['STAKE_WEIGHTED', 'HEADCOUNT'] as const) {
      await truncate();
      const w = await buildElectorate(ctx.rng, n, new Array(n).fill(0));
      await setOrgRule(prisma, w.org.child, {
        votingMode: 'WEIGHTED',
        tallyBasis: basis,
        approveNum: num,
        approveDen: den,
        approveInclusive: inclusive,
        rejectMode: 'DERIVED',
      });

      const { proposal } = await createProposal({
        childOrgId: w.org.child,
        initiatorOrgId: w.org.p0,
        initiatorUserId: w.user.p0u,
        actionType: 'SUSPEND',
        payload: { description: 'parity' },
      });

      for (let i = 0; i < n; i += 1) {
        const current = await prisma.governanceProposal.findUniqueOrThrow({
          where: { id: proposal.id },
        });
        if (current.status !== 'PENDING_VOTES') break;
        await castVote({
          proposalId: proposal.id,
          voterOrgId: w.org[`p${i}`],
          voterUserId: w.user[`p${i}u`],
          decision: decisions[i] ? 'APPROVE' : 'REJECT',
        });
      }
      const final = await prisma.governanceProposal.findUniqueOrThrow({
        where: { id: proposal.id },
      });
      outcomes.push(final.status as string);
    }

    compared += 1;
    if (outcomes[0] !== outcomes[1]) {
      ctx.violation(
        'weighted and headcount disagree with all stakes at zero',
        `weighted=${outcomes[0]} headcount=${outcomes[1]} n=${n} ${num}/${den} ` +
          `inclusive=${inclusive} votes=${decisions.join(',')} (seed ${ctx.rng.seed})`
      );
    }
  }

  ctx.check('all pairs compared', compared === 30, `${compared}`);
  ctx.note(`${compared} paired elections, weighted vs headcount`);
});

scenario(X, 'Structural churn during voting never corrupts an outcome', async (ctx) => {
  // Ownership is edited outside governance today — `owners/route.ts` lets an
  // owner add or remove co-parents directly. So the engine has to survive the
  // electorate changing underneath a live vote, repeatedly and at random.
  let rounds = 0;

  for (let round = 0; round < 40; round += 1) {
    await truncate();

    const n = ctx.rng.int(3, 6);
    const stakes = drawStakes(ctx.rng, n);
    const w = await buildElectorate(ctx.rng, n, stakes);
    await setOrgRule(prisma, w.org.child, drawPolicy(ctx.rng));

    const { proposal } = await createProposal({
      childOrgId: w.org.child,
      initiatorOrgId: w.org.p0,
      initiatorUserId: w.user.p0u,
      actionType: 'SUSPEND',
      payload: { description: `chaos-${round}` },
    });
    rounds += 1;

    for (const i of ctx.rng.shuffle(Array.from({ length: n }, (_, k) => k))) {
      const current = await prisma.governanceProposal.findUniqueOrThrow({
        where: { id: proposal.id },
      });
      if (current.status !== 'PENDING_VOTES') break;

      // A structural mutation between ballots, of the kind the app permits.
      switch (ctx.rng.int(0, 5)) {
        case 0: {
          const victim = ctx.rng.int(1, n - 1);
          await prisma.organizationOwnership.updateMany({
            where: { parentOrgId: w.org[`p${victim}`], childOrgId: w.org.child },
            data: { status: 'REMOVED', removedAt: new Date() },
          });
          break;
        }
        case 1: {
          const victim = ctx.rng.int(1, n - 1);
          await prisma.organization.update({
            where: { id: w.org[`p${victim}`] },
            data: { ownStatus: 'SUSPENDED', suspendedAt: new Date() },
          });
          break;
        }
        case 2: {
          const victim = ctx.rng.int(1, n - 1);
          await prisma.organization.update({
            where: { id: w.org[`p${victim}`] },
            data: { ownStatus: 'DEACTIVATED' },
          });
          break;
        }
        case 3: {
          // Stake edited mid-vote: must not affect this proposal, which froze
          // its weights at creation.
          const victim = ctx.rng.int(0, n - 1);
          await prisma.organizationOwnership.updateMany({
            where: { parentOrgId: w.org[`p${victim}`], childOrgId: w.org.child },
            data: { stakeBps: ctx.rng.int(0, 10000) },
          });
          break;
        }
        default:
          break;
      }

      try {
        await castVote({
          proposalId: proposal.id,
          voterOrgId: w.org[`p${i}`],
          voterUserId: w.user[`p${i}u`],
          decision: ctx.rng.bool(0.6) ? 'APPROVE' : 'REJECT',
        });
      } catch {
        // A refused ballot is a legitimate outcome here — the voter may have
        // just been removed. What matters is that the proposal stays coherent.
      }

      await evaluateProposal(proposal.id).catch(() => undefined);
    }

    const final = await prisma.governanceProposal.findUniqueOrThrow({
      where: { id: proposal.id },
    });
    const child = await prisma.organization.findUniqueOrThrow({ where: { id: w.org.child } });

    // Executed if and only if approved — through arbitrary churn.
    const executed = child.ownStatus === 'SUSPENDED';
    if (executed && final.status !== 'APPROVED') {
      ctx.violation(
        'an action executed for a proposal that did not pass',
        `status=${final.status} (seed ${ctx.rng.seed}, round ${round})`
      );
    }
    if (final.status === 'APPROVED' && !executed) {
      ctx.violation(
        'a proposal passed without its action taking effect',
        `orgStatus=${child.ownStatus} (seed ${ctx.rng.seed}, round ${round})`
      );
    }

    // Every ballot still corresponds to a frozen voter row.
    const votes = await prisma.governanceVote.findMany({ where: { proposalId: proposal.id } });
    const voterRows = await prisma.governanceProposalVoter.findMany({
      where: { proposalId: proposal.id },
    });
    const known = new Set(voterRows.map((v) => v.voterOrgId));
    for (const v of votes) {
      if (!known.has(v.voterOrgId)) {
        ctx.violation(
          'a ballot was accepted from outside the frozen electorate',
          `org ${v.voterOrgId} (seed ${ctx.rng.seed}, round ${round})`
        );
      }
    }
  }

  ctx.check('every chaos round completed', rounds === 40, `${rounds}`);
  ctx.note(`${rounds} elections under continuous structural churn`);
});

/** Local truncate so property loops can reset between rounds. */
async function truncate(): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

// Referenced so the config helper is exercised at least once per run.
scenario(F, 'Vote concentration limit is configurable and enforced', async (ctx) => {
  await setConfig(prisma, 'maxVotesPerUserPerProposal', 2);
  const w = await buildElectorate(ctx.rng, 3, [4000, 3000, 3000]);
  await setOrgRule(prisma, w.org.child, {
    votingMode: 'UNANIMOUS',
    approveNum: 1,
    approveDen: 1,
    approveInclusive: true,
    rejectMode: 'SINGLE_VETO',
  });

  const dual = await prisma.user.create({
    data: { email: `conc-${Date.now()}@sim.local`, passwordHash: 'x', name: 'conc' },
  });
  for (const k of ['p0', 'p1', 'p2']) {
    await prisma.organizationMember.create({
      data: { organizationId: w.org[k], userId: dual.id, role: 'OWNER' },
    });
  }

  const { proposal } = await createProposal({
    childOrgId: w.org.child,
    initiatorOrgId: w.org.p0,
    initiatorUserId: w.user.p0u,
    actionType: 'SUSPEND',
    payload: { description: 'concentration' },
  });

  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p0,
    voterUserId: dual.id,
    decision: 'APPROVE',
  });
  await castVote({
    proposalId: proposal.id,
    voterOrgId: w.org.p1,
    voterUserId: dual.id,
    decision: 'APPROVE',
  });
  await ctx.rejects(
    'the third ballot exceeds the configured cap',
    castVote({
      proposalId: proposal.id,
      voterOrgId: w.org.p2,
      voterUserId: dual.id,
      decision: 'APPROVE',
    })
  );
});
