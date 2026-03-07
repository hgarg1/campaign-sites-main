'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import {
  OrganizationProfile,
  OrganizationMembers,
  OrganizationWebsitesSection,
  OrganizationUsageCard,
  OrganizationSettings,
} from '@/components/admin/organizations';
import {
  useOrganization,
  useOrganizationMembers,
  useOrganizationWebsites,
  useOrganizationUsage,
} from '@/hooks/useOrganizations';

// ─── Hierarchy tab types ────────────────────────────────────────────────────

interface HierarchyOrgNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
  maxChildDepth: number | null;
  setupCompletedAt: string | null;
  children: HierarchyOrgNode[];
}

interface AncestorNode {
  id: string;
  name: string;
  slug: string;
}

interface HierarchyData {
  tree: HierarchyOrgNode;
  ancestors: AncestorNode[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DEACTIVATED: 'bg-red-100 text-red-700',
};

// ─── Hierarchy Tab Component ────────────────────────────────────────────────

function HierarchyTab({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHierarchy = useCallback(() => {
    setHierarchyLoading(true);
    globalThis.fetch(`/api/admin/organizations/${orgId}/hierarchy`)
      .then((r) => r.json())
      .then((d: HierarchyData) => setHierarchyData(d))
      .catch(() => setHierarchyError('Failed to load hierarchy data'))
      .finally(() => setHierarchyLoading(false));
  }, [orgId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  async function suspendOrg() {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/suspend`, { method: 'POST' });
      setShowSuspendModal(false);
      fetchHierarchy();
    } finally {
      setActionLoading(false);
    }
  }

  async function deactivateOrg() {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/deactivate`, { method: 'POST' });
      setShowDeactivateModal(false);
      fetchHierarchy();
    } finally {
      setActionLoading(false);
    }
  }

  async function reactivateOrg() {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/reactivate`, { method: 'POST' });
      fetchHierarchy();
    } finally {
      setActionLoading(false);
    }
  }

  if (hierarchyLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hierarchyError || !hierarchyData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-red-600">{hierarchyError ?? 'Failed to load hierarchy'}</p>
      </div>
    );
  }

  const { tree: org, ancestors } = hierarchyData;
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

  function countDescendants(node: HierarchyOrgNode): number {
    return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
  }
  const descendantCount = countDescendants(org);

  return (
    <div className="space-y-6">
      {/* Ancestor breadcrumb */}
      {ancestors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Ancestor Path</p>
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {ancestors.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">→</span>}
                <button
                  onClick={() => router.push(`/admin/portal/organizations/${a.id}`)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {a.name}
                </button>
              </span>
            ))}
            <span className="text-gray-300">→</span>
            <span className="text-gray-900 font-semibold">{org.name}</span>
          </div>
        </div>
      )}

      {/* Hierarchy info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Hierarchy Info</h3>
          <a
            href={`/admin/portal/hierarchy/${orgId}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Open Hierarchy Manager →
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block mb-1">Parent Organization</span>
            {parent ? (
              <button
                onClick={() => router.push(`/admin/portal/organizations/${parent.id}`)}
                className="font-medium text-blue-600 hover:underline"
              >
                {parent.name}
              </button>
            ) : (
              <span className="text-gray-400">Root organization</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Depth in Hierarchy</span>
            <span className="font-medium text-gray-900">{ancestors.length}</span>
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
            <span className="text-gray-500 block mb-1">Can Create Children</span>
            <span className="font-medium text-gray-900">{org.canCreateChildren ? 'Yes' : 'No'}</span>
            <a href={`/admin/portal/hierarchy/${orgId}`} className="ml-2 text-xs text-blue-600 hover:underline">Edit in Hierarchy Manager</a>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Max Child Depth</span>
            <span className="font-medium text-gray-900">{org.maxChildDepth != null ? org.maxChildDepth : 'Unlimited'}</span>
            <a href={`/admin/portal/hierarchy/${orgId}`} className="ml-2 text-xs text-blue-600 hover:underline">Edit in Hierarchy Manager</a>
          </div>
        </div>
      </div>

      {/* Status control card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Status Control</h3>
        {descendantCount > 0 && (
          <p className="text-xs text-gray-500 mb-4">Changes cascade to {descendantCount} descendant organization{descendantCount !== 1 ? 's' : ''}.</p>
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
              Deactivate
            </button>
          )}
          {org.ownStatus === 'ACTIVE' && (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700"
            >
              Suspend
            </button>
          )}
          {(org.ownStatus === 'SUSPENDED' || org.ownStatus === 'DEACTIVATED') && (
            <button
              onClick={reactivateOrg}
              disabled={actionLoading}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {actionLoading ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      {/* Direct children card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Direct Children <span className="text-gray-400 font-normal text-base">({org.children.length})</span>
        </h3>
        {org.children.length === 0 ? (
          <p className="text-sm text-gray-500">No child organizations</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Slug</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.children.map((child) => (
                  <tr key={child.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">{child.name}</td>
                    <td className="py-2 px-3 font-mono text-gray-500 text-xs">{child.slug}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[child.ownStatus]}`}>
                        {child.ownStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/portal/organizations/${child.id}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend confirmation modal */}
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
            <p className="text-xs text-gray-400 mb-4">Suspension is reversible. Reactivating will restore all cascade-suspended descendants.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={suspendOrg}
                disabled={actionLoading}
                className="bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
              >
                {actionLoading ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirmation modal */}
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
              This will deactivate <strong>{org.name}</strong>
              {descendantCount > 0 && (
                <> and all <strong>{descendantCount} descendant organization{descendantCount !== 1 ? 's' : ''}</strong></>
              )}.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Deactivated organizations lose access to their tenant portals. Reactivation is possible but is a significant action.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deactivateOrg}
                disabled={actionLoading}
                className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'overview' | 'hierarchy';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: organization, loading, updateOrganization } = useOrganization(organizationId);
  const { data: members, loading: membersLoading, updateMemberRole, removeMember } = useOrganizationMembers(organizationId);
  const { data: websites, loading: websitesLoading } = useOrganizationWebsites(organizationId);
  const { data: usage, loading: usageLoading } = useOrganizationUsage(organizationId);

  if (loading) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!organization) {
    return (
      <AdminLayout title="Not Found" subtitle="">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Organization not found</p>
          <button
            onClick={() => router.push('/admin/portal/organizations')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Organizations
          </button>
        </div>
      </AdminLayout>
    );
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
  ];

  return (
    <AdminLayout
      title={organization.name}
      subtitle={`Organization Details - ${organization.slug}`}
    >
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/portal/organizations')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
      >
        ← Back to Organizations
      </button>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile */}
            <OrganizationProfile organization={organization} />

            {/* Members */}
            <OrganizationMembers
              members={members}
              loading={membersLoading}
              onUpdateRole={updateMemberRole}
              onRemoveMember={removeMember}
            />

            {/* Websites */}
            <OrganizationWebsitesSection
              websites={websites}
              loading={websitesLoading}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <OrganizationSettings
              organization={organization}
              onUpdate={updateOrganization}
            />

            {/* Usage */}
            <OrganizationUsageCard
              usage={usage}
              loading={usageLoading}
            />
          </div>
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <HierarchyTab orgId={organizationId} />
      )}
    </AdminLayout>
  );
}
