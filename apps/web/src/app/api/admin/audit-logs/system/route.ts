import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate session to get authenticated userId
    const cookieStore = await (await import('next/headers')).cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    if (!parsedToken?.userId) {
      return NextResponse.json({ error: 'Unauthorized - invalid session' }, { status: 401 });
    }

    const userId = parsedToken.userId;

    // Verify user is a system admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, deletedAt: true },
    });

    if (!user || user.deletedAt || (user.role !== 'ADMIN' && user.role !== 'GLOBAL_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    // Note: This endpoint is deprecated. Use logSystemAdminAction() utility function instead.
    // Audit logs should be created through API endpoints that use logSystemAdminAction()
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Use direct API endpoints that log via logSystemAdminAction().' },
      { status: 410 }
    );
  } catch (error) {
    console.error('Failed to validate system admin log request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

