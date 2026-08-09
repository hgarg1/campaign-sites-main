import {
  validatePolicy,
  evaluateOutcome,
  tiesPossible,
  toPolicyConfig,
  type PolicyConfig,
} from '@/lib/governance-policy';
import { THRESHOLDS, tally, type Ballot } from '@/lib/governance-math';

const policy = (over: Partial<PolicyConfig> = {}): PolicyConfig => ({
  votingMode: 'UNANIMOUS',
  rejectMode: 'SINGLE_VETO',
  tallyBasis: 'HEADCOUNT',
  approve: THRESHOLDS.ALL,
  veto: null,
  quorum: THRESHOLDS.NONE,
  tieBreakEnabled: false,
  dealMakerMinStakeBps: 0,
  ttlDays: 7,
  ...over,
});

const b = (id: string, stakeBps: number, decision: Ballot['decision']): Ballot => ({
  voterOrgId: id,
  stakeBps,
  decision,
});

describe('validatePolicy guards', () => {
  it('rejects weighted unanimity, which would ignore zero-stake owners', () => {
    const r = validatePolicy(policy({ tallyBasis: 'STAKE_WEIGHTED' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('UNANIMOUS_MUST_BE_HEADCOUNT');
  });

  it('rejects UNANIMOUS + MAJORITY_VETO, which hangs after it is decided', () => {
    // Live in production data: one rejection kills unanimity, but rejection
    // does not fire until a majority rejects.
    const r = validatePolicy(policy({ rejectMode: 'MAJORITY_VETO' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('UNANIMOUS_REJECT_MODE');
  });

  it('rejects deal-maker racing a single veto', () => {
    const r = validatePolicy(
      policy({ votingMode: 'DEAL_MAKER', rejectMode: 'SINGLE_VETO', approve: THRESHOLDS.NONE })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DEAL_MAKER_REJECT_MODE');
  });

  it('rejects a majority veto when tallying by stake, as "majority" is ambiguous', () => {
    const r = validatePolicy(
      policy({
        votingMode: 'WEIGHTED',
        tallyBasis: 'STAKE_WEIGHTED',
        rejectMode: 'MAJORITY_VETO',
        approve: THRESHOLDS.SIMPLE_MAJORITY,
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('WEIGHTED_MAJORITY_VETO');
  });

  it('rejects thresholds that leave a band where neither rule can fire', () => {
    // Approve at 2/3 with a veto at 1/2: between them nothing resolves.
    const r = validatePolicy(
      policy({
        votingMode: 'SUPERMAJORITY',
        rejectMode: 'WEIGHTED_VETO',
        approve: THRESHOLDS.TWO_THIRDS,
        veto: THRESHOLDS.HALF,
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('THRESHOLD_HANG_WINDOW');
  });

  it('accepts complementary thresholds', () => {
    // 2/3 approve with a 1/3 veto covers the whole range.
    const r = validatePolicy(
      policy({
        votingMode: 'SUPERMAJORITY',
        rejectMode: 'WEIGHTED_VETO',
        approve: THRESHOLDS.TWO_THIRDS,
        veto: { num: 1, den: 3, inclusive: false },
      })
    );
    expect(r.ok).toBe(true);
  });

  it('bounds threshold denominators to keep the arithmetic exact', () => {
    const r = validatePolicy(policy({ approve: { num: 1, den: 5000, inclusive: true } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('THRESHOLD_DEN_RANGE');
  });

  it('warns that a tie-break is unreachable under derived rejection', () => {
    const r = validatePolicy(policy({ rejectMode: 'DERIVED', tieBreakEnabled: true }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(' ')).toMatch(/never fire/i);
  });

  it('warns when a 1% owner can veto a 99% owner', () => {
    const r = validatePolicy(
      policy({
        votingMode: 'WEIGHTED',
        tallyBasis: 'STAKE_WEIGHTED',
        approve: THRESHOLDS.SIMPLE_MAJORITY,
        rejectMode: 'SINGLE_VETO',
      })
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(' ')).toMatch(/1%/);
  });
});

describe('tiesPossible', () => {
  it('is false for derived rejection and true for majority veto', () => {
    expect(tiesPossible(policy({ rejectMode: 'DERIVED' }))).toBe(false);
    expect(tiesPossible(policy({ rejectMode: 'MAJORITY_VETO' }))).toBe(true);
  });
});

describe('evaluateOutcome', () => {
  it('holds a weighted proposal below its threshold, then approves it', () => {
    const p = policy({
      votingMode: 'WEIGHTED',
      tallyBasis: 'STAKE_WEIGHTED',
      approve: THRESHOLDS.TWO_THIRDS,
      rejectMode: 'DERIVED',
    });

    // 60% approving is short of two-thirds.
    expect(evaluateOutcome(tally([b('a', 6000, 'APPROVE'), b('b', 4000, null)]), p).kind).toBe(
      'PENDING'
    );
    // Both approve → 100%.
    expect(evaluateOutcome(tally([b('a', 6000, 'APPROVE'), b('b', 4000, 'APPROVE')]), p).kind).toBe(
      'APPROVED'
    );
  });

  it('lets a majority owner carry a weighted vote alone', () => {
    const p = policy({
      votingMode: 'WEIGHTED',
      tallyBasis: 'STAKE_WEIGHTED',
      approve: THRESHOLDS.SIMPLE_MAJORITY,
      rejectMode: 'DERIVED',
    });
    expect(
      evaluateOutcome(tally([b('big', 6000, 'APPROVE'), b('small', 4000, null)]), p).kind
    ).toBe('APPROVED');
  });

  it('lets a single veto stop a supermajority', () => {
    const p = policy({
      votingMode: 'SUPERMAJORITY',
      approve: THRESHOLDS.TWO_THIRDS,
      rejectMode: 'SINGLE_VETO',
    });
    const out = evaluateOutcome(
      tally([b('a', 0, 'APPROVE'), b('b', 0, 'APPROVE'), b('c', 0, 'REJECT')]),
      p
    );
    expect(out.kind).toBe('REJECTED');
  });

  it('resolves derived rejection the moment approval becomes impossible', () => {
    const p = policy({
      votingMode: 'SIMPLE_MAJORITY',
      approve: THRESHOLDS.SIMPLE_MAJORITY,
      rejectMode: 'DERIVED',
    });
    const out = evaluateOutcome(
      tally([b('a', 0, 'REJECT'), b('b', 0, 'REJECT'), b('c', 0, null)]),
      p
    );
    expect(out.kind).toBe('REJECTED');
    if (out.kind === 'REJECTED') expect(out.reason).toMatch(/no longer be reached/);
  });

  it('reports a tie only at full turnout, and only when enabled', () => {
    const p = policy({
      votingMode: 'SIMPLE_MAJORITY',
      approve: THRESHOLDS.SIMPLE_MAJORITY,
      rejectMode: 'MAJORITY_VETO',
      tieBreakEnabled: true,
    });
    const deadlocked = tally([
      b('a', 0, 'APPROVE'),
      b('b', 0, 'APPROVE'),
      b('c', 0, 'REJECT'),
      b('d', 0, 'REJECT'),
    ]);
    expect(evaluateOutcome(deadlocked, p).kind).toBe('TIE');

    // One vote outstanding is a stall, not a tie.
    const stalled = tally([b('a', 0, 'APPROVE'), b('b', 0, 'REJECT'), b('c', 0, null)]);
    expect(evaluateOutcome(stalled, p).kind).toBe('PENDING');

    // Same deadlock without the tie-break enabled stays pending until expiry.
    expect(evaluateOutcome(deadlocked, { ...p, tieBreakEnabled: false }).kind).toBe('PENDING');
  });

  it('carries a deal-maker on the first approval, subject to a stake floor', () => {
    const p = policy({
      votingMode: 'DEAL_MAKER',
      rejectMode: 'NONE',
      approve: THRESHOLDS.NONE,
      dealMakerMinStakeBps: 2500,
    });
    const t = tally([b('small', 1000, 'APPROVE'), b('big', 9000, null)]);

    // A 10% owner is below the floor.
    expect(evaluateOutcome(t, p, { maxApprovingStakeBps: 1000 }).kind).toBe('PENDING');
    // A 90% owner clears it.
    expect(evaluateOutcome(t, p, { maxApprovingStakeBps: 9000 }).kind).toBe('APPROVED');
  });

  it('withholds approval until the turnout floor is met', () => {
    const p = policy({
      votingMode: 'SIMPLE_MAJORITY',
      approve: THRESHOLDS.SIMPLE_MAJORITY,
      rejectMode: 'DERIVED',
      quorum: THRESHOLDS.TWO_THIRDS,
    });
    // 2 of 4 approving is a majority of nothing — turnout is only 50%.
    const t = tally([b('a', 0, 'APPROVE'), b('b', 0, 'APPROVE'), b('c', 0, null), b('d', 0, null)]);
    expect(evaluateOutcome(t, p).kind).toBe('PENDING');
  });
});

describe('toPolicyConfig', () => {
  const columns = {
    votingMode: 'QUORUM' as const,
    rejectMode: 'SINGLE_VETO' as const,
    tallyBasis: 'HEADCOUNT' as const,
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

  it('translates a legacy quorumPercent row on read', () => {
    const p = toPolicyConfig({ ...columns, quorumPercent: 51 });
    expect(p.approve).toEqual({ num: 51, den: 100, inclusive: true });
  });

  it('preserves legacy majority-veto semantics exactly', () => {
    // The old engine rejected when rejectCount/required > 1 - pct, which at
    // quorum 51 fires at exactly half the voters. A literal MAJORITY_VETO needs
    // strictly MORE than half, so translating it naively would flip outcomes
    // for proposals that are already open.
    const p = toPolicyConfig({ ...columns, quorumPercent: 51, rejectMode: 'MAJORITY_VETO' });
    expect(p.rejectMode).toBe('WEIGHTED_VETO');
    expect(p.veto).toEqual({ num: 49, den: 100, inclusive: false });

    // 2 rejections of 4 voters: rejected under the legacy rule, and still so.
    const t = tally([b('a', 0, 'REJECT'), b('b', 0, 'REJECT'), b('c', 0, null), b('d', 0, null)]);
    expect(evaluateOutcome(t, p).kind).toBe('REJECTED');
  });

  it('prefers explicit rational columns once they are set', () => {
    const p = toPolicyConfig({
      ...columns,
      quorumPercent: 51,
      approveNum: 2,
      approveDen: 3,
      approveInclusive: true,
    });
    expect(p.approve).toEqual({ num: 2, den: 3, inclusive: true });
  });
});
