-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "GovernanceActionType" AS ENUM ('SUSPEND', 'REACTIVATE', 'DEACTIVATE', 'UPDATE_SETTINGS', 'UPDATE_BRANDING', 'UPDATE_INTEGRATIONS', 'UPDATE_RBAC', 'ADD_PARENT', 'REMOVE_PARENT', 'ADD_CHILD');

-- CreateEnum
CREATE TYPE "VotingMode" AS ENUM ('UNANIMOUS', 'QUORUM');

-- CreateEnum
CREATE TYPE "RejectMode" AS ENUM ('SINGLE_VETO', 'MAJORITY_VETO');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING_VOTES', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoteDecision" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VOTE_REQUESTED', 'VOTE_CAST', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED', 'PROPOSAL_EXPIRED', 'PROPOSAL_CANCELLED');

-- CreateTable
CREATE TABLE "organization_ownerships" (
    "parentOrgId" TEXT NOT NULL,
    "childOrgId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "OwnershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedByUserId" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedByUserId" TEXT,

    CONSTRAINT "organization_ownerships_pkey" PRIMARY KEY ("parentOrgId","childOrgId")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "governance_rule_sets" (
    "id" TEXT NOT NULL,
    "actionType" "GovernanceActionType" NOT NULL,
    "votingMode" "VotingMode" NOT NULL DEFAULT 'UNANIMOUS',
    "quorumPercent" INTEGER,
    "rejectMode" "RejectMode" NOT NULL DEFAULT 'SINGLE_VETO',
    "ttlDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_proposals" (
    "id" TEXT NOT NULL,
    "childOrgId" TEXT NOT NULL,
    "initiatorOrgId" TEXT NOT NULL,
    "initiatorUserId" TEXT NOT NULL,
    "actionType" "GovernanceActionType" NOT NULL,
    "actionPayload" JSONB NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING_VOTES',
    "votingMode" "VotingMode" NOT NULL,
    "quorumPercent" INTEGER,
    "rejectMode" "RejectMode" NOT NULL,
    "requiredVoterCount" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedReason" TEXT,

    CONSTRAINT "governance_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_votes" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterOrgId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "decision" "VoteDecision" NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_notifications" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "recipientOrgId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_ownerships_childOrgId_idx" ON "organization_ownerships"("childOrgId");

-- CreateIndex
CREATE INDEX "organization_ownerships_parentOrgId_idx" ON "organization_ownerships"("parentOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "governance_rule_sets_actionType_key" ON "governance_rule_sets"("actionType");

-- CreateIndex
CREATE INDEX "governance_proposals_childOrgId_idx" ON "governance_proposals"("childOrgId");

-- CreateIndex
CREATE INDEX "governance_proposals_initiatorOrgId_idx" ON "governance_proposals"("initiatorOrgId");

-- CreateIndex
CREATE INDEX "governance_proposals_status_idx" ON "governance_proposals"("status");

-- CreateIndex
CREATE INDEX "governance_votes_voterOrgId_idx" ON "governance_votes"("voterOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "governance_votes_proposalId_voterOrgId_key" ON "governance_votes"("proposalId", "voterOrgId");

-- CreateIndex
CREATE INDEX "governance_notifications_recipientOrgId_readAt_idx" ON "governance_notifications"("recipientOrgId", "readAt");

-- CreateIndex
CREATE INDEX "governance_notifications_proposalId_idx" ON "governance_notifications"("proposalId");

-- AddForeignKey
ALTER TABLE "organization_ownerships" ADD CONSTRAINT "organization_ownerships_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_ownerships" ADD CONSTRAINT "organization_ownerships_childOrgId_fkey" FOREIGN KEY ("childOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_proposals" ADD CONSTRAINT "governance_proposals_childOrgId_fkey" FOREIGN KEY ("childOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_proposals" ADD CONSTRAINT "governance_proposals_initiatorOrgId_fkey" FOREIGN KEY ("initiatorOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_votes" ADD CONSTRAINT "governance_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "governance_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_votes" ADD CONSTRAINT "governance_votes_voterOrgId_fkey" FOREIGN KEY ("voterOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_notifications" ADD CONSTRAINT "governance_notifications_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "governance_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_notifications" ADD CONSTRAINT "governance_notifications_recipientOrgId_fkey" FOREIGN KEY ("recipientOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
