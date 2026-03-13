/**
 * API endpoint to manage individual roles
 * PATCH /api/admin/roles/[id] - Update role (requires system_admin_portal:rbac:update_role)
 * DELETE /api/admin/roles/[id] - Delete role (requires system_admin_portal:rbac:delete_role)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:update_role');
    if (!hasPermission) {
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
        { error: 'Cannot modify built-in roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Invalid role name' },
        { status: 400 }
      );
    }

    // Check if new name already exists (and it's different)
    if (name && name !== role.name) {
      const existing = await prisma.systemAdminRole.findUnique({
        where: { name: name.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.systemAdminRole.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
      },
      include: {
        _count: {
          select: { permissions: true, adminAssignments: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:delete_role');
    if (!hasPermission) {
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
        { error: 'Cannot delete built-in roles' },
        { status: 403 }
      );
    }

    await prisma.systemAdminRole.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Failed to delete role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
