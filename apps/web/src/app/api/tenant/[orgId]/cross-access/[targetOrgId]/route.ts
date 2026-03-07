import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { verifyAncestorAccess } from '@/lib/cross-org-auth';
import { isAncestor } from '@/lib/ancestry';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; targetOrgId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const actingAccess = await verifyOrgAccess(userId, params.orgId);
  if (!actingAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (params.orgId === params.targetOrgId) {
    return NextResponse.json({
      hasAccess: true,
      accessLevel: actingAccess.role,
      relationship: 'self',
      source: actingAccess.source,
    });
  }

  const isActingAncestor = await isAncestor(params.orgId, params.targetOrgId);
  if (isActingAncestor) {
    const adminAccess = await verifyAncestorAccess(userId, params.orgId, 'ADMIN');
    if (adminAccess.hasAccess) {
      return NextResponse.json({
        hasAccess: true,
        accessLevel: adminAccess.role,
        relationship: 'ancestor',
        source: adminAccess.source,
      });
    }
  }

  const targetIsAncestor = await isAncestor(params.targetOrgId, params.orgId);
  if (targetIsAncestor) {
    const targetAccess = await verifyAncestorAccess(userId, params.targetOrgId, 'MEMBER');
    return NextResponse.json({
      hasAccess: targetAccess.hasAccess,
      accessLevel: targetAccess.role,
      relationship: 'descendant',
      source: targetAccess.source,
    });
  }

  const directAccess = await verifyAncestorAccess(userId, params.targetOrgId, 'MEMBER');
  return NextResponse.json({
    hasAccess: directAccess.hasAccess,
    accessLevel: directAccess.role,
    relationship: 'unrelated',
    source: directAccess.source,
  });
}
