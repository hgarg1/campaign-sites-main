'use client';

/**
 * Who co-owns this organization, how much each owner's vote weighs, and who
 * currently holds a delegated vote.
 *
 * The hierarchy page looks downward at children. This is the upward view, which
 * matters more for governance: co-ownership was previously invisible to the org
 * being co-owned, which is the party most affected by it.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';

interface Ownership {
  parentOrgId: string;
  childOrgId: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'REMOVED';
  stakeBps: number;
  stakeUpdatedAt: string | null;
  parentOrg: { id: string; name: string; slug: string; ownStatus: string };
}

interface Proxy {
  id: string;
  proxyUserId: string;
  scopeChildOrgId: string | null;
  scopeActionType: string | null;
  exclusive: boolean;
  expiresAt: string;
  revokedAt: string | null;
  note: string | null;
  live: boolean;
  proxyUser: { id: string; name: string | null; email: string };
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OwnershipPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [owners, setOwners] = useState<Ownership[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ownersRes, proxiesRes] = await Promise.all([
        fetch(`/api/tenant/${orgId}/owners`),
        fetch(`/api/tenant/${orgId}/proxies`),
      ]);
      if (ownersRes.ok) setOwners((await ownersRes.json()).data ?? []);
      else setError('Could not load co-owners');
      if (proxiesRes.ok) setProxies((await proxiesRes.json()).data ?? []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = owners.filter((o) => o.status === 'ACTIVE');
  const totalStake = active.reduce((sum, o) => sum + o.stakeBps, 0);
  const unallocated = totalStake === 0;

  async function revoke(proxyId: string) {
    const res = await fetch(`/api/tenant/${orgId}/proxies?proxyId=${proxyId}`, {
      method: 'DELETE',
    });
    if (res.ok) load();
    else setError((await res.json()).error ?? 'Could not revoke that proxy');
  }

  return (
    <TenantLayout
      orgId={orgId}
      title="Ownership"
      subtitle="Who co-owns this organization, and how votes are weighted"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Co-owners</h2>

            {active.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                This organization has no parent owners. It governs itself.
              </p>
            ) : (
              <>
                <div className="divide-y rounded-lg border">
                  {active.map((o) => (
                    <div
                      key={o.parentOrgId}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {o.parentOrg.name}
                          {o.isPrimary && (
                            <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-normal text-brand-700">
                              Primary
                            </span>
                          )}
                          {o.parentOrg.ownStatus !== 'ACTIVE' && (
                            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-800">
                              {o.parentOrg.ownStatus.toLowerCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {unallocated
                            ? 'One vote'
                            : `${(o.stakeBps / 100).toFixed(2)}% of the vote`}
                        </div>
                      </div>
                      <div className="w-40 shrink-0">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-brand"
                            style={{
                              width: `${
                                unallocated
                                  ? Math.round(100 / active.length)
                                  : Math.round((o.stakeBps * 100) / totalStake)
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {unallocated && active.length > 1 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No stakes have been allocated, so every owner&apos;s vote counts equally.
                    Allocating stake requires a governance proposal, since it changes how much each
                    owner&apos;s vote is worth.
                  </p>
                )}
              </>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Delegated votes</h2>
              <span className="text-xs text-gray-500">
                A proxy lets one named person cast this organization&apos;s vote
              </span>
            </div>

            {proxies.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No one holds a proxy for this organization.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {proxies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-gray-900">
                        {p.proxyUser.name ?? p.proxyUser.email}
                        {p.exclusive && (
                          <span className="ml-2 rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700">
                            Exclusive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.scopeActionType
                          ? `${p.scopeActionType.replace(/_/g, ' ').toLowerCase()} only`
                          : 'All actions'}
                        {' · '}
                        {p.revokedAt
                          ? `Revoked ${formatDate(p.revokedAt)}`
                          : p.live
                            ? `Expires ${formatDate(p.expiresAt)}`
                            : `Expired ${formatDate(p.expiresAt)}`}
                      </div>
                    </div>
                    {p.live && (
                      <button
                        type="button"
                        onClick={() => revoke(p.id)}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Revoking is not retroactive: a vote already cast under a proxy stands.
            </p>
          </section>
        </div>
      )}
    </TenantLayout>
  );
}
