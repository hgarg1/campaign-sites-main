/**
 * API endpoint to manage system admin role assignments
 * GET  /api/admin/system-admins/[id]/roles - Get current roles
 * POST /api/admin/system-admins/[id]/roles - Assign role
 * DELETE /api/admin/system-admins/[id]/roles - Unassign role
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:view_admins');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    const roleAssignments = await prisma.systemAdminRoleAssignment.findMany({
      where: { adminId: params.id },
      include: { role: true },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(roleAssignments);
  } catch (error) {
    console.error('Failed to fetch role assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch role assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:assign_role');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    const body = await request.json();
    const { roleId, justification } = body;

    if (!roleId || !justification) {
      return NextResponse.json({ error: 'roleId and justification are required' }, { status: 400 });
    }

    // Verify role exists
    const role = await prisma.systemAdminRole.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Verify target admin exists
    const targetAdmin = await prisma.systemAdmin.findUnique({
      where: { id: params.id },
    });
    if (!targetAdmin) {
      return NextResponse.json({ error: 'System admin not found' }, { status: 404 });
    }

    // No self-escalation: granting yourself a role would let any admin holding
    // assign_role climb to super-admin in one request.
    if (targetAdmin.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own role assignments' },
        { status: 403 }
      );
    }

    // Create assignment
    const assignment = await prisma.systemAdminRoleAssignment.create({
      data: {
        adminId: params.id,
        roleId,
        assignedBy: userId,
      },
      include: { role: true },
    });

    // Audit log
    await logSystemAdminAction({
      action: 'ROLE_ASSIGNED',
      resourceType: 'SystemAdminRoleAssignment',
      resourceId: assignment.id,
      resourceName: `${targetAdmin.name} ← ${role.name}`,
      performedBy: userId,
      justification,
      status: 'success',
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Failed to assign role:', error);
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:revoke_role');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    const url = new URL(request.url);
    const roleId = url.searchParams.get('roleId');
    const justification = url.searchParams.get('justification') || '';

    if (!roleId) {
      return NextResponse.json({ error: 'roleId query parameter is required' }, { status: 400 });
    }

    // Get assignment info for audit
    const assignment = await prisma.systemAdminRoleAssignment.findUnique({
      where: {
        adminId_roleId: {
          adminId: params.id,
          roleId,
        },
      },
      include: { role: true, admin: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 });
    }

    if (assignment.admin.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own role assignments' },
        { status: 403 }
      );
    }

    // Delete assignment
    await prisma.systemAdminRoleAssignment.delete({
      where: {
        adminId_roleId: {
          adminId: params.id,
          roleId,
        },
      },
    });

    // Audit log
    await logSystemAdminAction({
      action: 'ROLE_REVOKED',
      resourceType: 'SystemAdminRoleAssignment',
      resourceId: assignment.id,
      resourceName: `${assignment.admin.name} ← ${assignment.role.name}`,
      performedBy: userId,
      justification: justification || 'Role revoked',
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke role:', error);
    return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 });
  }
}
