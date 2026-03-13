import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params;

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

    // Note: This endpoint is deprecated. Use direct organization API endpoints that log via appropriate mechanisms.
    // Audit logs should be created through API endpoints that properly validate user permissions.
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Organization audit logs should be created through proper API endpoints.' },
      { status: 410 }
    );
  } catch (error) {
    console.error('Failed to validate organization audit log request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

