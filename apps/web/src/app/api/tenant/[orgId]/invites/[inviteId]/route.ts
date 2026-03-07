import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

export async function DELETE(
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
    await prisma.organizationInvite.update({
      where: { id: params.inviteId },
      data: { status: 'REVOKED' },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
