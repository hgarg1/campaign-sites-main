-- Ownership voting weight + the frozen electorate for a proposal.
--
-- No backfill, deliberately. `stakeBps` defaults to 0 for every existing edge,
-- and the evaluator treats "every eligible owner has stake 0" as one-org-one-
-- vote. So behaviour after this migration is identical to before it, and stakes
-- only start mattering once someone explicitly allocates them.
--
-- Adding a column with a non-volatile DEFAULT does not rewrite the table on
-- PostgreSQL 11+.

-- AlterTable
ALTER TABLE "organization_ownerships" ADD COLUMN     "stakeBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "organization_ownerships" ADD COLUMN     "stakeUpdatedAt" TIMESTAMP(3);
ALTER TABLE "organization_ownerships" ADD COLUMN     "stakeUpdatedByUserId" TEXT;

ALTER TABLE "organization_ownerships"
  ADD CONSTRAINT "organization_ownerships_stakebps_range"
  CHECK ("stakeBps" >= 0 AND "stakeBps" <= 10000);

-- CreateTable
CREATE TABLE "ownership_stake_changes" (
    "id" TEXT NOT NULL,
    "parentOrgId" TEXT NOT NULL,
    "childOrgId" TEXT NOT NULL,
    "fromStakeBps" INTEGER,
    "toStakeBps" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "proposalId" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_stake_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ownership_stake_changes_childOrgId_changedAt_idx" ON "ownership_stake_changes"("childOrgId", "changedAt");
CREATE INDEX "ownership_stake_changes_parentOrgId_childOrgId_idx" ON "ownership_stake_changes"("parentOrgId", "childOrgId");

-- AlterTable: marks a proposal whose electorate has been frozen. NULL means the
-- proposal predates weighted voting and must be evaluated against live owners.
ALTER TABLE "governance_proposals" ADD COLUMN     "electorateSnapshotAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "governance_proposal_voters" (
    "proposalId" TEXT NOT NULL,
    "voterOrgId" TEXT NOT NULL,
    "stakeBps" INTEGER NOT NULL DEFAULT 0,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnReason" TEXT,

    CONSTRAINT "governance_proposal_voters_pkey" PRIMARY KEY ("proposalId","voterOrgId")
);

-- CreateIndex
CREATE INDEX "governance_proposal_voters_voterOrgId_idx" ON "governance_proposal_voters"("voterOrgId");

-- AddForeignKey
ALTER TABLE "governance_proposal_voters" ADD CONSTRAINT "governance_proposal_voters_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "governance_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "governance_proposal_voters" ADD CONSTRAINT "governance_proposal_voters_voterOrgId_fkey" FOREIGN KEY ("voterOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
