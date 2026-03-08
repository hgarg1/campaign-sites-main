import { NextRequest, NextResponse } from 'next/server';
import type { AdminSnapshot } from '@/lib/admin-live';
import { prisma } from '@/lib/database';
import {
  buildOrgTree,
  getAncestors,
  getDescendantIds,
  insertAncestry,
  removeAncestry,
  wouldCreateCycle,
} from '@/lib/ancestry';
import { executeAction } from '@/lib/governance';
import { invalidatePolicyCache, invalidateAllPolicyCaches, getOrgEffectivePolicy } from '@/lib/system-policy';
import type { PartyAffiliation } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { notifyAdmins, notifyOrgMembers } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function parsePagination(searchParams: URLSearchParams) {
  return {
    page: Math.max(parseInt(searchParams.get('page') || '1', 10), 1),
    pageSize: Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1),
  };
}

function getMonitoringHealth(snapshot: AdminSnapshot) {
  const now = new Date().toISOString();
  return {
    data: [
      {
        name: 'API Gateway',
        status: 'UP' as const,
        uptime: 99.9,
        latency: 32,
        load: 41,
        lastChecked: now,
      },
      {
        name: 'Database',
        status: 'UP' as const,
        uptime: 99.8,
        latency: 28,
        load: 37,
        lastChecked: now,
        message: `${snapshot.users.length} users, ${snapshot.websites.length} websites`,
      },
      {
        name: 'Redis Cache',
        status: 'UP' as const,
        uptime: 99.7,
        latency: 7,
        load: 24,
        lastChecked: now,
      },
    ],
  };
}

function getMonitoringMetrics() {
  const now = Date.now();
  const points = Array.from({ length: 12 }).map((_, index) => {
    const timestamp = new Date(now - (11 - index) * 5 * 60 * 1000).toISOString();
    return {
      timestamp,
      cpu: 30 + (index % 4) * 3,
      memory: 45 + (index % 5) * 2,
      diskIO: 4 + (index % 3),
      networkIO: 7 + (index % 4),
      databaseConnections: 8 + (index % 3),
      redisMemory: 48 + index,
    };
  });
  return { data: points };
}

function getMonitoringPerformance(snapshot: AdminSnapshot) {
  const base = Math.max(snapshot.jobs.length, 1);
  return {
    apiResponseTime: { p50: 80, p95: 160, p99: 240 },
    databaseQueryTime: { p50: 18, p95: 42, p99: 63 },
    workerJobTime: { p50: 900, p95: 1800, p99: 2800 },
    llmApiLatency: { p50: 700 + base, p95: 1200 + base, p99: 1800 + base },
  };
}

async function getAnalyticsGrowth() {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prior30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const last14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  function pct(current: number, prior: number) {
    if (prior === 0) return current > 0 ? 100.0 : 0.0;
    return Math.max(-100, Math.round(((current - prior) / prior) * 1000) / 10);
  }

  const [
    usersLast30, usersPrior30,
    orgsLast30, orgsPrior30,
    websitesLast30, websitesPrior30,
    dailyUserCounts, dailyOrgCounts, dailyWebsiteCounts,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { createdAt: { gte: prior30, lt: last30 } } }),
    prisma.organization.count({ where: { createdAt: { gte: last30 } } }),
    prisma.organization.count({ where: { createdAt: { gte: prior30, lt: last30 } } }),
    prisma.website.count({ where: { createdAt: { gte: last30 } } }),
    prisma.website.count({ where: { createdAt: { gte: prior30, lt: last30 } } }),
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS count
      FROM users WHERE created_at >= ${last14}
      GROUP BY DATE(created_at)`,
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS count
      FROM organizations WHERE created_at >= ${last14}
      GROUP BY DATE(created_at)`,
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS count
      FROM websites WHERE created_at >= ${last14}
      GROUP BY DATE(created_at)`,
  ]);

  const toMap = (rows: Array<{ date: Date; count: bigint }>) =>
    new Map(rows.map((r) => [new Date(r.date).toISOString().split('T')[0], Number(r.count)]));

  const userMap = toMap(dailyUserCounts);
  const orgMap = toMap(dailyOrgCounts);
  const websiteMap = toMap(dailyWebsiteCounts);

  const metrics = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(now.getTime() - (13 - index) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    return {
      date,
      users: userMap.get(date) ?? 0,
      organizations: orgMap.get(date) ?? 0,
      websites: websiteMap.get(date) ?? 0,
    };
  });

  return {
    usersGrowth: pct(usersLast30, usersPrior30),
    organizationsGrowth: pct(orgsLast30, orgsPrior30),
    websitesGrowth: pct(websitesLast30, websitesPrior30),
    metrics,
  };
}

async function getAnalyticsUsage() {
  const now = new Date();
  const last14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const dailyBuilds = await prisma.$queryRaw<
    Array<{ date: Date; count: bigint; completed: bigint; avg_ms: number | null }>
  >`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
      AVG(
        EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
      ) FILTER (
        WHERE status = 'COMPLETED'
          AND completed_at IS NOT NULL
          AND started_at IS NOT NULL
      ) AS avg_ms
    FROM build_jobs
    WHERE created_at >= ${last14}
    GROUP BY DATE(created_at)`;

  type BuildEntry = { count: number; completed: number; avg_ms: number | null };
  const buildMap = new Map<string, BuildEntry>(
    dailyBuilds.map((r) => [
      new Date(r.date).toISOString().split('T')[0],
      { count: Number(r.count), completed: Number(r.completed), avg_ms: r.avg_ms },
    ])
  );

  return Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(now.getTime() - (13 - index) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const row = buildMap.get(date);
    const total = row?.count ?? 0;
    const completed = row?.completed ?? 0;
    return {
      date,
      dailyActiveUsers: null,
      apiCalls: null,
      buildJobs: total,
      averageBuildTime: row?.avg_ms != null ? Math.round(row.avg_ms) : 0,
      successRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  });
}

async function getAnalyticsEngagement() {
  const [totalWebsites, activeIntegrations, completedBuilds, totalMembers, orgCount] =
    await Promise.all([
      prisma.website.count(),
      prisma.integration.count({ where: { isActive: true } }),
      prisma.buildJob.count({ where: { status: 'COMPLETED' } }),
      prisma.organizationMember.count(),
      prisma.organization.count(),
    ]);

  const teamInvited = Math.max(0, totalMembers - orgCount);

  return {
    sessionDuration: null,
    bounceRate: null,
    conversionRate: null,
    featureAdoption: [
      { feature: 'websites.created', value: totalWebsites, change: null },
      { feature: 'integrations.connected', value: activeIntegrations, change: null },
      { feature: 'builds.completed', value: completedBuilds, change: null },
      { feature: 'team.invited', value: teamInvited, change: null },
    ],
  };
}

function getSettingsDefaults() {
  const now = new Date().toISOString();
  return {
    email: {
      host: 'smtp.example.com',
      port: 587,
      username: 'noreply@example.com',
      password: '••••••••',
      tls: true,
      ssl: false,
      fromEmail: 'noreply@example.com',
    },
    emailTemplates: {
      data: [
        {
          id: 'tpl_welcome',
          key: 'welcome_email',
          name: 'Welcome Email',
          subject: 'Welcome to CampaignSites',
          htmlContent: '<p>Welcome!</p>',
          textContent: 'Welcome!',
          variables: ['name'],
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
    apiKeys: {
      data: [
        {
          id: 'key_default',
          name: 'Default Admin Key',
          key: 'cs_live_********',
          permissions: ['read:users', 'read:analytics'],
          lastUsedAt: null,
          createdAt: now,
          expiresAt: null,
        },
      ],
    },
    webhooks: { data: [] as Array<Record<string, unknown>> },
    rateLimits: {
      globalLimit: 1000,
      globalWindow: 60,
      perOrgLimit: 300,
      perOrgWindow: 60,
      perUserLimit: 100,
      perUserWindow: 60,
      whitelistIps: [],
    },
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expirationDays: null,
      historyCount: 5,
    },
    sessionPolicy: {
      timeoutMinutes: 30,
      rememberMeDuration: 14,
      maxConcurrentSessions: 3,
      forceLogoutOnIpChange: false,
    },
    authSettings: {
      require2FA: false,
      twoFAMethods: ['TOTP'],
      trustedDeviceDuration: 30,
    },
    ipFilters: { data: [] as Array<Record<string, unknown>> },
    retentionPolicies: {
      deletedWebsitesRetention: 30,
      deletedUsersRetention: 30,
      logsRetention: 90,
    },
    backup: {
      frequency: 'DAILY',
      lastBackupAt: null,
      nextBackupAt: null,
      backupSize: 0,
      enabled: true,
    },
    featureFlags: {
      data: [
        {
          id: 'flag_admin_analytics',
          name: 'Admin Analytics',
          key: 'admin_analytics',
          description: 'Enable advanced analytics in admin portal',
          enabled: true,
          rolloutPercentage: 100,
          targetAudiences: ['GLOBAL_ADMIN'],
          createdAt: now,
          updatedAt: now,
          updatedBy: 'system',
        },
      ],
    },
  };
}

function isActionPath(path: string[]) {
  const joined = path.join('/');
  return (
    joined.includes('/acknowledge') ||
    joined.includes('/resolve') ||
    joined.includes('/cancel') ||
    joined.includes('/rebuild') ||
    joined.includes('/manual') ||
    joined.includes('/test') ||
    joined.includes('/generate')
  );
}

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { getAdminSnapshot, getPaginatedWebsites, getPaginatedOrganizations, getPaginatedJobs } =
    await import('@/lib/admin-live');
  const path = params.slug || [];
  const [first, second, third] = path;
  const searchParams = request.nextUrl.searchParams;
  const { page, pageSize } = parsePagination(searchParams);

  // Governance routes do their own direct DB queries — skip the heavy snapshot
  if (first === 'governance') {
    if (second === 'stats' && !third) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [pending, approvedToday, expiredToday, totalOwnershipLinks, activeRules] = await Promise.all([
        prisma.governanceProposal.count({ where: { status: 'PENDING_VOTES' } }),
        prisma.governanceProposal.count({ where: { status: 'APPROVED', resolvedAt: { gte: yesterday } } }),
        prisma.governanceProposal.count({ where: { status: 'EXPIRED', resolvedAt: { gte: yesterday } } }),
        prisma.organizationOwnership.count({ where: { status: 'ACTIVE' } }),
        prisma.governanceRuleSet.count({ where: { isActive: true } }),
      ]);
      return NextResponse.json({ pending, approvedToday, expiredToday, totalOwnershipLinks, activeRules });
    }

    if (second === 'config') {
      const rows = await prisma.systemConfig.findMany();
      const config: Record<string, string> = {};
      for (const row of rows) config[row.key] = String(row.value ?? '');
      return NextResponse.json({ data: config });
    }

    if (second === 'rules') {
      const rules = await prisma.governanceRuleSet.findMany({
        select: {
          id: true,
          actionType: true,
          votingMode: true,
          quorumPercent: true,
          rejectMode: true,
          ttlDays: true,
          isActive: true,
        },
      });
      return NextResponse.json({ data: rules });
    }

    if (second === 'proposals' && third && !path[3]) {
      const proposal = await prisma.governanceProposal.findUnique({
        where: { id: third },
        include: {
          childOrg: { select: { id: true, name: true, slug: true } },
          initiatorOrg: { select: { id: true, name: true, slug: true } },
          votes: { select: { id: true, voterOrgId: true, voterUserId: true, decision: true, comment: true, votedAt: true } },
        },
      });
      if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      return NextResponse.json({ data: proposal });
    }

    if (second === 'proposals') {
      const statusFilter = searchParams.get('status');
      const orgIdFilter = searchParams.get('orgId');
      const { page: pPage, pageSize: pSize } = parsePagination(searchParams);

      const where: Record<string, unknown> = {};
      if (statusFilter) where['status'] = statusFilter;
      if (orgIdFilter) where['childOrgId'] = orgIdFilter;

      const [total, proposals] = await Promise.all([
        prisma.governanceProposal.count({ where }),
        prisma.governanceProposal.findMany({
          where,
          skip: (pPage - 1) * pSize,
          take: pSize,
          orderBy: { createdAt: 'desc' },
          include: {
            childOrg: { select: { id: true, name: true } },
            initiatorOrg: { select: { id: true, name: true } },
            votes: { select: { id: true, decision: true } },
          },
        }),
      ]);

      const enriched = proposals.map((p) => {
        const approveCount = p.votes.filter((v) => v.decision === 'APPROVE').length;
        const rejectCount = p.votes.filter((v) => v.decision === 'REJECT').length;
        return { ...p, approveCount, rejectCount };
      });

      return NextResponse.json({
        data: enriched,
        total,
        page: pPage,
        pageSize: pSize,
      });
    }

    return NextResponse.json({ error: `Unsupported governance endpoint` }, { status: 404 });
  }

  const snapshot = await getAdminSnapshot(searchParams.get('refresh') === 'true');

  if (first === 'websites' && !second) {
    return NextResponse.json(
      getPaginatedWebsites(snapshot, page, pageSize, {
        status: searchParams.get('status'),
        organizationId: searchParams.get('organizationId'),
        search: searchParams.get('search'),
      })
    );
  }

  if (first === 'websites' && second && !third) {
    const website = snapshot.websites.find((w) => w.id === second);
    if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    return NextResponse.json(website);
  }

  if (first === 'websites' && second && third === 'pages') {
    return NextResponse.json({ data: [] });
  }

  if (first === 'websites' && second && third === 'integrations') {
    return NextResponse.json({ data: [] });
  }

  if (first === 'websites' && second && third === 'llm-logs') {
    return NextResponse.json({ data: [] });
  }

  if (first === 'organizations' && !second) {
    return NextResponse.json(
      getPaginatedOrganizations(snapshot, page, pageSize, {
        whiteLabel: searchParams.get('whiteLabel'),
        status: searchParams.get('status'),
        search: searchParams.get('search'),
      })
    );
  }

  if (first === 'organizations' && second && !third) {
    const org = snapshot.organizations.find((o) => o.id === second);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(org);
  }

  if (first === 'organizations' && second && third === 'members') {
    const owner = snapshot.organizations.find((o) => o.id === second)?.owner;
    return NextResponse.json({
      data: owner
        ? [
            {
              id: `member_${owner.id}`,
              userId: owner.id,
              role: 'OWNER',
              user: owner,
            },
          ]
        : [],
    });
  }

  if (first === 'organizations' && second && third === 'websites') {
    const orgWebsites = snapshot.websites.filter((w) => w.organization.id === second);
    return NextResponse.json({ data: orgWebsites });
  }

  if (first === 'organizations' && second && third === 'usage') {
    return NextResponse.json({
      monthlyBuilds: 0,
      apiCalls: 0,
      storageUsed: 0,
      llmCosts: 0,
    });
  }

  if (first === 'jobs' && !second) {
    return NextResponse.json(
      getPaginatedJobs(snapshot, page, pageSize, {
        status: searchParams.get('status'),
        websiteId: searchParams.get('websiteId'),
      })
    );
  }

  if (first === 'jobs' && second === 'queue-status') {
    const pending = snapshot.jobs.filter((j) => j.status === 'PENDING').length;
    const inProgress = snapshot.jobs.filter((j) => j.status === 'IN_PROGRESS').length;
    const completedToday = snapshot.jobs.filter((j) => j.status === 'COMPLETED').length;
    const failedToday = snapshot.jobs.filter((j) => j.status === 'FAILED').length;

    return NextResponse.json({
      pending,
      inProgress,
      completedToday,
      failedToday,
      averageCompletionTime: 0,
    });
  }

  if (first === 'jobs' && second) {
    const job = snapshot.jobs.find((j) => j.id === second);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(job);
  }

  if (first === 'llm' && second === 'providers') {
    return NextResponse.json({
      data: [
        {
          provider: 'openai',
          model: 'gpt-4.1',
          status: 'active',
          totalCalls: snapshot.jobs.length * 4,
          totalTokens: snapshot.jobs.length * 3200,
          totalCost: Number((snapshot.jobs.length * 0.12).toFixed(2)),
          averageLatency: 720,
          lastError: null,
        },
      ],
    });
  }

  if (first === 'llm' && second === 'costs') {
    return NextResponse.json({
      today: 0,
      week: 0,
      month: 0,
      year: 0,
      byProvider: [],
      byOrganization: [],
    });
  }

  if (first === 'monitoring') {
    if (second === 'health') {
      return NextResponse.json(getMonitoringHealth(snapshot));
    }

    if (second === 'metrics') {
      return NextResponse.json(getMonitoringMetrics());
    }

    if (second === 'performance') {
      return NextResponse.json(getMonitoringPerformance(snapshot));
    }

    if (second === 'alerts') {
      return NextResponse.json({
        data: [
          {
            id: 'alert_redis_latency',
            level: 'INFO',
            type: 'CACHE',
            message: 'Redis latency normal',
            status: 'ACKNOWLEDGED',
            triggeredAt: snapshot.generatedAt,
            acknowledgedAt: snapshot.generatedAt,
            resolvedAt: null,
            acknowledgedBy: 'system',
            resolvedBy: null,
            metadata: { source: 'cache' },
          },
        ],
      });
    }

    if (second === 'alert-rules') {
      return NextResponse.json({
        data: [
          {
            id: 'rule_api_latency',
            name: 'API latency high',
            metric: 'api_response_time_p95',
            condition: 'GREATER_THAN',
            threshold: 500,
            level: 'WARNING',
            enabled: true,
            channels: ['channel_email_ops'],
            cooldownMinutes: 5,
            description: 'Warn when p95 API latency exceeds 500ms',
          },
        ],
      });
    }

    if (second === 'alert-channels') {
      return NextResponse.json({
        data: [
          {
            id: 'channel_email_ops',
            type: 'EMAIL',
            name: 'Ops Email',
            enabled: true,
            config: { to: 'ops@example.com' },
          },
        ],
      });
    }
  }

  if (first === 'analytics') {
    if (second === 'growth') {
      return NextResponse.json(await getAnalyticsGrowth());
    }

    if (second === 'usage') {
      return NextResponse.json(await getAnalyticsUsage());
    }

    if (second === 'engagement') {
      return NextResponse.json(await getAnalyticsEngagement());
    }

    if (second === 'quick-stats') {
      const [allJobs, completedJobs, pendingJobs, avgResult] = await Promise.all([
        prisma.buildJob.count(),
        prisma.buildJob.count({ where: { status: 'COMPLETED' } }),
        prisma.buildJob.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
        prisma.$queryRaw<Array<{ avg_ms: number | null }>>`
          SELECT AVG(
            EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
          ) AS avg_ms
          FROM build_jobs
          WHERE status = 'COMPLETED'
            AND completed_at IS NOT NULL
            AND started_at IS NOT NULL`,
      ]);
      const successRate = allJobs > 0 ? Math.round((completedJobs / allJobs) * 1000) / 10 : 0;
      const avgMs = avgResult[0]?.avg_ms;
      const avgBuildTimeSec = avgMs != null ? Math.round(avgMs / 100) / 10 : null;
      return NextResponse.json({ successRate, pendingJobs, avgBuildTimeSec });
    }

    if (second === 'costs') {
      return NextResponse.json({
        totalCost: Number((snapshot.jobs.length * 0.12).toFixed(2)),
        period: searchParams.get('period') || 'month',
        byOrganization: snapshot.organizations.map((org) => ({
          organizationId: org.id,
          organizationName: org.name,
          cost: Number((org.websiteCount * 0.3).toFixed(2)),
        })),
        byUser: snapshot.users.map((user) => ({
          userId: user.id,
          userName: user.name ?? user.email,
          cost: Number((user.websiteCount * 0.15).toFixed(2)),
        })),
        byWebsite: snapshot.websites.map((site) => ({
          websiteId: site.id,
          websiteName: site.name,
          cost: 0.25,
        })),
        byProvider: [{ provider: 'openai', cost: Number((snapshot.jobs.length * 0.12).toFixed(2)) }],
        infrastructure: Number((snapshot.websites.length * 2.5).toFixed(2)),
      });
    }

    if (second === 'billing') {
      return NextResponse.json({
        invoices: [],
        paymentHistory: [],
        outstandingBalance: 0,
        nextBillingDate: new Date().toISOString(),
        subscriptionStatus: 'active',
      });
    }

    if (second === 'reports') {
      return NextResponse.json([
        {
          id: 'report_daily_ops',
          name: 'Daily Ops Snapshot',
          type: 'daily',
          generatedAt: snapshot.generatedAt,
          downloadUrl: '/api/admin/analytics/reports/report_daily_ops/download',
          format: 'pdf',
        },
      ]);
    }

    if (second === 'reports' && third && path[3] === 'download') {
      return new NextResponse('Report content placeholder', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${third}.pdf`,
        },
      });
    }

    return NextResponse.json({ data: [] });
  }

  if (first === 'settings') {
    const settings = getSettingsDefaults();

    if (second === 'email') {
      if (!third) return NextResponse.json(settings.email);
      if (third === 'templates') return NextResponse.json(settings.emailTemplates);
      if (third === 'test') return NextResponse.json({ success: true });
    }

    if (second === 'api-keys') {
      return NextResponse.json(settings.apiKeys);
    }

    if (second === 'webhooks') {
      return NextResponse.json(settings.webhooks);
    }

    if (second === 'rate-limits') {
      return NextResponse.json(settings.rateLimits);
    }

    if (second === 'security') {
      if (third === 'password-policy') return NextResponse.json(settings.passwordPolicy);
      if (third === 'session-policy') return NextResponse.json(settings.sessionPolicy);
      if (third === 'auth-settings') return NextResponse.json(settings.authSettings);
      if (third === 'ip-filters') return NextResponse.json(settings.ipFilters);
    }

    if (second === 'data-retention') {
      if (third === 'policies') return NextResponse.json(settings.retentionPolicies);
      if (third === 'backup') return NextResponse.json(settings.backup);
    }

    if (second === 'feature-flags') {
      return NextResponse.json(settings.featureFlags);
    }

    return NextResponse.json({ data: [] });
  }

  // ─── Hierarchy: global tree ─────────────────────────────────────────────────
  if (first === 'hierarchy') {
    const rootOrgs = await prisma.organization.findMany({
      where: { parentId: null },
      select: { id: true },
    });
    const trees = await Promise.all(rootOrgs.map((o) => buildOrgTree(o.id)));
    return NextResponse.json({ data: trees.filter(Boolean) });
  }

  // ─── Hierarchy: per-org subtree ──────────────────────────────────────────────
  if (first === 'organizations' && second && third === 'hierarchy') {
    const tree = await buildOrgTree(second);
    if (!tree) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    const ancestors = await getAncestors(second);
    return NextResponse.json({ tree, ancestors });
  }

  // ─── Master tenant mappings ──────────────────────────────────────────────────
  if (first === 'master-tenants' && !second) {
    const mappings = await prisma.masterTenantMapping.findMany({
      include: {
        organization: {
          select: { id: true, name: true, slug: true, ownStatus: true, canCreateChildren: true },
        },
      },
    });
    return NextResponse.json({ data: mappings });
  }

  // ─── System Permission Policies ─────────────────────────────────────────────
  if (first === 'policies') {
    if (!second) {
      // List all policies with assignment counts
      const policies = await prisma.systemPermissionPolicy.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { assignments: true } } },
      });
      return NextResponse.json({ data: policies });
    }
    if (second && !third) {
      const policy = await prisma.systemPermissionPolicy.findUnique({
        where: { id: second },
        include: {
          assignments: {
            include: { organization: { select: { id: true, name: true, slug: true } } },
          },
        },
      });
      if (!policy) return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
      return NextResponse.json(policy);
    }
  }

  // ─── Org effective policy (for admin org detail view) ────────────────────────
  if (first === 'organizations' && second && third === 'effective-policy') {
    try {
      const result = await getOrgEffectivePolicy(second);
      const source = result.policies.length > 0
        ? result.policies.map((p) => p.name).join(', ')
        : 'No policies assigned — all actions permitted';
      return NextResponse.json({ source, rules: result.merged ?? [] });
    } catch {
      return NextResponse.json({ source: 'Error loading policy', rules: [] });
    }
  }

  // ─── List parent-imposed inherited policies on an org ────────────────────────
  if (first === 'organizations' && second && third === 'inherited-policies') {
    try {
      const inherited = await prisma.orgInheritedPolicy.findMany({
        where: { targetOrgId: second },
        include: { parentOrg: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const data = inherited.map((ip) => ({ ...ip, rules: Array.isArray(ip.rules) ? ip.rules : [] }));
      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  // ─── List policies assigned to an org ────────────────────────────────────────
  if (first === 'organizations' && second && third === 'policies' && !path[3]) {
    try {
      const assignments = await prisma.orgPolicyAssignment.findMany({
        where: { orgId: second },
        include: { policy: { select: { id: true, name: true, description: true, isDefault: true, _count: { select: { assignments: true } } } } },
        orderBy: { appliedAt: 'asc' },
      });
      return NextResponse.json({ assignments: assignments.map((a) => ({ ...a.policy, _count: { orgAssignments: a.policy._count.assignments } })) });
    } catch {
      return NextResponse.json({ assignments: [] });
    }
  }

  return NextResponse.json({
    error: `Unsupported admin endpoint: /api/admin/${path.join('/')}`,
  }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug || [];
  const [first, second, third] = path;

  if (first === 'analytics' && second === 'reports' && third === 'generate') {
    return NextResponse.json({
      id: `report_${Date.now()}`,
      name: 'Generated Report',
      type: 'custom',
      generatedAt: new Date().toISOString(),
      downloadUrl: '/api/admin/analytics/reports/generated/download',
      format: 'pdf',
    });
  }

  if (first === 'settings' && second === 'api-keys' && !third) {
    const body = (await request.json().catch(() => ({}))) as { name?: string; permissions?: string[] };
    return NextResponse.json(
      {
        id: `key_${Date.now()}`,
        name: body.name ?? 'New Key',
        key: 'cs_live_generated_********',
        permissions: body.permissions ?? [],
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
      { status: 201 }
    );
  }

  // ─── System Permission Policies ─────────────────────────────────────────────
  if (first === 'policies' && !second) {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      rules?: unknown[];
      isDefault?: boolean;
    };
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const policy = await prisma.systemPermissionPolicy.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        rules: (body.rules ?? []) as never,
        isDefault: body.isDefault ?? false,
      },
    });
    if (body.isDefault) await invalidateAllPolicyCaches();
    return NextResponse.json(policy, { status: 201 });
  }

  // ─── Assign policy to org ─────────────────────────────────────────────────────
  if (first === 'organizations' && second && third === 'policies') {
    const body = (await request.json().catch(() => ({}))) as { policyId?: string };
    if (!body.policyId) return NextResponse.json({ error: 'policyId required' }, { status: 400 });
    const assignment = await prisma.orgPolicyAssignment.upsert({
      where: { orgId_policyId: { orgId: second, policyId: body.policyId } },
      create: { orgId: second, policyId: body.policyId },
      update: { appliedAt: new Date() },
    });
    await invalidatePolicyCache(second);

    notifyAdmins({
      type: 'POLICY_ASSIGNED',
      title: 'Policy assigned to organization',
      body: `Policy ${body.policyId} was assigned to organization ${second}.`,
      orgId: second,
    }).catch(() => {});

    notifyOrgMembers(second, {
      type: 'ORG_POLICY_ASSIGNED',
      title: 'New policy applied to your organization',
      body: 'A system permission policy has been applied to your organization.',
      orgId: second,
    }).catch(() => {});

    return NextResponse.json(assignment, { status: 201 });
  }
  if (first === 'organizations' && second && third === 'parent') {
    const body = (await request.json().catch(() => ({}))) as { parentId?: string };
    if (!body.parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 });

    const org = await prisma.organization.findUnique({ where: { id: second } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const parent = await prisma.organization.findUnique({ where: { id: body.parentId } });
    if (!parent) return NextResponse.json({ error: 'Parent organization not found' }, { status: 404 });

    if (await wouldCreateCycle(second, body.parentId)) {
      return NextResponse.json({ error: 'Cannot set parent: would create a cycle' }, { status: 409 });
    }

    // Check max depth constraint on the new parent
    if (parent.maxChildDepth !== null) {
      const descendantIds = await getDescendantIds(second);
      const subtreeDepth = descendantIds.length > 0 ? Math.max(...(await Promise.all(
        descendantIds.map(async (id) => {
          const row = await prisma.organizationAncestry.findFirst({
            where: { ancestorId: second, descendantId: id },
            select: { depth: true },
          });
          return row?.depth ?? 0;
        })
      ))) : 0;
      if (subtreeDepth >= parent.maxChildDepth) {
        return NextResponse.json(
          { error: `Parent org allows max depth of ${parent.maxChildDepth}` },
          { status: 409 }
        );
      }
    }

    // Rebuild ancestry
    if (org.parentId) await removeAncestry(second);
    await insertAncestry(second, body.parentId);
    const updated = await prisma.organization.update({
      where: { id: second },
      data: { parentId: body.parentId },
    });
    return NextResponse.json(updated);
  }

  // ─── Suspend org + all descendants ──────────────────────────────────────────
  if (first === 'organizations' && second && third === 'suspend') {
    const org = await prisma.organization.findUnique({ where: { id: second } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const descendantIds = await getDescendantIds(second);
    const now = new Date();

    // Only cascade-suspend descendants that are currently ACTIVE (don't overwrite their own suspension reason)
    await prisma.organization.updateMany({
      where: { id: { in: descendantIds }, ownStatus: 'ACTIVE' },
      data: { ownStatus: 'SUSPENDED', suspendedAt: now, suspendedByOrgId: second },
    });
    // Suspend the org itself (by system — suspendedByOrgId = null)
    const updated = await prisma.organization.update({
      where: { id: second },
      data: { ownStatus: 'SUSPENDED', suspendedAt: now, suspendedByOrgId: null },
    });
    return NextResponse.json({ ...updated, cascadedCount: descendantIds.length });
  }

  // ─── Deactivate org + all descendants ──────────────────────────────────────
  if (first === 'organizations' && second && third === 'deactivate') {
    const org = await prisma.organization.findUnique({ where: { id: second } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const descendantIds = await getDescendantIds(second);
    const now = new Date();

    // Cascade-deactivate all active or suspended descendants
    await prisma.organization.updateMany({
      where: { id: { in: descendantIds }, ownStatus: { not: 'DEACTIVATED' } },
      data: { ownStatus: 'DEACTIVATED', suspendedAt: now, suspendedByOrgId: second },
    });
    const updated = await prisma.organization.update({
      where: { id: second },
      data: { ownStatus: 'DEACTIVATED', suspendedAt: now, suspendedByOrgId: null },
    });
    return NextResponse.json({ ...updated, cascadedCount: descendantIds.length });
  }

  // ─── Reactivate org + descendants suspended by this cascade ─────────────────
  if (first === 'organizations' && second && third === 'reactivate') {
    const org = await prisma.organization.findUnique({ where: { id: second } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const descendantIds = await getDescendantIds(second);

    // Restore only descendants that were suspended by this org's cascade
    const { count } = await prisma.organization.updateMany({
      where: { id: { in: descendantIds }, suspendedByOrgId: second },
      data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
    });
    const updated = await prisma.organization.update({
      where: { id: second },
      data: { ownStatus: 'ACTIVE', suspendedAt: null, suspendedByOrgId: null },
    });
    return NextResponse.json({ ...updated, restoredCount: count });
  }

  // ─── Governance: force-resolve proposal ─────────────────────────────────────
  if (first === 'governance' && second === 'proposals' && third && path[3] === 'force-resolve') {
    const proposalId = third;
    const body = (await request.json().catch(() => ({}))) as {
      decision?: 'APPROVED' | 'REJECTED';
      reason?: string;
    };

    if (!body.decision || !['APPROVED', 'REJECTED'].includes(body.decision)) {
      return NextResponse.json({ error: 'decision must be APPROVED or REJECTED' }, { status: 400 });
    }

    const proposal = await prisma.governanceProposal.findUnique({
      where: { id: proposalId },
      include: { childOrg: { select: { id: true } } },
    });
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.status !== 'PENDING_VOTES') {
      return NextResponse.json({ error: 'Proposal is not pending' }, { status: 409 });
    }

    const resolvedReason = body.reason ?? 'Force-resolved by admin';
    const now = new Date();

    const updated = await prisma.governanceProposal.update({
      where: { id: proposalId },
      data: {
        status: body.decision,
        resolvedAt: now,
        resolvedReason,
      },
    });

    if (body.decision === 'APPROVED') {
      try {
        await executeAction(proposal);
      } catch {
        // Best-effort — action may fail but we still record the resolution
      }
    }

    // Emit notifications inline
    const notifType: NotificationType =
      body.decision === 'APPROVED' ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED';
    const owners = await prisma.organizationOwnership.findMany({
      where: { childOrgId: proposal.childOrgId, status: 'ACTIVE' },
      select: { parentOrgId: true },
    });
    if (owners.length > 0) {
      await prisma.governanceNotification.createMany({
        data: owners.map((o) => ({
          proposalId,
          recipientOrgId: o.parentOrgId,
          type: notifType,
        })),
      });
    }

    return NextResponse.json(updated);
  }

  if (isActionPath(path)) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug || [];
  const [first, second, third] = path;

  // ─── Hierarchy settings ──────────────────────────────────────────────────────
  if (first === 'organizations' && second && third === 'hierarchy-settings') {
    const body = (await request.json().catch(() => ({}))) as {
      canCreateChildren?: boolean;
      maxChildDepth?: number | null;
    };
    const updated = await prisma.organization.update({
      where: { id: second },
      data: {
        ...(body.canCreateChildren !== undefined && { canCreateChildren: body.canCreateChildren }),
        ...(body.maxChildDepth !== undefined && { maxChildDepth: body.maxChildDepth }),
      },
    });
    return NextResponse.json(updated);
  }

  // ─── System Permission Policy PATCH ──────────────────────────────────────────
  if (first === 'policies' && second) {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      rules?: unknown[];
      isDefault?: boolean;
    };
    const policy = await prisma.systemPermissionPolicy.findUnique({ where: { id: second } });
    if (!policy) return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    const updated = await prisma.systemPermissionPolicy.update({
      where: { id: second },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.rules !== undefined && { rules: body.rules as never }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });
    await invalidateAllPolicyCaches();
    return NextResponse.json(updated);
  }

  // ─── Governance PATCH ────────────────────────────────────────────────────────
  if (first === 'governance') {
    if (second === 'config') {
      const body = (await request.json().catch(() => ({}))) as Record<string, string | number>;
      await Promise.all(
        Object.entries(body).map(([key, value]) =>
          prisma.systemConfig.upsert({
            where: { key },
            create: { key, value: String(value) },
            update: { value: String(value) },
          })
        )
      );
      return NextResponse.json({ success: true });
    }

    if (second === 'rules' && third) {
      const body = (await request.json().catch(() => ({}))) as {
        votingMode?: string;
        quorumPercent?: number;
        rejectMode?: string;
        ttlDays?: number;
        isActive?: boolean;
      };
      const updated = await prisma.governanceRuleSet.update({
        where: { id: third },
        data: {
          ...(body.votingMode !== undefined && { votingMode: body.votingMode as never }),
          ...(body.quorumPercent !== undefined && { quorumPercent: body.quorumPercent }),
          ...(body.rejectMode !== undefined && { rejectMode: body.rejectMode as never }),
          ...(body.ttlDays !== undefined && { ttlDays: body.ttlDays }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
      return NextResponse.json(updated);
    }
  }

  if (isActionPath(path) || path[0] === 'settings' || path[0] === 'monitoring') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug || [];
  const [first, second] = path;

  // ─── Set/update master tenant for a party ───────────────────────────────────
  if (first === 'master-tenants' && second) {
    const body = (await request.json().catch(() => ({}))) as { organizationId?: string };
    if (!body.organizationId) {
      return NextResponse.json({ error: 'organizationId required' }, { status: 400 });
    }
    const org = await prisma.organization.findUnique({ where: { id: body.organizationId } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const mapping = await prisma.masterTenantMapping.upsert({
      where: { partyAffiliation: second as PartyAffiliation },
      create: {
        partyAffiliation: second as PartyAffiliation,
        organizationId: body.organizationId,
      },
      update: { organizationId: body.organizationId },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    return NextResponse.json(mapping);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug || [];
  const [first, second, third] = path;

  // ─── Remove parent (detach org from hierarchy) ───────────────────────────────
  if (first === 'organizations' && second && third === 'parent') {
    const org = await prisma.organization.findUnique({ where: { id: second } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    if (!org.parentId) return NextResponse.json({ error: 'Organization has no parent' }, { status: 400 });

    await removeAncestry(second);
    // Rebuild self-ancestry for the detached subtree so its own children still find it
    await prisma.organizationAncestry.upsert({
      where: { ancestorId_descendantId: { ancestorId: second, descendantId: second } },
      create: { ancestorId: second, descendantId: second, depth: 0 },
      update: {},
    });
    const updated = await prisma.organization.update({
      where: { id: second },
      data: { parentId: null },
    });
    return NextResponse.json(updated);
  }

  // ─── Delete master tenant mapping ────────────────────────────────────────────
  if (first === 'master-tenants' && second) {
    await prisma.masterTenantMapping.delete({
      where: { partyAffiliation: second as PartyAffiliation },
    });
    return new NextResponse(null, { status: 204 });
  }

  // ─── Delete system permission policy ─────────────────────────────────────────
  if (first === 'policies' && second && !third) {
    const assignmentCount = await prisma.orgPolicyAssignment.count({ where: { policyId: second } });
    if (assignmentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete policy: still assigned to ${assignmentCount} org(s)` },
        { status: 409 }
      );
    }
    await prisma.systemPermissionPolicy.delete({ where: { id: second } });
    await invalidateAllPolicyCaches();
    return new NextResponse(null, { status: 204 });
  }

  // ─── Unassign policy from org ─────────────────────────────────────────────────
  if (first === 'organizations' && second && third === 'policies' && path[3]) {
    await prisma.orgPolicyAssignment.deleteMany({
      where: { orgId: second, policyId: path[3] },
    });
    await invalidatePolicyCache(second);
    return new NextResponse(null, { status: 204 });
  }

  if (path[0] === 'settings' || path[0] === 'organizations' || path[0] === 'users' || path[0] === 'websites') {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
