/**
 * Batch delete organizations endpoint
 * POST /api/admin/organizations/batch/delete
 * 
 * Requires: system_admin_portal:organizations:delete
 * Body: { orgIds: string[], justification: string }
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:organizations:delete'
    );

    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'BATCH_DELETE_ORGANIZATIONS_DENIED',
        resourceType: 'Organizations',
        resourceId: 'batch',
        resourceName: 'Batch delete organizations',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for system_admin_portal:organizations:delete' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orgIds, justification } = body;

    if (!Array.isArray(orgIds) || orgIds.length === 0) {
      return NextResponse.json(
        { error: 'orgIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!justification || typeof justification !== 'string') {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    const deleted = [];
    const failed = [];

    // Delete each organization and log separately
    for (const orgId of orgIds) {
      try {
        // Verify organization exists
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, name: true },
        });

        if (!org) {
          failed.push({ orgId, reason: 'Organization not found' });
          continue;
        }

        // Perform soft delete by setting deletedAt
        await prisma.organization.update({
          where: { id: orgId },
          data: { deletedAt: new Date() },
        });

        deleted.push(orgId);

        // Log each deletion separately with same justification
        await logSystemAdminAction({
          action: 'BATCH_DELETE_ORGANIZATIONS_ITEM',
          resourceType: 'Organization',
          resourceId: orgId,
          resourceName: org.name,
          performedBy: userId,
          justification,
          status: 'success',
        });
      } catch (err) {
        failed.push({
          orgId,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });

        // Log failure for this item
        await logSystemAdminAction({
          action: 'BATCH_DELETE_ORGANIZATIONS_ITEM_FAILED',
          resourceType: 'Organization',
          resourceId: orgId,
          resourceName: `Unknown org ${orgId}`,
          performedBy: userId,
          justification,
          status: 'failure',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Log batch summary
    await logSystemAdminAction({
      action: 'BATCH_DELETE_ORGANIZATIONS',
      resourceType: 'Organizations',
      resourceId: 'batch',
      resourceName: `Batch deleted ${deleted.length} organizations`,
      performedBy: userId,
      justification,
      status: deleted.length > 0 ? 'success' : 'failure',
      changes: {
        deletedCount: deleted.length,
        failedCount: failed.length,
        deletedIds: deleted,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
      failedCount: failed.length,
      deleted,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('Failed to batch delete organizations:', error);

    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logSystemAdminAction({
        action: 'BATCH_DELETE_ORGANIZATIONS_ERROR',
        resourceType: 'Organizations',
        resourceId: 'batch',
        resourceName: 'Batch delete organizations - server error',
        performedBy: userId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
