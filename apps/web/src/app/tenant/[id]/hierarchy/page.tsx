'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

// Types
interface OrgTreeNode {
  id: string; name: string; slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
  setupCompletedAt: string | null;
  children: OrgTreeNode[];
}

interface AncestorNode {
  id: string; name: string; slug: string;
  partyAffiliation: string | null;
  ownStatus: string;
  depth: number;
}

interface AggregateStats {
  totalDescendants: number;
  totalMembers: number;
  totalWebsites: number;
  activeDescendants: number;
  suspendedDescendants: number;
  deactivatedDescendants: number;
  recentBuilds: number;
}

interface Ownership {
  parentOrgId: string;
  childOrgId: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'REMOVED';
  addedAt: string;
  addedByUserId: string | null;
  removedAt: string | null;
  parentOrg: {
    id: string;
    name: string;
    slug: string;
    ownStatus: string;
  };
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

function OwnershipStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    REMOVED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function CoOwnersSection({
  orgId,
  ownerships,
  onRefresh,
}: {
  orgId: string;
  ownerships: Ownership[];
  onRefresh: () => void;
}) {
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParentOrgId, setNewParentOrgId] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const activeOwnerships = ownerships.filter((o) => o.status === 'ACTIVE');

  const handleAdd = async () => {
    if (!newParentOrgId.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentOrgId: newParentOrgId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error ?? 'Failed to add co-parent');
        return;
      }
      setNewParentOrgId('');
      setShowAddForm(false);
      onRefresh();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add co-parent');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (parentOrgId: string) => {
    setRemoveLoading(parentOrgId);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/owners`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentOrgId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to remove co-parent');
        return;
      }
      onRefresh();
    } catch {
      alert('Failed to remove co-parent');
    } finally {
      setRemoveLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">🔗 Co-Parent Owners</h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddError(null); }}
          className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Co-Parent'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Organizations that co-own and govern this org</p>

      {activeOwnerships.length <= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-4">
          This org has a single parent. Add co-parents to enable governance consensus voting.
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Org ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newParentOrgId}
              onChange={(e) => setNewParentOrgId(e.target.value)}
              placeholder="Enter parent org ID"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={addLoading || !newParentOrgId.trim()}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {addLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </div>
      )}

      {ownerships.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No ownership records found.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {ownerships.map((owner) => (
            <div key={owner.parentOrgId} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/tenant/${owner.parentOrg.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                >
                  {owner.parentOrg.name}
                </Link>
                <p className="text-xs text-gray-400">
                  Added {new Date(owner.addedAt).toLocaleDateString()}
                  {owner.isPrimary && <span className="ml-2 text-blue-600 font-medium">· Primary</span>}
                </p>
              </div>
              <OwnershipStatusBadge status={owner.status} />
              {activeOwnerships.length > 1 && owner.status === 'ACTIVE' && (
                <button
                  onClick={() => handleRemove(owner.parentOrg.id)}
                  disabled={removeLoading === owner.parentOrg.id}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 ml-2 text-lg"
                  title="Remove co-parent"
                >
                  {removeLoading === owner.parentOrg.id ? '...' : '🗑️'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [tree, setTree] = useState<OrgTreeNode | null>(null);
  const [directChildren, setDirectChildren] = useState<OrgTreeNode[]>([]);
  const [canCreateChildren, setCanCreateChildren] = useState(false);
  const [ancestors, setAncestors] = useState<AncestorNode[]>([]);
  const [currentOrg, setCurrentOrg] = useState<{ id: string; name: string } | null>(null);
  const [aggregate, setAggregate] = useState<AggregateStats | null>(null);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hierarchyRes, ancestryRes, aggregateRes, ownersRes] = await Promise.all([
        globalThis.fetch(`/api/tenant/${orgId}/hierarchy`),
        globalThis.fetch(`/api/tenant/${orgId}/ancestry`),
        globalThis.fetch(`/api/tenant/${orgId}/descendants/aggregate`),
        globalThis.fetch(`/api/tenant/${orgId}/owners`),
      ]);

      if (hierarchyRes.ok) {
        const hData = await hierarchyRes.json();
        setTree(hData.tree ?? null);
        setDirectChildren(hData.directChildren ?? (hData.tree?.children ?? []));
        setCanCreateChildren(hData.tree?.canCreateChildren ?? false);
      }
      if (ancestryRes.ok) {
        const aData = await ancestryRes.json();
        setAncestors(aData.ancestors ?? []);
        setCurrentOrg(aData.org ?? null);
      }
      if (aggregateRes.ok) {
        setAggregate(await aggregateRes.json());
      }
      if (ownersRes.ok) {
        const oData = await ownersRes.json();
        setOwnerships(oData.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [orgId]);

  const handleSuspend = async (childId: string) => {
    setActionLoading(childId + '-suspend');
    try {
      await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/suspend`, { method: 'POST' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (childId: string) => {
    setActionLoading(childId + '-reactivate');
    try {
      await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/reactivate`, { method: 'POST' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <TenantLayout title="Organization Hierarchy" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout title="Organization Hierarchy" orgId={orgId}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      </TenantLayout>
    );
  }

  const sortedAncestors = [...ancestors].sort((a, b) => a.depth - b.depth);

  return (
    <TenantLayout title="Organization Hierarchy" orgId={orgId}>
      {/* Ancestor breadcrumb */}
      {sortedAncestors.length > 0 && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
          {sortedAncestors.map((anc, i) => (
            <span key={anc.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-400">→</span>}
              <Link href={`/tenant/${anc.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                {anc.name}
              </Link>
            </span>
          ))}
          <span className="text-gray-400">→</span>
          <span className="font-bold text-gray-900">{currentOrg?.name ?? 'Your Org'}</span>
        </div>
      )}

      {/* Aggregate stats */}
      {aggregate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Descendants', value: aggregate.totalDescendants, icon: '🌳' },
            { label: 'Total Members', value: aggregate.totalMembers, icon: '👥' },
            { label: 'Total Websites', value: aggregate.totalWebsites, icon: '🌐' },
            { label: 'Recent Builds (30d)', value: aggregate.recentBuilds, icon: '🔨' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.icon}</span>
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Co-Parent Owners */}
      <CoOwnersSection orgId={orgId} ownerships={ownerships} onRefresh={fetchAll} />

      {/* Direct Children */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Direct Children</h2>
        {canCreateChildren && (
          <Link
            href={`/tenant/${orgId}/hierarchy/new`}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            + Create Child Organization
          </Link>
        )}
      </div>

      {directChildren.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-4xl mb-4 block">🌳</span>
          <p className="text-gray-600 mb-4">No child organizations yet.</p>
          {canCreateChildren && (
            <Link
              href={`/tenant/${orgId}/hierarchy/new`}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 inline-block"
            >
              Create your first child org
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {directChildren.map(child => (
            <div key={child.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/tenant/${orgId}/hierarchy/${child.id}`}
                    className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {child.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">/{child.slug}</p>
                </div>
                <OrgStatusBadge status={child.effectiveStatus} />
              </div>

              {child.effectiveStatus !== child.ownStatus && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                  ⚠️ Suspended by ancestor organization
                </div>
              )}

              {child.partyAffiliation && (
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium w-fit">
                  {child.partyAffiliation}
                </span>
              )}

              <div className="flex gap-2 mt-auto pt-2">
                <Link
                  href={`/tenant/${orgId}/hierarchy/${child.id}`}
                  className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 flex-1 text-center"
                >
                  Manage
                </Link>
                {child.ownStatus === 'ACTIVE' ? (
                  <button
                    onClick={() => handleSuspend(child.id)}
                    disabled={actionLoading === child.id + '-suspend'}
                    className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === child.id + '-suspend' ? '...' : 'Suspend'}
                  </button>
                ) : child.ownStatus === 'SUSPENDED' ? (
                  <button
                    onClick={() => handleReactivate(child.id)}
                    disabled={actionLoading === child.id + '-reactivate'}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === child.id + '-reactivate' ? '...' : 'Reactivate'}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </TenantLayout>
  );
}
