/**
 * Batch delete system admin users endpoint
 * POST /api/admin/users/batch/delete
 * 
 * Requires: system_admin_portal:users:delete
 * Body: { userIds: string[], justification: string }
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
      'system_admin_portal:users:delete'
    );

    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'BATCH_DELETE_USERS_DENIED',
        resourceType: 'Users',
        resourceId: 'batch',
        resourceName: 'Batch delete system admin users',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for system_admin_portal:users:delete' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds, justification } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!justification || typeof justification !== 'string') {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userIds.includes(userId)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const deleted = [];
    const failed = [];

    // Delete each system admin user and log separately
    for (const delUserId of userIds) {
      try {
        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: delUserId },
          select: { id: true, email: true, role: true },
        });

        if (!user) {
          failed.push({ userId: delUserId, reason: 'User not found' });
          continue;
        }

        // Only allow deletion of system admin users (role must be ADMIN for system admins)
        if (user.role !== 'ADMIN') {
          failed.push({ userId: delUserId, reason: 'User is not a system admin' });
          continue;
        }

        // Perform soft delete by setting deletedAt
        await prisma.user.update({
          where: { id: delUserId },
          data: { deletedAt: new Date() },
        });

        deleted.push(delUserId);

        // Log each deletion separately with same justification
        await logSystemAdminAction({
          action: 'BATCH_DELETE_USERS_ITEM',
          resourceType: 'User',
          resourceId: delUserId,
          resourceName: user.email,
          performedBy: userId,
          justification,
          status: 'success',
          changes: {
            deletedUserRole: user.role,
          },
        });
      } catch (err) {
        failed.push({
          userId: delUserId,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });

        // Log failure for this item
        await logSystemAdminAction({
          action: 'BATCH_DELETE_USERS_ITEM_FAILED',
          resourceType: 'User',
          resourceId: delUserId,
          resourceName: `Unknown user ${delUserId}`,
          performedBy: userId,
          justification,
          status: 'failure',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Log batch summary
    await logSystemAdminAction({
      action: 'BATCH_DELETE_USERS',
      resourceType: 'Users',
      resourceId: 'batch',
      resourceName: `Batch deleted ${deleted.length} system admin users`,
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
    console.error('Failed to batch delete users:', error);

    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logSystemAdminAction({
        action: 'BATCH_DELETE_USERS_ERROR',
        resourceType: 'Users',
        resourceId: 'batch',
        resourceName: 'Batch delete system admin users - server error',
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
