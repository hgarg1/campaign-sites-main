/**
 * API endpoint to manage system admin permission overrides
 * GET  /api/admin/system-admins/[id]/permissions - Get all permissions and overrides
 * POST /api/admin/system-admins/[id]/permissions - Create/update override
 * DELETE /api/admin/system-admins/[id]/permissions - Delete override
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:view_overrides');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    // Get all permissions
    const allPermissions = await prisma.systemAdminPermission.findMany({
      orderBy: [{ category: 'asc' }, { action: 'asc' }],
    });

    // Get user's role permissions
    const rolePermissions = await prisma.systemAdminRolePermission.findMany({
      where: {
        role: {
          adminAssignments: {
            some: { adminId: params.id },
          },
        },
      },
      include: { permission: true },
    });

    // Get user's overrides
    const overrides = await prisma.systemAdminPermissionOverride.findMany({
      where: { adminId: params.id },
      include: { permission: true },
    });

    return NextResponse.json({
      allPermissions,
      rolePermissions: rolePermissions.map((rp) => rp.permission),
      overrides,
    });
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:add_override');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    // No self-escalation: an admin must not grant or revoke their own overrides.
    const targetAdmin = await prisma.systemAdmin.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!targetAdmin) {
      return NextResponse.json({ error: 'System admin not found' }, { status: 404 });
    }
    if (targetAdmin.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own permission overrides' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permissionId, action, expiresAt, justification } = body;

    if (!permissionId || !action || !justification) {
      return NextResponse.json(
        { error: 'permissionId, action, and justification are required' },
        { status: 400 }
      );
    }

    if (!['ALLOW', 'DENY'].includes(action)) {
      return NextResponse.json({ error: 'action must be ALLOW or DENY' }, { status: 400 });
    }

    // Verify permission exists
    const permission = await prisma.systemAdminPermission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Create or update override
    const override = await prisma.systemAdminPermissionOverride.upsert({
      where: {
        adminId_permissionId: {
          adminId: params.id,
          permissionId,
        },
      },
      create: {
        adminId: params.id,
        permissionId,
        action,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      },
      update: {
        action,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: new Date(),
      },
      include: { permission: true },
    });

    // Audit log
    await logSystemAdminAction({
      action: 'PERMISSION_OVERRIDE_CREATED',
      resourceType: 'SystemAdminPermissionOverride',
      resourceId: override.id,
      resourceName: `${permission.claim} (${action})`,
      performedBy: userId,
      justification,
      status: 'success',
    });

    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    console.error('Failed to create override:', error);
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:delete_override');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    // No self-escalation: an admin must not grant or revoke their own overrides.
    const targetAdmin = await prisma.systemAdmin.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!targetAdmin) {
      return NextResponse.json({ error: 'System admin not found' }, { status: 404 });
    }
    if (targetAdmin.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own permission overrides' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const permissionId = url.searchParams.get('permissionId');
    const justification = url.searchParams.get('justification') || '';

    if (!permissionId) {
      return NextResponse.json(
        { error: 'permissionId query parameter is required' },
        { status: 400 }
      );
    }

    // Get override info for audit
    const override = await prisma.systemAdminPermissionOverride.findUnique({
      where: {
        adminId_permissionId: {
          adminId: params.id,
          permissionId,
        },
      },
      include: { permission: true },
    });

    if (!override) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    // Delete override
    await prisma.systemAdminPermissionOverride.delete({
      where: {
        adminId_permissionId: {
          adminId: params.id,
          permissionId,
        },
      },
    });

    // Audit log
    await logSystemAdminAction({
      action: 'PERMISSION_OVERRIDE_DELETED',
      resourceType: 'SystemAdminPermissionOverride',
      resourceId: override.id,
      resourceName: override.permission.claim,
      performedBy: userId,
      justification: justification || 'Override removed',
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete override:', error);
    return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 });
  }
}
