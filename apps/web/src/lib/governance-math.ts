/**
 * Vote tallying arithmetic.
 *
 * Kept free of Prisma and I/O so every threshold rule is unit-testable in
 * isolation — a governance outcome is not something to debug through a database.
 *
 * Two rules govern everything here:
 *
 *  1. **No floating point.** Every comparison is integer cross-multiplication.
 *     An outcome that depends on IEEE754 rounding is unauditable.
 *
 *  2. **Thresholds are rationals, not percentages.** "Two thirds" stored as the
 *     basis-point integer 6667 is wrong at N=3: 2/3 of 3 voters should pass, but
 *     2 * 10000 >= 6667 * 3 is 20000 >= 20001, which is false. No single
 *     basis-point value is correct for every denominator, so thresholds carry a
 *     numerator and denominator.
 */

/** A threshold, compared as `lhs / total  ≥ (or >)  num / den`. */
export interface Cmp {
  num: number;
  den: number;
  /** true → `>=` (at least). false → `>` (strictly more than). */
  inclusive: boolean;
}

/** Upper bound on threshold denominators, to keep cross-multiplication exact. */
export const MAX_THRESHOLD_DEN = 1000;

/**
 * Integer-only threshold test. Never divides, so there is no rounding.
 *
 * `inclusive` has to be stored rather than inferred, because "simple majority"
 * (strictly more than half) and "at least half" are the same rational 1/2 and
 * differ only in this operator.
 */
export function meets(lhs: number, total: number, t: Cmp): boolean {
  return t.inclusive ? lhs * t.den >= t.num * total : lhs * t.den > t.num * total;
}

/** Common thresholds, so callers don't hand-roll (and mis-encode) them. */
export const THRESHOLDS = {
  /** Every eligible voter. */
  ALL: { num: 1, den: 1, inclusive: true } as Cmp,
  /** Strictly more than half — the usual meaning of "majority". */
  SIMPLE_MAJORITY: { num: 1, den: 2, inclusive: false } as Cmp,
  /** At least half. Distinct from SIMPLE_MAJORITY at even electorates. */
  HALF: { num: 1, den: 2, inclusive: true } as Cmp,
  /** At least two thirds. Exact at every denominator, unlike 6667 bps. */
  TWO_THIRDS: { num: 2, den: 3, inclusive: true } as Cmp,
  /** At least three quarters. */
  THREE_QUARTERS: { num: 3, den: 4, inclusive: true } as Cmp,
  /** No participation floor. */
  NONE: { num: 0, den: 1, inclusive: true } as Cmp,
} as const;

export type BallotDecision = 'APPROVE' | 'REJECT' | null;

export interface Ballot {
  voterOrgId: string;
  /** Frozen weight from the proposal's electorate snapshot. */
  stakeBps: number;
  decision: BallotDecision;
}

export interface Tally {
  /** Headcount of eligible voters. */
  n: number;
  /** Total weight. Equals `n` when the all-zero fallback is active. */
  w: number;
  /** Approving weight / headcount. */
  a: number;
  ah: number;
  /** Rejecting weight / headcount. */
  r: number;
  rh: number;
  /** Undecided weight / headcount. */
  u: number;
  uh: number;
  /**
   * True when no eligible voter carries a stake, so weights fell back to
   * one-vote-each. Surfaced so the UI can say so rather than implying a
   * weighted result that isn't.
   */
  degradedToHeadcount: boolean;
}

/**
 * Weight of a single ballot.
 *
 * When no eligible voter has a stake the whole electorate weighs 1 each, which
 * makes an unallocated org behave exactly like the pre-weighting engine. This
 * is what lets the stake column ship with no backfill.
 */
function weightOf(ballot: Ballot, totalStake: number): number {
  return totalStake > 0 ? ballot.stakeBps : 1;
}

export function tally(ballots: Ballot[]): Tally {
  const totalStake = ballots.reduce((sum, b) => sum + b.stakeBps, 0);
  const degradedToHeadcount = totalStake === 0;

  let w = 0;
  let a = 0;
  let ah = 0;
  let r = 0;
  let rh = 0;

  for (const b of ballots) {
    const weight = weightOf(b, totalStake);
    w += weight;
    if (b.decision === 'APPROVE') {
      a += weight;
      ah += 1;
    } else if (b.decision === 'REJECT') {
      r += weight;
      rh += 1;
    }
  }

  return {
    n: ballots.length,
    w,
    a,
    ah,
    r,
    rh,
    u: w - a - r,
    uh: ballots.length - ah - rh,
    degradedToHeadcount,
  };
}

/**
 * Can this proposal still reach its approval threshold if every undecided
 * voter approves?
 *
 * The engine had no such notion, so a proposal whose approval had become
 * arithmetically impossible sat open until its TTL elapsed.
 */
export function approvalReachable(
  t: Tally,
  approve: Cmp,
  basis: 'HEADCOUNT' | 'STAKE_WEIGHTED'
): boolean {
  return basis === 'HEADCOUNT' ? meets(t.ah + t.uh, t.n, approve) : meets(t.a + t.u, t.w, approve);
}

export function approvalMet(
  t: Tally,
  approve: Cmp,
  basis: 'HEADCOUNT' | 'STAKE_WEIGHTED'
): boolean {
  if (t.n === 0) return false; // 0-of-0 is never unanimous
  return basis === 'HEADCOUNT' ? meets(t.ah, t.n, approve) : meets(t.a, t.w, approve);
}

/** Participation floor. Always inclusive, always by headcount. */
export function quorumMet(t: Tally, quorum: Cmp): boolean {
  return (t.ah + t.rh) * quorum.den >= quorum.num * t.n;
}

/**
 * A tie is full turnout with no rule fired — nothing else.
 *
 * A proposal nobody is voting on is a *stall*, not a tie, and expires normally.
 * If stalls escalated, one silent co-owner could hand every decision to the
 * tie-breaker, which is a far larger transfer of power than breaking a genuine
 * deadlock.
 */
export function isTie(t: Tally, approvalHasMet: boolean, rejectionHasMet: boolean): boolean {
  return t.uh === 0 && t.n > 0 && !approvalHasMet && !rejectionHasMet;
}

/**
 * Deterministic even split of 10000 basis points across `n` owners.
 * Largest-remainder, so the result always sums to exactly 10000
 * (n=3 → [3334, 3333, 3333]). Callers should order owners by `addedAt` so the
 * extra basis point lands somewhere stable rather than moving between renders.
 */
export function splitEvenBps(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(10000 / n);
  const remainder = 10000 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
