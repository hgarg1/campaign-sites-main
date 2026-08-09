'use client';

/**
 * How far a proposal is from resolving.
 *
 * Replaces a bar that filled with *turnout* while sitting under approve/reject
 * counts, which read as progress toward approval. A voter needs three things
 * the old view never showed: the threshold, the distance to it, and who has
 * yet to vote.
 */

export interface VoterView {
  orgId: string;
  orgName: string;
  stakeBps: number;
  sharePercent: number;
  decision: 'APPROVE' | 'REJECT' | null;
  votedByName: string | null;
  viaProxy: boolean;
  withdrawn: boolean;
  withdrawnReason: string | null;
}

export interface ProposalProgress {
  ruleSummary: string;
  basis: 'HEADCOUNT' | 'STAKE_WEIGHTED';
  degradedToHeadcount: boolean;
  approvalPercent: number;
  rejectionPercent: number;
  thresholdPercent: number;
  stillReachable: boolean;
  vetoWouldEndIt: boolean;
  votedCount: number;
  totalCount: number;
  outstandingOrgNames: string[];
  voters: VoterView[];
  tieBreak: {
    enabled: boolean;
    orgId: string | null;
    orgName: string | null;
    expiresAt: string | null;
    possible: boolean;
  };
}

function DecisionMark({ voter }: { voter: VoterView }) {
  if (voter.withdrawn) {
    return (
      <span className="text-xs text-gray-400" title={voter.withdrawnReason ?? undefined}>
        withdrawn
      </span>
    );
  }
  if (voter.decision === 'APPROVE') {
    return <span className="text-sm font-medium text-green-700">✓ Approved</span>;
  }
  if (voter.decision === 'REJECT') {
    return <span className="text-sm font-medium text-red-700">✗ Rejected</span>;
  }
  return <span className="text-sm text-gray-400">Awaiting</span>;
}

export function QuorumProgress({
  progress,
  status,
}: {
  progress: ProposalProgress;
  status: string;
}) {
  const { approvalPercent, rejectionPercent, thresholdPercent } = progress;
  const decided = !['PENDING_VOTES', 'PENDING_TIEBREAK'].includes(status);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="text-sm font-medium text-gray-900">{approvalPercent}% approving</span>
          <span className="text-xs text-gray-500">
            {progress.votedCount} of {progress.totalCount}{' '}
            {progress.totalCount === 1 ? 'owner has' : 'owners have'} voted
          </span>
        </div>

        {/* Approval and rejection share one track, with the threshold marked on
            it — the number that decides the outcome should be visible on the
            same scale as the progress toward it. */}
        <div
          className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden"
          role="img"
          aria-label={`${approvalPercent}% approving, ${rejectionPercent}% rejecting, ${thresholdPercent}% needed`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-green-500"
            style={{ width: `${Math.min(approvalPercent, 100)}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-red-400"
            style={{ width: `${Math.min(rejectionPercent, 100)}%` }}
          />
          {progress.thresholdPercent > 0 && progress.thresholdPercent < 100 && (
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-900"
              style={{ left: `${thresholdPercent}%` }}
              title={`${thresholdPercent}% needed to approve`}
            />
          )}
        </div>

        <p className="mt-2 text-xs text-gray-600">{progress.ruleSummary}</p>

        {progress.basis === 'STAKE_WEIGHTED' && progress.degradedToHeadcount && (
          <p className="mt-1 text-xs text-amber-700">
            This rule counts ownership stake, but no owner has been allocated any — so every owner
            currently counts equally.
          </p>
        )}

        {!decided && !progress.stillReachable && (
          <p className="mt-1 text-xs text-red-700">
            The approval threshold can no longer be reached.
          </p>
        )}

        {!decided && progress.vetoWouldEndIt && (
          <p className="mt-1 text-xs text-gray-500">
            Any single rejection ends this proposal immediately.
          </p>
        )}
      </div>

      <div className="border rounded-lg divide-y">
        {progress.voters.map((v) => (
          <div key={v.orgId} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm text-gray-900 truncate">{v.orgName}</div>
              <div className="text-xs text-gray-500">
                {v.withdrawn
                  ? 'No longer an owner'
                  : progress.degradedToHeadcount
                    ? 'One vote'
                    : `${v.sharePercent}% of the vote`}
                {v.votedByName && (
                  <>
                    {' · '}
                    {v.votedByName}
                    {v.viaProxy && ' (proxy)'}
                  </>
                )}
              </div>
            </div>
            <DecisionMark voter={v} />
          </div>
        ))}
      </div>

      {!decided && progress.outstandingOrgNames.length > 0 && (
        <p className="text-xs text-gray-500">
          Waiting on {progress.outstandingOrgNames.join(', ')}.
        </p>
      )}

      {!decided && progress.tieBreak.enabled && progress.tieBreak.possible && (
        <p className="text-xs text-gray-500">
          If every owner votes and neither side prevails,{' '}
          {progress.tieBreak.orgName ?? 'the national tenant'} casts the deciding vote.
        </p>
      )}
    </div>
  );
}
