import {
  meets,
  tally,
  approvalMet,
  approvalReachable,
  quorumMet,
  isTie,
  splitEvenBps,
  THRESHOLDS,
  type Ballot,
} from '@/lib/governance-math';

const ballot = (id: string, stakeBps: number, decision: Ballot['decision']): Ballot => ({
  voterOrgId: id,
  stakeBps,
  decision,
});

describe('meets — integer threshold comparison', () => {
  it('passes 2-of-3 at two-thirds, where basis points would fail', () => {
    // The reason thresholds are rationals: as 6667 bps this is
    // 2 * 10000 >= 6667 * 3 → 20000 >= 20001 → false, which is wrong.
    expect(meets(2, 3, THRESHOLDS.TWO_THIRDS)).toBe(true);
    expect(meets(1, 3, THRESHOLDS.TWO_THIRDS)).toBe(false);
  });

  it('distinguishes "more than half" from "at least half" at even splits', () => {
    expect(meets(2, 4, THRESHOLDS.SIMPLE_MAJORITY)).toBe(false); // 2 of 4 is not a majority
    expect(meets(2, 4, THRESHOLDS.HALF)).toBe(true);
    expect(meets(3, 4, THRESHOLDS.SIMPLE_MAJORITY)).toBe(true);
  });

  it('is exact at large weighted denominators', () => {
    // 6000/10000 is below two-thirds; 6667/10000 is above it.
    expect(meets(6000, 10000, THRESHOLDS.TWO_THIRDS)).toBe(false);
    expect(meets(6667, 10000, THRESHOLDS.TWO_THIRDS)).toBe(true);
    // Exactly two-thirds of 9999 passes an inclusive threshold.
    expect(meets(6666, 9999, THRESHOLDS.TWO_THIRDS)).toBe(true);
  });

  it('treats a zero threshold as always satisfied', () => {
    expect(meets(0, 5, THRESHOLDS.NONE)).toBe(true);
  });
});

describe('tally', () => {
  it('falls back to one-vote-each when no voter has a stake', () => {
    const t = tally([ballot('a', 0, 'APPROVE'), ballot('b', 0, 'REJECT'), ballot('c', 0, null)]);
    expect(t.degradedToHeadcount).toBe(true);
    expect(t.w).toBe(3);
    expect(t.a).toBe(1);
    expect(t.r).toBe(1);
    expect(t.u).toBe(1);
  });

  it('weighs by stake when stakes are allocated', () => {
    const t = tally([ballot('a', 6000, 'APPROVE'), ballot('b', 4000, 'REJECT')]);
    expect(t.degradedToHeadcount).toBe(false);
    expect(t.w).toBe(10000);
    expect(t.a).toBe(6000);
    expect(t.r).toBe(4000);
    expect(t.ah).toBe(1);
    expect(t.rh).toBe(1);
  });

  it('renormalises when an owner is absent, with no writes', () => {
    // 50/30/20 minus the 20 leaves 8000 total, i.e. 62.5% / 37.5%.
    const t = tally([ballot('a', 5000, 'APPROVE'), ballot('b', 3000, null)]);
    expect(t.w).toBe(8000);
    expect(meets(t.a, t.w, THRESHOLDS.SIMPLE_MAJORITY)).toBe(true);
  });

  it('counts a zero-stake owner for headcount but not for weight', () => {
    const t = tally([ballot('big', 9000, 'APPROVE'), ballot('observer', 0, null)]);
    expect(t.n).toBe(2);
    expect(t.uh).toBe(1); // still owed a vote under unanimity
    expect(t.w).toBe(9000);
    expect(t.u).toBe(0); // but carries no weight
  });
});

describe('approvalMet / approvalReachable', () => {
  it('never treats an empty electorate as unanimous', () => {
    expect(approvalMet(tally([]), THRESHOLDS.ALL, 'HEADCOUNT')).toBe(false);
  });

  it('holds a weighted proposal below threshold', () => {
    const t = tally([ballot('a', 6000, 'APPROVE'), ballot('b', 4000, null)]);
    expect(approvalMet(t, THRESHOLDS.TWO_THIRDS, 'STAKE_WEIGHTED')).toBe(false); // 60% < 66.7%
    expect(approvalReachable(t, THRESHOLDS.TWO_THIRDS, 'STAKE_WEIGHTED')).toBe(true);
  });

  it('detects when approval has become arithmetically impossible', () => {
    const t = tally([
      ballot('a', 0, 'REJECT'),
      ballot('b', 0, 'REJECT'),
      ballot('c', 0, 'REJECT'),
      ballot('d', 0, null),
      ballot('e', 0, null),
    ]);
    // 3 of 5 rejected, so a simple majority can no longer be reached.
    expect(approvalReachable(t, THRESHOLDS.SIMPLE_MAJORITY, 'HEADCOUNT')).toBe(false);
  });
});

describe('quorum', () => {
  it('measures turnout, not approval', () => {
    const t = tally([ballot('a', 0, 'REJECT'), ballot('b', 0, 'REJECT'), ballot('c', 0, null)]);
    expect(quorumMet(t, THRESHOLDS.HALF)).toBe(true); // 2 of 3 voted
    expect(quorumMet(t, THRESHOLDS.ALL)).toBe(false);
  });
});

describe('isTie', () => {
  it('is a tie only at full turnout with no rule fired', () => {
    const t = tally([
      ballot('a', 0, 'APPROVE'),
      ballot('b', 0, 'APPROVE'),
      ballot('c', 0, 'REJECT'),
      ballot('d', 0, 'REJECT'),
    ]);
    expect(isTie(t, false, false)).toBe(true);
  });

  it('is NOT a tie while anyone can still vote — that is a stall', () => {
    const t = tally([ballot('a', 0, 'APPROVE'), ballot('b', 0, 'REJECT'), ballot('c', 0, null)]);
    expect(isTie(t, false, false)).toBe(false);
  });

  it('is not a tie when a rule already fired', () => {
    const t = tally([ballot('a', 0, 'APPROVE'), ballot('b', 0, 'APPROVE')]);
    expect(isTie(t, true, false)).toBe(false);
  });
});

describe('splitEvenBps', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('sums to exactly 10000 for %i owners', (n) => {
    const split = splitEvenBps(n);
    expect(split).toHaveLength(n);
    expect(split.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('puts the remainder on the earliest owner', () => {
    expect(splitEvenBps(3)).toEqual([3334, 3333, 3333]);
  });

  it('returns nothing for a non-positive count', () => {
    expect(splitEvenBps(0)).toEqual([]);
  });
});

describe('backward compatibility', () => {
  it('reproduces one-org-one-vote unanimity when no stakes are set', () => {
    const allApprove = tally([
      ballot('a', 0, 'APPROVE'),
      ballot('b', 0, 'APPROVE'),
      ballot('c', 0, 'APPROVE'),
    ]);
    expect(approvalMet(allApprove, THRESHOLDS.ALL, 'HEADCOUNT')).toBe(true);

    const oneMissing = tally([
      ballot('a', 0, 'APPROVE'),
      ballot('b', 0, 'APPROVE'),
      ballot('c', 0, null),
    ]);
    expect(approvalMet(oneMissing, THRESHOLDS.ALL, 'HEADCOUNT')).toBe(false);
  });
});
