'use client';

/**
 * Who can act on an organization, and why.
 *
 * Support and incident review both need this question answered without reading
 * source: most people with authority over an org have no membership row in it.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { EmptyState } from '@/components/ui/EmptyState';

interface Entry {
  userId: string;
  name: string | null;
  email: string;
  active: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  source: 'DIRECT' | 'INHERITED';
  viaOrgId: string;
  viaOrgName: string;
  depth: number;
}

interface AuthorityMap {
  organization: { id: string; name: string };
  total: number;
  direct: number;
  inherited: number;
  entries: Entry[];
}

const ROLE_STYLES: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

export default function AuthorityPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [data, setData] = useState<AuthorityMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/authority`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'failed');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout
      title="Who can act on this organization"
      subtitle={data ? data.organization.name : 'Authority map'}
    >
      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : !data ? null : data.entries.length === 0 ? (
        <EmptyState
          title="Nobody has authority over this organization"
          description="It has no members of its own, and no ancestor organization has an admin or owner."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-600">
            <strong>{data.total}</strong> {data.total === 1 ? 'person has' : 'people have'}{' '}
            authority here — {data.direct} directly, and {data.inherited} inherited from an
            organization further up the hierarchy. Inherited authority leaves no membership record
            on this organization.
          </p>

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">
                    Person
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">
                    Where it comes from
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.entries.map((e) => (
                  <tr key={`${e.userId}-${e.viaOrgId}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{e.name ?? e.email}</div>
                      <div className="text-xs text-gray-500">
                        {e.email}
                        {!e.active && ' · account inactive'}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[e.role]}`}
                      >
                        {e.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {e.source === 'DIRECT' ? (
                        <span>Member of this organization</span>
                      ) : (
                        <span>
                          Inherited from <strong>{e.viaOrgName}</strong>
                          <span className="text-gray-500">
                            {' '}
                            · {e.depth} {e.depth === 1 ? 'level' : 'levels'} up
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Members of an ancestor organization are not listed: only admins and owners inherit
            authority downward.
          </p>
        </>
      )}
    </AdminLayout>
  );
}
