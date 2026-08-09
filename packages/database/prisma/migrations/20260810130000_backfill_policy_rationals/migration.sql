-- Translate existing rule rows onto rational thresholds, preserving behaviour.
--
-- Idempotent: every UPDATE is guarded so it can only touch a row still at the
-- column defaults, and the INSERT uses ON CONFLICT DO NOTHING. Safe to re-run.

-- 1. QUORUM rows: quorumPercent p becomes the rational p/100, inclusive.
--    The old engine approved when approveCount / required >= pct, so `>=` is
--    the faithful operator here.
UPDATE "governance_rule_sets"
SET "approveNum" = "quorumPercent",
    "approveDen" = 100,
    "approveInclusive" = true
WHERE "votingMode" = 'QUORUM'
  AND "quorumPercent" IS NOT NULL
  AND "approveNum" = 1
  AND "approveDen" = 1;

-- 2. "Majority veto" under QUORUM was never a majority: the old engine rejected
--    when rejectCount / required > 1 - pct, i.e. the moment approval became
--    unreachable. At quorum 51 that fires at exactly half the voters, whereas a
--    literal majority needs strictly more than half. Preserve the original
--    threshold rather than the original name.
UPDATE "governance_rule_sets"
SET "rejectMode" = 'WEIGHTED_VETO',
    "vetoNum" = 100 - "quorumPercent",
    "vetoDen" = 100,
    "vetoInclusive" = false
WHERE "votingMode" = 'QUORUM'
  AND "rejectMode" = 'MAJORITY_VETO'
  AND "quorumPercent" IS NOT NULL
  AND "vetoNum" IS NULL;

-- 3. UNANIMOUS + MAJORITY_VETO cannot resolve cleanly: one rejection already
--    makes unanimity impossible, but rejection would not fire until a majority
--    had rejected, leaving the proposal open long after it was decided. Rewrite
--    to the behaviour operators actually get today, where the first rejection
--    ends it.
UPDATE "governance_rule_sets"
SET "rejectMode" = 'SINGLE_VETO'
WHERE "votingMode" = 'UNANIMOUS'
  AND "rejectMode" = 'MAJORITY_VETO';

-- 4. UNANIMOUS rows already match the column defaults (approve 1/1 inclusive,
--    HEADCOUNT), so they need no translation.

-- 5. Repair rule-set drift. The TypeScript seed only ever created ten action
--    types, so databases seeded before SET_CHILD_POLICY / REMOVE_CHILD_POLICY
--    existed are missing rows, and the two action types added in this release
--    are missing everywhere. Absent a row the engine falls back to hard-coded
--    defaults, which is correct but invisible to an operator.
INSERT INTO "governance_rule_sets"
  (id, "actionType", "votingMode", "rejectMode", "ttlDays", "isActive", "updatedAt",
   "tallyBasis", "approveNum", "approveDen", "approveInclusive",
   "quorumNum", "quorumDen", "tieBreakEnabled", "dealMakerMinStakeBps")
SELECT gen_random_uuid()::text, t.action_type::"GovernanceActionType",
       'UNANIMOUS', 'SINGLE_VETO', 7, true, NOW(),
       'HEADCOUNT', 1, 1, true, 0, 1, false, 0
FROM (VALUES
  ('SUSPEND'), ('REACTIVATE'), ('DEACTIVATE'),
  ('UPDATE_SETTINGS'), ('UPDATE_BRANDING'), ('UPDATE_INTEGRATIONS'), ('UPDATE_RBAC'),
  ('ADD_PARENT'), ('REMOVE_PARENT'), ('ADD_CHILD'),
  ('SET_CHILD_POLICY'), ('REMOVE_CHILD_POLICY'),
  ('SET_OWNERSHIP_STAKES'), ('SET_GOVERNANCE_RULE')
) AS t(action_type)
ON CONFLICT ("actionType") DO NOTHING;

-- 6. Reallocating voting weight must require every owner's consent. If stakes
--    could be rewritten by a majority, an owner could be diluted out of the
--    majority that diluted them, and the whole weighting scheme becomes
--    decorative. This is the single most important default in the design.
UPDATE "governance_rule_sets"
SET "votingMode" = 'UNANIMOUS',
    "rejectMode" = 'SINGLE_VETO',
    "tallyBasis" = 'HEADCOUNT',
    "approveNum" = 1,
    "approveDen" = 1,
    "approveInclusive" = true
WHERE "actionType" = 'SET_OWNERSHIP_STAKES';

-- Amending the rulebook itself gets the same protection.
UPDATE "governance_rule_sets"
SET "votingMode" = 'UNANIMOUS',
    "rejectMode" = 'SINGLE_VETO',
    "tallyBasis" = 'HEADCOUNT',
    "approveNum" = 1,
    "approveDen" = 1,
    "approveInclusive" = true
WHERE "actionType" = 'SET_GOVERNANCE_RULE';
