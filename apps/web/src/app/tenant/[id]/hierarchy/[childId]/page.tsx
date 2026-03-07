'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

interface ChildOrg {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  setupCompletedAt: string | null;
  memberCount?: number;
  websiteCount?: number;
}

interface OrgTreeNode {
  id: string; name: string; slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
  setupCompletedAt: string | null;
  children: OrgTreeNode[];
}

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string };
  joinedAt?: string;
}

interface Website {
  id: string;
  name: string;
  domain: string | null;
  slug: string;
  status: string;
}

function OrgStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-yellow-100 text-yellow-700',
    DEACTIVATED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function ChildOrgPage() {
  const params = useParams();
  const orgId = params.id as string;
  const childId = params.childId as string;

  const [accessOk, setAccessOk] = useState<boolean | null>(null);
  const [accessLevel, setAccessLevel] = useState<string>('');
  const [childOrg, setChildOrg] = useState<ChildOrg | null>(null);
  const [childTree, setChildTree] = useState<OrgTreeNode | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check access first
      const accessRes = await globalThis.fetch(`/api/tenant/${orgId}/cross-access/${childId}`);
      if (!accessRes.ok) { setAccessOk(false); setLoading(false); return; }
      const accessData = await accessRes.json();
      if (!accessData.hasAccess) { setAccessOk(false); setLoading(false); return; }
      setAccessOk(true);
      setAccessLevel(accessData.accessLevel ?? 'Ancestor Admin');

      const [childRes, childHierarchyRes, membersRes, websitesRes] = await Promise.all([
        globalThis.fetch(`/api/tenant/${childId}`),
        globalThis.fetch(`/api/tenant/${childId}/hierarchy`),
        globalThis.fetch(`/api/tenant/${childId}/members`),
        globalThis.fetch(`/api/tenant/${childId}/websites`),
      ]);

      if (childRes.ok) setChildOrg(await childRes.json());
      if (childHierarchyRes.ok) {
        const hData = await childHierarchyRes.json();
        setChildTree(hData.tree ?? null);
      }
      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.data ?? mData ?? []);
      }
      if (websitesRes.ok) {
        const wData = await websitesRes.json();
        setWebsites(wData.data ?? wData ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [orgId, childId]);

  const handleSuspend = async () => {
    setActionLoading('suspend');
    try {
      await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/suspend`, { method: 'POST' });
      await fetchAll();
    } finally { setActionLoading(null); }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/reactivate`, { method: 'POST' });
      await fetchAll();
    } finally { setActionLoading(null); }
  };

  const title = childOrg ? `Managing: ${childOrg.name}` : 'Managing Child Org';

  if (loading) {
    return (
      <TenantLayout title={title} orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  if (accessOk === false) {
    return (
      <TenantLayout title="Access Forbidden" orgId={orgId}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <span className="text-4xl mb-3 block">🚫</span>
          <h2 className="text-xl font-bold text-red-700 mb-2">Access Forbidden</h2>
          <p className="text-red-600 text-sm mb-4">You do not have ancestor access to this organization.</p>
          <Link href={`/tenant/${orgId}/hierarchy`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">← Back to Hierarchy</Link>
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout title={title} orgId={orgId}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      </TenantLayout>
    );
  }

  const subChildren = childTree?.children ?? [];

  return (
    <TenantLayout title={title} subtitle={`Access Level: ${accessLevel}`} orgId={orgId}>
      <Link href={`/tenant/${orgId}/hierarchy`} className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-6 inline-block">
        ← Back to Hierarchy
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{childOrg?.name}</h2>
            <p className="text-sm text-gray-500">/{childOrg?.slug}</p>
            {childOrg?.partyAffiliation && (
              <span className="mt-2 inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                {childOrg.partyAffiliation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {childOrg && (
              <>
                <OrgStatusBadge status={childOrg.effectiveStatus} />
                {childOrg.ownStatus === 'ACTIVE' ? (
                  <button
                    onClick={handleSuspend}
                    disabled={actionLoading === 'suspend'}
                    className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend'}
                  </button>
                ) : childOrg.ownStatus === 'SUSPENDED' ? (
                  <button
                    onClick={handleReactivate}
                    disabled={actionLoading === 'reactivate'}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate'}
                  </button>
                ) : null}
                <Link
                  href={`/tenant/${childId}`}
                  className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Enter Child Portal →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Members</h3>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm">No members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{m.user.name ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{m.user.email}</td>
                    <td className="py-3 px-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{m.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Websites */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Websites</h3>
        {websites.length === 0 ? (
          <p className="text-gray-500 text-sm">No websites found.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {websites.map(w => (
              <div key={w.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="font-semibold text-gray-900">{w.name}</p>
                <p className="text-xs text-gray-500 mt-1">{w.domain ?? w.slug}</p>
                <span className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  w.status === 'PUBLISHED' ? 'bg-green-100 text-green-700'
                  : w.status === 'FAILED' ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
                }`}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-children */}
      {subChildren.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Child&apos;s Organizations</h3>
          <div className="space-y-2">
            {subChildren.map(sc => (
              <div key={sc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-medium">{sc.name}</span>
                  <span className="text-xs text-gray-500">/{sc.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <OrgStatusBadge status={sc.effectiveStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
