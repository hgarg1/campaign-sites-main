-- Repair the ancestry closure table.
--
-- `insertAncestry` built its rows by composing "ancestors of the parent" with
-- "descendants of the child", but only ever created a self-link for the child.
-- A root organization is created with no parent, so the function was never
-- called for it and it had no self-link — which made "ancestors of the parent"
-- empty, made the cross product empty, and made the whole call a silent no-op.
--
-- Every organization created directly under a root therefore has no ancestry to
-- that root, and neither does anything beneath it. The consequences are all
-- silent and all fail-open in the direction that matters:
--
--   * getDescendantIds(root) returns nothing, so suspending or deactivating a
--     root cascades to no one.
--   * getEffectiveStatus sees no suspended ancestor, so a child of a suspended
--     party committee keeps operating.
--   * resolveNationalTenant cannot find the party committee, so governance
--     tie-breaking never engages.
--
-- The code fix stops new gaps appearing. This repairs the rows already missing.
--
-- Additive only: it inserts what is absent and never deletes or re-depths an
-- existing row. Ancestry carries edges from co-ownership as well as from
-- `parentId`, and rebuilding from `parentId` alone would silently drop them.

-- 1. Every organization is its own ancestor at depth 0. This is the row whose
--    absence caused the bug.
INSERT INTO "organization_ancestry" ("ancestorId", "descendantId", "depth")
SELECT o."id", o."id", 0
FROM "organizations" o
ON CONFLICT ("ancestorId", "descendantId") DO NOTHING;

-- 2. Transitive closure over the union of the two edge sources: declared
--    `parentId` links, and the depth-1 rows already in the closure (which is
--    where co-ownership edges live).
--
--    Depth is taken as the shortest path. The column holds one value per pair,
--    so a DAG with several routes between two orgs has no single "the" depth;
--    the minimum is deterministic and matches the "how far up" reading that
--    `resolveNationalTenant` and `getOrgDepth` both use.
--
--    The depth cap is a cycle guard. `wouldCreateCycle` is supposed to prevent
--    cycles, but a recursive CTE over a cyclic graph does not terminate, and a
--    migration is the wrong place to discover that a guard was bypassed.
WITH RECURSIVE edges AS (
  SELECT o."parentId" AS "ancestorId", o."id" AS "descendantId"
  FROM "organizations" o
  WHERE o."parentId" IS NOT NULL
  UNION
  SELECT a."ancestorId", a."descendantId"
  FROM "organization_ancestry" a
  WHERE a."depth" = 1
),
closure ("ancestorId", "descendantId", "depth") AS (
  SELECT e."ancestorId", e."descendantId", 1
  FROM edges e
  UNION ALL
  SELECT c."ancestorId", e."descendantId", c."depth" + 1
  FROM closure c
  JOIN edges e ON e."ancestorId" = c."descendantId"
  WHERE c."depth" < 32
    AND c."ancestorId" <> e."descendantId"
)
INSERT INTO "organization_ancestry" ("ancestorId", "descendantId", "depth")
SELECT "ancestorId", "descendantId", MIN("depth")
FROM closure
GROUP BY "ancestorId", "descendantId"
ON CONFLICT ("ancestorId", "descendantId") DO NOTHING;
