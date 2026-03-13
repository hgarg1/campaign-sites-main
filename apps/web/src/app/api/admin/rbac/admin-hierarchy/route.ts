/**
 * API endpoint to fetch and update system admin hierarchy
 * GET  /api/admin/rbac/admin-hierarchy - Fetch hierarchy as graph (nodes + edges)
 * POST /api/admin/rbac/admin-hierarchy/commit - Commit hierarchy changes
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsGlobalAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch all system admins as nodes
    const admins = await prisma.systemAdmin.findMany({
      include: {
        roleAssignments: {
          include: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch all delegation relationships as edges
    const delegations = await prisma.systemAdminDelegation.findMany({
      include: {
        delegatingAdmin: true,
        delegatedToAdmin: true,
      },
    });

    // Convert to React Flow format
    const nodes = admins.map((admin, index) => ({
      id: admin.id,
      data: {
        label: admin.name,
        email: admin.email,
        roles: admin.roleAssignments.map((ra) => ra.role.name),
        isActive: admin.isActive,
      },
      position: {
        x: (index % 5) * 300,
        y: Math.floor(index / 5) * 200,
      },
      style: {
        background: admin.isActive ? '#dbeafe' : '#f3f4f6',
        border: admin.isActive ? '2px solid #3b82f6' : '2px solid #9ca3af',
        color: '#000',
        fontSize: '12px',
        fontWeight: 500,
        padding: '8px',
        borderRadius: '8px',
        minWidth: '150px',
        textAlign: 'center',
      },
    }));

    const edges = delegations.map((delegation) => ({
      id: `${delegation.delegatingAdminId}->${delegation.delegatedToAdminId}`,
      source: delegation.delegatingAdminId,
      target: delegation.delegatedToAdminId,
      animated: true,
      label: 'delegates to',
      style: {
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
    }));

    return NextResponse.json({
      nodes,
      edges,
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        isActive: a.isActive,
        roles: a.roleAssignments.map((ra) => ra.role.name),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch admin hierarchy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin hierarchy' },
      { status: 500 }
    );
  }
}
