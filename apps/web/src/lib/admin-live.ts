import { prisma } from './database';
import { cacheGet, cacheSet } from './redis';

const SNAPSHOT_CACHE_KEY = 'admin:snapshot:v1';
const SNAPSHOT_TTL_SECONDS = 15;

export type AdminSnapshot = {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
    status: 'active' | 'suspended' | 'deleted';
    organizationCount: number;
    websiteCount: number;
    createdAt: string;
    lastLogin?: string;
  }>;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    whiteLabel: boolean;
    customDomain: string | null;
    memberCount: number;
    websiteCount: number;
    status: 'active' | 'suspended';
    createdAt: string;
    owner?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  websites: Array<{
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    status: 'DRAFT' | 'BUILDING' | 'AUDITING' | 'DEPLOYING' | 'PUBLISHED' | 'FAILED';
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  jobs: Array<{
    id: string;
    websiteId: string;
    stage: 'BUILDER' | 'AUDITOR_1' | 'CICD_BUILDER' | 'AUDITOR_2' | 'DEPLOYMENT';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    error: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    website: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  generatedAt: string;
};

let inflightSnapshot: Promise<AdminSnapshot> | null = null;

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total: items.length,
    },
  };
}

async function buildSnapshotFromDatabase(): Promise<AdminSnapshot> {
  const [users, organizations, websites, jobs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            organizations: true,
            websites: true,
          },
        },
      },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        name: true,
        slug: true,
        whiteLabel: true,
        customDomain: true,
        createdAt: true,
        members: {
          take: 1,
          where: { role: 'OWNER' },
          select: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            members: true,
            websites: true,
          },
        },
      },
    }),
    prisma.website.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.buildJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        websiteId: true,
        stage: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        website: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    users: users.map((user: typeof users[number]) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: 'active',
      organizationCount: user._count.organizations,
      websiteCount: user._count.websites,
      createdAt: user.createdAt.toISOString(),
      lastLogin: undefined,
    })),
    organizations: organizations.map((org: typeof organizations[number]) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      whiteLabel: org.whiteLabel,
      customDomain: org.customDomain,
      memberCount: org._count.members,
      websiteCount: org._count.websites,
      status: 'active',
      createdAt: org.createdAt.toISOString(),
      owner: org.members[0]?.user,
    })),
    websites: websites.map((site: typeof websites[number]) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      domain: site.domain,
      status: site.status,
      publishedAt: site.publishedAt?.toISOString() ?? null,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
      organization: site.organization,
      owner: site.user,
    })),
    jobs: jobs.map((job: typeof jobs[number]) => ({
      id: job.id,
      websiteId: job.websiteId,
      stage: job.stage,
      status: job.status,
      error: job.error,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      website: job.website,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminSnapshot(forceRefresh = false): Promise<AdminSnapshot> {
  if (!forceRefresh) {
    const cached = await cacheGet<AdminSnapshot>(SNAPSHOT_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  if (inflightSnapshot) {
    return inflightSnapshot;
  }

  inflightSnapshot = (async () => {
    try {
      const snapshot = await buildSnapshotFromDatabase();
      await cacheSet(SNAPSHOT_CACHE_KEY, snapshot, SNAPSHOT_TTL_SECONDS);
      return snapshot;
    } catch (err) {
      console.error('[admin-live] snapshot build failed, returning empty snapshot:', err);
      // Return empty snapshot so the route can still serve list/detail pages
      // (they'll show empty state rather than hard 503)
      return emptySnapshot();
    } finally {
      inflightSnapshot = null;
    }
  })();

  return inflightSnapshot;
}

function emptySnapshot(): AdminSnapshot {
  return {
    users: [],
    organizations: [],
    websites: [],
    jobs: [],
    generatedAt: new Date().toISOString(),
  };
}

export function getPaginatedUsers(snapshot: AdminSnapshot, page: number, pageSize: number, filters?: {
  role?: string | null;
  status?: string | null;
  search?: string | null;
}) {
  let items = snapshot.users;

  if (filters?.role) {
    items = items.filter((u) => u.role === filters.role);
  }
  if (filters?.status) {
    items = items.filter((u) => u.status === filters.status);
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    items = items.filter((u) =>
      u.email.toLowerCase().includes(search) || (u.name ?? '').toLowerCase().includes(search)
    );
  }

  return paginate(items, page, pageSize);
}

export function getPaginatedOrganizations(snapshot: AdminSnapshot, page: number, pageSize: number, filters?: {
  whiteLabel?: string | null;
  status?: string | null;
  search?: string | null;
}) {
  let items = snapshot.organizations;

  if (filters?.whiteLabel !== null && filters?.whiteLabel !== undefined) {
    items = items.filter((org) => String(org.whiteLabel) === filters.whiteLabel);
  }
  if (filters?.status) {
    items = items.filter((org) => org.status === filters.status);
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    items = items.filter((org) =>
      org.name.toLowerCase().includes(search) || org.slug.toLowerCase().includes(search)
    );
  }

  return paginate(items, page, pageSize);
}

export function getPaginatedWebsites(snapshot: AdminSnapshot, page: number, pageSize: number, filters?: {
  status?: string | null;
  organizationId?: string | null;
  search?: string | null;
}) {
  let items = snapshot.websites;

  if (filters?.status) {
    items = items.filter((site) => site.status === filters.status);
  }
  if (filters?.organizationId) {
    items = items.filter((site) => site.organization.id === filters.organizationId);
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    items = items.filter((site) =>
      site.name.toLowerCase().includes(search) || site.slug.toLowerCase().includes(search)
    );
  }

  return paginate(items, page, pageSize);
}

export function getPaginatedJobs(snapshot: AdminSnapshot, page: number, pageSize: number, filters?: {
  status?: string | null;
  websiteId?: string | null;
}) {
  let items = snapshot.jobs;

  if (filters?.status) {
    items = items.filter((job) => job.status === filters.status);
  }
  if (filters?.websiteId) {
    items = items.filter((job) => job.websiteId === filters.websiteId);
  }

  return paginate(items, page, pageSize);
}
