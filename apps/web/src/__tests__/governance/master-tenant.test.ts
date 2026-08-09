const mockPrisma = {
  masterTenantMapping: { findUnique: jest.fn(), findMany: jest.fn() },
  organizationAncestry: { findMany: jest.fn() },
  organization: { findUnique: jest.fn(), findMany: jest.fn() },
};

jest.mock('@/lib/database', () => ({ prisma: mockPrisma }));

import { resolveNationalTenant, canTieBreak } from '@/lib/master-tenant';

function setup(opts: {
  selfMapping?: { organizationId: string; partyAffiliation: string } | null;
  ancestors?: Array<{ ancestorId: string; depth: number }>;
  mappedAncestors?: Array<{ organizationId: string; partyAffiliation: string }>;
  selfParty?: string | null;
  ancestorParties?: Array<{ id: string; partyAffiliation: string }>;
  partyMapping?: { organizationId: string; partyAffiliation: string } | null;
}) {
  mockPrisma.masterTenantMapping.findUnique.mockImplementation(({ where }: never) =>
    Promise.resolve(
      (where as Record<string, unknown>).organizationId !== undefined
        ? (opts.selfMapping ?? null)
        : (opts.partyMapping ?? null)
    )
  );
  mockPrisma.organizationAncestry.findMany.mockResolvedValue(opts.ancestors ?? []);
  mockPrisma.masterTenantMapping.findMany.mockResolvedValue(opts.mappedAncestors ?? []);
  mockPrisma.organization.findUnique.mockResolvedValue({
    partyAffiliation: opts.selfParty ?? null,
  });
  mockPrisma.organization.findMany.mockResolvedValue(opts.ancestorParties ?? []);
}

beforeEach(() => jest.clearAllMocks());

describe('resolveNationalTenant', () => {
  it('recognises an org that is itself a master tenant', async () => {
    setup({ selfMapping: { organizationId: 'rnc', partyAffiliation: 'REPUBLICAN' } });
    const r = await resolveNationalTenant('rnc');
    expect(r).toMatchObject({ orgId: 'rnc', source: 'SELF_MAPPING', ambiguous: false });
  });

  it('walks to the FURTHEST mapped ancestor, since the national body sits at the root', async () => {
    setup({
      selfMapping: null,
      ancestors: [
        { ancestorId: 'county', depth: 1 },
        { ancestorId: 'state', depth: 2 },
        { ancestorId: 'national', depth: 3 },
      ],
      // Both a mid-tree org and the root are mapped; the root must win.
      mappedAncestors: [
        { organizationId: 'state', partyAffiliation: 'REPUBLICAN' },
        { organizationId: 'national', partyAffiliation: 'REPUBLICAN' },
      ],
    });

    const r = await resolveNationalTenant('campaign');
    expect(r.orgId).toBe('national');
    expect(r.source).toBe('ANCESTOR_MAPPING');
  });

  it('refuses to choose when two party trees claim the org at the same depth', async () => {
    // Co-ownership makes the ancestry a DAG, so this is reachable. Picking one
    // would be the platform deciding which party an org belongs to.
    setup({
      selfMapping: null,
      ancestors: [
        { ancestorId: 'dnc', depth: 2 },
        { ancestorId: 'rnc', depth: 2 },
      ],
      mappedAncestors: [
        { organizationId: 'dnc', partyAffiliation: 'DEMOCRAT' },
        { organizationId: 'rnc', partyAffiliation: 'REPUBLICAN' },
      ],
    });

    const r = await resolveNationalTenant('contested');
    expect(r.ambiguous).toBe(true);
    expect(r.orgId).toBeNull();
  });

  it('falls back to the org’s own party affiliation', async () => {
    setup({
      selfMapping: null,
      ancestors: [],
      selfParty: 'GREEN',
      partyMapping: { organizationId: 'green-national', partyAffiliation: 'GREEN' },
    });

    const r = await resolveNationalTenant('lone-org');
    expect(r).toMatchObject({ orgId: 'green-national', source: 'SELF_AFFILIATION' });
  });

  it('inherits affiliation from an ancestor when the org declares none', async () => {
    // The common case: orgs created through the hierarchy flow have a NULL
    // partyAffiliation and never inherit one.
    setup({
      selfMapping: null,
      ancestors: [{ ancestorId: 'state', depth: 2 }],
      mappedAncestors: [],
      selfParty: null,
      ancestorParties: [{ id: 'state', partyAffiliation: 'DEMOCRAT' }],
      partyMapping: { organizationId: 'dnc', partyAffiliation: 'DEMOCRAT' },
    });

    const r = await resolveNationalTenant('child');
    expect(r).toMatchObject({ orgId: 'dnc', source: 'ANCESTOR_AFFILIATION' });
  });

  it('resolves to nothing when there is no mapping and no affiliation', async () => {
    setup({ selfMapping: null, ancestors: [], selfParty: null, partyMapping: null });
    const r = await resolveNationalTenant('orphan');
    expect(r).toMatchObject({ orgId: null, source: 'NONE', ambiguous: false });
  });
});

describe('canTieBreak', () => {
  const base = { partyAffiliation: null, resolvedFromOrgId: null } as const;

  it('accepts a resolved, unrelated national tenant', () => {
    expect(
      canTieBreak({ ...base, orgId: 'rnc', source: 'ANCESTOR_MAPPING', ambiguous: false }, 'child')
        .eligible
    ).toBe(true);
  });

  it('refuses when the org would adjudicate its own proposal', () => {
    const r = canTieBreak(
      { ...base, orgId: 'rnc', source: 'SELF_MAPPING', ambiguous: false },
      'rnc'
    );
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/its own proposal/);
  });

  it('refuses an ambiguous resolution', () => {
    const r = canTieBreak({ ...base, orgId: null, source: 'NONE', ambiguous: true }, 'child');
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/more than one party tree/);
  });

  it('refuses when nothing resolved', () => {
    const r = canTieBreak({ ...base, orgId: null, source: 'NONE', ambiguous: false }, 'child');
    expect(r.eligible).toBe(false);
  });
});
