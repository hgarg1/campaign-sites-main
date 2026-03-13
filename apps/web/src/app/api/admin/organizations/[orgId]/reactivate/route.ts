/**
 * API endpoint to reactivate an organization
 * POST /api/admin/organizations/{orgId}/reactivate
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permission
    const canReactivate = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:organizations:reactivate'
    );
    if (!canReactivate) {
      await logSystemAdminAction({
        action: 'ORGANIZATION_REACTIVATE_DENIED',
        resourceType: 'Organization',
        resourceId: params.orgId,
        resourceName: 'Unknown',
        performedBy: userId,
        justification: 'Permission denied',
        status: 'failure',
      });
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { justification } = body;

    if (!justification) {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    // Get org before update
    const org = await prisma.organization.findUnique({
      where: { id: params.orgId },
      select: { id: true, name: true, ownStatus: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (org.ownStatus === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Organization is already active' },
        { status: 400 }
      );
    }

    // Update status
    const updated = await prisma.organization.update({
      where: { id: params.orgId },
      data: { ownStatus: 'ACTIVE' },
      select: { id: true, name: true, ownStatus: true },
    });

    // Audit log
    await logSystemAdminAction({
      action: 'ORGANIZATION_REACTIVATED',
      resourceType: 'Organization',
      resourceId: params.orgId,
      resourceName: org.name,
      performedBy: userId,
      justification,
      changes: { ownStatus: 'ACTIVE' },
      status: 'success',
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Failed to reactivate organization:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate organization' },
      { status: 500 }
    );
  }
}
