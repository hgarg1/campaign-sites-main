/**
 * Hook for loading effective policy restrictions in the tenant portal.
 * Returns helpers to check if a resource+action is blocked, and a restriction
 * banner component for pages that have restricted operations.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

export interface PolicyRule {
  resource: string;
  actions: string[];
  allow: boolean;
}

export interface EffectiveRestrictions {
  rules: PolicyRule[];
  sources: string[];
}

const DEFAULT: EffectiveRestrictions = { rules: [], sources: [] };

export function useEffectiveRestrictions(orgId: string) {
  const [restrictions, setRestrictions] = useState<EffectiveRestrictions>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/tenant/${orgId}/effective-restrictions`);
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data);
      }
    } catch {
      // Fail open — don't block UI if policy engine is unavailable
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Returns true if the action is explicitly blocked by a policy rule.
   * Fail-open: unknown/unmatched actions are allowed.
   */
  function isBlocked(resource: string, action: string): boolean {
    for (const rule of restrictions.rules) {
      const resourceMatch = rule.resource === resource || rule.resource === '*';
      const actionMatch = rule.actions.includes(action) || rule.actions.includes('*');
      if (resourceMatch && actionMatch) {
        return !rule.allow;
      }
    }
    return false;
  }

  /**
   * Returns a tooltip text when an action is blocked (undefined if allowed).
   */
  function blockedReason(resource: string, action: string): string | undefined {
    if (!isBlocked(resource, action)) return undefined;
    const hasSystemSource = restrictions.sources.includes('system');
    const parentSources = restrictions.sources.filter((s) => s !== 'system');
    if (hasSystemSource) {
      return 'This action is restricted by the platform administrator.';
    }
    if (parentSources.length > 0) {
      return 'This action is restricted by your parent organization.';
    }
    return 'This action is restricted by policy.';
  }

  return { restrictions, loading, isBlocked, blockedReason };
}

/**
 * Small inline restriction badge to show next to disabled buttons/inputs.
 */
export function RestrictionBadge({ message }: { message: string }) {
  return (
    <span
      title={message}
      className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
    >
      🔒 Restricted
    </span>
  );
}

/**
 * Page-level banner shown when one or more actions on the page are restricted.
 */
export function RestrictionBanner({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;
  const hasSystem = sources.includes('system');
  const hasParent = sources.some((s) => s !== 'system');

  const msg = hasSystem && hasParent
    ? 'Some actions on this page are restricted by the platform administrator and your parent organization.'
    : hasSystem
    ? 'Some actions on this page are restricted by the platform administrator.'
    : 'Some actions on this page are restricted by your parent organization.';

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
      <span className="text-lg">🔒</span>
      <p>{msg}</p>
    </div>
  );
}
