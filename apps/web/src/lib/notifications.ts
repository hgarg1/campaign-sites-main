import { prisma } from './database';
import { Prisma, NotificationEventType } from '@prisma/client';

const SYSTEM_TYPES = new Set<NotificationEventType>([
  NotificationEventType.USER_CREATED,
  NotificationEventType.USER_ROLE_CHANGED,
  NotificationEventType.USER_DEACTIVATED,
  NotificationEventType.POLICY_ASSIGNED,
  NotificationEventType.POLICY_REVOKED,
  NotificationEventType.SECURITY_ALERT,
  NotificationEventType.SYSTEM_ANNOUNCEMENT,
]);

export interface CreateNotificationOpts {
  type: NotificationEventType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  recipientIds: string[];
  orgId?: string;
  actorId?: string;
}

/**
 * Creates notifications for eligible recipients, respecting RBAC rules and
 * per-user disabled-type preferences.
 */
export async function createNotification(opts: CreateNotificationOpts): Promise<void> {
  if (opts.recipientIds.length === 0) return;

  const isSystemType = SYSTEM_TYPES.has(opts.type);

  // Fetch recipient eligibility data in a single query
  const users = await prisma.user.findMany({
    where: { id: { in: opts.recipientIds } },
    select: {
      id: true,
      role: true,
      organizations: opts.orgId
        ? { where: { organizationId: opts.orgId }, select: { id: true } }
        : false,
      notificationSettings: {
        select: { disabledTypes: true },
      },
    },
  });

  const eligible: string[] = [];
  for (const user of users) {
    // RBAC: system types only go to admins
    if (isSystemType && user.role !== 'ADMIN' && user.role !== 'GLOBAL_ADMIN') continue;

    // RBAC: org types only go to org members
    if (!isSystemType && opts.orgId) {
      const orgMembers = user.organizations as { id: string }[];
      if (!orgMembers || orgMembers.length === 0) continue;
    }

    // Respect per-user disabled type preferences
    const disabled = user.notificationSettings?.disabledTypes ?? [];
    if (disabled.includes(opts.type)) continue;

    eligible.push(user.id);
  }

  if (eligible.length === 0) return;

  await prisma.notification.createMany({
    data: eligible.map((recipientId) => ({
      type: opts.type,
      title: opts.title,
      body: opts.body,
      data: opts.data ? (opts.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      recipientId,
      orgId: opts.orgId,
      actorId: opts.actorId,
    })),
    skipDuplicates: true,
  });
}

/**
 * Send a system notification to all ADMIN and GLOBAL_ADMIN users.
 */
export async function notifyAdmins(
  opts: Omit<CreateNotificationOpts, 'recipientIds'>
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'GLOBAL_ADMIN'] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await createNotification({ ...opts, recipientIds: admins.map((u) => u.id) });
}

/**
 * Send an org notification to all members of an org, optionally filtered by role.
 */
export async function notifyOrgMembers(
  orgId: string,
  opts: Omit<CreateNotificationOpts, 'recipientIds'>,
  roles?: string[]
): Promise<void> {
  const where: Record<string, unknown> = { organizationId: orgId };
  if (roles && roles.length > 0) {
    where.role = { in: roles };
  }
  const members = await prisma.organizationMember.findMany({
    where,
    select: { userId: true },
  });
  if (members.length === 0) return;
  await createNotification({
    ...opts,
    orgId,
    recipientIds: members.map((m) => m.userId),
  });
}
