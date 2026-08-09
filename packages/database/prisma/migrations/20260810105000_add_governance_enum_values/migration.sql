-- New governance enum values ONLY. No DML in this file.
--
-- Prisma wraps each migration in a transaction, and PostgreSQL will not let a
-- newly added enum value be *used* in the same transaction that adds it. Any
-- statement referencing these values must therefore live in a later migration.

-- CreateEnum
CREATE TYPE "TallyBasis" AS ENUM ('HEADCOUNT', 'STAKE_WEIGHTED');

-- AlterEnum
ALTER TYPE "VotingMode" ADD VALUE IF NOT EXISTS 'SIMPLE_MAJORITY';
ALTER TYPE "VotingMode" ADD VALUE IF NOT EXISTS 'SUPERMAJORITY';
ALTER TYPE "VotingMode" ADD VALUE IF NOT EXISTS 'WEIGHTED';
ALTER TYPE "VotingMode" ADD VALUE IF NOT EXISTS 'DEAL_MAKER';

-- AlterEnum
ALTER TYPE "RejectMode" ADD VALUE IF NOT EXISTS 'WEIGHTED_VETO';
ALTER TYPE "RejectMode" ADD VALUE IF NOT EXISTS 'DERIVED';
ALTER TYPE "RejectMode" ADD VALUE IF NOT EXISTS 'NONE';

-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'PENDING_TIEBREAK';

-- AlterEnum
ALTER TYPE "GovernanceActionType" ADD VALUE IF NOT EXISTS 'SET_OWNERSHIP_STAKES';
ALTER TYPE "GovernanceActionType" ADD VALUE IF NOT EXISTS 'SET_GOVERNANCE_RULE';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TIEBREAK_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROPOSAL_TIEBROKEN';
