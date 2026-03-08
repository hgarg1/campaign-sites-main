/**
 * System Permission Policy Engine
 *
 * System admins create named policies and assign them to tenant orgs.
 * Each policy is an array of PolicyRule objects that allow or deny
 * specific actions on specific resources within that org.
 *
 * Rule evaluation:
 *   - Deny beats allow at the same specificity
 *   - Explicit rules beat wildcard (*) action rules
 *   - If no rule matches, the action is allowed by default
 */

import { prisma } from './database';
import { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern } from './redis';

export interface PolicyRule {
  resource: string;   // members | branding | integrations | websites | settings | governance | hierarchy
  actions: string[];  // specific actions or ["*"] for all
  allow: boolean;
}

export interface PolicyCheckResult {
  allowed: boolean;
  policyId?: string;
  policyName?: string;
  reason?: string;
}

const CACHE_TTL = 60; // seconds

function effectivePolicyCacheKey(orgId: string) {
  return `sys-policy:effective:${orgId}`;
}

/** Load all policy rules assigned to an org (including any default policies). */
async function loadOrgRules(orgId: string): Promise<{ policyId: string; policyName: string; rules: PolicyRule[] }[]> {
  const assignments = await prisma.orgPolicyAssignment.findMany({
    where: { orgId },
    include: { policy: { select: { id: true, name: true, rules: true } } },
  });

  // Also include default policies not yet explicitly assigned
  const assignedPolicyIds = new Set(assignments.map((a) => a.policyId));
  const defaultPolicies = await prisma.systemPermissionPolicy.findMany({
    where: { isDefault: true, id: { notIn: [...assignedPolicyIds] } },
    select: { id: true, name: true, rules: true },
  });

  const result = [
    ...assignments.map((a) => ({
      policyId: a.policyId,
      policyName: a.policy.name,
      rules: a.policy.rules as unknown as PolicyRule[],
    })),
    ...defaultPolicies.map((p) => ({
      policyId: p.id,
      policyName: p.name,
      rules: p.rules as unknown as PolicyRule[],
    })),
  ];

  return result;
}

/**
 * Check whether a resource+action is allowed for an org by system policies.
 * Returns { allowed: true } if no policy blocks it.
 */
export async function checkSystemPolicy(
  orgId: string,
  resource: string,
  action: string
): Promise<PolicyCheckResult> {
  const cacheKey = effectivePolicyCacheKey(orgId);
  let allPolicies = await cacheGet<{ policyId: string; policyName: string; rules: PolicyRule[] }[]>(cacheKey);

  if (!allPolicies) {
    allPolicies = await loadOrgRules(orgId);
    await cacheSet(cacheKey, allPolicies, CACHE_TTL);
  }

  // Evaluate: explicit action match beats wildcard; deny beats allow at same specificity
  let explicitDeny: { policyId: string; policyName: string } | null = null;
  let explicitAllow: { policyId: string; policyName: string } | null = null;
  let wildcardDeny: { policyId: string; policyName: string } | null = null;

  for (const { policyId, policyName, rules } of allPolicies) {
    for (const rule of rules) {
      if (rule.resource !== resource && rule.resource !== '*') continue;
      const matchesAction = rule.actions.includes(action) || rule.actions.includes('*');
      const isExact = rule.actions.includes(action);
      if (!matchesAction) continue;

      if (!rule.allow) {
        if (isExact) {
          explicitDeny = { policyId, policyName };
        } else {
          wildcardDeny = { policyId, policyName };
        }
      } else if (isExact) {
        explicitAllow = { policyId, policyName };
      }
    }
  }

  // Explicit deny always wins
  if (explicitDeny) {
    return {
      allowed: false,
      policyId: explicitDeny.policyId,
      policyName: explicitDeny.policyName,
      reason: `Action '${action}' on '${resource}' is denied by system policy "${explicitDeny.policyName}"`,
    };
  }
  // Explicit allow overrides wildcard deny
  if (explicitAllow) {
    return { allowed: true };
  }
  // Wildcard deny
  if (wildcardDeny) {
    return {
      allowed: false,
      policyId: wildcardDeny.policyId,
      policyName: wildcardDeny.policyName,
      reason: `Action '${action}' on '${resource}' is denied by system policy "${wildcardDeny.policyName}"`,
    };
  }

  return { allowed: true };
}

/** Get the merged effective policy for an org (for UI display). */
export async function getOrgEffectivePolicy(orgId: string): Promise<{
  policies: { id: string; name: string; rules: PolicyRule[] }[];
  merged: PolicyRule[];
}> {
  const allPolicies = await loadOrgRules(orgId);
  const merged: PolicyRule[] = allPolicies.flatMap((p) => p.rules);
  return {
    policies: allPolicies.map((p) => ({ id: p.policyId, name: p.policyName, rules: p.rules })),
    merged,
  };
}

/** Bust the policy cache for an org. Call after policy assignment changes. */
export async function invalidatePolicyCache(orgId: string) {
  await cacheDel(effectivePolicyCacheKey(orgId));
}

/** Bust all policy caches (e.g., after a default policy changes). */
export async function invalidateAllPolicyCaches() {
  await cacheInvalidatePattern('sys-policy:effective:*');
}
