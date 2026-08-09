/**
 * Electorate reconciliation semantics.
 *
 * These exercise `reconcileElectorate` against a mocked Prisma client rather
 * than a database, because what is being asserted is the *policy* — who stays in
 * the denominator when ownership changes mid-vote — not Prisma's behaviour.
 */

const mockPrisma = {
  governanceVote: { findMany: jest.fn() },
  governanceProposalVoter: { findMany: jest.fn(), update: jest.fn() },
  organizationOwnership: { findMany: jest.fn() },
  organization: { findMany: jest.fn() },
};

jest.mock('@/lib/database', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/audit-log', () => ({ logSystemAdminAction: jest.fn() }));

import { reconcileElectorate } from '@/lib/governance';

const PROPOSAL = {
  id: 'p1',
  childOrgId: 'child',
  electorateSnapshotAt: new Date('2026-08-01T00:00:00Z'),
};

function setup(opts: {
  snapshot: Array<{ voterOrgId: string; stakeBps: number; withdrawnAt?: Date | null }>;
  stillActiveOrgIds: string[];
  deactivatedOrgIds?: string[];
  votes?: Array<{ voterOrgId: string; decision: 'APPROVE' | 'REJECT' }>;
}) {
  mockPrisma.governanceVote.findMany.mockResolvedValue(opts.votes ?? []);
  mockPrisma.governanceProposalVoter.findMany.mockResolvedValue(
    opts.snapshot.map((s) => ({ withdrawnAt: null, withdrawnReason: null, ...s }))
  );
  mockPrisma.organizationOwnership.findMany.mockResolvedValue(
    opts.stillActiveOrgIds.map((id) => ({ parentOrgId: id }))
  );
  mockPrisma.organization.findMany.mockResolvedValue(
    (opts.deactivatedOrgIds ?? []).map((id) => ({ id }))
  );
  mockPrisma.governanceProposalVoter.update.mockResolvedValue({});
}

beforeEach(() => jest.clearAllMocks());

describe('reconcileElectorate', () => {
  it('keeps every voter when nothing has changed', async () => {
    setup({
      snapshot: [
        { voterOrgId: 'a', stakeBps: 6000 },
        { voterOrgId: 'b', stakeBps: 4000 },
      ],
      stillActiveOrgIds: ['a', 'b'],
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.map((b) => b.voterOrgId)).toEqual(['a', 'b']);
    expect(mockPrisma.governanceProposalVoter.update).not.toHaveBeenCalled();
  });

  it('withdraws an owner whose ownership was removed, shrinking the denominator', async () => {
    setup({
      snapshot: [
        { voterOrgId: 'a', stakeBps: 5000 },
        { voterOrgId: 'b', stakeBps: 3000 },
        { voterOrgId: 'c', stakeBps: 2000 },
      ],
      stillActiveOrgIds: ['a', 'b'], // c was removed
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.map((b) => b.voterOrgId)).toEqual(['a', 'b']);
    expect(mockPrisma.governanceProposalVoter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ withdrawnReason: 'OWNERSHIP_REMOVED' }),
      })
    );
  });

  it('KEEPS a suspended co-owner — suspension must not be a way to win a vote', async () => {
    setup({
      snapshot: [
        { voterOrgId: 'a', stakeBps: 0 },
        { voterOrgId: 'suspended', stakeBps: 0 },
      ],
      stillActiveOrgIds: ['a', 'suspended'],
      deactivatedOrgIds: [], // suspended is not deactivated
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.map((b) => b.voterOrgId)).toContain('suspended');
  });

  it('withdraws a DEACTIVATED co-owner, because deactivation is terminal', async () => {
    setup({
      snapshot: [
        { voterOrgId: 'a', stakeBps: 0 },
        { voterOrgId: 'gone', stakeBps: 0 },
      ],
      stillActiveOrgIds: ['a', 'gone'],
      deactivatedOrgIds: ['gone'],
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.map((b) => b.voterOrgId)).toEqual(['a']);
    expect(mockPrisma.governanceProposalVoter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ withdrawnReason: 'ORG_DEACTIVATED' }),
      })
    );
  });

  it('never admits an owner added after the snapshot', async () => {
    setup({
      snapshot: [{ voterOrgId: 'a', stakeBps: 10000 }],
      stillActiveOrgIds: ['a', 'newcomer'], // newcomer joined mid-vote
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.map((b) => b.voterOrgId)).toEqual(['a']);
  });

  it('can empty out entirely, rather than reporting a phantom voter', async () => {
    setup({ snapshot: [{ voterOrgId: 'a', stakeBps: 0 }], stillActiveOrgIds: [] });
    expect(await reconcileElectorate(PROPOSAL)).toEqual([]);
  });

  it('carries cast decisions onto the ballots', async () => {
    setup({
      snapshot: [
        { voterOrgId: 'a', stakeBps: 6000 },
        { voterOrgId: 'b', stakeBps: 4000 },
      ],
      stillActiveOrgIds: ['a', 'b'],
      votes: [{ voterOrgId: 'a', decision: 'APPROVE' }],
    });

    const ballots = await reconcileElectorate(PROPOSAL);
    expect(ballots.find((b) => b.voterOrgId === 'a')?.decision).toBe('APPROVE');
    expect(ballots.find((b) => b.voterOrgId === 'b')?.decision).toBeNull();
  });

  it('falls back to the live owner set for proposals created before snapshots existed', async () => {
    mockPrisma.governanceVote.findMany.mockResolvedValue([]);
    mockPrisma.organizationOwnership.findMany.mockResolvedValue([
      { parentOrgId: 'legacy-a', stakeBps: 0 },
      { parentOrgId: 'legacy-b', stakeBps: 0 },
    ]);

    const ballots = await reconcileElectorate({
      id: 'old',
      childOrgId: 'child',
      electorateSnapshotAt: null,
    });

    expect(ballots.map((b) => b.voterOrgId)).toEqual(['legacy-a', 'legacy-b']);
    // The snapshot table is never consulted on the legacy path.
    expect(mockPrisma.governanceProposalVoter.findMany).not.toHaveBeenCalled();
  });
});
