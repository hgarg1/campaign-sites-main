-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GovernanceActionType" ADD VALUE 'SET_CHILD_POLICY';
ALTER TYPE "GovernanceActionType" ADD VALUE 'REMOVE_CHILD_POLICY';

-- CreateTable
CREATE TABLE "org_inherited_policies" (
    "id" TEXT NOT NULL,
    "parentOrgId" TEXT NOT NULL,
    "targetOrgId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_inherited_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_inherited_policies_targetOrgId_idx" ON "org_inherited_policies"("targetOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_inherited_policies_parentOrgId_targetOrgId_key" ON "org_inherited_policies"("parentOrgId", "targetOrgId");

-- AddForeignKey
ALTER TABLE "org_inherited_policies" ADD CONSTRAINT "org_inherited_policies_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_inherited_policies" ADD CONSTRAINT "org_inherited_policies_targetOrgId_fkey" FOREIGN KEY ("targetOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
