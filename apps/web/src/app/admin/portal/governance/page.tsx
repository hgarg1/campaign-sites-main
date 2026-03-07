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

interface GovernanceVoteSummary {
  id: string;
  voterOrgId: string;
  voterUserId: string;
  decision: string;
  comment: string | null;
  votedAt: string;
}

interface GovernanceProposal {
  id: string;
  actionType: string;
  actionPayload?: unknown;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedReason?: string | null;
  requiredVoterCount: number;
  childOrg: { id: string; name: string; slug?: string };
  initiatorOrg: { id: string; name: string; slug?: string };
  votes: { id: string; decision?: string }[];
  approveCount?: number;
  rejectCount?: number;
}

interface GovernanceProposalDetail extends GovernanceProposal {
  votes: GovernanceVoteSummary[];
}

interface GovernanceStats {
  pending: number;
  approvedToday: number;
  expiredToday: number;
  totalOwnershipLinks: number;
  activeRules: number;
}

type TabType = 'config' | 'rules' | 'proposals';

const VOTING_MODES = ['UNANIMOUS', 'QUORUM'] as const;
const REJECT_MODES = ['SINGLE_VETO', 'MAJORITY_VETO'] as const;
const PROPOSAL_STATUSES = ['', 'PENDING_VOTES', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const;

const ACTION_TYPE_LABELS: Record<string, string> = {
  SUSPEND: 'Suspend Org',
  REACTIVATE: 'Reactivate Org',
  DEACTIVATE: 'Deactivate Org',
  UPDATE_SETTINGS: 'Update Settings',
  UPDATE_BRANDING: 'Update Branding',
  UPDATE_INTEGRATIONS: 'Update Integrations',
  UPDATE_RBAC: 'Change Member Role',
  ADD_PARENT: 'Add Parent',
  REMOVE_PARENT: 'Remove Parent',
  ADD_CHILD: 'Add Child Org',
};

function actionLabel(raw: string) {
  return ACTION_TYPE_LABELS[raw] ?? raw;
}

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

// ─── StatsPanel ───────────────────────────────────────────────────────────────

function StatsPanel() {
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/governance/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      icon: '🗳️',
      label: 'Pending Proposals',
      value: stats?.pending ?? 0,
      color: stats?.pending ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-500',
    },
    {
      icon: '✅',
      label: 'Approved Today',
      value: stats?.approvedToday ?? 0,
      color: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      icon: '⏰',
      label: 'Expired Today',
      value: stats?.expiredToday ?? 0,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
    },
    {
      icon: '🔗',
      label: 'Active Ownership Links',
      value: stats?.totalOwnershipLinks ?? 0,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      icon: '📋',
      label: 'Active Rules',
      value: stats?.activeRules ?? 0,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`border rounded-xl p-4 flex flex-col gap-1 ${card.color}`}
        >
          <div className="text-2xl">{card.icon}</div>
          {loading ? (
            <div className="animate-pulse bg-gray-200 rounded h-6 w-12" />
          ) : (
            <div className="text-2xl font-bold">{card.value}</div>
          )}
          <div className="text-xs font-medium">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [maxCoParents, setMaxCoParents] = useState(1);
  const [originalMaxCoParents, setOriginalMaxCoParents] = useState(1);
  const [ttlDays, setTtlDays] = useState(7);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch('/api/admin/governance/config');
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        const json = await res.json();
        const data: GovernanceConfig = json.data ?? {};
        const coParents = data.maxCoParentsPerOrg ? Number(data.maxCoParentsPerOrg) : 1;
        const ttl = data.proposalDefaultTtlDays ? Number(data.proposalDefaultTtlDays) : 7;
        setMaxCoParents(coParents);
        setOriginalMaxCoParents(coParents);
        setTtlDays(ttl);
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
      setOriginalMaxCoParents(maxCoParents);
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
          <p className="mt-1 text-xs text-gray-500">
            Maximum number of parent organizations that can co-own a single child org. Changing this does not automatically remove existing co-parent relationships.
          </p>
          {maxCoParents < originalMaxCoParents && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-xs">
              ⚠️ Lowering this limit won&apos;t remove existing co-parent relationships — you must manage those manually.
            </div>
          )}
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
          <p className="mt-1 text-xs text-gray-500">
            How long a proposal stays open for voting before it automatically expires. Individual action types can override this.
          </p>
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

  // Bulk Apply state
  const [bulkVotingMode, setBulkVotingMode] = useState<string>('UNANIMOUS');
  const [bulkRejectMode, setBulkRejectMode] = useState<string>('SINGLE_VETO');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  const loadRules = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

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

  const handleBulkApply = async () => {
    const activeRules = rules.filter((r) => r.isActive);
    if (activeRules.length === 0) return;
    setBulkApplying(true);
    setBulkSuccess(false);
    try {
      await Promise.all(
        activeRules.map((r) =>
          fetch(`/api/admin/governance/rules/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ votingMode: bulkVotingMode, rejectMode: bulkRejectMode }),
          })
        )
      );
      await loadRules();
      setBulkSuccess(true);
      setTimeout(() => setBulkSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk apply failed');
    } finally {
      setBulkApplying(false);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Voting Rules</h3>
      </div>

      {/* Bulk Apply */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Bulk Apply to Active Rules:</span>
        <select
          value={bulkVotingMode}
          onChange={(e) => setBulkVotingMode(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          disabled={bulkApplying}
        >
          {VOTING_MODES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select
          value={bulkRejectMode}
          onChange={(e) => setBulkRejectMode(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          disabled={bulkApplying}
        >
          {REJECT_MODES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <button
          onClick={handleBulkApply}
          disabled={bulkApplying}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {bulkApplying ? (
            <>
              <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
              Applying…
            </>
          ) : 'Apply to All Active Rules'}
        </button>
        {bulkSuccess && (
          <span className="text-green-600 text-sm font-medium">✓ Applied!</span>
        )}
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
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-sm">{actionLabel(rule.actionType)}</div>
                    <div className="font-mono text-xs text-gray-400">{rule.actionType}</div>
                  </td>
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
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-sm">{actionLabel(rule.actionType)}</div>
                    <div className="font-mono text-xs text-gray-400">{rule.actionType}</div>
                  </td>
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

// ─── Proposal Detail Slide-Over ────────────────────────────────────────────────

interface ProposalSlideOverProps {
  proposalId: string | null;
  onClose: () => void;
}

function ProposalSlideOver({ proposalId, onClose }: ProposalSlideOverProps) {
  const [detail, setDetail] = useState<GovernanceProposalDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!proposalId) { setDetail(null); return; }
    setLoading(true);
    fetch(`/api/admin/governance/proposals/${proposalId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data ?? null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [proposalId]);

  if (!proposalId) return null;

  const statusColors: Record<string, string> = {
    PENDING_VOTES: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Proposal Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1">
          {loading && <Skeleton />}
          {!loading && !detail && (
            <p className="text-gray-500 text-sm">Failed to load proposal details.</p>
          )}
          {!loading && detail && (
            <div className="space-y-5">
              {/* Header info */}
              <div>
                <div className="text-xs text-gray-400 font-mono mb-1">{detail.id}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[detail.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {detail.status}
                  </span>
                  <span className="text-xs text-gray-500">Created {new Date(detail.createdAt).toLocaleString()}</span>
                </div>
                {detail.expiresAt && (
                  <div className="text-xs text-gray-500 mt-1">Expires {new Date(detail.expiresAt).toLocaleString()}</div>
                )}
                {detail.resolvedAt && (
                  <div className="text-xs text-gray-500 mt-1">Resolved {new Date(detail.resolvedAt).toLocaleString()}</div>
                )}
              </div>

              {/* Orgs & Action */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400 uppercase font-medium mb-0.5">Child Org</div>
                  <div className="text-gray-800 font-medium">{detail.childOrg?.name ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase font-medium mb-0.5">Initiator Org</div>
                  <div className="text-gray-800 font-medium">{detail.initiatorOrg?.name ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-0.5">Action Type</div>
                  <div className="text-gray-800 font-medium">{actionLabel(detail.actionType)}</div>
                  <div className="text-xs text-gray-400 font-mono">{detail.actionType}</div>
                </div>
              </div>

              {/* Action Payload */}
              {detail.actionPayload !== undefined && detail.actionPayload !== null && (
                <div>
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Action Payload</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto border border-gray-100 max-h-40">
                    {JSON.stringify(detail.actionPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Votes */}
              <div>
                <div className="text-xs text-gray-400 uppercase font-medium mb-2">
                  Votes ({detail.votes.length}/{detail.requiredVoterCount})
                </div>
                {detail.votes.length === 0 ? (
                  <p className="text-gray-400 text-sm">No votes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.votes.map((v) => (
                      <div key={v.id} className="flex items-start gap-2 text-sm border border-gray-100 rounded p-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${v.decision === 'APPROVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.decision === 'APPROVE' ? '✓ APPROVE' : '✗ REJECT'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 font-mono truncate">{v.voterOrgId.slice(0, 12)}…</div>
                          {v.comment && <div className="text-xs text-gray-600 italic mt-0.5">{v.comment}</div>}
                          <div className="text-xs text-gray-400 mt-0.5">{new Date(v.votedAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Proposals Tab ────────────────────────────────────────────────────────────

function ProposalsTab() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  const loadProposals = useCallback(async (status: string, currentPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', String(currentPage));
      params.set('pageSize', String(pageSize));
      const res = await fetch(`/api/admin/governance/proposals?${params.toString()}`);
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
    loadProposals(statusFilter, page);
  }, [statusFilter, page, loadProposals]);

  const forceResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const confirmed = window.confirm(`Force ${decision} this proposal? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setResolving(id);
      setError(null);
      const res = await fetch(`/api/admin/governance/proposals/${id}/force-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: 'Force-resolved by admin' }),
      });
      if (!res.ok) throw new Error(`Force resolve failed: ${res.status}`);
      await loadProposals(statusFilter, page);
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalPages = Math.ceil(total / pageSize);

  // Client-side org name filter
  const filtered = orgSearch
    ? proposals.filter((p) =>
        (p.childOrg?.name ?? '').toLowerCase().includes(orgSearch.toLowerCase()) ||
        (p.initiatorOrg?.name ?? '').toLowerCase().includes(orgSearch.toLowerCase())
      )
    : proposals;

  return (
    <>
      <ProposalSlideOver
        proposalId={selectedProposalId}
        onClose={() => setSelectedProposalId(null)}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Proposals {!loading && <span className="text-sm text-gray-500 font-normal">({total} total)</span>}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search org name…"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROPOSAL_STATUSES.map((s) => (
                <option key={s} value={s}>{s || 'All Statuses'}</option>
              ))}
            </select>
            <button
              onClick={() => loadProposals(statusFilter, page)}
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
                  {['ID', 'Child Org', 'Action', 'Initiator', 'Created', 'Status', 'Expires', 'Votes (✓/✗)', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.childOrg?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{actionLabel(p.actionType)}</td>
                    <td className="px-4 py-3 text-gray-700">{p.initiatorOrg?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.createdAt ? formatDate(p.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(p.status)}
                      {p.status !== 'PENDING_VOTES' && p.resolvedReason && (
                        <div className="text-xs text-gray-400 italic mt-0.5">{p.resolvedReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {p.approveCount ?? 0}✓ {p.rejectCount ?? 0}✗ / {p.requiredVoterCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => setSelectedProposalId(p.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                          title="View details"
                        >
                          👁️
                        </button>
                        {p.status === 'PENDING_VOTES' && (
                          <>
                            <button
                              onClick={() => forceResolve(p.id, 'APPROVED')}
                              disabled={resolving === p.id}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => forceResolve(p.id, 'REJECTED')}
                              disabled={resolving === p.id}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              ✗
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No proposals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
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
      <StatsPanel />

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
