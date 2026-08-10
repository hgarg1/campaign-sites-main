-- Proxy voting: an organization may lend its vote to one named person.
--
-- The target is a User, never another organization. Delegating org-to-org
-- would merge two co-parents' voting power into a bloc, which is exactly the
-- concentration co-ownership is designed to prevent.

-- Every statement is guarded. The first attempt at this migration failed
-- part-way through (see the index note below); Prisma wraps a migration in a
-- transaction so it rolled back, but making re-application safe costs nothing
-- and removes the need to reason about how far it got.

-- AlterTable
ALTER TABLE "governance_votes" ADD COLUMN IF NOT EXISTS "castViaProxyId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "governance_proxies" (
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
CREATE INDEX IF NOT EXISTS "governance_proxies_principalOrgId_proxyUserId_idx" ON "governance_proxies"("principalOrgId", "proxyUserId");
CREATE INDEX IF NOT EXISTS "governance_proxies_proxyUserId_idx" ON "governance_proxies"("proxyUserId");

-- At most one LIVE proxy per (principal, scope).
--
-- Revoked and expired rows are retained for audit, so this has to be partial —
-- a plain unique constraint would block re-granting after a revocation.
--
-- Four indexes rather than one over
-- `COALESCE("scopeChildOrgId",''), COALESCE("scopeActionType"::text,'')`,
-- because PostgreSQL rejects that: casting an enum to text is STABLE, not
-- IMMUTABLE — `ALTER TYPE ... RENAME VALUE` can change the result — and index
-- expressions must be immutable. It failed in production with 42P17.
--
-- `NULLS NOT DISTINCT` would express this in one index, but it needs PostgreSQL
-- 15+. Enumerating the four NULL combinations explicitly works on every version
-- and needs no assumption about the deployed server.
--
-- NULL means "all" in both scope columns, so the four cases are: fully
-- specified, all-children, all-actions, and everything.
CREATE UNIQUE INDEX IF NOT EXISTS "governance_proxies_live_scope_both_key"
  ON "governance_proxies" ("principalOrgId", "scopeChildOrgId", "scopeActionType")
  WHERE "revokedAt" IS NULL
    AND "scopeChildOrgId" IS NOT NULL
    AND "scopeActionType" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "governance_proxies_live_scope_action_key"
  ON "governance_proxies" ("principalOrgId", "scopeActionType")
  WHERE "revokedAt" IS NULL
    AND "scopeChildOrgId" IS NULL
    AND "scopeActionType" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "governance_proxies_live_scope_child_key"
  ON "governance_proxies" ("principalOrgId", "scopeChildOrgId")
  WHERE "revokedAt" IS NULL
    AND "scopeChildOrgId" IS NOT NULL
    AND "scopeActionType" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "governance_proxies_live_scope_all_key"
  ON "governance_proxies" ("principalOrgId")
  WHERE "revokedAt" IS NULL
    AND "scopeChildOrgId" IS NULL
    AND "scopeActionType" IS NULL;

-- AddForeignKey
--
-- Plain ADD CONSTRAINT, not a DO block guarding against duplicate_object.
-- Prisma runs a migration inside a transaction, so the failed first attempt left
-- nothing behind and these cannot already exist. A DO block would also mean
-- shipping dollar-quoted SQL through Prisma's statement splitter, which is not a
-- risk worth taking on the retry of a migration that has already failed once.
ALTER TABLE "governance_proxies" ADD CONSTRAINT "governance_proxies_principalOrgId_fkey"
  FOREIGN KEY ("principalOrgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "governance_proxies" ADD CONSTRAINT "governance_proxies_proxyUserId_fkey"
  FOREIGN KEY ("proxyUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
