/**
 * Resolving an organization's national (master) tenant.
 *
 * Used to find who casts the deciding vote when co-owners deadlock. The awkward
 * part is that `Organization.partyAffiliation` is NULL for every org created
 * through the hierarchy flow — only master tenants and orgs that completed the
 * setup modal have one, and it is not inherited by children. So structure is a
 * more trustworthy signal than the org's own party field, and is tried first.
 */

import { PrismaClient, PartyAffiliation } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/database';

export type NationalTenantSource =
  | 'SELF_MAPPING'
  | 'ANCESTOR_MAPPING'
  | 'SELF_AFFILIATION'
  | 'ANCESTOR_AFFILIATION'
  | 'NONE';

export interface NationalTenantResolution {
  orgId: string | null;
  partyAffiliation: PartyAffiliation | null;
  source: NationalTenantSource;
  /** The org the answer was derived from (the org itself, or an ancestor). */
  resolvedFromOrgId: string | null;
  /**
   * True when two different party trees claim this org at the same distance.
   * Treated as unresolvable rather than arbitrated — picking one would be this
   * system deciding which party an organization belongs to.
   */
  ambiguous: boolean;
}

const UNRESOLVED: NationalTenantResolution = {
  orgId: null,
  partyAffiliation: null,
  source: 'NONE',
  resolvedFromOrgId: null,
  ambiguous: false,
};

/**
 * Finds the national tenant for an org.
 *
 * Order:
 *   1. the org is itself a master tenant
 *   2. the furthest ancestor that is a master tenant — furthest, because the
 *      national body sits at the root
 *   3. party affiliation, own then inherited from the furthest ancestor that
 *      declares one
 *
 * Callers should resolve this at proposal *creation* and store the result.
 * Resolving lazily would let a proposal that re-parents an org move its own
 * casting vote.
 */
export async function resolveNationalTenant(
  orgId: string,
  db: PrismaClient = defaultPrisma
): Promise<NationalTenantResolution> {
  // 1. The org is itself a master tenant.
  const self = await db.masterTenantMapping.findUnique({
    where: { organizationId: orgId },
  });
  if (self) {
    return {
      orgId,
      partyAffiliation: self.partyAffiliation,
      source: 'SELF_MAPPING',
      resolvedFromOrgId: orgId,
      ambiguous: false,
    };
  }

  // 2. Ancestors, furthest first. Multi-parent ownership makes the closure a
  //    DAG rather than a tree, so several ancestors can share a depth.
  const ancestorRows = await db.organizationAncestry.findMany({
    where: { descendantId: orgId, depth: { gt: 0 } },
    select: { ancestorId: true, depth: true },
    orderBy: [{ depth: 'desc' }, { ancestorId: 'asc' }],
  });

  if (ancestorRows.length > 0) {
    const mappings = await db.masterTenantMapping.findMany({
      where: { organizationId: { in: ancestorRows.map((r) => r.ancestorId) } },
    });

    if (mappings.length > 0) {
      const mappedByOrg = new Map(mappings.map((m) => [m.organizationId, m]));
      const mappedAncestors = ancestorRows.filter((r) => mappedByOrg.has(r.ancestorId));
      // Compute the maximum rather than trusting the query's ordering. Choosing
      // the wrong ancestor here hands the deciding vote to the wrong
      // organization, which is not a failure worth leaving to an ORDER BY.
      const furthestDepth = Math.max(...mappedAncestors.map((r) => r.depth));
      const atFurthest = mappedAncestors.filter((r) => r.depth === furthestDepth);

      if (atFurthest.length > 1) {
        // Two party trees at the same distance. Refuse rather than choose.
        return { ...UNRESOLVED, ambiguous: true };
      }

      const winner = atFurthest[0];
      const mapping = mappedByOrg.get(winner.ancestorId)!;
      return {
        orgId: mapping.organizationId,
        partyAffiliation: mapping.partyAffiliation,
        source: 'ANCESTOR_MAPPING',
        resolvedFromOrgId: winner.ancestorId,
        ambiguous: false,
      };
    }
  }

  // 3. Fall back to declared party affiliation, own first.
  const selfOrg = await db.organization.findUnique({
    where: { id: orgId },
    select: { partyAffiliation: true },
  });

  let affiliation = selfOrg?.partyAffiliation ?? null;
  let fromOrgId = affiliation ? orgId : null;
  let source: NationalTenantSource = affiliation ? 'SELF_AFFILIATION' : 'NONE';

  if (!affiliation && ancestorRows.length > 0) {
    const ancestorOrgs = await db.organization.findMany({
      where: {
        id: { in: ancestorRows.map((r) => r.ancestorId) },
        partyAffiliation: { not: null },
      },
      select: { id: true, partyAffiliation: true },
    });

    if (ancestorOrgs.length > 0) {
      const byId = new Map(ancestorOrgs.map((o) => [o.id, o]));
      const declaringRows = ancestorRows.filter((r) => byId.has(r.ancestorId));
      // Again by explicit maximum, not by query order.
      const furthestDepth = Math.max(...declaringRows.map((r) => r.depth));
      const declaring = declaringRows.filter((r) => r.depth === furthestDepth);

      const parties = new Set(declaring.map((r) => byId.get(r.ancestorId)!.partyAffiliation));
      if (parties.size > 1) {
        return { ...UNRESOLVED, ambiguous: true };
      }

      affiliation = byId.get(declaring[0].ancestorId)!.partyAffiliation;
      fromOrgId = declaring[0].ancestorId;
      source = 'ANCESTOR_AFFILIATION';
    }
  }

  if (!affiliation) return UNRESOLVED;

  const mapping = await db.masterTenantMapping.findUnique({
    where: { partyAffiliation: affiliation },
  });
  if (!mapping) return UNRESOLVED;

  return {
    orgId: mapping.organizationId,
    partyAffiliation: affiliation,
    source,
    resolvedFromOrgId: fromOrgId,
    ambiguous: false,
  };
}

/**
 * Whether an org can serve as tie-breaker for a proposal about `childOrgId`.
 *
 * An org cannot adjudicate a dispute about itself, which is the concentration
 * of power the whole co-ownership model exists to prevent.
 */
export function canTieBreak(
  resolution: NationalTenantResolution,
  childOrgId: string
): { eligible: boolean; reason?: string } {
  if (resolution.ambiguous) {
    return {
      eligible: false,
      reason:
        'This organization sits under more than one party tree, so it has no single national tenant',
    };
  }
  if (!resolution.orgId) {
    return {
      eligible: false,
      reason: 'No national tenant could be resolved for this organization',
    };
  }
  if (resolution.orgId === childOrgId) {
    return {
      eligible: false,
      reason:
        'The national tenant is the organization being governed, and cannot adjudicate its own proposal',
    };
  }
  return { eligible: true };
}
