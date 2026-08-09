'use client';

import { useState } from 'react';

/**
 * The casting decision, shown only to the assigned national tenant.
 *
 * Written to be explicit that this *overrides* a deadlocked vote rather than
 * adding another ballot to it — if the national tenant is also a co-owner, its
 * earlier vote still stands in the record and is not counted twice.
 */
export function TieBreakPanel({
  orgId,
  proposalId,
  tieBreakExpiresAt,
  onResolved,
}: {
  orgId: string;
  proposalId: string;
  tieBreakExpiresAt: string | null;
  onResolved: () => void;
}) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hoursLeft = tieBreakExpiresAt
    ? Math.max(0, Math.floor((new Date(tieBreakExpiresAt).getTime() - Date.now()) / 3_600_000))
    : null;

  async function submit() {
    if (!decision || !reason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tenant/${orgId}/governance/${proposalId}?action=tiebreak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to record the decision');
        return;
      }
      onResolved();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-amber-900">This proposal is deadlocked</h3>
        <p className="mt-1 text-sm text-amber-900">
          Every owner has voted and neither side reached its threshold. As the national tenant, your
          organization casts the deciding vote.
        </p>
        <p className="mt-2 text-xs text-amber-800">
          This decision replaces the deadlocked result outright — it is not counted as another vote
          alongside the others.
          {hoursLeft !== null && (
            <>
              {' '}
              You have about {hoursLeft} {hoursLeft === 1 ? 'hour' : 'hours'} to decide.
            </>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDecision('APPROVE')}
          aria-pressed={decision === 'APPROVE'}
          className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
            decision === 'APPROVE'
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-green-300 bg-white text-green-700 hover:bg-green-50'
          }`}
        >
          Approve it
        </button>
        <button
          type="button"
          onClick={() => setDecision('REJECT')}
          aria-pressed={decision === 'REJECT'}
          className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
            decision === 'REJECT'
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-red-300 bg-white text-red-700 hover:bg-red-50'
          }`}
        >
          Reject it
        </button>
      </div>

      {decision && (
        <div className="space-y-2">
          <label htmlFor="tiebreak-reason" className="block text-xs font-medium text-amber-900">
            Reason (required, and shown to every owner)
          </label>
          <textarea
            id="tiebreak-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this outcome, given the split"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !reason.trim()}
            className="w-full rounded-lg bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {submitting
              ? 'Recording…'
              : `Confirm — ${decision === 'APPROVE' ? 'approve' : 'reject'} this proposal`}
          </button>
        </div>
      )}
    </div>
  );
}
