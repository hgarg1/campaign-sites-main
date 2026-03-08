import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session-auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1'), 1);
  const skip = (page - 1) * limit;

  try {
    const where = {
      recipientId: session.userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: { id: true, type: true, title: true, body: true, data: true, orgId: true, readAt: true, createdAt: true },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: session.userId, readAt: null } }),
    ]);

    return NextResponse.json({ data, total, unreadCount, page, limit });
  } catch {
    return NextResponse.json({ data: [], total: 0, unreadCount: 0, page, limit });
  }
}

export async function PATCH(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { ids?: string[]; all?: boolean };
  const now = new Date();

  try {
    let updated = 0;
    if (body.all) {
      const result = await prisma.notification.updateMany({
        where: { recipientId: session.userId, readAt: null },
        data: { readAt: now },
      });
      updated = result.count;
    } else if (body.ids?.length) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: body.ids }, recipientId: session.userId, readAt: null },
        data: { readAt: now },
      });
      updated = result.count;
    }
    return NextResponse.json({ updated });
  } catch {
    return NextResponse.json({ updated: 0 });
  }
}
