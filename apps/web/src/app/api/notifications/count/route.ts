import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session-auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const unreadCount = await prisma.notification.count({
      where: { recipientId: session.userId, readAt: null },
    });
    return NextResponse.json({ unreadCount });
  } catch {
    return NextResponse.json({ unreadCount: 0 });
  }
}
