/**
 * API endpoint to list all available system admin permissions
 * GET /api/admin/rbac/permissions-list - Returns array of all permission objects
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin('system_admin_portal:rbac:view_permissions');
    if (!auth.ok) return auth.error;

    // Get search/filter parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const category = searchParams.get('category') || '';

    // Query all available permissions
    let query: any = {};

    if (search) {
      query.OR = [
        { claim: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const permissions = await prisma.systemAdminPermission.findMany({
      where: query,
      orderBy: [{ category: 'asc' }, { claim: 'asc' }],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Permission list fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
