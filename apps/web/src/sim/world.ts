/**
 * World construction for the governance simulation.
 *
 * Builds real rows — organizations, users, memberships, co-ownership edges,
 * the ancestry closure table, master-tenant mappings, rule sets — so that every
 * lookup the engine performs resolves against data shaped the way production
 * data is shaped. In particular the closure table is populated through the same
 * `insertAncestry` the application uses, because the national-tenant resolver
 * reads it and a hand-written closure would let the resolver pass on data the
 * app could never produce.
 */

import type { PrismaClient } from '@prisma/client';
import { insertAncestry } from '@/lib/ancestry';

type Party =
  | 'REPUBLICAN'
  | 'DEMOCRAT'
  | 'LIBERTARIAN'
  | 'GREEN'
  | 'INDEPENDENT'
  | 'NONPARTISAN'
  | 'OTHER';

export interface OrgSpec {
  key: string;
  name?: string;
  /** Structural parent — distinct from co-ownership, and what ancestry follows. */
  parent?: string;
  party?: Party;
  status?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  /** Registers this org as the master tenant for `party`, making it a tie-breaker. */
  masterFor?: Party;
}

export interface OwnerSpec {
  parent: string;
  child: string;
  stakeBps?: number;
  isPrimary?: boolean;
  status?: 'ACTIVE' | 'REMOVED';
}

export interface UserSpec {
  key: string;
  /** Memberships as `orgKey:ROLE`, e.g. `national:OWNER`. */
  memberships?: string[];
  global?: boolean;
}

export interface World {
  org: Record<string, string>;
  user: Record<string, string>;
}

let counter = 0;
/** Deterministic, collision-free identifiers so failures are reproducible. */
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function resetCounter(): void {
  counter = 0;
}

export async function buildWorld(
  prisma: PrismaClient,
  spec: { orgs: OrgSpec[]; owners?: OwnerSpec[]; users?: UserSpec[] }
): Promise<World> {
  const org: Record<string, string> = {};
  const user: Record<string, string> = {};

  // Organizations first, in declaration order, so `parent` always refers to
  // something already created. Declaration order is the caller's contract.
  for (const o of spec.orgs) {
    const created = await prisma.organization.create({
      data: {
        name: o.name ?? o.key,
        slug: uniq(o.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
        parentId: o.parent ? org[o.parent] : null,
        partyAffiliation: o.party ?? null,
        ownStatus: o.status ?? 'ACTIVE',
        suspendedAt: o.status === 'SUSPENDED' ? new Date() : null,
        canCreateChildren: true,
      },
    });
    org[o.key] = created.id;

    // Through the application's own closure-table writer, not by hand.
    if (o.parent) await insertAncestry(created.id, org[o.parent]);

    if (o.masterFor) {
      await prisma.masterTenantMapping.create({
        data: { partyAffiliation: o.masterFor, organizationId: created.id },
      });
    }
  }

  for (const u of spec.users ?? []) {
    const created = await prisma.user.create({
      data: {
        email: `${uniq(u.key)}@sim.local`,
        passwordHash: 'sim-not-a-real-hash',
        name: u.key,
        role: u.global ? 'GLOBAL_ADMIN' : 'USER',
      },
    });
    user[u.key] = created.id;

    for (const m of u.memberships ?? []) {
      const [orgKey, role] = m.split(':');
      if (!org[orgKey]) throw new Error(`Unknown org "${orgKey}" in membership for ${u.key}`);
      await prisma.organizationMember.create({
        data: {
          organizationId: org[orgKey],
          userId: created.id,
          role: (role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? 'MEMBER',
        },
      });
    }
  }

  for (const o of spec.owners ?? []) {
    await prisma.organizationOwnership.create({
      data: {
        parentOrgId: org[o.parent],
        childOrgId: org[o.child],
        stakeBps: o.stakeBps ?? 0,
        isPrimary: o.isPrimary ?? false,
        status: o.status ?? 'ACTIVE',
        removedAt: o.status === 'REMOVED' ? new Date() : null,
      },
    });
  }

  return { org, user };
}

/**
 * Governance rules.
 *
 * `createProposal` resolves per-child rules before global ones, so scenarios
 * that need a specific policy set it here rather than relying on seed data —
 * which the simulation deliberately does not load, so that nothing depends on
 * seed drift.
 */
export interface PolicySpec {
  votingMode?:
    | 'UNANIMOUS'
    | 'QUORUM'
    | 'SIMPLE_MAJORITY'
    | 'SUPERMAJORITY'
    | 'WEIGHTED'
    | 'DEAL_MAKER';
  rejectMode?: 'SINGLE_VETO' | 'MAJORITY_VETO' | 'WEIGHTED_VETO' | 'DERIVED' | 'NONE';
  tallyBasis?: 'HEADCOUNT' | 'STAKE_WEIGHTED';
  approveNum?: number;
  approveDen?: number;
  approveInclusive?: boolean;
  vetoNum?: number | null;
  vetoDen?: number | null;
  vetoInclusive?: boolean;
  quorumNum?: number;
  quorumDen?: number;
  tieBreakEnabled?: boolean;
  dealMakerMinStakeBps?: number;
  ttlDays?: number;
}

const POLICY_DEFAULTS: Required<Omit<PolicySpec, 'vetoNum' | 'vetoDen'>> & {
  vetoNum: number | null;
  vetoDen: number | null;
} = {
  votingMode: 'UNANIMOUS',
  rejectMode: 'SINGLE_VETO',
  tallyBasis: 'HEADCOUNT',
  approveNum: 1,
  approveDen: 1,
  approveInclusive: true,
  vetoNum: null,
  vetoDen: null,
  vetoInclusive: true,
  quorumNum: 0,
  quorumDen: 1,
  tieBreakEnabled: false,
  dealMakerMinStakeBps: 0,
  ttlDays: 7,
};

/** A per-child rule, which outranks the global rule set for that org. */
export async function setOrgRule(
  prisma: PrismaClient,
  childOrgId: string,
  policy: PolicySpec,
  actionType: string | null = null
): Promise<void> {
  const data = { ...POLICY_DEFAULTS, ...policy };
  // The compound unique has a nullable member, which Prisma cannot express in
  // `upsert` — find-then-write, exactly as the application does.
  const existing = await prisma.orgGovernanceRule.findFirst({
    where: { childOrgId, actionType: actionType as never },
  });
  if (existing) {
    await prisma.orgGovernanceRule.update({ where: { id: existing.id }, data: data as never });
  } else {
    await prisma.orgGovernanceRule.create({
      data: { childOrgId, actionType: actionType as never, ...data } as never,
    });
  }
}

/** The platform-wide rule for an action type. */
export async function setGlobalRule(
  prisma: PrismaClient,
  actionType: string,
  policy: PolicySpec
): Promise<void> {
  const data = { ...POLICY_DEFAULTS, ...policy };
  await prisma.governanceRuleSet.upsert({
    where: { actionType: actionType as never },
    create: { actionType: actionType as never, ...data } as never,
    update: data as never,
  });
}

export async function setConfig(
  prisma: PrismaClient,
  key: string,
  value: unknown
): Promise<void> {
  // Stored as JSON strings to match the admin PATCH path.
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) as never },
    update: { value: JSON.stringify(value) as never },
  });
}
