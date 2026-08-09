/**
 * Governance policy: resolution, validation, and outcome evaluation.
 *
 * A "policy" is the full rule a proposal is judged by — how approval is reached,
 * how rejection is reached, the turnout floor, and whether a deadlock escalates.
 * It is resolved once at proposal creation and frozen onto the proposal, so
 * amending the rulebook can never change a vote already under way.
 */

import type { RejectMode, TallyBasis, VotingMode } from '@prisma/client';
import {
  MAX_THRESHOLD_DEN,
  THRESHOLDS,
  approvalMet,
  approvalReachable,
  isTie,
  meets,
  quorumMet,
  type Cmp,
  type Tally,
} from '@/lib/governance-math';

export interface PolicyConfig {
  votingMode: VotingMode;
  rejectMode: RejectMode;
  tallyBasis: TallyBasis;
  approve: Cmp;
  veto: Cmp | null;
  quorum: Cmp;
  tieBreakEnabled: boolean;
  dealMakerMinStakeBps: number;
  ttlDays: number;
}

/** Columns shared by GovernanceRuleSet and OrgGovernanceRule. */
export interface PolicyColumns {
  votingMode: VotingMode;
  rejectMode: RejectMode;
  tallyBasis: TallyBasis;
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
  quorumPercent?: number | null;
}

/**
 * Builds a PolicyConfig from stored columns.
 *
 * A row still at the column defaults (approve 1/1) that carries a legacy
 * `quorumPercent` is translated on read, so the rational columns can ship before
 * the data migration runs and neither ordering breaks.
 */
export function toPolicyConfig(row: PolicyColumns): PolicyConfig {
  const legacyQuorum =
    row.approveNum === 1 &&
    row.approveDen === 1 &&
    row.votingMode === 'QUORUM' &&
    typeof row.quorumPercent === 'number';

  const approve: Cmp = legacyQuorum
    ? { num: row.quorumPercent as number, den: 100, inclusive: true }
    : { num: row.approveNum, den: row.approveDen, inclusive: row.approveInclusive };

  let veto: Cmp | null =
    row.vetoNum !== null && row.vetoDen !== null
      ? { num: row.vetoNum, den: row.vetoDen, inclusive: row.vetoInclusive }
      : null;
  let rejectMode = row.rejectMode;

  // The legacy engine's "majority veto" under QUORUM was not a majority at all:
  // it rejected when rejectCount / required > 1 - pct, i.e. as soon as approval
  // became unreachable. At quorum 51% that fires at exactly half the voters,
  // whereas a true majority veto needs strictly more than half — so translating
  // it as MAJORITY_VETO would silently change outcomes for in-flight proposals.
  // Preserve it exactly as a threshold veto.
  if (legacyQuorum && rejectMode === 'MAJORITY_VETO') {
    rejectMode = 'WEIGHTED_VETO';
    veto = { num: 100 - (row.quorumPercent as number), den: 100, inclusive: false };
  }

  return {
    votingMode: row.votingMode,
    rejectMode,
    tallyBasis: row.tallyBasis,
    approve,
    veto,
    quorum: { num: row.quorumNum, den: row.quorumDen, inclusive: true },
    tieBreakEnabled: row.tieBreakEnabled,
    dealMakerMinStakeBps: row.dealMakerMinStakeBps,
    ttlDays: row.ttlDays,
  };
}

/** Named presets, so an operator never has to hand-encode a threshold. */
export const POLICY_PRESETS = {
  UNANIMOUS: { label: 'Unanimous', approve: THRESHOLDS.ALL, basis: 'HEADCOUNT' },
  SIMPLE_MAJORITY: {
    label: 'Simple majority (more than half)',
    approve: THRESHOLDS.SIMPLE_MAJORITY,
    basis: 'HEADCOUNT',
  },
  TWO_THIRDS: {
    label: 'Supermajority (two thirds)',
    approve: THRESHOLDS.TWO_THIRDS,
    basis: 'HEADCOUNT',
  },
  THREE_QUARTERS: {
    label: 'Supermajority (three quarters)',
    approve: THRESHOLDS.THREE_QUARTERS,
    basis: 'HEADCOUNT',
  },
  WEIGHTED_MAJORITY: {
    label: 'Majority by ownership stake',
    approve: THRESHOLDS.SIMPLE_MAJORITY,
    basis: 'STAKE_WEIGHTED',
  },
  WEIGHTED_TWO_THIRDS: {
    label: 'Two thirds by ownership stake',
    approve: THRESHOLDS.TWO_THIRDS,
    basis: 'STAKE_WEIGHTED',
  },
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

export type PolicyValidation =
  | { ok: true; warnings: string[] }
  | { ok: false; code: string; message: string };

/**
 * Rejects mode combinations that cannot resolve, and warns about the ones that
 * are coherent but surprising.
 *
 * `UNANIMOUS + MAJORITY_VETO` is the motivating case and exists in production
 * data today: a single rejection already makes unanimity unreachable, but
 * rejection does not fire until a majority has rejected, so the proposal is
 * arithmetically dead while still sitting open until its TTL.
 */
export function validatePolicy(p: PolicyConfig): PolicyValidation {
  const warnings: string[] = [];

  const bad = (code: string, message: string): PolicyValidation => ({ ok: false, code, message });

  // G6/G7 — bounds. Denominators are bounded so cross-multiplication stays exact.
  for (const [name, cmp] of [
    ['approve', p.approve],
    ['quorum', p.quorum],
    ...(p.veto ? ([['veto', p.veto]] as const) : []),
  ] as Array<[string, Cmp]>) {
    if (cmp.den < 1 || cmp.den > MAX_THRESHOLD_DEN) {
      return bad(
        'THRESHOLD_DEN_RANGE',
        `${name} denominator must be between 1 and ${MAX_THRESHOLD_DEN}`
      );
    }
    if (cmp.num < 0 || cmp.num > cmp.den) {
      return bad('THRESHOLD_NUM_RANGE', `${name} numerator must be between 0 and its denominator`);
    }
  }

  // G1 — weighted unanimity is a category error: 100% of stake would silently
  // ignore any owner holding none.
  if (p.votingMode === 'UNANIMOUS' && p.tallyBasis === 'STAKE_WEIGHTED') {
    return bad(
      'UNANIMOUS_MUST_BE_HEADCOUNT',
      'Unanimous voting counts voters, not stake — a zero-stake owner would otherwise be silently excluded'
    );
  }

  // G2 — see the doc comment above.
  if (p.votingMode === 'UNANIMOUS' && !['SINGLE_VETO', 'DERIVED'].includes(p.rejectMode)) {
    return bad(
      'UNANIMOUS_REJECT_MODE',
      'Unanimous voting must pair with a single veto or derived rejection: one rejection already makes unanimity impossible, so any other reject mode leaves the proposal open after it is decided'
    );
  }

  // G3 — deal-maker is first-past-the-post, so a first-past-the-post veto makes
  // the outcome a race between voters rather than a decision.
  if (p.votingMode === 'DEAL_MAKER' && !['NONE', 'DERIVED'].includes(p.rejectMode)) {
    return bad(
      'DEAL_MAKER_REJECT_MODE',
      'A deal-maker rule resolves on the first approval, so it must pair with no veto or derived rejection — otherwise the outcome depends on who votes first'
    );
  }

  // G4 — "majority" of heads or of stake is ambiguous under weighting.
  if (p.tallyBasis === 'STAKE_WEIGHTED' && p.rejectMode === 'MAJORITY_VETO') {
    return bad(
      'WEIGHTED_MAJORITY_VETO',
      'Majority veto is ambiguous when tallying by stake — use a weighted veto or derived rejection'
    );
  }

  // G5 — no-hang window. If the approval and veto thresholds do not cover the
  // whole range there is a band where neither rule can fire and the proposal
  // hangs to TTL.
  if (p.veto) {
    const { num: aNum, den: aDen } = p.approve;
    const { num: vNum, den: vDen } = p.veto;
    if (aNum * vDen + vNum * aDen > aDen * vDen) {
      return bad(
        'THRESHOLD_HANG_WINDOW',
        'These approval and veto thresholds leave a range where neither can be met, so the proposal would hang until it expires'
      );
    }
  }

  // G8 and other advisories.
  if (p.tieBreakEnabled && p.rejectMode === 'DERIVED') {
    warnings.push(
      'Derived rejection resolves the moment approval becomes impossible, so a tie can never occur and the tie-break will never fire.'
    );
  }
  if (p.tallyBasis === 'STAKE_WEIGHTED' && p.rejectMode === 'SINGLE_VETO') {
    warnings.push(
      'With a single veto, an owner holding 1% can block an owner holding 99% — intended for minority protection, but it undercuts weighting.'
    );
  }
  if (p.votingMode === 'SIMPLE_MAJORITY' && p.rejectMode === 'SINGLE_VETO') {
    warnings.push(
      'Majority approval combined with a single veto behaves as unanimity in practice, since any one owner can block.'
    );
  }
  if (!p.tieBreakEnabled && ['MAJORITY_VETO', 'WEIGHTED_VETO'].includes(p.rejectMode)) {
    warnings.push(
      'This rule can deadlock at full turnout. Without a tie-break the proposal will expire instead of resolving.'
    );
  }

  return { ok: true, warnings };
}

/** Whether a policy can produce a genuine tie, for the admin UI to display. */
export function tiesPossible(p: PolicyConfig): boolean {
  return p.rejectMode === 'MAJORITY_VETO' || p.rejectMode === 'WEIGHTED_VETO';
}

// ─── Outcome ──────────────────────────────────────────────────────────────────

export type Outcome =
  | { kind: 'APPROVED' }
  | { kind: 'REJECTED'; reason: string }
  | { kind: 'TIE' }
  | { kind: 'PENDING' };

/**
 * Applies a policy to a tally.
 *
 * Order matters: rejection is checked before approval so an explicit veto beats
 * a satisfied approval threshold in the same evaluation.
 */
export function evaluateOutcome(
  t: Tally,
  p: PolicyConfig,
  opts: { maxApprovingStakeBps?: number } = {}
): Outcome {
  if (t.n === 0) return { kind: 'PENDING' };

  const basis = p.tallyBasis;

  // ── Rejection ──
  let rejected = false;
  let rejectReason = 'Rejected by vote';

  switch (p.rejectMode) {
    case 'SINGLE_VETO':
      rejected = t.rh >= 1;
      break;
    case 'MAJORITY_VETO':
      rejected = meets(t.rh, t.n, THRESHOLDS.SIMPLE_MAJORITY);
      break;
    case 'WEIGHTED_VETO':
      // Measured on the same basis as the tally: heads against heads, stake
      // against stake. A veto threshold expressed in one unit and compared in
      // the other would be meaningless.
      rejected = p.veto
        ? basis === 'HEADCOUNT'
          ? meets(t.rh, t.n, p.veto)
          : meets(t.r, t.w, p.veto)
        : false;
      break;
    case 'DERIVED':
      rejected = !approvalReachable(t, p.approve, basis);
      if (rejected) rejectReason = 'Approval threshold can no longer be reached';
      break;
    case 'NONE':
      rejected = false;
      break;
  }

  if (rejected) return { kind: 'REJECTED', reason: rejectReason };

  // ── Approval ──
  let approved: boolean;
  if (p.votingMode === 'DEAL_MAKER') {
    // A lone approver may need a minimum stake, so one token owner cannot carry
    // a decision on their own.
    approved =
      t.ah >= 1 &&
      (p.dealMakerMinStakeBps === 0 || (opts.maxApprovingStakeBps ?? 0) >= p.dealMakerMinStakeBps);
  } else if (p.votingMode === 'UNANIMOUS') {
    approved = t.ah === t.n;
  } else {
    approved = approvalMet(t, p.approve, basis);
  }

  // A turnout floor gates approval but never rejection: failing it means the
  // process did not happen, which expires rather than decides.
  if (approved && !quorumMet(t, p.quorum)) {
    return { kind: 'PENDING' };
  }

  if (approved) return { kind: 'APPROVED' };

  if (p.tieBreakEnabled && isTie(t, false, false)) {
    return { kind: 'TIE' };
  }

  return { kind: 'PENDING' };
}
