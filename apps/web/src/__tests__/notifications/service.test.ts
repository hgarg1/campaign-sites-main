/**
 * Unit tests for the notification service (apps/web/src/lib/notifications.ts)
 *
 * Prisma is mocked so no database is required.
 */

import { NotificationEventType } from '@prisma/client';

// ── Mock prisma ──────────────────────────────────────────────────────────────
const mockFindMany = jest.fn();
const mockCreateMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/database', () => ({
  prisma: {
    user: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    organizationMember: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    notification: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { createNotification, notifyAdmins, notifyOrgMembers } from '@/lib/notifications';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeUser(overrides: {
  id: string;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  orgMember?: boolean;
  disabledTypes?: NotificationEventType[];
}) {
  return {
    id: overrides.id,
    role: overrides.role,
    organizations: overrides.orgMember ? [{ id: 'member-record' }] : [],
    notificationSettings: overrides.disabledTypes
      ? { disabledTypes: overrides.disabledTypes }
      : null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateMany.mockResolvedValue({ count: 0 });
});

// ── createNotification ────────────────────────────────────────────────────────

describe('createNotification', () => {
  it('does nothing when recipientIds is empty', async () => {
    await createNotification({
      type: NotificationEventType.SYSTEM_ANNOUNCEMENT,
      title: 'Hi',
      body: 'Test',
      recipientIds: [],
    });
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('delivers system type to ADMIN users', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'admin1', role: 'ADMIN' }),
    ]);
    await createNotification({
      type: NotificationEventType.POLICY_ASSIGNED,
      title: 'Policy',
      body: 'A policy was assigned.',
      recipientIds: ['admin1'],
    });
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'admin1' }),
        ]),
      })
    );
  });

  it('blocks system type for non-admin users', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'user1', role: 'USER' }),
    ]);
    await createNotification({
      type: NotificationEventType.SECURITY_ALERT,
      title: 'Alert',
      body: 'Something happened.',
      recipientIds: ['user1'],
    });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('delivers system type to GLOBAL_ADMIN', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'ga1', role: 'GLOBAL_ADMIN' }),
    ]);
    await createNotification({
      type: NotificationEventType.USER_ROLE_CHANGED,
      title: 'Role changed',
      body: 'A role was updated.',
      recipientIds: ['ga1'],
    });
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'ga1' }),
        ]),
      })
    );
  });

  it('delivers org type to org members', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'member1', role: 'USER', orgMember: true }),
    ]);
    await createNotification({
      type: NotificationEventType.ORG_MEMBER_ADDED,
      title: 'Member added',
      body: 'Someone joined.',
      recipientIds: ['member1'],
      orgId: 'org-abc',
    });
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'member1', orgId: 'org-abc' }),
        ]),
      })
    );
  });

  it('blocks org type for non-members when orgId is specified', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'outsider1', role: 'USER', orgMember: false }),
    ]);
    await createNotification({
      type: NotificationEventType.ORG_MEMBER_REMOVED,
      title: 'Member removed',
      body: 'Someone left.',
      recipientIds: ['outsider1'],
      orgId: 'org-abc',
    });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('skips recipients who disabled the notification type', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({
        id: 'admin1',
        role: 'ADMIN',
        disabledTypes: [NotificationEventType.POLICY_ASSIGNED],
      }),
    ]);
    await createNotification({
      type: NotificationEventType.POLICY_ASSIGNED,
      title: 'Policy',
      body: 'Assigned.',
      recipientIds: ['admin1'],
    });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('delivers to users whose disabledTypes does NOT include the type', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeUser({
        id: 'admin2',
        role: 'ADMIN',
        disabledTypes: [NotificationEventType.SYSTEM_ANNOUNCEMENT],
      }),
    ]);
    await createNotification({
      type: NotificationEventType.POLICY_ASSIGNED,
      title: 'Policy',
      body: 'Assigned.',
      recipientIds: ['admin2'],
    });
    expect(mockCreateMany).toHaveBeenCalled();
  });
});

// ── notifyAdmins ──────────────────────────────────────────────────────────────

describe('notifyAdmins', () => {
  it('fans out to all ADMIN + GLOBAL_ADMIN users', async () => {
    // First call: user.findMany to get admins
    mockFindMany.mockResolvedValueOnce([
      { id: 'admin1' },
      { id: 'ga1' },
    ]);
    // Second call inside createNotification: user.findMany for eligibility
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'admin1', role: 'ADMIN' }),
      makeUser({ id: 'ga1', role: 'GLOBAL_ADMIN' }),
    ]);

    await notifyAdmins({
      type: NotificationEventType.USER_CREATED,
      title: 'New user',
      body: 'A user was created.',
    });

    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'admin1' }),
          expect.objectContaining({ recipientId: 'ga1' }),
        ]),
      })
    );
  });

  it('does nothing when there are no admins', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await notifyAdmins({
      type: NotificationEventType.SECURITY_ALERT,
      title: 'Alert',
      body: 'Something.',
    });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});

// ── notifyOrgMembers ──────────────────────────────────────────────────────────

describe('notifyOrgMembers', () => {
  it('fans out to all members of an org', async () => {
    // First call: organizationMember.findMany
    mockFindMany.mockResolvedValueOnce([
      { userId: 'user1' },
      { userId: 'user2' },
    ]);
    // Second call inside createNotification
    mockFindMany.mockResolvedValueOnce([
      makeUser({ id: 'user1', role: 'USER', orgMember: true }),
      makeUser({ id: 'user2', role: 'USER', orgMember: true }),
    ]);

    await notifyOrgMembers('org-xyz', {
      type: NotificationEventType.ORG_MEMBER_ADDED,
      title: 'Member added',
      body: 'Someone joined.',
    });

    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'user1', orgId: 'org-xyz' }),
          expect.objectContaining({ recipientId: 'user2', orgId: 'org-xyz' }),
        ]),
      })
    );
  });

  it('does nothing when no members are found', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await notifyOrgMembers('org-empty', {
      type: NotificationEventType.ORG_MEMBER_REMOVED,
      title: 'Removed',
      body: 'Someone left.',
    });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('passes role filter to the query', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await notifyOrgMembers(
      'org-xyz',
      { type: NotificationEventType.ORG_ROLE_CHANGED, title: 'Role', body: 'Changed.' },
      ['OWNER', 'ADMIN']
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { in: ['OWNER', 'ADMIN'] } }),
      })
    );
  });
});
