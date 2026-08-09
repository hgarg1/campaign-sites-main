'use client';

/**
 * States what a vote will actually do before it is cast.
 *
 * "2 approvals" told a voter nothing about whether theirs would be the one that
 * executes the action. Under a single-veto rule a rejection is irreversible and
 * immediate, which is worth knowing before clicking rather than after.
 */

import type { ProposalProgress } from './QuorumProgress';

export function VoteConsequence({
  progress,
  decision,
  myStakePercent,
}: {
  progress: ProposalProgress;
  decision: 'APPROVE' | 'REJECT';
  /** This organization's share, when the tally is weighted. */
  myStakePercent?: number;
}) {
  const weighted = progress.basis === 'STAKE_WEIGHTED' && !progress.degradedToHeadcount;

  if (decision === 'REJECT') {
    if (progress.vetoWouldEndIt) {
      return (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Any single rejection ends this proposal, so <strong>this will reject it outright</strong>.
          It cannot be reopened — a new proposal would have to be raised.
        </p>
      );
    }
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        Your rejection is recorded against the proposal. It ends early only once enough owners
        reject that approval becomes impossible.
      </p>
    );
  }

  const after = weighted
    ? progress.approvalPercent + (myStakePercent ?? 0)
    : Math.round(((progress.votedCount + 1) * 100) / Math.max(progress.totalCount, 1));

  const wouldCarry = after >= progress.thresholdPercent;
  const outstandingAfter = Math.max(progress.outstandingOrgNames.length - 1, 0);

  if (wouldCarry && outstandingAfter === 0) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
        Yours is the last vote needed. <strong>The action will execute immediately</strong> once you
        confirm.
      </p>
    );
  }

  if (wouldCarry) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
        This takes approval to about {after}%, past the {progress.thresholdPercent}% needed, so{' '}
        <strong>the action will execute immediately</strong>.
      </p>
    );
  }

  return (
    <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
      This takes approval to about {after}% of the {progress.thresholdPercent}% needed.{' '}
      {outstandingAfter > 0 && (
        <>
          {outstandingAfter} {outstandingAfter === 1 ? 'owner has' : 'owners have'} yet to vote.
        </>
      )}
    </p>
  );
}
