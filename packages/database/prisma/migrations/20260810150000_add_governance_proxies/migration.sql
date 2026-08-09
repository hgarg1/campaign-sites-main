-- Proxy voting: an organization may lend its vote to one named person.
--
-- The target is a User, never another organization. Delegating org-to-org
-- would merge two co-parents' voting power into a bloc, which is exactly the
-- concentration co-ownership is designed to prevent.

-- AlterTable
ALTER TABLE "governance_votes" ADD COLUMN     "castViaProxyId" TEXT;

-- CreateTable
CREATE TABLE "governance_proxies" (
    "id" TEXT NOT NULL,
    "principalOrgId" TEXT NOT NULL,
    "scopeChildOrgId" TEXT,
    "scopeActionType" "GovernanceActionType",
    "proxyUserId" TEXT NOT NULL,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "eligibilitySource" TEXT NOT NULL,
    "eligibilityOrgId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "governance_proxies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "governance_proxies_principalOrgId_proxyUserId_idx" ON "governance_proxies"("principalOrgId", "proxyUserId");
CREATE INDEX "governance_proxies_proxyUserId_idx" ON "governance_proxies"("proxyUserId");

-- At most one LIVE proxy per (principal, scope). Revoked and expired rows are
-- retained for audit, so this has to be a partial index — a plain unique
-- constraint would block re-granting after a revocation. COALESCE is needed
-- because PostgreSQL treats NULLs as distinct, and NULL scope means "all".
CREATE UNIQUE INDEX "governance_proxies_live_scope_key"
  ON "governance_proxies"
     ("principalOrgId", COALESCE("scopeChildOrgId", ''), COALESCE("scopeActionType"::text, ''))
  WHERE "revokedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "governance_proxies" ADD CONSTRAINT "governance_proxies_principalOrgId_fkey" FOREIGN KEY ("principalOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "governance_proxies" ADD CONSTRAINT "governance_proxies_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
