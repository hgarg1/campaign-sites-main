import { prisma } from '@/lib/database';
import { insertAncestry, removeAncestry, getDescendantIds } from '@/lib/ancestry';
import {
  Prisma,
  GovernanceProposal,
  GovernanceActionType,
  MemberRole,
  VoteDecision,
  VotingMode,
  RejectMode,
  ProposalStatus,
  NotificationType,
  OwnershipStatus,
} from '@prisma/client';
import { logSystemAdminAction } from '@/lib/audit-log';
import { tally as tallyBallots, type Ballot, type BallotDecision } from '@/lib/governance-math';
import {
  evaluateOutcome,
  toPolicyConfig,
  type PolicyColumns,
  type PolicyConfig,
} from '@/lib/governance-policy';

/** Roles a governance UPDATE_RBAC action may assign. */
const ALLOWED_MEMBER_ROLES: MemberRole[] = ['MEMBER', 'ADMIN', 'OWNER'];

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ActionPayload {
  // UPDATE_SETTINGS / UPDATE_BRANDING
  settings?: Record<string, unknown>;
  // UPDATE_INTEGRATIONS
  integrationId?: string;
  integrationConfig?: Record<string, unknown>;
  // UPDATE_RBAC
  memberId?: string;
  newRole?: string;
  // ADD_PARENT / REMOVE_PARENT
  parentOrgId?: string;
  addedByUserId?: string;
  // ADD_CHILD
  childOrgId?: string;
  // Human-readable summary (always set)
  description?: string;
}

export interface GovernanceResult {
  proposal: GovernanceProposal;
  /** true when N=1 and the action was executed immediately without a proposal record */
  autoExecuted: boolean;
}

// ─── System config ────────────────────────────────────────────────────────────

export async function getSystemConfigValue(key: string, defaultValue: number): Promise<number> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return defaultValue;
  const parsed = Number(row.value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ─── Ownership helpers ────────────────────────────────────────────────────────

export async function getActiveOwners(
  childOrgId: string
): Promise<Array<{ parentOrgId: string; stakeBps: number }>> {
  return prisma.organizationOwnership.findMany({
    where: { childOrgId, status: 'ACTIVE' as OwnershipStatus },
    select: { parentOrgId: true, stakeBps: true },
    // Stable order so an even split's remainder basis point always lands on the
    // same (earliest) owner rather than moving between calls.
    orderBy: { addedAt: 'asc' },
  });
}

// ─── Policy resolution ────────────────────────────────────────────────────────

/** Defaults when neither the org nor the platform has configured a rule. */
const FALLBACK_POLICY: PolicyColumns = {
  votingMode: 'UNANIMOUS',
  rejectMode: 'SINGLE_VETO',
  tallyBasis: 'HEADCOUNT',
  approveNum: 1,
  approveDen: 1,
  approveInclusive: true,
  vetoNum: null,
  vetoDen: null,
  vetoInclusive: true,
  quorumNum: 0,
  quorumDen: 1,
  tieBreakEnabled: false,
  dealMakerMinStakeBps: 0,
  ttlDays: 7,
  quorumPercent: null,
};

/**
 * Resolves the governance policy for an action on a child org.
 *
 * Most specific wins:
 *   org rule for this action → org-wide default rule → platform rule → fallback
 *
 * The rule is scoped to the governed child rather than to one ownership edge,
 * because a proposal about a child is voted on by *all* of its co-parents — a
 * rule attached to a single edge would leave "whose rule applies" undefined.
 */
export async function resolvePolicy(
  childOrgId: string,
  actionType: GovernanceActionType
): Promise<PolicyConfig> {
  const [specific, orgDefault, platform] = await Promise.all([
    prisma.orgGovernanceRule.findFirst({ where: { childOrgId, actionType, isActive: true } }),
    prisma.orgGovernanceRule.findFirst({
      where: { childOrgId, actionType: null, isActive: true },
    }),
    prisma.governanceRuleSet.findFirst({ where: { actionType, isActive: true } }),
  ]);

  const row = specific ?? orgDefault ?? platform ?? FALLBACK_POLICY;
  return toPolicyConfig(row as PolicyColumns);
}

/**
 * Rebuilds a policy from the snapshot frozen onto a proposal.
 *
 * Proposals created before the rational threshold columns existed have them all
 * NULL, and fall through to their legacy `votingMode` + `quorumPercent`, which
 * `toPolicyConfig` translates. That keeps in-flight proposals resolving exactly
 * as they would have before this change.
 */
function proposalPolicy(proposal: GovernanceProposal): PolicyConfig {
  return toPolicyConfig({
    votingMode: proposal.votingMode,
    rejectMode: proposal.rejectMode,
    tallyBasis: proposal.tallyBasis ?? 'HEADCOUNT',
    approveNum: proposal.approveNum ?? 1,
    approveDen: proposal.approveDen ?? 1,
    approveInclusive: proposal.approveInclusive ?? true,
    vetoNum: proposal.vetoNum,
    vetoDen: proposal.vetoDen,
    vetoInclusive: proposal.vetoInclusive ?? true,
    quorumNum: proposal.quorumNum ?? 0,
    quorumDen: proposal.quorumDen ?? 1,
    tieBreakEnabled: proposal.tieBreakEnabled,
    dealMakerMinStakeBps: proposal.dealMakerMinStakeBps ?? 0,
    ttlDays: 7,
    quorumPercent: proposal.quorumPercent,
  });
}

// ─── Electorate ───────────────────────────────────────────────────────────────

/**
 * Brings a proposal's frozen electorate back in line with reality, then returns
 * the ballots to tally.
 *
 * Withdraws snapshot rows whose ownership is no longer ACTIVE, or whose org has
 * been DEACTIVATED. Never adds rows.
 *
 * A SUSPENDED co-owner deliberately keeps its vote. Suspension is reversible,
 * so dropping suspended orgs from the electorate would make "suspend the
 * co-owner who disagrees with you, then pass what you want" a single move. The
 * cost is that a proposal can stall until its TTL, which admin force-resolve
 * covers.
 *
 * Proposals created before weighted voting have `electorateSnapshotAt` NULL and
 * fall back to the live owner set, preserving their original semantics.
 */
export async function reconcileElectorate(
  proposal: Pick<GovernanceProposal, 'id' | 'childOrgId' | 'electorateSnapshotAt'>
): Promise<Ballot[]> {
  const votes = await prisma.governanceVote.findMany({
    where: { proposalId: proposal.id },
    select: { voterOrgId: true, decision: true },
  });
  const decisionByOrg = new Map(votes.map((v) => [v.voterOrgId, v.decision]));

  // Legacy path: no snapshot, so evaluate against live owners as before.
  if (!proposal.electorateSnapshotAt) {
    const owners = await getActiveOwners(proposal.childOrgId);
    return owners.map((o) => ({
      voterOrgId: o.parentOrgId,
      stakeBps: o.stakeBps,
      decision: (decisionByOrg.get(o.parentOrgId) ?? null) as BallotDecision,
    }));
  }

  const snapshot = await prisma.governanceProposalVoter.findMany({
    where: { proposalId: proposal.id },
  });

  const stillActive = new Set(
    (
      await prisma.organizationOwnership.findMany({
        where: {
          childOrgId: proposal.childOrgId,
          status: 'ACTIVE' as OwnershipStatus,
          parentOrgId: { in: snapshot.map((s) => s.voterOrgId) },
        },
        select: { parentOrgId: true },
      })
    ).map((o) => o.parentOrgId)
  );

  const deactivated = new Set(
    (
      await prisma.organization.findMany({
        where: {
          id: { in: snapshot.map((s) => s.voterOrgId) },
          ownStatus: 'DEACTIVATED',
        },
        select: { id: true },
      })
    ).map((o) => o.id)
  );

  const toWithdraw: Array<{ voterOrgId: string; reason: string }> = [];
  for (const row of snapshot) {
    if (row.withdrawnAt) continue;
    if (!stillActive.has(row.voterOrgId)) {
      toWithdraw.push({ voterOrgId: row.voterOrgId, reason: 'OWNERSHIP_REMOVED' });
    } else if (deactivated.has(row.voterOrgId)) {
      toWithdraw.push({ voterOrgId: row.voterOrgId, reason: 'ORG_DEACTIVATED' });
    }
  }

  if (toWithdraw.length > 0) {
    const now = new Date();
    await Promise.all(
      toWithdraw.map((w) =>
        prisma.governanceProposalVoter.update({
          where: {
            proposalId_voterOrgId: { proposalId: proposal.id, voterOrgId: w.voterOrgId },
          },
          data: { withdrawnAt: now, withdrawnReason: w.reason },
        })
      )
    );
  }

  const withdrawn = new Set(toWithdraw.map((w) => w.voterOrgId));

  return snapshot
    .filter((row) => !row.withdrawnAt && !withdrawn.has(row.voterOrgId))
    .map((row) => ({
      voterOrgId: row.voterOrgId,
      stakeBps: row.stakeBps,
      decision: (decisionByOrg.get(row.voterOrgId) ?? null) as BallotDecision,
    }));
}

// ─── Private helper ───────────────────────────────────────────────────────────

async function notifyOwners(
  proposalId: string,
  childOrgId: string,
  type: NotificationType,
  excludeOrgId?: string
): Promise<void> {
  const owners = await getActiveOwners(childOrgId);
  const recipients = excludeOrgId ? owners.filter((o) => o.parentOrgId !== excludeOrgId) : owners;

  if (recipients.length === 0) return;

  await prisma.governanceNotification.createMany({
    data: recipients.map((o) => ({
      proposalId,
      recipientOrgId: o.parentOrgId,
      type,
    })),
  });
}

// ─── Create proposal ──────────────────────────────────────────────────────────

export async function createProposal(params: {
  childOrgId: string;
  initiatorOrgId: string;
  initiatorUserId: string;
  actionType: GovernanceActionType;
  payload: ActionPayload;
}): Promise<GovernanceResult> {
  const { childOrgId, initiatorOrgId, initiatorUserId, actionType, payload } = params;

  // Validate: initiator must be an ACTIVE owner
  const initiatorOwnership = await prisma.organizationOwnership.findFirst({
    where: { parentOrgId: initiatorOrgId, childOrgId, status: 'ACTIVE' as OwnershipStatus },
  });
  if (!initiatorOwnership) {
    throw new Error(`Organization ${initiatorOrgId} is not an active owner of ${childOrgId}`);
  }

  // Resolve the policy this proposal will be judged by, most specific first.
  const policy = await resolvePolicy(childOrgId, actionType);

  // Legacy columns are still written so anything reading them keeps working.
  const ruleSet = await prisma.governanceRuleSet.findFirst({
    where: { actionType, isActive: true },
  });

  const votingMode: VotingMode = ruleSet?.votingMode ?? 'UNANIMOUS';
  const quorumPercent: number = ruleSet?.quorumPercent ?? 51;
  const rejectMode: RejectMode = ruleSet?.rejectMode ?? 'SINGLE_VETO';
  const ttlDays: number =
    ruleSet?.ttlDays ?? (await getSystemConfigValue('proposalDefaultTtlDays', 7));

  const owners = await getActiveOwners(childOrgId);
  const requiredVoterCount = owners.length;

  // N=1 shortcut: a sole owner needs no vote, but the action is still recorded.
  // Persisting a pre-resolved proposal keeps the governance history complete —
  // previously this path executed against a synthetic in-memory object and left
  // no trace of suspensions, role changes or hierarchy edits.
  if (requiredVoterCount === 1) {
    const now = new Date();
    const proposal = await prisma.governanceProposal.create({
      data: {
        childOrgId,
        initiatorOrgId,
        initiatorUserId,
        actionType,
        actionPayload: payload as object,
        status: 'APPROVED' as ProposalStatus,
        votingMode,
        quorumPercent,
        rejectMode,
        requiredVoterCount,
        expiresAt: now,
        resolvedAt: now,
        resolvedReason: 'Auto-approved: sole owner',
        tallyBasis: policy.tallyBasis,
        approveNum: policy.approve.num,
        approveDen: policy.approve.den,
        approveInclusive: policy.approve.inclusive,
        vetoNum: policy.veto?.num ?? null,
        vetoDen: policy.veto?.den ?? null,
        vetoInclusive: policy.veto?.inclusive ?? true,
        quorumNum: policy.quorum.num,
        quorumDen: policy.quorum.den,
        dealMakerMinStakeBps: policy.dealMakerMinStakeBps,
        electorateSnapshotAt: now,
        // Recorded even though no vote was needed, so every proposal has a
        // consistent electorate for the history view to render.
        voters: {
          createMany: {
            data: owners.map((o) => ({ voterOrgId: o.parentOrgId, stakeBps: o.stakeBps })),
          },
        },
      },
    });

    // Caller is responsible for catching action-specific errors
    await executeAction(proposal);
    return { proposal, autoExecuted: true };
  }

  // N>1: persist proposal and notify co-owners
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const proposal = await prisma.governanceProposal.create({
    data: {
      childOrgId,
      initiatorOrgId,
      initiatorUserId,
      actionType,
      actionPayload: payload as object,
      status: 'PENDING_VOTES' as ProposalStatus,
      votingMode,
      quorumPercent,
      rejectMode,
      requiredVoterCount,
      expiresAt,
      tallyBasis: policy.tallyBasis,
      approveNum: policy.approve.num,
      approveDen: policy.approve.den,
      approveInclusive: policy.approve.inclusive,
      vetoNum: policy.veto?.num ?? null,
      vetoDen: policy.veto?.den ?? null,
      vetoInclusive: policy.veto?.inclusive ?? true,
      quorumNum: policy.quorum.num,
      quorumDen: policy.quorum.den,
      dealMakerMinStakeBps: policy.dealMakerMinStakeBps,
      electorateSnapshotAt: new Date(),
      // Freeze who may vote and how much each weighs. Without this, a co-parent
      // could reallocate stakes mid-vote to change an outcome already underway.
      voters: {
        createMany: {
          data: owners.map((o) => ({ voterOrgId: o.parentOrgId, stakeBps: o.stakeBps })),
        },
      },
    },
  });

  await notifyOwners(proposal.id, childOrgId, 'VOTE_REQUESTED', initiatorOrgId);

  return { proposal, autoExecuted: false };
}

// ─── Cast vote ────────────────────────────────────────────────────────────────

export async function castVote(params: {
  proposalId: string;
  voterOrgId: string;
  voterUserId: string;
  decision: VoteDecision;
  comment?: string;
}): Promise<GovernanceProposal> {
  const { proposalId, voterOrgId, voterUserId, decision, comment } = params;

  const proposal = await prisma.governanceProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  if (proposal.status !== ('PENDING_VOTES' as ProposalStatus)) {
    throw new Error(`Proposal ${proposalId} is not open for voting (status: ${proposal.status})`);
  }

  // Check expiry before accepting a vote. Guarded so concurrent late votes
  // cannot each emit an expiry notification.
  if (proposal.expiresAt < new Date()) {
    const { count } = await prisma.governanceProposal.updateMany({
      where: { id: proposalId, status: 'PENDING_VOTES' as ProposalStatus },
      data: {
        status: 'EXPIRED' as ProposalStatus,
        resolvedAt: new Date(),
        resolvedReason: 'Proposal expired',
      },
    });
    if (count > 0) {
      await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_EXPIRED');
    }
    return prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposalId } });
  }

  // Validate voter is an ACTIVE owner
  const voterOwnership = await prisma.organizationOwnership.findFirst({
    where: {
      parentOrgId: voterOrgId,
      childOrgId: proposal.childOrgId,
      status: 'ACTIVE' as OwnershipStatus,
    },
  });
  if (!voterOwnership) {
    throw new Error(`Organization ${voterOrgId} is not an active owner of ${proposal.childOrgId}`);
  }

  // Duplicate votes are prevented by the @@unique([proposalId, voterOrgId])
  // constraint rather than a read-then-write check, which two concurrent
  // requests can both pass. P2002 is the expected, non-exceptional outcome of a
  // double submit.
  try {
    await prisma.governanceVote.create({
      data: { proposalId, voterOrgId, voterUserId, decision, comment },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(`Organization ${voterOrgId} has already voted on proposal ${proposalId}`);
    }
    throw error;
  }

  await notifyOwners(proposalId, proposal.childOrgId, 'VOTE_CAST', voterOrgId);

  return evaluateProposal(proposalId);
}

// ─── Evaluate proposal ────────────────────────────────────────────────────────

export async function evaluateProposal(proposalId: string): Promise<GovernanceProposal> {
  const proposal = await prisma.governanceProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });
  // The electorate is the proposal's frozen voter set, reconciled against
  // current ownership. Ballots from withdrawn voters are excluded from both the
  // numerator and the denominator, so removing an owner keeps unanimity
  // reachable rather than stranding the proposal.
  const ballots = await reconcileElectorate(proposal);
  const t = tallyBallots(ballots);

  // An electorate that has emptied out cannot decide anything. Resolving it as
  // expired is honest; treating 0-of-0 as unanimous would silently execute an
  // action nobody voted for.
  if (t.n === 0) {
    const { count } = await prisma.governanceProposal.updateMany({
      where: { id: proposalId, status: 'PENDING_VOTES' as ProposalStatus },
      data: {
        status: 'EXPIRED' as ProposalStatus,
        resolvedAt: new Date(),
        resolvedReason: 'Electorate empty',
      },
    });
    if (count > 0) {
      await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_EXPIRED');
    }
    return prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposalId } });
  }

  // Judge against the policy frozen onto the proposal, so amending the rulebook
  // cannot change a vote already under way. Proposals created before the
  // rational columns existed fall back to their legacy votingMode/quorumPercent
  // through `toPolicyConfig`.
  const policy = proposalPolicy(proposal);

  // Only relevant to DEAL_MAKER: the largest stake among approvers, so a token
  // owner cannot single-handedly carry a decision when a floor is configured.
  const maxApprovingStakeBps = ballots
    .filter((b) => b.decision === 'APPROVE')
    .reduce((max, b) => Math.max(max, b.stakeBps), 0);

  const decision = evaluateOutcome(t, policy, { maxApprovingStakeBps });

  let outcome: 'APPROVED' | 'REJECTED' | null = null;
  let resolvedReason: string | undefined;

  if (decision.kind === 'APPROVED') {
    outcome = 'APPROVED';
  } else if (decision.kind === 'REJECTED') {
    outcome = 'REJECTED';
    resolvedReason = decision.reason;
  }

  if (!outcome) {
    // Not yet decided — return current proposal unchanged
    return proposal;
  }

  // Guarded transition. Two concurrent votes can both compute an outcome from
  // the same pre-write state; only the caller that actually moves the row out
  // of PENDING_VOTES may execute the action or notify. Without this the status
  // could flip APPROVED→REJECTED and executeAction could run for a proposal
  // that ends up rejected.
  const { count } = await prisma.governanceProposal.updateMany({
    where: { id: proposalId, status: 'PENDING_VOTES' as ProposalStatus },
    data: {
      status: outcome as ProposalStatus,
      resolvedAt: new Date(),
      resolvedReason: resolvedReason ?? null,
    },
  });

  if (count === 0) {
    // Someone else resolved it first — return their outcome, do nothing else.
    return prisma.governanceProposal.findUniqueOrThrow({ where: { id: proposalId } });
  }

  const resolved = await prisma.governanceProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  if (outcome === 'APPROVED') {
    // Caller is responsible for catching action-specific errors
    await executeAction(resolved);
    await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_APPROVED');
  } else {
    await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_REJECTED');
  }

  return resolved;
}

// ─── Execute action ───────────────────────────────────────────────────────────

/**
 * Executes an approved proposal and records the outcome.
 *
 * Every path that mutates state as a result of governance goes through here —
 * approved-by-vote, auto-approved sole owner, and admin force-resolve — so this
 * is the one place that guarantees an audit entry exists for the action.
 */
export async function executeAction(proposal: GovernanceProposal): Promise<void> {
  try {
    await performAction(proposal);
    await logSystemAdminAction({
      action: `GOVERNANCE_${proposal.actionType}`,
      resourceType: 'Organization',
      resourceId: proposal.childOrgId,
      resourceName: `proposal ${proposal.id}`,
      changes: (proposal.actionPayload ?? {}) as Record<string, unknown>,
      justification: proposal.resolvedReason ?? undefined,
      performedBy: proposal.initiatorUserId,
      status: 'success',
    });
  } catch (error) {
    await logSystemAdminAction({
      action: `GOVERNANCE_${proposal.actionType}_FAILED`,
      resourceType: 'Organization',
      resourceId: proposal.childOrgId,
      resourceName: `proposal ${proposal.id}`,
      changes: (proposal.actionPayload ?? {}) as Record<string, unknown>,
      performedBy: proposal.initiatorUserId,
      status: 'failure',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function performAction(proposal: GovernanceProposal): Promise<void> {
  const payload = (proposal.actionPayload ?? {}) as ActionPayload;
  const childOrgId = proposal.childOrgId;

  switch (proposal.actionType) {
    case 'SUSPEND': {
      const descendantIds = await getDescendantIds(childOrgId);
      if (descendantIds.length > 0) {
        // Only cascade into descendants that are currently ACTIVE. Without this
        // filter, suspending overwrites suspendedByOrgId on orgs another owner
        // already suspended, and that owner's later REACTIVATE then restores
        // orgs it never suspended.
        await prisma.organization.updateMany({
          where: { id: { in: descendantIds }, ownStatus: 'ACTIVE' },
          data: {
            ownStatus: 'SUSPENDED',
            suspendedAt: new Date(),
            suspendedByOrgId: proposal.initiatorOrgId,
          },
        });
      }
      await prisma.organization.update({
        where: { id: childOrgId },
        data: {
          ownStatus: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedByOrgId: proposal.initiatorOrgId,
        },
      });
      break;
    }

    case 'REACTIVATE': {
      const descendantIds = await getDescendantIds(childOrgId);
      if (descendantIds.length > 0) {
        await prisma.organization.updateMany({
          where: {
            id: { in: descendantIds },
            suspendedByOrgId: proposal.initiatorOrgId,
          },
          data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
        });
      }
      await prisma.organization.update({
        where: { id: childOrgId },
        data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
      });
      break;
    }

    case 'DEACTIVATE': {
      const descendantIds = await getDescendantIds(childOrgId);
      if (descendantIds.length > 0) {
        await prisma.organization.updateMany({
          where: {
            id: { in: descendantIds },
            ownStatus: { not: 'DEACTIVATED' },
          },
          data: {
            ownStatus: 'DEACTIVATED',
            suspendedAt: new Date(),
            suspendedByOrgId: proposal.initiatorOrgId,
          },
        });
      }
      await prisma.organization.update({
        where: { id: childOrgId },
        data: { ownStatus: 'DEACTIVATED' },
      });
      break;
    }

    case 'UPDATE_SETTINGS':
    case 'UPDATE_BRANDING': {
      const org = await prisma.organization.findUniqueOrThrow({ where: { id: childOrgId } });
      const branding = (org.branding as any) ?? {};
      const merged = { ...branding, ...(payload.settings ?? {}) };
      await prisma.organization.update({
        where: { id: childOrgId },
        data: { branding: merged },
      });
      break;
    }

    case 'UPDATE_INTEGRATIONS': {
      if (!payload.integrationId) {
        throw new Error('UPDATE_INTEGRATIONS action requires payload.integrationId');
      }
      // The integration must belong to the org this proposal governs — otherwise
      // an owner of one org could rewrite integration config in an unrelated one.
      const integration = await (prisma as any).organizationIntegration.findUnique({
        where: { id: payload.integrationId },
        select: { organizationId: true },
      });
      if (!integration || integration.organizationId !== childOrgId) {
        throw new Error('integrationId does not belong to the governed organization');
      }
      await (prisma as any).organizationIntegration.update({
        where: { id: payload.integrationId },
        data: { config: payload.integrationConfig },
      });
      break;
    }

    case 'UPDATE_RBAC': {
      if (!payload.memberId) {
        throw new Error('UPDATE_RBAC action requires payload.memberId');
      }
      // Scope the member row to the governed org. Without this check, any owner
      // could promote an arbitrary user in an arbitrary organization.
      const member = await prisma.organizationMember.findUnique({
        where: { id: payload.memberId },
        select: { organizationId: true },
      });
      if (!member || member.organizationId !== childOrgId) {
        throw new Error('memberId does not belong to the governed organization');
      }
      if (!ALLOWED_MEMBER_ROLES.includes(payload.newRole as MemberRole)) {
        throw new Error(`Invalid role: ${String(payload.newRole)}`);
      }
      await prisma.organizationMember.update({
        where: { id: payload.memberId },
        data: { role: payload.newRole as MemberRole },
      });
      break;
    }

    case 'ADD_PARENT': {
      if (!payload.parentOrgId) {
        throw new Error('ADD_PARENT action requires payload.parentOrgId');
      }
      // Ownership rows are keyed [parentOrgId, childOrgId] and reused rather
      // than versioned, so a previously REMOVED parent already has a row.
      // `.create()` would throw P2002 on re-admission.
      await prisma.organizationOwnership.upsert({
        where: {
          parentOrgId_childOrgId: { parentOrgId: payload.parentOrgId, childOrgId },
        },
        update: {
          status: 'ACTIVE' as OwnershipStatus,
          addedAt: new Date(),
          addedByUserId: payload.addedByUserId ?? proposal.initiatorUserId,
          removedAt: null,
          removedByUserId: null,
        },
        create: {
          parentOrgId: payload.parentOrgId,
          childOrgId,
          isPrimary: false,
          status: 'ACTIVE' as OwnershipStatus,
          addedByUserId: payload.addedByUserId ?? proposal.initiatorUserId,
        },
      });
      await insertAncestry(childOrgId, payload.parentOrgId);
      break;
    }

    case 'REMOVE_PARENT': {
      if (!payload.parentOrgId) {
        throw new Error('REMOVE_PARENT action requires payload.parentOrgId');
      }
      const ownership = await prisma.organizationOwnership.findFirstOrThrow({
        where: {
          parentOrgId: payload.parentOrgId,
          childOrgId,
          status: 'ACTIVE' as OwnershipStatus,
        },
      });

      await prisma.organizationOwnership.update({
        where: { parentOrgId_childOrgId: { parentOrgId: payload.parentOrgId, childOrgId } },
        data: {
          status: 'REMOVED' as OwnershipStatus,
          removedAt: new Date(),
          removedByUserId: proposal.initiatorUserId,
        },
      });

      // Rebuild the closure table from scratch for this child
      await removeAncestry(childOrgId);
      const remainingOwners = await getActiveOwners(childOrgId);
      for (const owner of remainingOwners) {
        await insertAncestry(childOrgId, owner.parentOrgId);
      }

      // If the removed parent was primary, promote the next-oldest active owner
      if (ownership.isPrimary) {
        const nextOwner = await prisma.organizationOwnership.findFirst({
          where: { childOrgId, status: 'ACTIVE' as OwnershipStatus },
          orderBy: { addedAt: 'asc' },
        });
        if (nextOwner) {
          await prisma.organizationOwnership.update({
            where: {
              parentOrgId_childOrgId: {
                parentOrgId: nextOwner.parentOrgId,
                childOrgId,
              },
            },
            data: { isPrimary: true },
          });
          await prisma.organization.update({
            where: { id: childOrgId },
            data: { parentId: nextOwner.parentOrgId },
          });
        } else {
          // No remaining owners — clear parentId
          await prisma.organization.update({
            where: { id: childOrgId },
            data: { parentId: null },
          });
        }
      }
      break;
    }

    case 'ADD_CHILD': {
      if (!payload.childOrgId) {
        throw new Error('ADD_CHILD action requires payload.childOrgId');
      }
      // Adopting an org the initiator has no authority over is a takeover, not a
      // hierarchy change. Require an existing ownership link or ancestry edge.
      const canAdopt = await prisma.organizationOwnership.findFirst({
        where: {
          parentOrgId: proposal.initiatorOrgId,
          childOrgId: payload.childOrgId,
          status: 'ACTIVE' as OwnershipStatus,
        },
      });
      if (!canAdopt) {
        const ancestry = await prisma.organizationAncestry.findFirst({
          where: {
            ancestorId: proposal.initiatorOrgId,
            descendantId: payload.childOrgId,
            depth: { gt: 0 },
          },
        });
        if (!ancestry) {
          throw new Error(
            'Initiator has no existing authority over the organization named in payload.childOrgId'
          );
        }
      }
      await prisma.organization.update({
        where: { id: payload.childOrgId },
        data: { parentId: proposal.initiatorOrgId },
      });
      // Upsert for the same reason as ADD_PARENT: the edge row may already
      // exist in REMOVED state from a prior relationship.
      await prisma.organizationOwnership.upsert({
        where: {
          parentOrgId_childOrgId: {
            parentOrgId: proposal.initiatorOrgId,
            childOrgId: payload.childOrgId,
          },
        },
        update: {
          isPrimary: true,
          status: 'ACTIVE' as OwnershipStatus,
          addedAt: new Date(),
          addedByUserId: proposal.initiatorUserId,
          removedAt: null,
          removedByUserId: null,
        },
        create: {
          parentOrgId: proposal.initiatorOrgId,
          childOrgId: payload.childOrgId,
          isPrimary: true,
          status: 'ACTIVE' as OwnershipStatus,
          addedByUserId: proposal.initiatorUserId,
        },
      });
      await insertAncestry(payload.childOrgId, proposal.initiatorOrgId);
      break;
    }

    case 'SET_CHILD_POLICY': {
      if (!payload.childOrgId) throw new Error('SET_CHILD_POLICY requires payload.childOrgId');
      const { invalidateOrgPolicyCache } = await import('@/lib/org-policy');
      const policyRules = (payload as ActionPayload & { rules?: unknown[] }).rules ?? [];
      const policyNote = (payload as ActionPayload & { note?: string }).note ?? null;
      await prisma.orgInheritedPolicy.upsert({
        where: {
          parentOrgId_targetOrgId: {
            parentOrgId: proposal.initiatorOrgId,
            targetOrgId: payload.childOrgId,
          },
        },
        create: {
          parentOrgId: proposal.initiatorOrgId,
          targetOrgId: payload.childOrgId,
          rules: policyRules as never,
          note: policyNote,
          createdByUserId: proposal.initiatorUserId,
        },
        update: { rules: policyRules as never, note: policyNote },
      });
      await invalidateOrgPolicyCache(payload.childOrgId);
      break;
    }

    case 'REMOVE_CHILD_POLICY': {
      if (!payload.childOrgId) throw new Error('REMOVE_CHILD_POLICY requires payload.childOrgId');
      const { invalidateOrgPolicyCache } = await import('@/lib/org-policy');
      await prisma.orgInheritedPolicy.deleteMany({
        where: { parentOrgId: proposal.initiatorOrgId, targetOrgId: payload.childOrgId },
      });
      await invalidateOrgPolicyCache(payload.childOrgId);
      break;
    }

    default:
      throw new Error(`Unhandled actionType: ${proposal.actionType}`);
  }
}

// ─── Expire stale proposals ───────────────────────────────────────────────────

export async function expireStaleProposals(orgId?: string): Promise<number> {
  const stale = await prisma.governanceProposal.findMany({
    where: {
      status: 'PENDING_VOTES' as ProposalStatus,
      expiresAt: { lt: new Date() },
      ...(orgId ? { OR: [{ childOrgId: orgId }, { initiatorOrgId: orgId }] } : {}),
    },
  });

  if (stale.length === 0) return 0;

  const now = new Date();

  await Promise.all(
    stale.map(async (proposal) => {
      await prisma.governanceProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'EXPIRED' as ProposalStatus,
          resolvedAt: now,
          resolvedReason: 'Proposal expired',
        },
      });
      await notifyOwners(proposal.id, proposal.childOrgId, 'PROPOSAL_EXPIRED');
    })
  );

  return stale.length;
}

// ─── Cancel proposal ──────────────────────────────────────────────────────────

export async function cancelProposal(
  proposalId: string,
  requestingOrgId: string
): Promise<GovernanceProposal> {
  const proposal = await prisma.governanceProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  if (proposal.status !== ('PENDING_VOTES' as ProposalStatus)) {
    throw new Error(`Proposal ${proposalId} cannot be cancelled (status: ${proposal.status})`);
  }

  if (proposal.initiatorOrgId !== requestingOrgId) {
    throw new Error(
      `Only the initiating organization (${proposal.initiatorOrgId}) can cancel this proposal`
    );
  }

  const cancelled = await prisma.governanceProposal.update({
    where: { id: proposalId },
    data: {
      status: 'CANCELLED' as ProposalStatus,
      resolvedAt: new Date(),
      resolvedReason: 'Cancelled by initiator',
    },
  });

  await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_CANCELLED', requestingOrgId);

  return cancelled;
}
