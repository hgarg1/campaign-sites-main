'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { HierarchyGraph } from '@/components/shared/HierarchyGraph';

interface OrgTreeNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
  maxChildDepth: number | null;
  setupCompletedAt: string | null;
  children: OrgTreeNode[];
}

interface AncestorNode {
  id: string;
  name: string;
  slug: string;
}

interface HierarchyData {
  tree: OrgTreeNode;
  ancestors: AncestorNode[];
}

interface FlatOrg {
  id: string;
  name: string;
  slug: string;
}

const PARTY_COLORS: Record<string, string> = {
  REPUBLICAN: 'bg-red-100 text-red-700',
  DEMOCRAT: 'bg-blue-100 text-blue-700',
  LIBERTARIAN: 'bg-yellow-100 text-yellow-700',
  GREEN: 'bg-green-100 text-green-700',
  INDEPENDENT: 'bg-gray-100 text-gray-700',
  NONPARTISAN: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DEACTIVATED: 'bg-red-100 text-red-700',
};

export default function HierarchyOrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hierarchy settings form state
  const [settingsCanCreateChildren, setSettingsCanCreateChildren] = useState(false);
  const [settingsMaxChildDepth, setSettingsMaxChildDepth] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Parent assignment modal
  const [showParentModal, setShowParentModal] = useState(false);
  const [allOrgs, setAllOrgs] = useState<FlatOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [assigningParent, setAssigningParent] = useState(false);
  const [removingParent, setRemovingParent] = useState(false);

  // Suspend/reactivate/deactivate modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fetchHierarchy = useCallback(() => {
    setLoading(true);
    globalThis.fetch(`/api/admin/organizations/${orgId}/hierarchy`)
      .then((r) => r.json())
      .then((d: HierarchyData) => {
        setData(d);
        setSettingsCanCreateChildren(d.tree.canCreateChildren);
        setSettingsMaxChildDepth(d.tree.maxChildDepth != null ? String(d.tree.maxChildDepth) : '');
      })
      .catch(() => setError('Failed to load organization hierarchy'))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  function openParentModal() {
    setShowParentModal(true);
    setParentSearch('');
    setSelectedParentId('');
    if (allOrgs.length === 0) {
      setOrgsLoading(true);
      globalThis.fetch('/api/admin/organizations?pageSize=500')
        .then((r) => r.json())
        .then((d: { data: FlatOrg[] }) => setAllOrgs(d.data ?? []))
        .catch(() => {})
        .finally(() => setOrgsLoading(false));
    }
  }

  async function saveSettings() {
    if (!data) return;
    setSavingSettings(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/hierarchy-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canCreateChildren: settingsCanCreateChildren,
          maxChildDepth: settingsMaxChildDepth === '' ? null : Number(settingsMaxChildDepth),
        }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      fetchHierarchy();
    } finally {
      setSavingSettings(false);
    }
  }

  async function assignParent() {
    if (!selectedParentId) return;
    setAssigningParent(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: selectedParentId }),
      });
      setShowParentModal(false);
      fetchHierarchy();
    } finally {
      setAssigningParent(false);
    }
  }

  async function removeParent() {
    setRemovingParent(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/parent`, { method: 'DELETE' });
      fetchHierarchy();
    } finally {
      setRemovingParent(false);
    }
  }

  async function suspendOrg() {
    setSuspending(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/suspend`, { method: 'POST' });
      setShowSuspendModal(false);
      fetchHierarchy();
    } finally {
      setSuspending(false);
    }
  }

  async function deactivateOrg() {
    setDeactivating(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/deactivate`, { method: 'POST' });
      setShowDeactivateModal(false);
      fetchHierarchy();
    } finally {
      setDeactivating(false);
    }
  }

  async function reactivateOrg() {
    setReactivating(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/reactivate`, { method: 'POST' });
      fetchHierarchy();
    } finally {
      setReactivating(false);
    }
  }

  const filteredOrgs = allOrgs.filter(
    (o) => o.id !== orgId && o.name.toLowerCase().includes(parentSearch.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Error" subtitle="">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-red-600">{error ?? 'Organization not found'}</p>
          <button onClick={() => router.push('/admin/portal/hierarchy')} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Hierarchy
          </button>
        </div>
      </AdminLayout>
    );
  }

  const org = data.tree;
  const ancestors = data.ancestors;
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

  function countDescendants(node: OrgTreeNode): number {
    return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
  }
  const descendantCount = countDescendants(org);

  return (
    <AdminLayout title={org.name} subtitle={`Hierarchy Management · ${org.slug}`}>
      {/* Back button */}
      <button onClick={() => router.push('/admin/portal/hierarchy')} className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
        ← Back to Hierarchy
      </button>

      {/* Ancestor breadcrumb */}
      {ancestors.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-6 flex-wrap">
          {ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-1">
              {i > 0 && <span>→</span>}
              <button onClick={() => router.push(`/admin/portal/hierarchy/${a.id}`)} className="hover:text-blue-600 hover:underline">
                {a.name}
              </button>
            </span>
          ))}
          <span>→</span>
          <span className="text-gray-900 font-medium">{org.name}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Card 1: Org Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Name</span>
              <span className="font-medium text-gray-900">{org.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Slug</span>
              <span className="font-mono text-gray-900">{org.slug}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Party Affiliation</span>
              {org.partyAffiliation ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTY_COLORS[org.partyAffiliation] ?? 'bg-gray-100 text-gray-700'}`}>
                  {org.partyAffiliation}
                </span>
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Own Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[org.ownStatus]}`}>
                {org.ownStatus}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Effective Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[org.effectiveStatus]}`}>
                {org.effectiveStatus}
              </span>
              {org.effectiveStatus !== org.ownStatus && (
                <span className="ml-2 text-xs text-orange-600">(suspended by ancestor)</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Setup Completed</span>
              <span className="text-gray-900">
                {org.setupCompletedAt ? new Date(org.setupCompletedAt).toLocaleDateString() : 'Not completed'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Can Create Children</span>
              <span className="text-gray-900">{org.canCreateChildren ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Max Child Depth</span>
              <span className="text-gray-900">{org.maxChildDepth != null ? org.maxChildDepth : 'Unlimited'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hierarchy Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hierarchy Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="canCreateChildren"
                type="checkbox"
                checked={settingsCanCreateChildren}
                onChange={(e) => setSettingsCanCreateChildren(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="canCreateChildren" className="text-sm font-medium text-gray-700">
                Allow this organization to create child organizations
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="maxChildDepth" className="text-sm font-medium text-gray-700 w-48">
                Max Child Depth
              </label>
              <input
                id="maxChildDepth"
                type="number"
                min="0"
                placeholder="Unlimited"
                value={settingsMaxChildDepth}
                onChange={(e) => setSettingsMaxChildDepth(e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">Leave blank for unlimited</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              {settingsSaved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            </div>
          </div>
        </div>

        {/* Card 3: Parent Assignment */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent Organization</h2>
          <div className="flex items-center justify-between">
            <div>
              {parent ? (
                <div className="text-sm">
                  <span className="text-gray-500">Current parent: </span>
                  <button
                    onClick={() => router.push(`/admin/portal/hierarchy/${parent.id}`)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {parent.name}
                  </button>
                  <span className="text-gray-400 ml-2 font-mono text-xs">({parent.slug})</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Root organization (no parent)</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={openParentModal} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">
                Change Parent
              </button>
              {parent && (
                <button
                  onClick={removeParent}
                  disabled={removingParent}
                  className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  {removingParent ? 'Removing...' : 'Remove Parent'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Status Control */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Status Control</h2>
          {descendantCount > 0 && (
            <p className="text-xs text-gray-500 mb-4">Status changes cascade to {descendantCount} descendant organization{descendantCount !== 1 ? 's' : ''}.</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-600">
              Current: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[org.ownStatus]}`}>{org.ownStatus}</span>
              {org.effectiveStatus !== org.ownStatus && (
                <span className="ml-2 text-xs text-orange-600">(effectively {org.effectiveStatus} via ancestor)</span>
              )}
            </div>
            {(org.ownStatus === 'ACTIVE' || org.ownStatus === 'SUSPENDED') && (
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800"
              >
                Deactivate Organization
              </button>
            )}
            {org.ownStatus === 'ACTIVE' && (
              <button onClick={() => setShowSuspendModal(true)} className="bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700">
                Suspend Organization
              </button>
            )}
            {(org.ownStatus === 'SUSPENDED' || org.ownStatus === 'DEACTIVATED') && (
              <button onClick={reactivateOrg} disabled={reactivating} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {reactivating ? 'Reactivating...' : 'Reactivate Organization'}
              </button>
            )}
          </div>
        </div>

        {/* Hierarchy visualization */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Hierarchy</h2>
          <div style={{ height: '500px', width: '100%' }}>
            <HierarchyGraph 
              org={org}
              editable={true}
              onHierarchyChange={() => fetchHierarchy()}
            />
          </div>
        </div>
      </div>

      {/* Parent Assignment Modal */}
      {showParentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Parent Organization</h3>
            <input
              type="text"
              placeholder="Search organizations..."
              value={parentSearch}
              onChange={(e) => setParentSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              {orgsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredOrgs.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">No organizations found</p>
              ) : (
                filteredOrgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedParentId(o.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedParentId === o.id ? 'bg-blue-50' : ''}`}
                  >
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <span className="text-gray-400 font-mono text-xs">{o.slug}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowParentModal(false)} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={assignParent}
                disabled={!selectedParentId || assigningParent}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {assigningParent ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Suspend Organization</h3>
            <p className="text-sm text-gray-600 mb-2">
              This will suspend <strong>{org.name}</strong>
              {descendantCount > 0 && (
                <> and cascade to <strong>{descendantCount} descendant organization{descendantCount !== 1 ? 's' : ''}</strong> (skipping any already suspended)</>
              )}.
            </p>
            <p className="text-xs text-gray-400 mb-4">Suspension is reversible. Reactivating this org will restore all cascade-suspended descendants.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSuspendModal(false)} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={suspendOrg}
                disabled={suspending}
                className="bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
              >
                {suspending ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">⚠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Deactivate Organization</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently deactivate <strong>{org.name}</strong>
              {descendantCount > 0 && (
                <> and all <strong>{descendantCount} descendant organization{descendantCount !== 1 ? 's' : ''}</strong></>
              )}.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Deactivated organizations lose access to their tenant portals. You can reactivate later, but this is a significant action.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeactivateModal(false)} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={deactivateOrg}
                disabled={deactivating}
                className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
