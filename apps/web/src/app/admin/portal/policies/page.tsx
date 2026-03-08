'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyRule {
  resource: string;
  actions: string[];
  allow: boolean;
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  rules: PolicyRule[];
  isDefault: boolean;
  createdAt: string;
  _count?: { assignments: number };
}

const RESOURCES = ['members', 'branding', 'integrations', 'websites', 'settings', 'governance', 'hierarchy'] as const;
const ACTIONS_BY_RESOURCE: Record<string, string[]> = {
  members:      ['invite', 'remove', 'update'],
  branding:     ['update'],
  integrations: ['create', 'update', 'delete'],
  websites:     ['create', 'publish', 'delete'],
  settings:     ['update'],
  governance:   ['create', 'vote'],
  hierarchy:    ['add-parent', 'remove-parent', 'add-child'],
};

function emptyRule(): PolicyRule {
  return { resource: 'members', actions: ['invite'], allow: false };
}

// ─── Rule Builder ─────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: PolicyRule;
  onChange: (r: PolicyRule) => void;
  onRemove: () => void;
}) {
  const availableActions = ['*', ...(ACTIONS_BY_RESOURCE[rule.resource] ?? [])];

  function toggleAction(action: string) {
    if (action === '*') {
      onChange({ ...rule, actions: ['*'] });
      return;
    }
    const without = rule.actions.filter((a) => a !== '*' && a !== action);
    const next = rule.actions.includes(action) ? without : [...without, action];
    onChange({ ...rule, actions: next.length ? next : ['*'] });
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Resource</span>
            <select
              value={rule.resource}
              onChange={(e) => onChange({ ...rule, resource: e.target.value, actions: ['*'] })}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Effect</span>
            <select
              value={rule.allow ? 'allow' : 'deny'}
              onChange={(e) => onChange({ ...rule, allow: e.target.value === 'allow' })}
              className={`border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                rule.allow
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : 'border-red-300 text-red-700 bg-red-50'
              }`}
            >
              <option value="allow">✓ Allow</option>
              <option value="deny">✗ Deny</option>
            </select>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Actions</span>
          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => toggleAction(action)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  rule.actions.includes(action)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="mt-1 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-base"
        title="Remove rule"
      >
        ×
      </button>
    </div>
  );
}

// ─── Policy Modal ─────────────────────────────────────────────────────────────

function PolicyModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Policy;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [rules, setRules] = useState<PolicyRule[]>(initial?.rules ?? [emptyRule()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError('Policy name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        initial ? `/api/admin/policies/${initial.id}` : '/api/admin/policies',
        {
          method: initial ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || null, rules, isDefault }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? 'Edit Policy' : 'New Permission Policy'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {initial ? 'Update policy name, description, and rules.' : 'Define what tenant admins can and cannot do.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-base">⚠️</span> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Policy Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Restricted Branding"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="What does this policy restrict or permit?"
              rows={2}
            />
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Apply to all orgs by default</p>
              <p className="text-xs text-gray-500">This policy will be enforced for all organizations unless overridden.</p>
            </div>
          </label>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <span className="text-sm font-semibold text-gray-700">Rules</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{rules.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setRules((r) => [...r, emptyRule()])}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                + Add Rule
              </button>
            </div>
            <div className="space-y-2.5">
              {rules.map((rule, i) => (
                <RuleRow
                  key={i}
                  rule={rule}
                  onChange={(r) => setRules((prev) => prev.map((x, j) => j === i ? r : x))}
                  onRemove={() => setRules((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
              {rules.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400">No rules yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Add a rule to restrict or explicitly allow actions.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">Rules are evaluated top-to-bottom. First match wins.</p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Policy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | Policy | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/policies')
      .then((r) => r.json())
      .then((d) => setPolicies(d.data ?? []))
      .catch(() => setError('Failed to load policies'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(policyId: string) {
    if (!confirm('Delete this policy? This cannot be undone.')) return;
    setDeleting(policyId);
    try {
      const res = await fetch(`/api/admin/policies/${policyId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Delete failed');
      }
      setSuccess('Policy deleted.');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminLayout title="Permission Policies" subtitle="Define what tenant org admins can and cannot do">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permission Policies</h1>
            <p className="text-sm text-gray-500 mt-1">
              Define what tenant org admins can and cannot do. Assign policies to specific orgs.
            </p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Policy
          </button>
        </div>

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-xl" />)}
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm mb-3">No permission policies yet.</p>
            <button
              onClick={() => setModal('create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create your first policy
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                      {policy.isDefault && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded">Default</span>
                      )}
                    </div>
                    {policy.description && (
                      <p className="text-sm text-gray-500 mb-2">{policy.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {policy.rules.slice(0, 5).map((rule, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs rounded border ${
                            rule.allow
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {rule.allow ? '✓' : '✗'} {rule.resource}: {rule.actions.join(', ')}
                        </span>
                      ))}
                      {policy.rules.length > 5 && (
                        <span className="px-2 py-0.5 text-xs text-gray-400">+{policy.rules.length - 5} more</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className="text-xs text-gray-400">{policy._count?.assignments ?? 0} orgs</span>
                    <button
                      onClick={() => setModal(policy)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      disabled={deleting === policy.id || (policy._count?.assignments ?? 0) > 0}
                      className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40"
                      title={(policy._count?.assignments ?? 0) > 0 ? 'Unassign from all orgs first' : 'Delete policy'}
                    >
                      {deleting === policy.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <PolicyModal
          initial={modal === 'create' ? undefined : (modal as Policy)}
          onSave={() => { setModal(null); load(); setSuccess('Policy saved.'); setTimeout(() => setSuccess(null), 3000); }}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
}
