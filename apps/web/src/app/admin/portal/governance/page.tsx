'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GovernanceConfig {
  maxCoParentsPerOrg?: string;
  proposalDefaultTtlDays?: string;
  [key: string]: string | undefined;
}

interface GovernanceRule {
  id: string;
  actionType: string;
  votingMode: string;
  quorumPercent: number | null;
  rejectMode: string;
  ttlDays: number;
  isActive: boolean;
}

interface GovernanceProposal {
  id: string;
  actionType: string;
  status: string;
  expiresAt: string | null;
  requiredVoterCount: number;
  childOrg: { id: string; name: string };
  initiatorOrg: { id: string; name: string };
  votes: { id: string }[];
}

type TabType = 'config' | 'rules' | 'proposals';

const VOTING_MODES = ['UNANIMOUS', 'QUORUM'] as const;
const REJECT_MODES = ['SINGLE_VETO', 'MAJORITY_VETO'] as const;
const PROPOSAL_STATUSES = ['', 'PENDING_VOTES', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse bg-gray-200 rounded h-4 w-full" />
      ))}
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab() {
  const [config, setConfig] = useState<GovernanceConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [maxCoParents, setMaxCoParents] = useState(1);
  const [ttlDays, setTtlDays] = useState(7);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch('/api/admin/governance/config');
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        const json = await res.json();
        const data: GovernanceConfig = json.data ?? {};
        setConfig(data);
        setMaxCoParents(data.maxCoParentsPerOrg ? Number(data.maxCoParentsPerOrg) : 1);
        setTtlDays(data.proposalDefaultTtlDays ? Number(data.proposalDefaultTtlDays) : 7);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load config');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setSuccess(false);
      setError(null);
      const res = await fetch('/api/admin/governance/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxCoParentsPerOrg: maxCoParents,
          proposalDefaultTtlDays: ttlDays,
        }),
      });
      if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  }, [maxCoParents, ttlDays]);

  if (loading) return <Skeleton />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Governance System Config</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          Config saved successfully.
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Co-Parents Per Org
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxCoParents}
            onChange={(e) => setMaxCoParents(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Proposal TTL (days)
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={ttlDays}
            onChange={(e) => setTtlDays(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Config'}
      </button>
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab() {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Partial<GovernanceRule>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch('/api/admin/governance/rules');
        if (!res.ok) throw new Error(`Failed to load rules: ${res.status}`);
        const json = await res.json();
        setRules(json.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load rules');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const startEdit = (rule: GovernanceRule) => {
    setEditingId(rule.id);
    setEditState({
      votingMode: rule.votingMode,
      quorumPercent: rule.quorumPercent ?? undefined,
      rejectMode: rule.rejectMode,
      ttlDays: rule.ttlDays,
      isActive: rule.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState({});
  };

  const saveEdit = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/governance/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const updated: GovernanceRule = await res.json();
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
      setEditState({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Voting Rules</h3>
      </div>

      {error && (
        <div className="mx-6 my-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Action Type', 'Voting Mode', 'Quorum %', 'Reject Mode', 'TTL (days)', 'Active', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rules.map((rule) =>
              editingId === rule.id ? (
                <tr key={rule.id} className="bg-blue-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{rule.actionType}</td>
                  <td className="px-4 py-3">
                    <select
                      value={editState.votingMode ?? rule.votingMode}
                      onChange={(e) => setEditState((s) => ({ ...s, votingMode: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {VOTING_MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {(editState.votingMode ?? rule.votingMode) === 'QUORUM' ? (
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editState.quorumPercent ?? ''}
                        onChange={(e) => setEditState((s) => ({ ...s, quorumPercent: Number(e.target.value) }))}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editState.rejectMode ?? rule.rejectMode}
                      onChange={(e) => setEditState((s) => ({ ...s, rejectMode: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {REJECT_MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={editState.ttlDays ?? rule.ttlDays}
                      onChange={(e) => setEditState((s) => ({ ...s, ttlDays: Number(e.target.value) }))}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={editState.isActive ?? rule.isActive}
                      onChange={(e) => setEditState((s) => ({ ...s, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => saveEdit(rule.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{rule.actionType}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {rule.votingMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rule.quorumPercent !== null ? `${rule.quorumPercent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{rule.rejectMode}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.ttlDays}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => startEdit(rule)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit rule"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              )
            )}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No governance rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Proposals Tab ────────────────────────────────────────────────────────────

function ProposalsTab() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  const loadProposals = useCallback(async (status: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/admin/governance/proposals${status ? `?status=${status}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load proposals: ${res.status}`);
      const json = await res.json();
      setProposals(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals(statusFilter);
  }, [statusFilter, loadProposals]);

  const forceResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setResolving(id);
      setError(null);
      const res = await fetch(`/api/admin/governance/proposals/${id}/force-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: 'Force-resolved by admin' }),
      });
      if (!res.ok) throw new Error(`Force resolve failed: ${res.status}`);
      await loadProposals(statusFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve proposal');
    } finally {
      setResolving(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_VOTES: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      EXPIRED: 'bg-gray-100 text-gray-600',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Proposals {!loading && <span className="text-sm text-gray-500 font-normal">({total} total)</span>}
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
          <button
            onClick={() => loadProposals(statusFilter)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 my-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6"><Skeleton /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Child Org', 'Action', 'Initiator', 'Status', 'Expires', 'Votes', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {proposals.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.childOrg?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{p.actionType}</td>
                  <td className="px-4 py-3 text-gray-700">{p.initiatorOrg?.name ?? '—'}</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.votes.length}/{p.requiredVoterCount}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'PENDING_VOTES' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => forceResolve(p.id, 'APPROVED')}
                          disabled={resolving === p.id}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => forceResolve(p.id, 'REJECTED')}
                          disabled={resolving === p.id}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No proposals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('config');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'rules' || tab === 'proposals') setActiveTab(tab);
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'config', label: 'System Config', icon: '⚙️' },
    { id: 'rules', label: 'Voting Rules', icon: '📋' },
    { id: 'proposals', label: 'Proposals', icon: '🗳️' },
  ];

  return (
    <AdminLayout
      title="Governance"
      subtitle="Configure multi-parent ownership rules and monitor proposals"
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'proposals' && <ProposalsTab />}
    </AdminLayout>
  );
}
