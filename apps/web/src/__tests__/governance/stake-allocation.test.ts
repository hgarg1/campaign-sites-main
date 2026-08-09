/**
 * SET_OWNERSHIP_STAKES validation.
 *
 * Reallocation is the action the entire weighting scheme depends on: if a
 * partial or unbalanced allocation could be applied, an owner's voting power
 * could be changed without them ever agreeing to it.
 */

const mockPrisma = {
  organizationOwnership: { findMany: jest.fn(), update: jest.fn() },
  ownershipStakeChange: { create: jest.fn() },
  governanceProposal: { findUniqueOrThrow: jest.fn() },
  organization: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
};

jest.mock('@/lib/database', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/audit-log', () => ({ logSystemAdminAction: jest.fn() }));
jest.mock('@/lib/ancestry', () => ({
  insertAncestry: jest.fn(),
  removeAncestry: jest.fn(),
  getDescendantIds: jest.fn().mockResolvedValue([]),
}));

import { executeAction } from '@/lib/governance';

const proposalWith = (stakes: unknown) =>
  ({
    id: 'p1',
    childOrgId: 'child',
    initiatorOrgId: 'a',
    initiatorUserId: 'user1',
    actionType: 'SET_OWNERSHIP_STAKES',
    actionPayload: { stakes },
    resolvedReason: null,
  }) as never;

function withOwners(owners: Array<{ parentOrgId: string; stakeBps: number }>) {
  mockPrisma.organizationOwnership.findMany.mockResolvedValue(owners);
  mockPrisma.organizationOwnership.update.mockResolvedValue({});
  mockPrisma.ownershipStakeChange.create.mockResolvedValue({});
}

beforeEach(() => jest.clearAllMocks());

describe('SET_OWNERSHIP_STAKES', () => {
  it('applies a balanced allocation and records the change', async () => {
    withOwners([
      { parentOrgId: 'a', stakeBps: 0 },
      { parentOrgId: 'b', stakeBps: 0 },
    ]);

    await executeAction(
      proposalWith([
        { parentOrgId: 'a', stakeBps: 6000 },
        { parentOrgId: 'b', stakeBps: 4000 },
      ])
    );

    expect(mockPrisma.organizationOwnership.update).toHaveBeenCalledTimes(2);
    // The edge row is reused rather than versioned, so history must be written.
    expect(mockPrisma.ownershipStakeChange.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.ownershipStakeChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStakeBps: 0, toStakeBps: 6000, reason: 'PROPOSAL' }),
      })
    );
  });

  it('refuses an allocation that does not total 100%', async () => {
    withOwners([
      { parentOrgId: 'a', stakeBps: 0 },
      { parentOrgId: 'b', stakeBps: 0 },
    ]);

    await expect(
      executeAction(
        proposalWith([
          { parentOrgId: 'a', stakeBps: 6000 },
          { parentOrgId: 'b', stakeBps: 3000 },
        ])
      )
    ).rejects.toThrow(/must total 10000/);
    expect(mockPrisma.organizationOwnership.update).not.toHaveBeenCalled();
  });

  it('refuses to omit an active owner — silence is not consent to dilution', async () => {
    withOwners([
      { parentOrgId: 'a', stakeBps: 5000 },
      { parentOrgId: 'b', stakeBps: 5000 },
    ]);

    await expect(
      executeAction(proposalWith([{ parentOrgId: 'a', stakeBps: 10000 }]))
    ).rejects.toThrow(/omits active owner b/);
    expect(mockPrisma.organizationOwnership.update).not.toHaveBeenCalled();
  });

  it('refuses stake for an org that is not an owner', async () => {
    withOwners([{ parentOrgId: 'a', stakeBps: 0 }]);

    await expect(
      executeAction(
        proposalWith([
          { parentOrgId: 'a', stakeBps: 5000 },
          { parentOrgId: 'outsider', stakeBps: 5000 },
        ])
      )
    ).rejects.toThrow(/not an active owner/);
  });

  it('refuses a duplicated organization', async () => {
    withOwners([{ parentOrgId: 'a', stakeBps: 0 }]);

    await expect(
      executeAction(
        proposalWith([
          { parentOrgId: 'a', stakeBps: 5000 },
          { parentOrgId: 'a', stakeBps: 5000 },
        ])
      )
    ).rejects.toThrow(/same organization twice/);
  });

  it('refuses an out-of-range or non-integer stake', async () => {
    withOwners([
      { parentOrgId: 'a', stakeBps: 0 },
      { parentOrgId: 'b', stakeBps: 0 },
    ]);

    await expect(
      executeAction(
        proposalWith([
          { parentOrgId: 'a', stakeBps: 10500 },
          { parentOrgId: 'b', stakeBps: -500 },
        ])
      )
    ).rejects.toThrow(/between 0 and 10000/);
  });

  it('skips writes for owners whose stake is unchanged', async () => {
    withOwners([
      { parentOrgId: 'a', stakeBps: 6000 },
      { parentOrgId: 'b', stakeBps: 4000 },
    ]);

    await executeAction(
      proposalWith([
        { parentOrgId: 'a', stakeBps: 6000 }, // unchanged
        { parentOrgId: 'b', stakeBps: 4000 }, // unchanged
      ])
    );

    expect(mockPrisma.organizationOwnership.update).not.toHaveBeenCalled();
    expect(mockPrisma.ownershipStakeChange.create).not.toHaveBeenCalled();
  });

  it('requires a stakes payload at all', async () => {
    withOwners([{ parentOrgId: 'a', stakeBps: 0 }]);
    await expect(executeAction(proposalWith(undefined))).rejects.toThrow(/requires payload.stakes/);
  });
});
