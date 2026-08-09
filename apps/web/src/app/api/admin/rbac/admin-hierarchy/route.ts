/**
 * API endpoint to fetch and update global admin hierarchy
 * GET  /api/admin/rbac/admin-hierarchy - Fetch hierarchy as graph (nodes + edges)
 * POST /api/admin/rbac/admin-hierarchy/commit - Commit hierarchy changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:view_hierarchy');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

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
    return NextResponse.json({ error: 'Failed to fetch admin hierarchy' }, { status: 500 });
  }
}
