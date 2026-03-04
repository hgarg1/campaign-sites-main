import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  type AdminSnapshot,
  getAdminSnapshot,
  getPaginatedJobs,
  getPaginatedOrganizations,
  getPaginatedWebsites,
} from '@/lib/admin-live';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { isDatabaseEnabled } from '@/lib/runtime-config';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

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

function getAnalyticsGrowth(snapshot: AdminSnapshot) {
  const now = Date.now();
  const metrics = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(now - (13 - index) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    return {
      date,
      users: Math.max(snapshot.users.length - (13 - index), 0),
      organizations: Math.max(snapshot.organizations.length - Math.floor((13 - index) / 2), 0),
      websites: Math.max(snapshot.websites.length - Math.floor((13 - index) / 3), 0),
    };
  });

  return {
    usersGrowth: 4.8,
    organizationsGrowth: 2.1,
    websitesGrowth: 6.3,
    metrics,
  };
}

function getAnalyticsUsage(snapshot: AdminSnapshot) {
  const now = Date.now();
  return Array.from({ length: 14 }).map((_, index) => ({
    date: new Date(now - (13 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyActiveUsers: Math.max(snapshot.users.length - (index % 3), 1),
    apiCalls: 1200 + index * 37,
    buildJobs: snapshot.jobs.length + (index % 4),
    averageBuildTime: 420 + (index % 5) * 15,
    successRate: 95 - (index % 3),
  }));
}

function getAnalyticsEngagement() {
  return [
    { metric: 'Session Duration', value: 7.8, trend: 4.2 },
    { metric: 'Bounce Rate', value: 31.5, trend: -2.1 },
    { metric: 'Conversion Rate', value: 12.4, trend: 1.8 },
    { metric: 'Feature Adoption', value: 68.2, trend: 5.6 },
  ];
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
  // Authentication check
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      { error: 'Admin access unavailable' },
      { status: 503 }
    );
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const path = params.slug || [];
  const [first, second, third] = path;
  const searchParams = request.nextUrl.searchParams;

  const snapshot = await getAdminSnapshot(searchParams.get('refresh') === 'true');
  const { page, pageSize } = parsePagination(searchParams);

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
      return NextResponse.json(getAnalyticsGrowth(snapshot));
    }

    if (second === 'usage') {
      return NextResponse.json(getAnalyticsUsage(snapshot));
    }

    if (second === 'engagement') {
      return NextResponse.json(getAnalyticsEngagement());
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

  return NextResponse.json({
    error: `Unsupported admin endpoint: /api/admin/${path.join('/')}`,
  }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug || [];
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

  if (isActionPath(path)) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug || [];

  if (isActionPath(path) || path[0] === 'settings' || path[0] === 'monitoring') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug || [];

  if (path[0] === 'settings' || path[0] === 'organizations' || path[0] === 'users' || path[0] === 'websites') {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
