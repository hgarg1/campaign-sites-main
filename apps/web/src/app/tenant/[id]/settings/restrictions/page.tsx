'use client';

/**
 * "What can my organization do?"
 *
 * A tenant could previously be restricted by the platform, by any ancestor
 * organization, and by its own effective status, and no screen said which —
 * every restriction surfaced as an unexplained 403.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';
import { EmptyState } from '@/components/ui/EmptyState';

interface Rule {
  resource: string;
  actions: string[];
  allow: boolean;
}

interface Source {
  kind: 'PLATFORM' | 'PARENT';
  label: string;
  setBy: string | null;
  note: string | null;
  rules: Rule[];
}

interface Restrictions {
  sources: Source[];
  status: { own: string; effective: string; suspendedByAncestor: boolean };
  structure: { canCreateChildren: boolean; maxChildDepth: number | null };
}

function humanResource(resource: string) {
  return resource.replace(/_/g, ' ');
}

function humanActions(actions: string[]) {
  if (actions.includes('*')) return 'anything';
  return actions.map((a) => a.replace(/_/g, ' ')).join(', ');
}

export default function RestrictionsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [data, setData] = useState<Restrictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/policy-explain`);
      if (!res.ok) throw new Error('failed');
      setData(await res.json());
    } catch {
      setError('Could not load restrictions');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <TenantLayout
      orgId={orgId}
      title="What your organization can do"
      subtitle="Restrictions in force, and who set them"
    >
      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 rounded" />
          ))}
        </div>
      ) : !data ? null : (
        <div className="space-y-8">
          {data.status.effective !== 'ACTIVE' && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-900">
                This organization is {data.status.effective.toLowerCase()}
              </h2>
              <p className="mt-1 text-sm text-amber-900">
                {data.status.suspendedByAncestor
                  ? 'Your own status is active, but a parent organization further up the hierarchy is suspended, and that applies to everything beneath it.'
                  : 'Most actions are unavailable until this is lifted.'}
              </p>
            </div>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Restrictions</h2>

            {data.sources.length === 0 ? (
              <EmptyState
                icon="✓"
                title="No restrictions apply"
                description="Neither the platform nor any parent organization has limited what this organization can do."
              />
            ) : (
              <div className="space-y-4">
                {data.sources.map((source, i) => (
                  <div key={`${source.kind}-${i}`} className="rounded-lg border">
                    <div className="border-b bg-gray-50 px-4 py-2">
                      <div className="text-sm font-medium text-gray-900">Set by {source.label}</div>
                      <div className="text-xs text-gray-500">
                        {source.kind === 'PLATFORM'
                          ? 'Applies to every organization on the platform, or to yours specifically'
                          : 'Imposed by a parent organization through a governance vote'}
                        {source.setBy && source.kind === 'PLATFORM' && ` · ${source.setBy}`}
                      </div>
                      {source.note && (
                        <p className="mt-1 text-xs italic text-gray-600">
                          &ldquo;{source.note}&rdquo;
                        </p>
                      )}
                    </div>
                    <ul className="divide-y">
                      {source.rules.map((rule, j) => (
                        <li key={j} className="px-4 py-2 text-sm text-gray-700">
                          You cannot <strong>{humanActions(rule.actions)}</strong> for{' '}
                          <strong>{humanResource(rule.resource)}</strong>.
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Structure</h2>
            <div className="divide-y rounded-lg border text-sm">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-gray-700">Can create child organizations</span>
                <span className="text-gray-900">
                  {data.structure.canCreateChildren ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-gray-700">Maximum depth beneath this organization</span>
                <span className="text-gray-900">{data.structure.maxChildDepth ?? 'Unlimited'}</span>
              </div>
            </div>
          </section>

          <p className="text-xs text-gray-500">
            To change a restriction, contact whoever set it — a platform restriction needs a system
            administrator, and a parent organization&apos;s restriction is lifted through a
            governance proposal by that organization.
          </p>
        </div>
      )}
    </TenantLayout>
  );
}
