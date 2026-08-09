/**
 * API endpoint to list all system admins
 * GET /api/admin/system-admins - Get all system admins with roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:view_admins');
    if (!auth.ok) return auth.error;
    const userId = auth.userId;

    // Get all system admins with roles
    const admins = await prisma.systemAdmin.findMany({
      include: {
        roleAssignments: {
          include: { role: true },
        },
      },
      orderBy: { email: 'asc' },
    });

    // Transform to cleaner format
    const formattedAdmins = admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isActive: admin.isActive,
      roles: admin.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
      })),
    }));

    return NextResponse.json({ admins: formattedAdmins });
  } catch (error) {
    console.error('Failed to fetch system admins:', error);
    return NextResponse.json({ error: 'Failed to fetch system admins' }, { status: 500 });
  }
}
