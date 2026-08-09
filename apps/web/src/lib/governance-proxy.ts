/**
 * Proxy voting.
 *
 * An organization may lend its vote to **one named person**, never to another
 * organization. Org-to-org delegation would let two co-parents' voting power
 * merge into a single bloc, which is the concentration that co-ownership exists
 * to prevent. A proxy moves only *who may press the button*: the resulting
 * ballot is still attributed to the principal organization, carries the
 * principal's stake, and the electorate is unchanged.
 */

import { GovernanceActionType, MemberRole, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/database';
import { getAncestorIds, getDescendantIds } from '@/lib/ancestry';
import { getSystemConfigValue } from '@/lib/system-config';

/** Roles that qualify a person to hold, or be granted, a proxy. */
const QUALIFYING_ROLES: MemberRole[] = ['ADMIN', 'OWNER'];

export interface ProxyEligibility {
  eligible: boolean;
  /** Which org the holder qualified through, for the audit trail. */
  orgId?: string;
  role?: MemberRole;
  reason?: string;
}

/**
 * The organizations a proxy holder may be drawn from.
 *
 * Deliberately excludes co-owner subtrees that are neither ancestors nor
 * descendants of the principal: an admin of co-parent B holding co-parent A's
 * proxy is delegation to another tenant with extra steps.
 */
export async function eligibleOrgIds(
  principalOrgId: string,
  scopeChildOrgId: string | null,
  db: PrismaClient = defaultPrisma
): Promise<string[]> {
  const [ancestors, descendants] = await Promise.all([
    getAncestorIds(principalOrgId, db),
    getDescendantIds(principalOrgId, db),
  ]);

  const ids = new Set<string>([principalOrgId, ...ancestors, ...descendants]);

  if (scopeChildOrgId) {
    ids.add(scopeChildOrgId);
    for (const id of await getDescendantIds(scopeChildOrgId, db)) ids.add(id);
  }

  return Array.from(ids);
}

/**
 * Whether a user may hold a proxy for this principal.
 *
 * Checked when granting for fast feedback, and again at cast time because
 * membership and structure both drift.
 */
export async function checkProxyEligibility(
  params: { principalOrgId: string; scopeChildOrgId: string | null; proxyUserId: string },
  db: PrismaClient = defaultPrisma
): Promise<ProxyEligibility> {
  const { principalOrgId, scopeChildOrgId, proxyUserId } = params;

  const user = await db.user.findUnique({
    where: { id: proxyUserId },
    select: { id: true, deletedAt: true, suspendedAt: true },
  });
  if (!user || user.deletedAt) {
    return { eligible: false, reason: 'That user account does not exist' };
  }
  if (user.suspendedAt) {
    return { eligible: false, reason: 'That user account is suspended' };
  }

  const orgIds = await eligibleOrgIds(principalOrgId, scopeChildOrgId, db);

  const membership = await db.organizationMember.findFirst({
    where: {
      userId: proxyUserId,
      organizationId: { in: orgIds },
      role: { in: QUALIFYING_ROLES },
    },
    select: { organizationId: true, role: true },
  });

  if (!membership) {
    return {
      eligible: false,
      reason:
        'A proxy may only be held by an admin or owner within this organization’s own structure — its ancestors, its descendants, or the child being governed',
    };
  }

  return { eligible: true, orgId: membership.organizationId, role: membership.role };
}

// ─── Grant / revoke ───────────────────────────────────────────────────────────

export async function grantProxy(params: {
  principalOrgId: string;
  proxyUserId: string;
  grantedByUserId: string;
  expiresAt: Date;
  scopeChildOrgId?: string | null;
  scopeActionType?: GovernanceActionType | null;
  exclusive?: boolean;
  note?: string;
}) {
  const {
    principalOrgId,
    proxyUserId,
    grantedByUserId,
    expiresAt,
    scopeChildOrgId = null,
    scopeActionType = null,
    exclusive = false,
    note,
  } = params;

  if (proxyUserId === grantedByUserId) {
    throw new Error('Granting a proxy to yourself has no effect');
  }

  const maxDays = await getSystemConfigValue('maxProxyDays', 30);
  const ceiling = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);
  if (expiresAt > ceiling) {
    throw new Error(`A proxy may not last longer than ${maxDays} days`);
  }
  if (expiresAt <= new Date()) {
    throw new Error('A proxy must expire in the future');
  }

  const eligibility = await checkProxyEligibility({
    principalOrgId,
    scopeChildOrgId,
    proxyUserId,
  });
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? 'That user may not hold this proxy');
  }

  // One live proxy per scope. The partial unique index enforces this too; the
  // explicit check exists to produce a readable error rather than a P2002.
  const existing = await defaultPrisma.governanceProxy.findFirst({
    where: { principalOrgId, scopeChildOrgId, scopeActionType, revokedAt: null },
  });
  if (existing) {
    throw new Error('A proxy is already active for this scope — revoke it first');
  }

  return defaultPrisma.governanceProxy.create({
    data: {
      principalOrgId,
      scopeChildOrgId,
      scopeActionType,
      proxyUserId,
      exclusive,
      grantedByUserId,
      expiresAt,
      note,
      eligibilitySource: eligibility.role ?? 'UNKNOWN',
      eligibilityOrgId: eligibility.orgId ?? principalOrgId,
    },
  });
}

/**
 * Revocation is prospective. A ballot already cast under this proxy stands —
 * retracting a vote would mean un-executing an action that may already have
 * taken effect.
 */
export async function revokeProxy(proxyId: string, revokedByUserId: string) {
  return defaultPrisma.governanceProxy.updateMany({
    where: { id: proxyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedByUserId },
  });
}

// ─── Cast-time resolution ─────────────────────────────────────────────────────

/**
 * Finds a live proxy letting `actingUserId` cast for `principalOrgId`, and
 * re-verifies it. Returns null when no valid proxy applies.
 *
 * Everything is re-checked here rather than trusted from grant time: people
 * leave organizations, accounts get suspended, and the hierarchy moves.
 */
export async function resolveProxyForVote(params: {
  principalOrgId: string;
  childOrgId: string;
  actionType: GovernanceActionType;
  actingUserId: string;
}): Promise<{ proxyId: string } | null> {
  const { principalOrgId, childOrgId, actionType, actingUserId } = params;

  const candidates = await defaultPrisma.governanceProxy.findMany({
    where: {
      principalOrgId,
      proxyUserId: actingUserId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      OR: [{ scopeChildOrgId: null }, { scopeChildOrgId: childOrgId }],
      AND: [{ OR: [{ scopeActionType: null }, { scopeActionType: actionType }] }],
    },
    orderBy: [{ scopeChildOrgId: 'desc' }, { scopeActionType: 'desc' }],
  });

  for (const proxy of candidates) {
    const eligibility = await checkProxyEligibility({
      principalOrgId,
      scopeChildOrgId: proxy.scopeChildOrgId,
      proxyUserId: actingUserId,
    });
    if (eligibility.eligible) return { proxyId: proxy.id };
  }

  return null;
}

/**
 * Refuses a ballot that would let one person control more than one
 * organization's vote on the same proposal.
 *
 * This closes a hole that predates proxies entirely: because org authority is
 * inherited down the hierarchy, an admin of a grandparent org sitting above two
 * co-parents can already cast both their votes today.
 */
export async function assertNoVoteConcentration(params: {
  proposalId: string;
  userId: string;
}): Promise<void> {
  const cap = await getSystemConfigValue('maxVotesPerUserPerProposal', 1);

  const existing = await defaultPrisma.governanceVote.findMany({
    where: { proposalId: params.proposalId, voterUserId: params.userId },
    select: { voterOrgId: true },
  });

  if (existing.length >= cap) {
    const orgs = await defaultPrisma.organization.findMany({
      where: { id: { in: existing.map((v) => v.voterOrgId) } },
      select: { name: true },
    });
    const names = orgs.map((o) => o.name).join(', ');
    throw new Error(
      `You have already voted on this proposal on behalf of ${names}. One person may cast for at most ${cap} organization${cap === 1 ? '' : 's'} per proposal.`
    );
  }
}

// ─── Disclosure ───────────────────────────────────────────────────────────────

export interface ConcentrationEntry {
  userId: string;
  userName: string | null;
  userEmail: string;
  controlledOrgIds: string[];
  controlledStakeBps: number;
  /** Integer percent of the electorate's weight, by cross-multiplication. */
  sharePercent: number;
  viaProxyOrgIds: string[];
}

/**
 * Who could, in principle, cast for more than one organization on this proposal.
 *
 * Complements the hard cap with disclosure: the cap stops one person voting
 * twice, but co-owners should still be able to see when a single individual is
 * positioned to speak for a large share of the electorate.
 */
export async function getVoteConcentration(proposalId: string): Promise<ConcentrationEntry[]> {
  const proposal = await defaultPrisma.governanceProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, childOrgId: true, actionType: true },
  });
  if (!proposal) return [];

  const voters = await defaultPrisma.governanceProposalVoter.findMany({
    where: { proposalId, withdrawnAt: null },
    select: { voterOrgId: true, stakeBps: true },
  });
  if (voters.length === 0) return [];

  const totalStake = voters.reduce((sum, v) => sum + v.stakeBps, 0);
  // Mirrors the tally's fallback: with no stakes allocated every org weighs 1.
  const weightOf = (stakeBps: number) => (totalStake > 0 ? stakeBps : 1);
  const totalWeight = voters.reduce((sum, v) => sum + weightOf(v.stakeBps), 0);

  const byUser = new Map<string, { orgIds: Set<string>; viaProxy: Set<string>; weight: number }>();
  const add = (userId: string, orgId: string, weight: number, viaProxy: boolean) => {
    const entry = byUser.get(userId) ?? { orgIds: new Set(), viaProxy: new Set(), weight: 0 };
    if (!entry.orgIds.has(orgId)) {
      entry.orgIds.add(orgId);
      entry.weight += weight;
    }
    if (viaProxy) entry.viaProxy.add(orgId);
    byUser.set(userId, entry);
  };

  for (const voter of voters) {
    const weight = weightOf(voter.stakeBps);

    // Direct authority, including that inherited from an ancestor org.
    const reachableOrgIds = [voter.voterOrgId, ...(await getAncestorIds(voter.voterOrgId))];
    const members = await defaultPrisma.organizationMember.findMany({
      where: { organizationId: { in: reachableOrgIds }, role: { in: QUALIFYING_ROLES } },
      select: { userId: true },
    });
    for (const m of members) add(m.userId, voter.voterOrgId, weight, false);

    // Authority lent by a live proxy.
    const proxies = await defaultPrisma.governanceProxy.findMany({
      where: {
        principalOrgId: voter.voterOrgId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ scopeChildOrgId: null }, { scopeChildOrgId: proposal.childOrgId }],
        AND: [{ OR: [{ scopeActionType: null }, { scopeActionType: proposal.actionType }] }],
      },
      select: { proxyUserId: true },
    });
    for (const p of proxies) add(p.proxyUserId, voter.voterOrgId, weight, true);
  }

  const multi = Array.from(byUser.entries()).filter(([, e]) => e.orgIds.size > 1);
  if (multi.length === 0) return [];

  const users = await defaultPrisma.user.findMany({
    where: { id: { in: multi.map(([userId]) => userId) } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return multi
    .map(([userId, e]) => ({
      userId,
      userName: userById.get(userId)?.name ?? null,
      userEmail: userById.get(userId)?.email ?? '',
      controlledOrgIds: Array.from(e.orgIds),
      controlledStakeBps: e.weight,
      // Integer percent without floating point.
      sharePercent: totalWeight > 0 ? Math.floor((e.weight * 100) / totalWeight) : 0,
      viaProxyOrgIds: Array.from(e.viaProxy),
    }))
    .sort((a, b) => b.sharePercent - a.sharePercent);
}
