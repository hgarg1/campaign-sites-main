/**
 * Unit tests for notification API routes.
 *
 * Mocks: prisma, verifySession, and next/server to avoid Fetch API globals.
 */

import { NotificationEventType } from '@prisma/client';

// ── Mock next/server before any route imports ─────────────────────────────────

jest.mock('next/server', () => {
  const mockNextResponse = {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    }),
  };
  return {
    NextRequest: jest.fn(),
    NextResponse: mockNextResponse,
  };
});

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockNotificationFindMany = jest.fn();
const mockNotificationCount = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockNotificationSettingsUpsert = jest.fn();

jest.mock('@/lib/database', () => ({
  prisma: {
    notification: {
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
      count: (...args: unknown[]) => mockNotificationCount(...args),
      updateMany: (...args: unknown[]) => mockNotificationUpdateMany(...args),
    },
    userNotificationSettings: {
      upsert: (...args: unknown[]) => mockNotificationSettingsUpsert(...args),
    },
  },
}));

jest.mock('@/lib/session-auth', () => ({
  verifySession: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

// Must import after mocks
import { GET as getNotifications, PATCH as patchNotifications } from '@/app/api/notifications/route';
import { GET as getCount } from '@/app/api/notifications/count/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/notifications/settings/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string, opts?: { method?: string; body?: string }) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: opts?.method ?? 'GET',
    cookies: { get: jest.fn().mockReturnValue(undefined) },
    headers: { get: jest.fn().mockReturnValue(null) },
    json: () => Promise.resolve(opts?.body ? JSON.parse(opts.body) : {}),
    [Symbol.for('url')]: parsedUrl,
  } as unknown as import('next/server').NextRequest;
}

function makeNotification(id: string, readAt: string | null = null) {
  return {
    id,
    type: NotificationEventType.SYSTEM_ANNOUNCEMENT,
    title: 'Test',
    body: 'Test body',
    data: null,
    orgId: null,
    readAt,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { verifySession } = jest.requireMock('@/lib/session-auth');
  verifySession.mockReturnValue({ userId: 'test-user-id' });
});

// ── GET /api/notifications ────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('returns paginated notifications and unread count', async () => {
    const notifs = [makeNotification('n1'), makeNotification('n2', new Date().toISOString())];
    mockNotificationFindMany.mockResolvedValueOnce(notifs);
    mockNotificationCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const req = makeRequest('http://localhost/api/notifications?limit=10&page=1');
    const res = await getNotifications(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.unreadCount).toBe(1);
  });

  it('filters by unread when ?unread=true', async () => {
    mockNotificationFindMany.mockResolvedValueOnce([makeNotification('n1')]);
    mockNotificationCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const req = makeRequest('http://localhost/api/notifications?unread=true');
    await getNotifications(req);

    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
      })
    );
  });

  it('returns 401 when session is missing', async () => {
    const { verifySession } = jest.requireMock('@/lib/session-auth');
    verifySession.mockReturnValueOnce(null);

    const req = makeRequest('http://localhost/api/notifications');
    const res = await getNotifications(req);
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/notifications ──────────────────────────────────────────────────

describe('PATCH /api/notifications', () => {
  it('marks specific notification IDs as read', async () => {
    mockNotificationUpdateMany.mockResolvedValueOnce({ count: 2 });

    const req = makeRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ ids: ['n1', 'n2'] }),
    });
    const res = await patchNotifications(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(2);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['n1', 'n2'] } }),
      })
    );
  });

  it('marks ALL notifications as read when all=true', async () => {
    mockNotificationUpdateMany.mockResolvedValueOnce({ count: 5 });

    const req = makeRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ all: true }),
    });
    const res = await patchNotifications(req);
    const body = await res.json();

    expect(body.updated).toBe(5);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recipientId: 'test-user-id', readAt: null }),
      })
    );
  });

  it('returns 0 updated when body has neither ids nor all', async () => {
    const req = makeRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const res = await patchNotifications(req);
    const body = await res.json();
    expect(body.updated).toBe(0);
    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });
});

// ── GET /api/notifications/count ─────────────────────────────────────────────

describe('GET /api/notifications/count', () => {
  it('returns correct unread count', async () => {
    mockNotificationCount.mockResolvedValueOnce(7);

    const req = makeRequest('http://localhost/api/notifications/count');
    const res = await getCount(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.unreadCount).toBe(7);
    expect(mockNotificationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientId: 'test-user-id', readAt: null },
      })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    const { verifySession } = jest.requireMock('@/lib/session-auth');
    verifySession.mockReturnValueOnce(null);

    const req = makeRequest('http://localhost/api/notifications/count');
    const res = await getCount(req);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/notifications/settings ──────────────────────────────────────────

describe('GET /api/notifications/settings', () => {
  it('creates default settings if none exist (upsert semantics)', async () => {
    const defaultSettings = {
      id: 'settings-1',
      userId: 'test-user-id',
      inApp: true,
      disabledTypes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockNotificationSettingsUpsert.mockResolvedValueOnce(defaultSettings);

    const req = makeRequest('http://localhost/api/notifications/settings');
    const res = await getSettings(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.inApp).toBe(true);
    expect(body.disabledTypes).toEqual([]);
    expect(mockNotificationSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user-id' },
        create: expect.objectContaining({ userId: 'test-user-id', inApp: true }),
      })
    );
  });
});

// ── PATCH /api/notifications/settings ────────────────────────────────────────

describe('PATCH /api/notifications/settings', () => {
  it('updates inApp and disabledTypes', async () => {
    const updated = {
      id: 'settings-1',
      userId: 'test-user-id',
      inApp: false,
      disabledTypes: [NotificationEventType.POLICY_ASSIGNED],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockNotificationSettingsUpsert.mockResolvedValueOnce(updated);

    const req = makeRequest('http://localhost/api/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify({ inApp: false, disabledTypes: ['POLICY_ASSIGNED'] }),
    });
    const res = await patchSettings(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.inApp).toBe(false);
  });
});