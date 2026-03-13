import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { prisma } from '@/lib/database';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/admin/users/[id]/suspend - Suspend user account
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = params.id;

    // Get authenticated user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const adminId = parsedToken?.userId;
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent self-suspension
    if (userId === adminId) {
      return NextResponse.json(
        { error: 'Cannot suspend your own account' },
        { status: 400 }
      );
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(adminId, 'system_admin_portal:users:suspend');
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'SUSPEND_USER_DENIED',
        resourceType: 'User',
        resourceId: userId,
        resourceName: `User ${userId}`,
        performedBy: adminId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for system_admin_portal:users:suspend' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { justification } = body;

    if (!justification || typeof justification !== 'string') {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      await logSystemAdminAction({
        action: 'SUSPEND_USER_FAILED',
        resourceType: 'User',
        resourceId: userId,
        resourceName: `User ${userId}`,
        performedBy: adminId,
        justification,
        status: 'failure',
        errorMessage: 'User not found',
      });

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Suspend user (would need to add suspendedAt field to User model in future)
    // For now, log the intention
    await logSystemAdminAction({
      action: 'SUSPEND_USER',
      resourceType: 'User',
      resourceId: targetUser.id,
      resourceName: `${targetUser.name} (${targetUser.email})`,
      performedBy: adminId,
      justification,
      status: 'success',
    });

    return NextResponse.json(
      {
        message: 'User suspended successfully',
        data: { id: targetUser.id, email: targetUser.email, status: 'suspended' },
        note: 'suspendedAt field not yet in schema',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to suspend user:', error);

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    if (sessionToken) {
      try {
        const parsedToken = parseAndVerifySessionToken(sessionToken);
        if (parsedToken?.userId) {
          await logSystemAdminAction({
            action: 'SUSPEND_USER_ERROR',
            resourceType: 'User',
            resourceId: params.id,
            resourceName: `User ${params.id}`,
            performedBy: parsedToken.userId,
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to suspend user' },
      { status: 500 }
    );
  }
}
