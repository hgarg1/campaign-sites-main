import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { orgId: string; inviteId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await prisma.organizationInvite.update({
      where: { id: params.inviteId },
      data: { createdAt: new Date(), expiresAt, status: 'PENDING' },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
