import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const unreadCountOnly = searchParams.get('unreadCount') === 'true';
  const unreadOnly = searchParams.get('unread') === 'true';

  if (unreadCountOnly) {
    const count = await prisma.governanceNotification.count({
      where: { recipientOrgId: params.orgId, readAt: null },
    });
    return NextResponse.json({ count });
  }

  const notifications = await prisma.governanceNotification.findMany({
    where: {
      recipientOrgId: params.orgId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      proposalId: true,
      recipientOrgId: true,
      type: true,
      readAt: true,
      createdAt: true,
      proposal: {
        select: {
          id: true,
          actionType: true,
          childOrgId: true,
          status: true,
          childOrg: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const unreadCount = await prisma.governanceNotification.count({
    where: { recipientOrgId: params.orgId, readAt: null },
  });

  return NextResponse.json({ data: notifications, unreadCount });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { ids?: string[]; all?: boolean };
  const now = new Date();

  let updated = 0;

  if (body.all) {
    const result = await prisma.governanceNotification.updateMany({
      where: { recipientOrgId: params.orgId, readAt: null },
      data: { readAt: now },
    });
    updated = result.count;
  } else if (body.ids && body.ids.length > 0) {
    const result = await prisma.governanceNotification.updateMany({
      where: { id: { in: body.ids }, recipientOrgId: params.orgId },
      data: { readAt: now },
    });
    updated = result.count;
  }

  return NextResponse.json({ updated });
}
