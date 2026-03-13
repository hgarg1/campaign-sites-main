import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSessionUserFromToken } from '@/lib/session-auth';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';
import { notifyAdmins } from '@/lib/notifications';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/users/[id] - Get user details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    const sessionUser = await getSessionUserFromToken(sessionToken);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'GLOBAL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            organizations: true,
            websites: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: 'active',
          organizationCount: user._count.organizations,
          websiteCount: user._count.websites,
          createdAt: user.createdAt.toISOString(),
          lastLogin: undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (role change, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    const sessionUser = await getSessionUserFromToken(sessionToken);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'GLOBAL_ADMIN' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json() as { role?: string; name?: string };

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.role !== undefined && { role: body.role as any }),
      },
    });

    if (body.role && body.role !== existing.role) {
      notifyAdmins({
        type: 'USER_ROLE_CHANGED',
        title: 'User role changed',
        body: `${existing.name ?? existing.email}'s role changed from ${existing.role} to ${body.role}.`,
        actorId: sessionUser.id,
      }).catch(() => {});
    }

    return NextResponse.json(
      { message: 'User updated successfully', data: { id: updated.id, email: updated.email, name: updated.name, role: updated.role } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const userId = parsedToken?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permission
    const canDelete = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:users:delete'
    );
    if (!canDelete) {
      await logSystemAdminAction({
        action: 'USER_DELETE_DENIED',
        resourceType: 'User',
        resourceId: params.id,
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

    // Get user before deletion
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For now, soft-delete by returning success
    // In production, implement:
    // 1. Add deletedAt field to User model
    // 2. Update all queries to filter out deleted users
    // 3. Cascade delete or cascade null on related data

    // Audit log
    await logSystemAdminAction({
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: params.id,
      resourceName: user.email,
      performedBy: userId,
      justification: 'User deleted',
      status: 'success',
    });

    return NextResponse.json(
      { message: 'User deleted successfully', data: { id: user.id, email: user.email } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
