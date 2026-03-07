/**
 * Closure-table helpers for the Organization hierarchy.
 *
 * The `organization_ancestry` table stores every ancestor→descendant pair
 * including self-links (depth 0). This gives O(1) ancestor/descendant queries
 * without recursive CTEs.
 *
 * Invariant: whenever Organization.parentId changes, call removeAncestry +
 * insertAncestry to rebuild all affected rows.
 */

import { PrismaClient, OrganizationStatus } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AncestorNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: OrganizationStatus;
  depth: number;
}

export interface DescendantNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: OrganizationStatus;
  depth: number;
  parentId: string | null;
}

export interface OrgTreeNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: OrganizationStatus;
  effectiveStatus: OrganizationStatus;
  canCreateChildren: boolean;
  setupCompletedAt: Date | null;
  children: OrgTreeNode[];
}

// ─── Ancestry queries ─────────────────────────────────────────────────────────

/**
 * Returns all ancestors of orgId ordered from closest (depth 1) to furthest.
 * Does NOT include the org itself (depth 0 self-link is excluded).
 */
export async function getAncestors(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<AncestorNode[]> {
  const rows = await db.organizationAncestry.findMany({
    where: { descendantId: orgId, depth: { gt: 0 } },
    orderBy: { depth: 'asc' },
    include: {
      ancestor: {
        select: { id: true, name: true, slug: true, partyAffiliation: true, ownStatus: true },
      },
    },
  });

  return rows.map((r) => ({
    ...r.ancestor,
    depth: r.depth,
  }));
}

/**
 * Returns all descendants of orgId ordered from closest (depth 1) to furthest.
 * Does NOT include the org itself.
 */
export async function getDescendants(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<DescendantNode[]> {
  const rows = await db.organizationAncestry.findMany({
    where: { ancestorId: orgId, depth: { gt: 0 } },
    orderBy: { depth: 'asc' },
    include: {
      descendant: {
        select: {
          id: true,
          name: true,
          slug: true,
          partyAffiliation: true,
          ownStatus: true,
          parentId: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    ...r.descendant,
    depth: r.depth,
  }));
}

/**
 * Returns just the IDs of all descendants (useful for bulk operations).
 */
export async function getDescendantIds(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<string[]> {
  const rows = await db.organizationAncestry.findMany({
    where: { ancestorId: orgId, depth: { gt: 0 } },
    select: { descendantId: true },
  });
  return rows.map((r) => r.descendantId);
}

/**
 * Returns just the IDs of all ancestors (useful for permission checks).
 */
export async function getAncestorIds(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<string[]> {
  const rows = await db.organizationAncestry.findMany({
    where: { descendantId: orgId, depth: { gt: 0 } },
    select: { ancestorId: true },
  });
  return rows.map((r) => r.ancestorId);
}

/**
 * Checks whether candidateAncestorId is an ancestor of descendantId (any depth).
 */
export async function isAncestor(
  candidateAncestorId: string,
  descendantId: string,
  db: PrismaClient = defaultPrisma
): Promise<boolean> {
  const row = await db.organizationAncestry.findFirst({
    where: { ancestorId: candidateAncestorId, descendantId, depth: { gt: 0 } },
    select: { depth: true },
  });
  return row !== null;
}

// ─── Closure table maintenance ────────────────────────────────────────────────

/**
 * Inserts all ancestor→descendant rows for a newly parented child.
 *
 * Algorithm (standard closure-table insert):
 *   For every ancestor A of parentId (including parentId itself at depth 0),
 *   and every descendant D of childId (including childId itself at depth 0),
 *   insert (A, D, depthA + depthD + 1).
 *
 * Also inserts the child's self-link (depth 0) if it doesn't exist.
 */
export async function insertAncestry(
  childId: string,
  parentId: string,
  db: PrismaClient = defaultPrisma
): Promise<void> {
  // Ensure child self-link exists
  await db.organizationAncestry.upsert({
    where: { ancestorId_descendantId: { ancestorId: childId, descendantId: childId } },
    create: { ancestorId: childId, descendantId: childId, depth: 0 },
    update: {},
  });

  // Ancestors of parent (including parent itself, depth 0)
  const parentAndAncestors = await db.organizationAncestry.findMany({
    where: { descendantId: parentId },
  });

  // Descendants of child (including child itself, depth 0)
  const childAndDescendants = await db.organizationAncestry.findMany({
    where: { ancestorId: childId },
  });

  const rows = parentAndAncestors.flatMap((ancestor) =>
    childAndDescendants.map((descendant) => ({
      ancestorId: ancestor.ancestorId,
      descendantId: descendant.descendantId,
      depth: ancestor.depth + descendant.depth + 1,
    }))
  );

  // Upsert all at once (idempotent)
  await Promise.all(
    rows.map((row) =>
      db.organizationAncestry.upsert({
        where: {
          ancestorId_descendantId: {
            ancestorId: row.ancestorId,
            descendantId: row.descendantId,
          },
        },
        create: row,
        update: { depth: row.depth },
      })
    )
  );
}

/**
 * Removes all ancestry rows where orgId is the descendant (severs it from its
 * ancestors). Does NOT remove its self-link or its descendant rows, so the
 * subtree stays intact as a new root.
 *
 * Call this before insertAncestry when re-parenting an org.
 */
export async function removeAncestry(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<void> {
  await db.organizationAncestry.deleteMany({
    where: { descendantId: orgId, depth: { gt: 0 } },
  });

  // Also sever all descendant links that pass through orgId as an intermediate
  // (i.e., rows where ancestor is an ancestor of orgId and descendant is a
  // descendant of orgId — these cross the cut point)
  const ancestorIds = await getAncestorIds(orgId, db);
  if (ancestorIds.length > 0) {
    const descendantIds = await getDescendantIds(orgId, db);
    const allDescendantIds = [orgId, ...descendantIds];
    await db.organizationAncestry.deleteMany({
      where: {
        ancestorId: { in: ancestorIds },
        descendantId: { in: allDescendantIds },
      },
    });
  }
}

// ─── Effective status ─────────────────────────────────────────────────────────

/**
 * Returns the effective status for an org, walking up the ancestor chain.
 * If any ancestor is SUSPENDED or DEACTIVATED, that status is inherited.
 * DEACTIVATED takes precedence over SUSPENDED.
 *
 * Returns the org's own ownStatus if no ancestor overrides it.
 */
export async function getEffectiveStatus(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<OrganizationStatus> {
  // Fetch the org's own status
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { ownStatus: true },
  });
  if (!org) return 'ACTIVE';
  if (org.ownStatus === 'DEACTIVATED') return 'DEACTIVATED';

  // Check ancestors
  const ancestorRows = await db.organizationAncestry.findMany({
    where: { descendantId: orgId, depth: { gt: 0 } },
    include: { ancestor: { select: { ownStatus: true } } },
  });

  let worstStatus: OrganizationStatus = org.ownStatus;
  for (const row of ancestorRows) {
    const s = row.ancestor.ownStatus;
    if (s === 'DEACTIVATED') return 'DEACTIVATED'; // can't get worse
    if (s === 'SUSPENDED') worstStatus = 'SUSPENDED';
  }
  return worstStatus;
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

/**
 * Builds a nested tree from a flat list of DescendantNodes rooted at rootId.
 * Used for API responses that need a fully-nested JSON tree.
 */
export async function buildOrgTree(
  rootId: string,
  db: PrismaClient = defaultPrisma
): Promise<OrgTreeNode | null> {
  const root = await db.organization.findUnique({
    where: { id: rootId },
    select: {
      id: true,
      name: true,
      slug: true,
      partyAffiliation: true,
      ownStatus: true,
      canCreateChildren: true,
      setupCompletedAt: true,
    },
  });
  if (!root) return null;

  const descendants = await getDescendants(rootId, db);
  const effectiveRoot = await getEffectiveStatus(rootId, db);

  // Build map of id → node
  const nodeMap = new Map<string, OrgTreeNode>();
  nodeMap.set(rootId, {
    ...root,
    effectiveStatus: effectiveRoot,
    children: [],
  });

  for (const d of descendants) {
    const effectiveStatus = await getEffectiveStatus(d.id, db);
    nodeMap.set(d.id, {
      id: d.id,
      name: d.name,
      slug: d.slug,
      partyAffiliation: d.partyAffiliation,
      ownStatus: d.ownStatus,
      effectiveStatus,
      canCreateChildren: false, // populated below if needed
      setupCompletedAt: null,
      children: [],
    });
  }

  // Fetch canCreateChildren + setupCompletedAt for all descendant nodes
  if (descendants.length > 0) {
    const extraData = await db.organization.findMany({
      where: { id: { in: descendants.map((d) => d.id) } },
      select: { id: true, canCreateChildren: true, setupCompletedAt: true },
    });
    for (const extra of extraData) {
      const node = nodeMap.get(extra.id);
      if (node) {
        node.canCreateChildren = extra.canCreateChildren;
        node.setupCompletedAt = extra.setupCompletedAt;
      }
    }
  }

  // Wire up parent→child relationships
  for (const d of descendants) {
    if (d.parentId && nodeMap.has(d.parentId)) {
      nodeMap.get(d.parentId)!.children.push(nodeMap.get(d.id)!);
    }
  }

  return nodeMap.get(rootId)!;
}

/**
 * Validates that setting newParentId as the parent of childId would not
 * create a cycle (i.e., childId must not already be an ancestor of newParentId).
 */
export async function wouldCreateCycle(
  childId: string,
  newParentId: string,
  db: PrismaClient = defaultPrisma
): Promise<boolean> {
  if (childId === newParentId) return true;
  return isAncestor(childId, newParentId, db);
}

/**
 * Returns the depth of an org within the overall hierarchy (0 = root).
 */
export async function getOrgDepth(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<number> {
  const row = await db.organizationAncestry.findFirst({
    where: { descendantId: orgId, depth: { gt: 0 } },
    orderBy: { depth: 'desc' },
    select: { depth: true },
  });
  return row?.depth ?? 0;
}
