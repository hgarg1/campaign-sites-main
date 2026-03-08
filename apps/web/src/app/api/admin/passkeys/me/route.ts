/**
 * Self-service passkey credential management for the logged-in admin user.
 * GET /api/admin/passkeys/me — list current user's own credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = verifySession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const credentials = await prisma.passkeyCredential.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        deviceName: true,
        transports: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: credentials });
  } catch {
    return NextResponse.json({ error: 'Failed to load credentials' }, { status: 500 });
  }
}
