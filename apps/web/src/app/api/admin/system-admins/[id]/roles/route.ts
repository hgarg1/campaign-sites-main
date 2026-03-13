/**
 * API endpoint to manage system admin role assignments
 * GET  /api/admin/system-admins/[id]/roles - Get current roles
 * POST /api/admin/system-admins/[id]/roles - Assign role
 * DELETE /api/admin/system-admins/[id]/roles - Unassign role
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

async function checkIsGlobalAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'GLOBAL_ADMIN';
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

    const isAdmin = await checkIsGlobalAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only GLOBAL_ADMIN can view system admin roles' },
        { status: 403 }
      );
    }

    const roleAssignments = await prisma.systemAdminRoleAssignment.findMany({
      where: { adminId: params.id },
      include: { role: true },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(roleAssignments);
  } catch (error) {
    console.error('Failed to fetch role assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role assignments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsGlobalAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only GLOBAL_ADMIN can assign system admin roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roleId, justification } = body;

    if (!roleId || !justification) {
      return NextResponse.json(
        { error: 'roleId and justification are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'System admin not found' },
        { status: 404 }
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
    return NextResponse.json(
      { error: 'Failed to assign role' },
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

    const isAdmin = await checkIsGlobalAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only GLOBAL_ADMIN can revoke system admin roles' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const roleId = url.searchParams.get('roleId');
    const justification = url.searchParams.get('justification') || '';

    if (!roleId) {
      return NextResponse.json(
        { error: 'roleId query parameter is required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Role assignment not found' },
        { status: 404 }
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
    return NextResponse.json(
      { error: 'Failed to revoke role' },
      { status: 500 }
    );
  }
}
