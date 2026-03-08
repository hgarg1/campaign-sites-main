/**
 * GET /api/tenant/[orgId]/audit-log
 * Returns the last 50 audit log entries for this organization.
 * Requires ADMIN or OWNER membership.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ data: [] });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    // Query server_logs where source=audit and metadata->>'orgId' matches
    const logs = await prisma.serverLog.findMany({
      where: {
        source: 'audit',
        metadata: {
          path: ['orgId'],
          equals: params.orgId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        message: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: logs });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
