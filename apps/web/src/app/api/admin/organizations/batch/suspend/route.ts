/**
 * Batch suspend organizations endpoint
 * POST /api/admin/organizations/batch/suspend
 * 
 * Requires: system_admin_portal:organizations:write
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
      'system_admin_portal:organizations:write'
    );

    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'BATCH_SUSPEND_ORGANIZATIONS_DENIED',
        resourceType: 'Organizations',
        resourceId: 'batch',
        resourceName: 'Batch suspend organizations',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for system_admin_portal:organizations:write' },
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

    const suspended = [];
    const failed = [];

    // Suspend each organization and log separately
    for (const orgId of orgIds) {
      try {
        // Verify organization exists
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, name: true, ownStatus: true },
        });

        if (!org) {
          failed.push({ orgId, reason: 'Organization not found' });
          continue;
        }

        if (org.ownStatus === 'SUSPENDED') {
          failed.push({ orgId, reason: 'Organization already suspended' });
          continue;
        }

        // Update organization status to suspended
        const updated = await prisma.organization.update({
          where: { id: orgId },
          data: { 
            ownStatus: 'SUSPENDED',
            suspendedAt: new Date(),
          },
          select: { id: true, name: true, ownStatus: true },
        });

        suspended.push(orgId);

        // Log each suspension separately with same justification
        await logSystemAdminAction({
          action: 'BATCH_SUSPEND_ORGANIZATIONS_ITEM',
          resourceType: 'Organization',
          resourceId: orgId,
          resourceName: org.name,
          performedBy: userId,
          justification,
          status: 'success',
          changes: {
            previousStatus: org.ownStatus,
            newStatus: updated.ownStatus,
          },
        });
      } catch (err) {
        failed.push({
          orgId,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });

        // Log failure for this item
        await logSystemAdminAction({
          action: 'BATCH_SUSPEND_ORGANIZATIONS_ITEM_FAILED',
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
      action: 'BATCH_SUSPEND_ORGANIZATIONS',
      resourceType: 'Organizations',
      resourceId: 'batch',
      resourceName: `Batch suspended ${suspended.length} organizations`,
      performedBy: userId,
      justification,
      status: suspended.length > 0 ? 'success' : 'failure',
      changes: {
        suspendedCount: suspended.length,
        failedCount: failed.length,
        suspendedIds: suspended,
      },
    });

    return NextResponse.json({
      success: true,
      suspendedCount: suspended.length,
      failedCount: failed.length,
      suspended,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('Failed to batch suspend organizations:', error);

    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logSystemAdminAction({
        action: 'BATCH_SUSPEND_ORGANIZATIONS_ERROR',
        resourceType: 'Organizations',
        resourceId: 'batch',
        resourceName: 'Batch suspend organizations - server error',
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
