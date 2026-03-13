/**
 * API endpoint to manage role permissions
 * GET /api/admin/roles/[id]/permissions - Get permissions assigned to role (requires system_admin_portal:rbac:view_roles)
 * PUT /api/admin/roles/[id]/permissions - Update permissions for role (requires system_admin_portal:rbac:add_role_permission or system_admin_portal:rbac:remove_role_permission)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:view_roles');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const role = await prisma.systemAdminRole.findUnique({
      where: { id: params.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    const permissions = role.permissions.map(rp => rp.permission);
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Failed to fetch role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check either add or remove permission
    const canAddPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:add_role_permission');
    const canRemovePermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:remove_role_permission');

    if (!canAddPermission && !canRemovePermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const role = await prisma.systemAdminRole.findUnique({
      where: { id: params.id },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    if (role.isBuiltIn) {
      return NextResponse.json(
        { error: 'Cannot modify permissions for built-in roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'permissionIds must be an array' },
        { status: 400 }
      );
    }

    // Validate all permission IDs exist
    const permissions = await prisma.systemAdminPermission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { error: 'One or more permission IDs do not exist' },
        { status: 400 }
      );
    }

    // Delete existing role-permission relationships
    await prisma.systemAdminRolePermission.deleteMany({
      where: { roleId: params.id },
    });

    // Create new relationships
    await prisma.systemAdminRolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: params.id,
        permissionId,
      })),
    });

    const updated = await prisma.systemAdminRole.findUnique({
      where: { id: params.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json(updated?.permissions.map(rp => rp.permission));
  } catch (error) {
    console.error('Failed to update role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    );
  }
}
