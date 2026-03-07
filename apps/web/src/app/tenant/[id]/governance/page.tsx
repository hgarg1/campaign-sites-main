'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrgRef { id: string; name: string }

interface Vote {
  id: string;
  voterOrgId: string;
  voterUserId?: string;
  decision: 'APPROVE' | 'REJECT';
  comment?: string | null;
  createdAt?: string;
}

interface Proposal {
  id: string;
  childOrgId: string;
  childOrg: OrgRef;
  initiatorOrgId: string;
  initiatorOrg: OrgRef;
  actionType: string;
  actionPayload: Record<string, unknown>;
  status: string;
  requiredVoterCount: number;
  expiresAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedReason: string | null;
  votes: Vote[];
}

interface TabCounts {
  pendingCount: number;
  mineCount: number;
  historyCount: number;
  incomingCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  PENDING_VOTES: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const ALL_ACTION_TYPES = Object.keys(ACTION_LABELS);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function VoteBadge({ decision }: { decision: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${decision === 'APPROVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      {decision === 'APPROVE' ? '✓ Approve' : '✗ Reject'}
    </span>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function timeUntil(iso: string | null): { text: string; color: string } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 24) return { text: `Expires in ${hours}h ${minutes}m`, color: 'text-red-600 font-medium' };
  if (hours < 48) return { text: `Expires in ${hours}h ${minutes}m`, color: 'text-orange-500 font-medium' };
  return null;
}

// ─── Proposal Detail Slide-over ────────────────────────────────────────────────

function ProposalDetailSlideOver({
  orgId,
  proposalId,
  onClose,
  onVoted,
}: {
  orgId: string;
  proposalId: string;
  onClose: () => void;
  onVoted?: () => void;
}) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteState, setVoteState] = useState<{ decision: 'APPROVE' | 'REJECT' | null; comment: string; submitting: boolean; error: string; success: boolean }>({
    decision: null, comment: '', submitting: false, error: '', success: false,
  });

  const fetchProposal = useCallback(() => {
    setLoading(true);
    fetch(`/api/tenant/${orgId}/governance/${proposalId}`)
      .then((r) => r.json())
      .then(setProposal)
      .finally(() => setLoading(false));
  }, [orgId, proposalId]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  async function submitVote() {
    if (!voteState.decision) return;
    setVoteState((s) => ({ ...s, submitting: true, error: '' }));
    try {
      const res = await fetch(`/api/tenant/${orgId}/governance/${proposalId}?action=vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: voteState.decision, comment: voteState.comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoteState((s) => ({ ...s, submitting: false, error: data.error ?? 'Failed to cast vote' }));
        return;
      }
      setVoteState({ decision: null, comment: '', submitting: false, error: '', success: true });
      fetchProposal();
      onVoted?.();
      setTimeout(() => setVoteState((s) => ({ ...s, success: false })), 3000);
    } catch {
      setVoteState((s) => ({ ...s, submitting: false, error: 'Network error' }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Proposal Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-200 rounded h-4 w-full" />)}
          </div>
        ) : !proposal ? (
          <div className="p-6 text-red-600">Failed to load proposal.</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Action</span><div className="font-medium">{ACTION_LABELS[proposal.actionType] ?? proposal.actionType}</div></div>
              <div><span className="text-gray-500">Status</span><div><StatusBadge status={proposal.status} /></div></div>
              <div><span className="text-gray-500">Child Org</span><div className="font-medium">{proposal.childOrg?.name ?? proposal.childOrgId}</div></div>
              <div><span className="text-gray-500">Initiated By</span><div className="font-medium">{proposal.initiatorOrg?.name ?? proposal.initiatorOrgId}</div></div>
              <div><span className="text-gray-500">Created</span><div>{formatDate(proposal.createdAt)}</div></div>
              <div><span className="text-gray-500">Expires</span><div className={isExpiringSoon(proposal.expiresAt) ? 'text-red-600 font-medium' : ''}>{formatDate(proposal.expiresAt)}</div></div>
              {proposal.resolvedAt && <div><span className="text-gray-500">Resolved</span><div>{formatDate(proposal.resolvedAt)}</div></div>}
              {proposal.resolvedReason && <div className="col-span-2"><span className="text-gray-500">Reason</span><div>{proposal.resolvedReason}</div></div>}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Action Payload</h3>
              <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-48">
                {JSON.stringify(proposal.actionPayload, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Votes ({proposal.votes.length} / {proposal.requiredVoterCount})
              </h3>
              {proposal.votes.length === 0 ? (
                <p className="text-sm text-gray-500">No votes cast yet.</p>
              ) : (
                <ul className="space-y-2">
                  {proposal.votes.map((v) => (
                    <li key={v.id} className="flex items-start gap-3 text-sm border rounded p-2">
                      <VoteBadge decision={v.decision} />
                      <div>
                        <div className="font-medium font-mono">{v.voterOrgId.slice(0, 8)}…</div>
                        {v.comment && <div className="text-gray-500 mt-0.5">{v.comment}</div>}
                        {v.createdAt && <div className="text-xs text-gray-400">{formatDate(v.createdAt)}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {proposal.status === 'PENDING_VOTES' && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Cast Your Vote</h3>
                {voteState.success && (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2 text-sm mb-3">
                    ✓ Your vote has been recorded.
                  </div>
                )}
                {voteState.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-3">
                    {voteState.error}
                  </div>
                )}
                {voteState.decision === null ? (
                  <div className="flex gap-2">
                    <button onClick={() => setVoteState((s) => ({ ...s, decision: 'APPROVE' }))} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-medium py-2 rounded-lg text-sm">✓ Approve</button>
                    <button onClick={() => setVoteState((s) => ({ ...s, decision: 'REJECT' }))} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2 rounded-lg text-sm">✗ Reject</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Optional comment…"
                      rows={2}
                      value={voteState.comment}
                      onChange={(e) => setVoteState((s) => ({ ...s, comment: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={submitVote}
                        disabled={voteState.submitting}
                        className={`flex-1 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-50 ${voteState.decision === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {voteState.submitting ? 'Submitting…' : `Confirm ${voteState.decision === 'APPROVE' ? 'Approve' : 'Reject'}`}
                      </button>
                      <button onClick={() => setVoteState((s) => ({ ...s, decision: null, comment: '' }))} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Proposal Slide-over ───────────────────────────────────────────────────

function NewProposalSlideOver({
  orgId,
  onClose,
  onSuccess,
}: {
  orgId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [childOrgId, setChildOrgId] = useState('');
  const [actionType, setActionType] = useState('SUSPEND');
  const [description, setDescription] = useState('');
  const [payloadJson, setPayloadJson] = useState('{}');
  const [memberId, setMemberId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [parentOrgId, setParentOrgId] = useState('');
  const [childPayloadOrgId, setChildPayloadOrgId] = useState('');
  const [integrationId, setIntegrationId] = useState('');
  const [integrationConfigJson, setIntegrationConfigJson] = useState('{}');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [childOrgs, setChildOrgs] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [childOrgsLoading, setChildOrgsLoading] = useState(true);
  const [childOrgsFetchFailed, setChildOrgsFetchFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/tenant/${orgId}/governance?tab=children`)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((data: { id: string; name: string; slug: string }[]) => setChildOrgs(data))
      .catch(() => setChildOrgsFetchFailed(true))
      .finally(() => setChildOrgsLoading(false));
  }, [orgId]);

  function buildPayload(): Record<string, unknown> {
    if (['SUSPEND', 'REACTIVATE', 'DEACTIVATE'].includes(actionType)) {
      return {};
    }
    if (['UPDATE_SETTINGS', 'UPDATE_BRANDING'].includes(actionType)) {
      try { return { settings: JSON.parse(payloadJson) }; } catch { return {}; }
    }
    if (actionType === 'UPDATE_RBAC') {
      return { memberId, newRole };
    }
    if (actionType === 'ADD_PARENT' || actionType === 'REMOVE_PARENT') {
      return { parentOrgId };
    }
    if (actionType === 'ADD_CHILD') {
      return { childOrgId: childPayloadOrgId };
    }
    if (actionType === 'UPDATE_INTEGRATIONS') {
      try { return { integrationId, integrationConfig: JSON.parse(integrationConfigJson) }; } catch { return {}; }
    }
    return {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/governance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childOrgId, actionType, payload: buildPayload(), description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create proposal'); return; }
      const msg = data.autoExecuted
        ? 'Action executed immediately (sole owner).'
        : 'Proposal created — co-owners have been notified.';
      onSuccess(msg);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  function renderPayloadFields() {
    if (['SUSPEND', 'REACTIVATE', 'DEACTIVATE'].includes(actionType)) return null;
    if (['UPDATE_SETTINGS', 'UPDATE_BRANDING'].includes(actionType)) return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Settings JSON</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono" rows={4} value={payloadJson} onChange={(e) => setPayloadJson(e.target.value)} />
      </div>
    );
    if (actionType === 'UPDATE_RBAC') return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ADMIN / MEMBER / OWNER" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
        </div>
      </>
    );
    if (actionType === 'ADD_PARENT' || actionType === 'REMOVE_PARENT') return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Org ID</label>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={parentOrgId} onChange={(e) => setParentOrgId(e.target.value)} />
      </div>
    );
    if (actionType === 'ADD_CHILD') return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Child Org ID</label>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={childPayloadOrgId} onChange={(e) => setChildPayloadOrgId(e.target.value)} />
      </div>
    );
    if (actionType === 'UPDATE_INTEGRATIONS') return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Integration ID</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={integrationId} onChange={(e) => setIntegrationId(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Config JSON</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono" rows={4} value={integrationConfigJson} onChange={(e) => setIntegrationConfigJson(e.target.value)} />
        </div>
      </>
    );
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">New Proposal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child Org *</label>
            {childOrgsLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-9 w-full" />
            ) : childOrgsFetchFailed ? (
              <input required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Paste child org ID…" value={childOrgId} onChange={(e) => setChildOrgId(e.target.value)} />
            ) : childOrgs.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You have no owned child organizations. Add co-parents on the Hierarchy page first.
              </p>
            ) : (
              <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={childOrgId} onChange={(e) => setChildOrgId(e.target.value)}>
                <option value="">Select a child org…</option>
                {childOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type *</label>
            <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={actionType} onChange={(e) => setActionType(e.target.value)}>
              {ALL_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>{ACTION_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {['SUSPEND', 'DEACTIVATE'].includes(actionType) && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-lg px-3 py-2 text-sm">
              ⚠️ This is a destructive action. All co-owners must approve before it takes effect.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {renderPayloadFields()}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting || (!childOrgsFetchFailed && !childOrgsLoading && childOrgs.length === 0)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Create Proposal'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pending Vote Tab ──────────────────────────────────────────────────────────

function PendingVoteTab({ orgId, onRefresh, onViewDetail }: { orgId: string; onRefresh: () => void; onViewDetail: (id: string) => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, { decision: 'APPROVE' | 'REJECT' | null; comment: string; submitting: boolean; error: string; voteSuccess: boolean }>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/tenant/${orgId}/governance?tab=pending`)
      .then((r) => r.json())
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  function startVote(id: string, decision: 'APPROVE' | 'REJECT') {
    setVoting((v) => ({ ...v, [id]: { ...(v[id] ?? { comment: '', submitting: false, error: '', voteSuccess: false }), decision } }));
  }

  async function submitVote(p: Proposal) {
    const v = voting[p.id];
    if (!v?.decision) return;
    setVoting((prev) => ({ ...prev, [p.id]: { ...prev[p.id], submitting: true, error: '' } }));
    try {
      const res = await fetch(`/api/tenant/${orgId}/governance/${p.id}?action=vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: v.decision, comment: v.comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoting((prev) => ({ ...prev, [p.id]: { ...prev[p.id], submitting: false, error: data.error ?? 'Failed to cast vote' } }));
        return;
      }
      setVoting((prev) => ({ ...prev, [p.id]: { decision: null, comment: '', submitting: false, error: '', voteSuccess: true } }));
      load();
      onRefresh();
      setTimeout(() => setVoting((prev) => ({ ...prev, [p.id]: { ...prev[p.id], voteSuccess: false } })), 3000);
    } catch {
      setVoting((prev) => ({ ...prev, [p.id]: { ...prev[p.id], submitting: false, error: 'Network error' } }));
    }
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="animate-pulse bg-gray-200 rounded h-20" />)}</div>;
  if (!proposals.length) return <div className="text-center py-12 text-gray-500">No pending votes — you&apos;re all caught up! 🎉</div>;

  return (
    <div className="space-y-4">
      {proposals.map((p) => {
        const approvals = p.votes.filter((v) => v.decision === 'APPROVE').length;
        const rejections = p.votes.filter((v) => v.decision === 'REJECT').length;
        const voteState = voting[p.id];
        const countdown = timeUntil(p.expiresAt);
        const expiringSoon = isExpiringSoon(p.expiresAt);

        return (
          <div key={p.id} className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">{p.childOrg?.name ?? p.childOrgId}</div>
                <div className="text-sm text-gray-500">{ACTION_LABELS[p.actionType] ?? p.actionType}</div>
                {!!p.actionPayload?.description && (
                  <p className="text-xs text-gray-400 italic mt-0.5">{String(p.actionPayload.description)}</p>
                )}
                <div className="text-xs text-gray-400 mt-1">Initiated by{p.initiatorOrg?.name ?? p.initiatorOrgId} · {formatDate(p.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onViewDetail(p.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 rounded px-2 py-1">👁️ Details</button>
                <StatusBadge status={p.status} />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{approvals + rejections} of {p.requiredVoterCount} voted</span>
                {countdown ? (
                  <span className={countdown.color}>{countdown.text}</span>
                ) : (
                  <span className={expiringSoon ? 'text-red-600 font-medium' : ''}>
                    Expires {formatDate(p.expiresAt)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${p.requiredVoterCount > 0 ? ((approvals + rejections) / p.requiredVoterCount) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs mt-1">
                <span className="text-green-600">✓ {approvals} approve</span>
                <span className="text-red-600">✗ {rejections} reject</span>
              </div>
            </div>

            {voteState?.voteSuccess && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2 text-sm">
                ✓ Your vote has been recorded.
              </div>
            )}

            {!voteState || voteState.decision === null ? (
              <div className="flex gap-2 mt-4">
                <button onClick={() => startVote(p.id, 'APPROVE')} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-medium py-2 rounded-lg text-sm">✓ Approve</button>
                <button onClick={() => startVote(p.id, 'REJECT')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2 rounded-lg text-sm">✗ Reject</button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional comment…"
                  rows={2}
                  value={voteState.comment}
                  onChange={(e) => setVoting((prev) => ({ ...prev, [p.id]: { ...prev[p.id], comment: e.target.value } }))}
                />
                {voteState.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
                    {voteState.error}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => submitVote(p)}
                    disabled={voteState.submitting}
                    className={`flex-1 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-50 ${voteState.decision === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {voteState.submitting ? 'Submitting…' : `Confirm ${voteState.decision === 'APPROVE' ? 'Approve' : 'Reject'}`}
                  </button>
                  <button onClick={() => setVoting((prev) => { const next = { ...prev }; delete next[p.id]; return next; })} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── My Proposals Tab ─────────────────────────────────────────────────────────

function MyProposalsTab({ orgId, onViewDetail, onRefresh }: { orgId: string; onViewDetail: (id: string) => void; onRefresh: () => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/tenant/${orgId}/governance?tab=mine`)
      .then((r) => r.json())
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function cancelProp(p: Proposal) {
    if (!window.confirm(`Cancel proposal for "${ACTION_LABELS[p.actionType] ?? p.actionType}" on "${p.childOrg?.name}"?`)) return;
    setCancelError('');
    const res = await fetch(`/api/tenant/${orgId}/governance/${p.id}?action=cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCancelError(data.error ?? 'Failed to cancel proposal');
      return;
    }
    load(); onRefresh();
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="animate-pulse bg-gray-200 rounded h-12" />)}</div>;
  if (!proposals.length) return <div className="text-center py-12 text-gray-500">You haven&apos;t initiated any proposals yet.</div>;

  return (
    <div className="overflow-x-auto">
      {cancelError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{cancelError}</div>
      )}
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th colSpan={8} className="px-4 py-2 text-right">
              <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 border rounded px-2 py-1">🔄 Refresh</button>
            </th>
          </tr>
          <tr>
            {['Child Org','Action','Status','Created','Expires/Resolved','Resolved Reason','Votes','Actions'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {proposals.map((p) => {
            const approvals = p.votes.filter((v) => v.decision === 'APPROVE').length;
            const rejections = p.votes.filter((v) => v.decision === 'REJECT').length;
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.childOrg?.name ?? p.childOrgId}</td>
                <td className="px-4 py-3">{ACTION_LABELS[p.actionType] ?? p.actionType}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                <td className={`px-4 py-3 ${isExpiringSoon(p.expiresAt) && p.status === 'PENDING_VOTES' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {p.resolvedAt ? formatDate(p.resolvedAt) : formatDate(p.expiresAt)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs italic">{p.resolvedReason ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-green-600">✓{approvals}</span> <span className="text-red-500 ml-1">✗{rejections}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onViewDetail(p.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">👁️ View</button>
                    {p.status === 'PENDING_VOTES' && (
                      <button onClick={() => cancelProp(p)} className="text-red-600 hover:text-red-800 text-xs font-medium">✕ Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Incoming Tab ─────────────────────────────────────────────────────────────

function IncomingTab({ orgId, onViewDetail }: { orgId: string; onViewDetail: (id: string) => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tenant/${orgId}/governance?tab=incoming`)
      .then((r) => r.json())
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="animate-pulse bg-gray-200 rounded h-12" />)}</div>;
  if (!proposals.length) return <div className="text-center py-12 text-gray-500">No incoming proposals targeting your org.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Proposed By','Action','Status','Created','Expires','Votes'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {proposals.map((p) => {
            const approvals = p.votes.filter((v) => v.decision === 'APPROVE').length;
            const rejections = p.votes.filter((v) => v.decision === 'REJECT').length;
            return (
              <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetail(p.id)}>
                <td className="px-4 py-3 font-medium">{p.initiatorOrg?.name ?? p.initiatorOrgId}</td>
                <td className="px-4 py-3">
                  <div>{ACTION_LABELS[p.actionType] ?? p.actionType}</div>
                  {!!p.actionPayload?.description && (
                    <p className="text-xs text-gray-400 italic mt-0.5">{String(p.actionPayload.description)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                  {p.resolvedReason && (
                    <p className="text-xs text-gray-400 italic mt-1">{p.resolvedReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                <td className={`px-4 py-3 ${isExpiringSoon(p.expiresAt) && p.status === 'PENDING_VOTES' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(p.expiresAt)}</td>
                <td className="px-4 py-3">
                  <span className="text-green-600">✓{approvals}</span> <span className="text-red-500 ml-1">✗{rejections}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ orgId, onViewDetail }: { orgId: string; onViewDetail: (id: string) => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetch(`/api/tenant/${orgId}/governance?tab=history`)
      .then((r) => r.json())
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="animate-pulse bg-gray-200 rounded h-12" />)}</div>;
  if (!proposals.length) return <div className="text-center py-12 text-gray-500">No resolved proposals yet.</div>;

  const filtered = actionFilter ? proposals.filter((p) => p.actionType === actionFilter) : proposals;

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Filter by action:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          {ALL_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>{ACTION_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Child Org','Action','Status','Initiated By','Created','Resolved','Resolved Reason','Votes'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {filtered.map((p) => {
            const approvals = p.votes.filter((v) => v.decision === 'APPROVE').length;
            const rejections = p.votes.filter((v) => v.decision === 'REJECT').length;
            return (
              <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetail(p.id)}>
                <td className="px-4 py-3 font-medium">{p.childOrg?.name ?? p.childOrgId}</td>
                <td className="px-4 py-3">{ACTION_LABELS[p.actionType] ?? p.actionType}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-gray-500">{p.initiatorOrg?.name ?? p.initiatorOrgId}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.resolvedAt)}</td>
                <td className="px-4 py-3 text-xs text-gray-400 italic">{p.resolvedReason ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-green-600">✓{approvals}</span> <span className="text-red-500 ml-1">✗{rejections}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'mine' | 'incoming' | 'history';

export default function GovernancePage() {
  const params = useParams();
  const orgId = params.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get('tab') as TabKey | null) ?? 'pending';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [counts, setCounts] = useState<TabCounts | null>(null);
  const [detailProposalId, setDetailProposalId] = useState<string | null>(null);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadCounts = useCallback(() => {
    fetch(`/api/tenant/${orgId}/governance`)
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, [orgId]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`);
  }

  function handleNewProposalSuccess(msg: string) {
    setShowNewProposal(false);
    setSuccessMessage(msg);
    loadCounts();
    setTimeout(() => setSuccessMessage(''), 5000);
  }

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: 'pending', label: 'Pending Vote', icon: '🗳️', count: counts?.pendingCount },
    { key: 'mine', label: 'My Proposals', icon: '📤', count: counts?.mineCount },
    { key: 'incoming', label: 'Incoming', icon: '📥', count: counts?.incomingCount },
    { key: 'history', label: 'History', icon: '📋', count: counts?.historyCount },
  ];

  return (
    <TenantLayout title="Governance" orgId={orgId}>
      <div className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
            ✓ {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewProposal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            + New Proposal
          </button>
        </div>

        <div>
          {activeTab === 'pending' && <PendingVoteTab orgId={orgId} onRefresh={loadCounts} onViewDetail={setDetailProposalId} />}
          {activeTab === 'mine' && <MyProposalsTab orgId={orgId} onViewDetail={setDetailProposalId} onRefresh={loadCounts} />}
          {activeTab === 'incoming' && <IncomingTab orgId={orgId} onViewDetail={setDetailProposalId} />}
          {activeTab === 'history' && <HistoryTab orgId={orgId} onViewDetail={setDetailProposalId} />}
        </div>
      </div>

      {detailProposalId && (
        <ProposalDetailSlideOver orgId={orgId} proposalId={detailProposalId} onClose={() => setDetailProposalId(null)} onVoted={loadCounts} />
      )}
      {showNewProposal && (
        <NewProposalSlideOver orgId={orgId} onClose={() => setShowNewProposal(false)} onSuccess={handleNewProposalSuccess} />
      )}
    </TenantLayout>
  );
}
