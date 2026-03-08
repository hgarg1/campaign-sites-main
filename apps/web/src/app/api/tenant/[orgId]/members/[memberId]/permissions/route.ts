/**
 * GET /api/tenant/[orgId]/members/[memberId]/permissions
 * Returns the full effective permission grid for a specific member.
 * Used by the member detail drawer in the team page.
 * Requires ADMIN+ or the member themselves.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { getMemberEffectivePermissions } from '@/lib/member-policy';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ data: [] });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Allow ADMIN+ or the member themselves
  const admin = await verifyOrgAdmin(userId, params.orgId);
  if (!admin) {
    // Check if the requester is the member themselves
    const selfMember = await prisma.organizationMember.findUnique({
      where: { id: params.memberId },
    });
    if (!selfMember || selfMember.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const target = await prisma.organizationMember.findUnique({
    where: { id: params.memberId },
    include: { customRole: true },
  });
  if (!target || target.organizationId !== params.orgId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const permissions = await getMemberEffectivePermissions(params.orgId, target.userId);

  return NextResponse.json({
    memberId: params.memberId,
    userId: target.userId,
    role: target.role,
    customRole: target.customRole ?? null,
    permissions,
  });
}
