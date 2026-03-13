/**
 * API endpoint to manage system admin roles
 * GET /api/admin/roles - List all roles (requires system_admin_portal:rbac:view_roles)
 * POST /api/admin/roles - Create new role (requires system_admin_portal:rbac:create_role)
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission for viewing roles
    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:view_roles');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const roles = await prisma.systemAdminRole.findMany({
      include: {
        _count: {
          select: { permissions: true, adminAssignments: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission for creating roles
    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:rbac:create_role');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existing = await prisma.systemAdminRole.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      );
    }

    const role = await prisma.systemAdminRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isBuiltIn: false,
      },
      include: {
        _count: {
          select: { permissions: true, adminAssignments: true }
        }
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Failed to create role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
