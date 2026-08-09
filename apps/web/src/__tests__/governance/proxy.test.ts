/**
 * Proxy eligibility, lifecycle, and the vote-concentration cap.
 *
 * The rule these all serve: a proxy lends a *person* the ability to act for one
 * organization. It must never become a way for two organizations' votes to end
 * up under one person's control.
 */

const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  organizationMember: { findFirst: jest.fn(), findMany: jest.fn() },
  organizationAncestry: { findMany: jest.fn() },
  governanceProxy: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  governanceVote: { findMany: jest.fn() },
  organization: { findMany: jest.fn() },
  systemConfig: { findUnique: jest.fn() },
};

jest.mock('@/lib/database', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/ancestry', () => ({
  getAncestorIds: jest.fn().mockResolvedValue(['parent-org']),
  getDescendantIds: jest.fn().mockResolvedValue(['child-org']),
}));

import {
  checkProxyEligibility,
  eligibleOrgIds,
  grantProxy,
  assertNoVoteConcentration,
} from '@/lib/governance-proxy';

const ACTIVE_USER = { id: 'u1', deletedAt: null, suspendedAt: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.systemConfig.findUnique.mockResolvedValue(null); // fall back to defaults
});

describe('eligibleOrgIds', () => {
  it('spans the principal, its ancestors and its descendants', async () => {
    const ids = await eligibleOrgIds('principal', null);
    expect(ids).toEqual(expect.arrayContaining(['principal', 'parent-org', 'child-org']));
  });

  it('includes the governed child when the proxy is scoped to one', async () => {
    const ids = await eligibleOrgIds('principal', 'governed');
    expect(ids).toContain('governed');
  });
});

describe('checkProxyEligibility', () => {
  it('accepts an admin inside the principal’s own structure', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: 'parent-org',
      role: 'ADMIN',
    });

    const r = await checkProxyEligibility({
      principalOrgId: 'principal',
      scopeChildOrgId: null,
      proxyUserId: 'u1',
    });
    expect(r).toMatchObject({ eligible: true, orgId: 'parent-org', role: 'ADMIN' });
  });

  it('refuses someone with no qualifying membership in that structure', async () => {
    // The important exclusion: an admin of a *co-parent* is outside the
    // principal's ancestors and descendants, so holding its proxy would be
    // delegation to another tenant with extra steps.
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

    const r = await checkProxyEligibility({
      principalOrgId: 'principal',
      scopeChildOrgId: null,
      proxyUserId: 'outsider',
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/own structure/);
  });

  it('refuses a suspended account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, suspendedAt: new Date() });
    const r = await checkProxyEligibility({
      principalOrgId: 'principal',
      scopeChildOrgId: null,
      proxyUserId: 'u1',
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/suspended/);
  });

  it('refuses a deleted account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, deletedAt: new Date() });
    const r = await checkProxyEligibility({
      principalOrgId: 'principal',
      scopeChildOrgId: null,
      proxyUserId: 'u1',
    });
    expect(r.eligible).toBe(false);
  });
});

describe('grantProxy', () => {
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: 'parent-org',
      role: 'ADMIN',
    });
    mockPrisma.governanceProxy.findFirst.mockResolvedValue(null);
    mockPrisma.governanceProxy.create.mockImplementation(({ data }: never) =>
      Promise.resolve({ id: 'proxy1', ...(data as object) })
    );
  });

  it('grants a scoped, expiring proxy and records how the holder qualified', async () => {
    const proxy = await grantProxy({
      principalOrgId: 'principal',
      proxyUserId: 'u1',
      grantedByUserId: 'owner1',
      expiresAt: tomorrow(),
    });
    expect(proxy).toMatchObject({ eligibilitySource: 'ADMIN', eligibilityOrgId: 'parent-org' });
  });

  it('requires an expiry in the future', async () => {
    await expect(
      grantProxy({
        principalOrgId: 'principal',
        proxyUserId: 'u1',
        grantedByUserId: 'owner1',
        expiresAt: new Date(Date.now() - 1000),
      })
    ).rejects.toThrow(/expire in the future/);
  });

  it('caps how long a proxy may last', async () => {
    await expect(
      grantProxy({
        principalOrgId: 'principal',
        proxyUserId: 'u1',
        grantedByUserId: 'owner1',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
    ).rejects.toThrow(/may not last longer than 30 days/);
  });

  it('refuses a self-grant, which changes nothing', async () => {
    await expect(
      grantProxy({
        principalOrgId: 'principal',
        proxyUserId: 'same',
        grantedByUserId: 'same',
        expiresAt: tomorrow(),
      })
    ).rejects.toThrow(/yourself/);
  });

  it('refuses a second live proxy for the same scope', async () => {
    mockPrisma.governanceProxy.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      grantProxy({
        principalOrgId: 'principal',
        proxyUserId: 'u1',
        grantedByUserId: 'owner1',
        expiresAt: tomorrow(),
      })
    ).rejects.toThrow(/already active/);
  });
});

describe('assertNoVoteConcentration', () => {
  it('allows a first ballot', async () => {
    mockPrisma.governanceVote.findMany.mockResolvedValue([]);
    await expect(
      assertNoVoteConcentration({ proposalId: 'p1', userId: 'u1' })
    ).resolves.toBeUndefined();
  });

  it('refuses a second organization’s ballot from the same person', async () => {
    // This is reachable WITHOUT proxies: authority inherits down the hierarchy,
    // so an admin of a grandparent above two co-parents can cast for both.
    mockPrisma.governanceVote.findMany.mockResolvedValue([{ voterOrgId: 'org-a' }]);
    mockPrisma.organization.findMany.mockResolvedValue([{ name: 'Org A' }]);

    await expect(assertNoVoteConcentration({ proposalId: 'p1', userId: 'u1' })).rejects.toThrow(
      /already voted on this proposal on behalf of Org A/
    );
  });
});
