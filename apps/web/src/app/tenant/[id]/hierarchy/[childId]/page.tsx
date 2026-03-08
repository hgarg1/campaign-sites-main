'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

interface PolicyRule {
  resource: string;
  actions: string[];
  allow: boolean;
}

const RESOURCES = ['settings', 'branding', 'members', 'integrations', 'websites', 'governance', 'hierarchy'];
const ACTIONS: Record<string, string[]> = {
  settings: ['update'],
  branding: ['update'],
  members: ['invite', 'update', 'remove'],
  integrations: ['create', 'update', 'delete'],
  websites: ['create', 'publish', 'delete'],
  governance: ['create', 'vote'],
  hierarchy: ['add-child', 'remove-parent'],
};

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

  // ── Policy management ──────────────────────────────────────────────────────
  const [policy, setPolicy] = useState<{ id: string; rules: PolicyRule[]; note: string | null } | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policyEdit, setPolicyEdit] = useState(false);
  const [editRules, setEditRules] = useState<PolicyRule[]>([]);
  const [editNote, setEditNote] = useState('');
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (!accessOk) return;
    setPolicyLoading(true);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/policy`);
      if (res.ok) {
        const d = await res.json();
        setPolicy(d.policy);
        if (d.policy) {
          setEditRules(d.policy.rules ?? []);
          setEditNote(d.policy.note ?? '');
        }
      }
    } finally { setPolicyLoading(false); }
  }, [orgId, childId, accessOk]);

  useEffect(() => { if (accessOk) fetchPolicy(); }, [accessOk, fetchPolicy]);

  const savePolicy = async () => {
    setPolicySaving(true);
    setPolicyMsg(null);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: editRules, note: editNote }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPolicyMsg(d.error ?? 'Failed to save');
      } else {
        const d = await res.json();
        setPolicy(d.policy);
        setPolicyEdit(false);
        setPolicyMsg('Policy saved.');
        setTimeout(() => setPolicyMsg(null), 3000);
      }
    } finally { setPolicySaving(false); }
  };

  const removePolicy = async () => {
    setPolicySaving(true);
    try {
      await globalThis.fetch(`/api/tenant/${orgId}/children/${childId}/policy`, { method: 'DELETE' });
      setPolicy(null);
      setEditRules([]);
      setEditNote('');
      setPolicyEdit(false);
      setPolicyMsg('Restrictions removed.');
      setTimeout(() => setPolicyMsg(null), 3000);
    } finally { setPolicySaving(false); }
  };

  const addRule = () => setEditRules(r => [...r, { resource: 'settings', actions: ['update'], allow: false }]);
  const removeRule = (i: number) => setEditRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: keyof PolicyRule, value: unknown) =>
    setEditRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: value } : rule));

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

      {/* Policy Restrictions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Policy Restrictions</h3>
            <p className="text-sm text-gray-500 mt-1">
              Restrict what this child organization can do in their portal.
            </p>
          </div>
          {!policyEdit && (
            <button
              onClick={() => { setPolicyEdit(true); if (!policy) { setEditRules([]); setEditNote(''); } }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {policy ? 'Edit Restrictions' : '+ Add Restrictions'}
            </button>
          )}
        </div>

        {policyMsg && (
          <div className={`mb-4 px-3 py-2 rounded text-sm ${policyMsg.startsWith('Failed') || policyMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {policyMsg}
          </div>
        )}

        {policyLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : policyEdit ? (
          <div className="space-y-4">
            {editRules.length === 0 && (
              <p className="text-sm text-gray-400">No rules yet — add a restriction below.</p>
            )}
            {editRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">
                <select
                  value={rule.resource}
                  onChange={e => updateRule(i, 'resource', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {RESOURCES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  multiple
                  value={rule.actions}
                  onChange={e => updateRule(i, 'actions', Array.from(e.target.selectedOptions, o => o.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  size={3}
                >
                  {(ACTIONS[rule.resource] ?? ['*']).map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="*">* (all)</option>
                </select>
                <select
                  value={rule.allow ? 'allow' : 'deny'}
                  onChange={e => updateRule(i, 'allow', e.target.value === 'allow')}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="deny">Deny</option>
                  <option value="allow">Allow</option>
                </select>
                <button onClick={() => removeRule(i)} className="text-red-500 hover:text-red-700 text-lg font-bold leading-none px-1">×</button>
              </div>
            ))}

            <button
              onClick={addRule}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-dashed border-blue-300 rounded-lg px-4 py-2 w-full"
            >
              + Add Rule
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional — shown to child org admins)</label>
              <input
                type="text"
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder="e.g. Branding locked during campaign season"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={savePolicy}
                disabled={policySaving}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {policySaving ? 'Saving…' : 'Save Restrictions'}
              </button>
              <button
                onClick={() => { setPolicyEdit(false); if (policy) { setEditRules(policy.rules); setEditNote(policy.note ?? ''); } }}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              {policy && (
                <button
                  onClick={removePolicy}
                  disabled={policySaving}
                  className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Remove All Restrictions
                </button>
              )}
            </div>
          </div>
        ) : policy && policy.rules.length > 0 ? (
          <div className="space-y-2">
            {policy.note && (
              <p className="text-sm text-gray-600 italic mb-3">&quot;{policy.note}&quot;</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Resource</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Actions</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {policy.rules.map((rule, i) => (
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
        ) : (
          <p className="text-sm text-gray-400">No restrictions set — child org has full autonomy.</p>
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
