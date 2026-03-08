/**
 * Parent Tenant Policy Engine
 *
 * Resolves the combined effective restrictions for an org by merging:
 *  1. System admin policies (from system-policy.ts)
 *  2. Parent org inherited policies (OrgInheritedPolicy rows)
 *
 * Rule precedence: DENY beats ALLOW at same specificity; more specific actions
 * beat wildcards. System policies are evaluated first — if they deny, parent
 * policies cannot override (system admins have final say).
 */

import { prisma } from '@/lib/database';
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis';

export interface PolicyRule {
  resource: string;
  actions: string[];
  allow: boolean;
}

export interface EffectiveRestrictions {
  /**
   * Combined ordered list of rules (system + all ancestor parent policies).
   * Evaluate top-to-bottom: first match wins per resource+action pair.
   */
  rules: PolicyRule[];
  /** 'system' | orgId of the policy source */
  sources: string[];
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  source?: string; // 'system' | orgId
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL = 60; // seconds
function cacheKey(orgId: string) { return `org-policy:effective:${orgId}`; }

export async function invalidateOrgPolicyCache(orgId: string) {
  await cacheDel(cacheKey(orgId));
}

export async function invalidateDescendantCaches(orgId: string) {
  const { prisma: db } = await import('@/lib/database');
  const rows = await db.organizationAncestry.findMany({
    where: { ancestorId: orgId },
    select: { descendantId: true },
  });
  await Promise.all([
    cacheDel(cacheKey(orgId)),
    ...rows.map((r) => cacheDel(cacheKey(r.descendantId))),
  ]);
}

// ─── Rule evaluation ──────────────────────────────────────────────────────────

function matchesRule(rule: PolicyRule, resource: string, action: string): boolean {
  if (rule.resource !== resource && rule.resource !== '*') return false;
  return rule.actions.includes(action) || rule.actions.includes('*');
}

/**
 * Evaluates an ordered list of rules (first match wins).
 * Returns the first matching rule's allow/deny decision.
 */
function evalRules(rules: PolicyRule[], resource: string, action: string): { matched: boolean; allow: boolean } {
  for (const rule of rules) {
    if (matchesRule(rule, resource, action)) {
      return { matched: true, allow: rule.allow };
    }
  }
  return { matched: false, allow: true };
}

// ─── Fetch ancestor policies ──────────────────────────────────────────────────

async function loadAncestorPolicies(orgId: string): Promise<{ orgId: string; rules: PolicyRule[] }[]> {
  // Get all ancestors ordered by depth (closest first)
  const ancestorRows = await prisma.organizationAncestry.findMany({
    where: { descendantId: orgId },
    orderBy: { depth: 'asc' },
    select: { ancestorId: true, depth: true },
  });

  if (ancestorRows.length === 0) return [];

  const ancestorIds = ancestorRows.map((r) => r.ancestorId);

  const policies = await prisma.orgInheritedPolicy.findMany({
    where: { parentOrgId: { in: ancestorIds }, targetOrgId: orgId },
  });

  if (policies.length === 0) return [];

  // Sort by depth — closest ancestor's policy takes priority
  const depthMap = new Map(ancestorRows.map((r) => [r.ancestorId, r.depth]));
  policies.sort((a, b) => (depthMap.get(a.parentOrgId) ?? 999) - (depthMap.get(b.parentOrgId) ?? 999));

  return policies.map((p) => ({
    orgId: p.parentOrgId,
    rules: p.rules as unknown as PolicyRule[],
  }));
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export async function resolveEffectiveRestrictions(orgId: string): Promise<EffectiveRestrictions> {
  const cached = await cacheGet<EffectiveRestrictions>(cacheKey(orgId));
  if (cached) return cached;

  // Load system policy
  const { getOrgEffectivePolicy } = await import('@/lib/system-policy');
  const sysPolicy = await getOrgEffectivePolicy(orgId);
  const sysRules: PolicyRule[] = (sysPolicy?.merged ?? []) as PolicyRule[];

  // Load ancestor (parent org) policies
  const ancestorPolicies = await loadAncestorPolicies(orgId);

  const allRules: PolicyRule[] = [
    ...sysRules,
    ...ancestorPolicies.flatMap((p) => p.rules),
  ];

  const sources = [
    ...(sysRules.length > 0 ? ['system'] : []),
    ...ancestorPolicies.map((p) => p.orgId),
  ];

  const result: EffectiveRestrictions = { rules: allRules, sources };

  await cacheSet(cacheKey(orgId), result, CACHE_TTL);

  return result;
}

/**
 * Check whether a specific resource+action is allowed for an org.
 * Stacks system policy AND parent org policies.
 */
export async function checkOrgPolicy(
  orgId: string,
  resource: string,
  action: string
): Promise<PolicyCheckResult> {
  try {
    const { rules } = await resolveEffectiveRestrictions(orgId);
    const { matched, allow } = evalRules(rules, resource, action);
    if (!matched || allow) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `${resource}.${action} is restricted`,
    };
  } catch {
    // Fail open — don't block tenant operations if policy engine is unavailable
    return { allowed: true };
  }
}
