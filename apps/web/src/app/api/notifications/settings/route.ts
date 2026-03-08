import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session-auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, inApp: true, disabledTypes: [] },
      update: {},
    });
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ userId: session.userId, inApp: true, disabledTypes: [] });
  }
}

export async function PATCH(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { inApp?: boolean; disabledTypes?: string[] };

  try {
    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        inApp: body.inApp ?? true,
        disabledTypes: (body.disabledTypes ?? []) as any,
      },
      update: {
        ...(body.inApp !== undefined ? { inApp: body.inApp } : {}),
        ...(body.disabledTypes !== undefined ? { disabledTypes: body.disabledTypes as any } : {}),
      },
    });
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
