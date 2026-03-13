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
import { HierarchyGraph } from '@/components/shared/HierarchyGraph';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { logSystemAdminAction } from '@/lib/audit-log';

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
  const [showReactivateModal, setShowReactivateModal] = useState(false);
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

  async function suspendOrg(justification?: string) {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/suspend`, { method: 'POST' });
      setShowSuspendModal(false);
      
      // Log the action
      await logSystemAdminAction({
        action: 'ORGANIZATION_SUSPENDED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'SUSPENDED' },
        justification,
        status: 'success',
      });
      
      fetchHierarchy();
    } catch (error) {
      // Log the failure
      await logSystemAdminAction({
        action: 'ORGANIZATION_SUSPENDED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'SUSPENDED' },
        justification,
        status: 'failure',
        errorMessage: String(error),
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function deactivateOrg(justification?: string) {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/deactivate`, { method: 'POST' });
      setShowDeactivateModal(false);
      
      // Log the action
      await logSystemAdminAction({
        action: 'ORGANIZATION_DEACTIVATED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'DEACTIVATED' },
        justification,
        status: 'success',
      });
      
      fetchHierarchy();
    } catch (error) {
      // Log the failure
      await logSystemAdminAction({
        action: 'ORGANIZATION_DEACTIVATED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'DEACTIVATED' },
        justification,
        status: 'failure',
        errorMessage: String(error),
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function reactivateOrg(justification?: string) {
    setActionLoading(true);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/reactivate`, { method: 'POST' });
      
      // Log the action
      await logSystemAdminAction({
        action: 'ORGANIZATION_REACTIVATED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'ACTIVE' },
        justification,
        status: 'success',
      });
      
      fetchHierarchy();
    } catch (error) {
      // Log the failure
      await logSystemAdminAction({
        action: 'ORGANIZATION_REACTIVATED',
        resourceType: 'Organization',
        resourceId: orgId,
        resourceName: org.name,
        changes: { status: 'ACTIVE' },
        justification,
        status: 'failure',
        errorMessage: String(error),
      });
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
              onClick={() => setShowReactivateModal(true)}
              disabled={actionLoading}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {actionLoading ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      {/* Hierarchy visualization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Hierarchy</h3>
        <div style={{ height: '500px', width: '100%' }}>
          <HierarchyGraph 
            org={org}
            editable={false}
            onHierarchyChange={() => {}}
          />
        </div>
      </div>

      {/* Suspend confirmation modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        title="Suspend Organization"
        message={
          `This will suspend ${org.name}${
            descendantCount > 0 
              ? ` and cascade to ${descendantCount} descendant organization${descendantCount !== 1 ? 's' : ''} (skipping any already suspended)` 
              : ''
          }. Suspension is reversible.`
        }
        confirmText="Suspend"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={actionLoading}
        showJustification={true}
        icon="warning"
        onConfirm={suspendOrg}
        onCancel={() => setShowSuspendModal(false)}
      />

      {/* Deactivate confirmation modal */}
      <ConfirmationModal
        isOpen={showDeactivateModal}
        title="Deactivate Organization"
        message={
          `This will deactivate ${org.name}${
            descendantCount > 0 
              ? ` and all ${descendantCount} descendant organization${descendantCount !== 1 ? 's' : ''}`
              : ''
          }. Deactivated organizations lose access to their tenant portals.`
        }
        confirmText="Deactivate"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={actionLoading}
        showJustification={true}
        icon="error"
        onConfirm={deactivateOrg}
        onCancel={() => setShowDeactivateModal(false)}
      />

      {/* Reactivate confirmation modal */}
      <ConfirmationModal
        isOpen={showReactivateModal}
        title="Reactivate Organization"
        message={
          `This will reactivate ${org.name} and restore access to all users.${
            org.ownStatus === 'DEACTIVATED' 
              ? ' Note: This is a significant action for deactivated organizations.'
              : ''
          }`
        }
        confirmText="Reactivate"
        cancelText="Cancel"
        isDangerous={false}
        isLoading={actionLoading}
        showJustification={true}
        icon="info"
        onConfirm={reactivateOrg}
        onCancel={() => setShowReactivateModal(false)}
      />
    </div>
  );
}

// ─── Policies Tab Component ──────────────────────────────────────────────────

interface Policy {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  _count: { orgAssignments: number };
}

interface InheritedPolicy {
  id: string;
  parentOrgId: string;
  rules: { resource: string; actions: string[]; allow: boolean }[];
  note: string | null;
  parentOrg?: { id: string; name: string; slug: string };
}

function PoliciesTab({ orgId }: { orgId: string }) {
  const [assignments, setAssignments] = useState<Policy[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<Policy[]>([]);
  const [effectivePolicy, setEffectivePolicy] = useState<{ source: string; rules: { resource: string; actions: string[]; allow: boolean }[] } | null>(null);
  const [inheritedPolicies, setInheritedPolicies] = useState<InheritedPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, allRes, effectiveRes, inheritedRes] = await Promise.all([
        globalThis.fetch(`/api/admin/organizations/${orgId}/policies`),
        globalThis.fetch('/api/admin/policies'),
        globalThis.fetch(`/api/admin/organizations/${orgId}/effective-policy`),
        globalThis.fetch(`/api/admin/organizations/${orgId}/inherited-policies`),
      ]);
      const [assignData, allData, effectiveData, inheritedData] = await Promise.all([
        assignRes.json(),
        allRes.json(),
        effectiveRes.ok ? effectiveRes.json() : { source: 'No policy data', rules: [] },
        inheritedRes.ok ? inheritedRes.json() : { data: [] },
      ]);
      setAssignments(assignData.assignments ?? []);
      setAvailablePolicies(allData.data ?? []);
      setEffectivePolicy(effectiveData ?? null);
      setInheritedPolicies(inheritedData.data ?? []);
    } catch {
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const assignedIds = new Set(assignments.map((p) => p.id));
  const unassignedPolicies = availablePolicies.filter((p) => !assignedIds.has(p.id) && !p.isDefault);

  async function assign() {
    if (!selectedPolicyId) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`/api/admin/organizations/${orgId}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: selectedPolicyId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to assign policy');
      } else {
        setSelectedPolicyId('');
        load();
      }
    } finally {
      setAssigning(false);
    }
  }

  async function unassign(policyId: string) {
    setRemoving(policyId);
    try {
      await globalThis.fetch(`/api/admin/organizations/${orgId}/policies/${policyId}`, { method: 'DELETE' });
      load();
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Assigned Policies */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Applied Policies</h3>
            <p className="text-sm text-gray-500 mt-1">Policies directly assigned to this organization.</p>
          </div>
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No policies explicitly assigned. Org inherits any default policy.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                </div>
                <button
                  onClick={() => unassign(p.id)}
                  disabled={removing === p.id}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {removing === p.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Assign new */}
        {unassignedPolicies.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select policy to assign…</option>
              {unassignedPolicies.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={!selectedPolicyId || assigning}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        )}
      </div>

      {/* Inherited policies from parent orgs */}
      {inheritedPolicies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Parent-Set Restrictions</h3>
          <p className="text-sm text-gray-500 mb-4">Policies imposed on this org by its parent organizations.</p>
          <div className="space-y-4">
            {inheritedPolicies.map((ip) => (
              <div key={ip.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  From: <span className="font-bold">{ip.parentOrg?.name ?? ip.parentOrgId}</span>
                </p>
                {ip.note && <p className="text-xs text-amber-700 italic mb-2">&quot;{ip.note}&quot;</p>}
                {ip.rules.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="text-left py-1 px-2 text-amber-700 font-medium">Resource</th>
                        <th className="text-left py-1 px-2 text-amber-700 font-medium">Actions</th>
                        <th className="text-left py-1 px-2 text-amber-700 font-medium">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ip.rules.map((rule, i) => (
                        <tr key={i} className="border-b border-amber-100 last:border-0">
                          <td className="py-1 px-2 font-mono text-gray-900">{rule.resource}</td>
                          <td className="py-1 px-2 font-mono text-gray-600">{rule.actions.join(', ')}</td>
                          <td className="py-1 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.allow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {rule.allow ? 'Allow' : 'Deny'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-amber-600">No rules.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effective policy view */}
      {effectivePolicy && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Effective Policy Rules</h3>
          <p className="text-sm text-gray-500 mb-4">
            Source: <span className="font-medium text-gray-700">{effectivePolicy.source}</span>
          </p>
          {effectivePolicy.rules.length === 0 ? (
            <p className="text-sm text-gray-400">No rules — all actions permitted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Resource</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Actions</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {effectivePolicy.rules.map((rule, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono text-gray-900">{rule.resource}</td>
                      <td className="py-2 px-3 font-mono text-gray-600">{rule.actions.join(', ')}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.allow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {rule.allow ? 'Allow' : 'Deny'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a href="/admin/portal/policies" className="text-sm text-blue-600 hover:underline font-medium">
              Manage system policies →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'overview' | 'hierarchy' | 'policies';

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
    { id: 'policies', label: 'Policies' },
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

      {activeTab === 'policies' && (
        <PoliciesTab orgId={organizationId} />
      )}
    </AdminLayout>
  );
}
