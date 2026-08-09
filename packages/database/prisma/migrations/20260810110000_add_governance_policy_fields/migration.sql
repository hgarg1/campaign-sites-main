-- Rational thresholds, the per-org rule table, and tie-break columns.
--
-- Entirely additive. `quorumPercent` is deliberately retained: the engine reads
-- it as a fallback for rows still at the new columns' defaults, so this
-- migration and the code that uses it can deploy in either order.
--
-- Thresholds are stored as num/den rather than a percentage because no whole
-- percent (nor basis point) encodes "two thirds" correctly at every electorate
-- size — as 67% it fails at 3 voters, where 2 of 3 should pass.

-- AlterTable: platform-wide defaults
ALTER TABLE "governance_rule_sets" ADD COLUMN     "tallyBasis" "TallyBasis" NOT NULL DEFAULT 'HEADCOUNT';
ALTER TABLE "governance_rule_sets" ADD COLUMN     "approveNum" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "approveDen" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "approveInclusive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "vetoNum" INTEGER;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "vetoDen" INTEGER;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "vetoInclusive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "quorumNum" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "quorumDen" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "tieBreakEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "governance_rule_sets" ADD COLUMN     "dealMakerMinStakeBps" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: proposal policy snapshot. Nullable so proposals created before
-- this migration are distinguishable and keep their original legacy semantics.
ALTER TABLE "governance_proposals" ADD COLUMN     "tallyBasis" "TallyBasis";
ALTER TABLE "governance_proposals" ADD COLUMN     "approveNum" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "approveDen" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "approveInclusive" BOOLEAN;
ALTER TABLE "governance_proposals" ADD COLUMN     "vetoNum" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "vetoDen" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "vetoInclusive" BOOLEAN;
ALTER TABLE "governance_proposals" ADD COLUMN     "quorumNum" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "quorumDen" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "dealMakerMinStakeBps" INTEGER;
ALTER TABLE "governance_proposals" ADD COLUMN     "tallyBasisEffective" "TallyBasis";

-- AlterTable: tie-break. tieBreakOrgId is resolved at proposal CREATION so a
-- proposal that itself re-parents an org cannot move its own casting vote.
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakOrgId" TEXT;
ALTER TABLE "governance_proposals" ADD COLUMN     "tieDetectedAt" TIMESTAMP(3);
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakExpiresAt" TIMESTAMP(3);
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakDecision" "VoteDecision";
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakByUserId" TEXT;
ALTER TABLE "governance_proposals" ADD COLUMN     "tieBreakReason" TEXT;

-- CreateTable: a governance rule owned by the governed org itself.
CREATE TABLE "org_governance_rules" (
    "id" TEXT NOT NULL,
    "childOrgId" TEXT NOT NULL,
    "actionType" "GovernanceActionType",
    "votingMode" "VotingMode" NOT NULL DEFAULT 'UNANIMOUS',
    "rejectMode" "RejectMode" NOT NULL DEFAULT 'SINGLE_VETO',
    "ttlDays" INTEGER NOT NULL DEFAULT 7,
    "tallyBasis" "TallyBasis" NOT NULL DEFAULT 'HEADCOUNT',
    "approveNum" INTEGER NOT NULL DEFAULT 1,
    "approveDen" INTEGER NOT NULL DEFAULT 1,
    "approveInclusive" BOOLEAN NOT NULL DEFAULT true,
    "vetoNum" INTEGER,
    "vetoDen" INTEGER,
    "vetoInclusive" BOOLEAN NOT NULL DEFAULT true,
    "quorumNum" INTEGER NOT NULL DEFAULT 0,
    "quorumDen" INTEGER NOT NULL DEFAULT 1,
    "tieBreakEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dealMakerMinStakeBps" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "setByProposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_governance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_governance_rules_childOrgId_idx" ON "org_governance_rules"("childOrgId");

-- The compound unique index Prisma's @@unique declares, which backs the
-- childOrgId_actionType selector used for upserts.
CREATE UNIQUE INDEX "org_governance_rules_childOrgId_actionType_key" ON "org_governance_rules"("childOrgId", "actionType");

-- PostgreSQL treats NULLs as distinct in a unique index, so the index above
-- would happily allow several org-wide default rules (actionType IS NULL) for
-- the same org. This partial index enforces the one that actually matters.
CREATE UNIQUE INDEX "org_governance_rules_child_default_key"
  ON "org_governance_rules"("childOrgId")
  WHERE "actionType" IS NULL;

-- AddForeignKey
ALTER TABLE "org_governance_rules" ADD CONSTRAINT "org_governance_rules_childOrgId_fkey" FOREIGN KEY ("childOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
