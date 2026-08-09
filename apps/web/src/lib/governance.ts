import { prisma } from '@/lib/database';
import { insertAncestry, removeAncestry, getDescendantIds } from '@/lib/ancestry';
import {
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

export async function getActiveOwners(childOrgId: string): Promise<Array<{ parentOrgId: string }>> {
  return prisma.organizationOwnership.findMany({
    where: { childOrgId, status: 'ACTIVE' as OwnershipStatus },
    select: { parentOrgId: true },
  });
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

  // Load rule set — fall back to sensible defaults if none exists for this actionType
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

  // Check expiry before accepting a vote
  if (proposal.expiresAt < new Date()) {
    const expired = await prisma.governanceProposal.update({
      where: { id: proposalId },
      data: {
        status: 'EXPIRED' as ProposalStatus,
        resolvedAt: new Date(),
        resolvedReason: 'Proposal expired',
      },
    });
    await notifyOwners(proposalId, proposal.childOrgId, 'PROPOSAL_EXPIRED');
    return expired;
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

  // Guard duplicate vote (the unique constraint will also catch this at the DB level)
  const existingVote = await prisma.governanceVote.findFirst({
    where: { proposalId, voterOrgId },
  });
  if (existingVote) {
    throw new Error(`Organization ${voterOrgId} has already voted on proposal ${proposalId}`);
  }

  await prisma.governanceVote.create({
    data: { proposalId, voterOrgId, voterUserId, decision, comment },
  });

  await notifyOwners(proposalId, proposal.childOrgId, 'VOTE_CAST', voterOrgId);

  return evaluateProposal(proposalId);
}

// ─── Evaluate proposal ────────────────────────────────────────────────────────

export async function evaluateProposal(proposalId: string): Promise<GovernanceProposal> {
  const proposal = await prisma.governanceProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });
  const votes = await prisma.governanceVote.findMany({ where: { proposalId } });

  // Evaluate against the CURRENT owner set, not the count snapshotted at
  // creation. If an owner is removed mid-vote, the stored count makes unanimity
  // unreachable; if one is added, the stored count lets a proposal pass without
  // them. Votes from orgs that are no longer active owners are discarded.
  const activeOwners = await getActiveOwners(proposal.childOrgId);
  const activeOwnerIds = new Set(activeOwners.map((o) => o.parentOrgId));
  const countingVotes = votes.filter((v) => activeOwnerIds.has(v.voterOrgId));

  const approveCount = countingVotes.filter(
    (v) => v.decision === ('APPROVE' as VoteDecision)
  ).length;
  const rejectCount = countingVotes.filter((v) => v.decision === ('REJECT' as VoteDecision)).length;
  const required = Math.max(activeOwners.length, 1);

  let outcome: 'APPROVED' | 'REJECTED' | null = null;
  let resolvedReason: string | undefined;

  if (proposal.votingMode === ('UNANIMOUS' as VotingMode)) {
    if (proposal.rejectMode === ('SINGLE_VETO' as RejectMode) && rejectCount > 0) {
      outcome = 'REJECTED';
      resolvedReason = 'Rejected by vote';
    } else if (
      proposal.rejectMode === ('MAJORITY_VETO' as RejectMode) &&
      rejectCount > required / 2
    ) {
      outcome = 'REJECTED';
      resolvedReason = 'Rejected by vote';
    } else if (approveCount === required) {
      outcome = 'APPROVED';
    }
  } else {
    // QUORUM mode
    const pct = (proposal.quorumPercent ?? 51) / 100;

    if (proposal.rejectMode === ('SINGLE_VETO' as RejectMode) && rejectCount > 0) {
      outcome = 'REJECTED';
      resolvedReason = 'Rejected by vote';
    } else if (
      proposal.rejectMode === ('MAJORITY_VETO' as RejectMode) &&
      required > 0 &&
      rejectCount / required > 1 - pct
    ) {
      outcome = 'REJECTED';
      resolvedReason = 'Rejected by vote';
    } else if (required > 0 && approveCount / required >= pct) {
      outcome = 'APPROVED';
    }
  }

  if (!outcome) {
    // Not yet decided — return current proposal unchanged
    return proposal;
  }

  const resolved = await prisma.governanceProposal.update({
    where: { id: proposalId },
    data: {
      status: outcome as ProposalStatus,
      resolvedAt: new Date(),
      resolvedReason: resolvedReason ?? null,
    },
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
      await prisma.organizationOwnership.create({
        data: {
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
      await prisma.organizationOwnership.create({
        data: {
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
